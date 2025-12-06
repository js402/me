import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { hasProAccess } from '@/lib/subscription'
import { rateLimit } from '@/middleware/rateLimit'
import { validateInput, careerGuidanceSchema } from '@/lib/validation'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { hashCV } from '@/lib/cv-cache'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})


// Step 1: Extract Career Information
const CAREER_EXTRACTION_PROMPT = `You are a career information extractor. Analyze the CV and extract key career information.

Return JSON:
{
  "currentRole": string,
  "yearsOfExperience": number,
  "primarySkills": string[],
  "industries": string[],
  "careerGoals": string, // Infer from CV progression
  "educationLevel": string
}`

// Step 2: Generate Structured Career Guidance
const CAREER_GUIDANCE_PROMPT = `You are an expert career advisor. Based on the extracted career information, provide comprehensive career guidance.

Return JSON with this EXACT structure:
{
  "strategicPath": {
    "currentPosition": string, // Assessment of current position
    "shortTerm": string[], // 3-5 specific goals for 1-2 years
    "midTerm": string[], // 3-5 specific goals for 3-5 years
    "longTerm": string[] // 3-5 specific goals for 5+ years
  },
  "marketValue": {
    "salaryRange": {
      "min": number,
      "max": number,
      "currency": "USD" | "EUR" | "GBP"
    },
    "marketDemand": string, // Current market demand analysis
    "competitiveAdvantages": string[], // 3-5 key advantages
    "negotiationTips": string[] // 3-5 specific tips
  },
  "skillGap": {
    "critical": [
      {
        "skill": string,
        "priority": "high" | "medium" | "low",
        "timeframe": string, // e.g., "3-6 months"
        "resources": string[] // 2-3 specific learning resources
      }
    ],
    "recommended": [
      {
        "skill": string,
        "priority": "high" | "medium" | "low",
        "timeframe": string,
        "resources": string[]
      }
    ]
  }
}

Be specific with numbers, timelines, and resources. Provide actionable, data-driven guidance.`

// Step 3: Validate Output Structure
const OUTPUT_VALIDATION_PROMPT = `Validate that the career guidance JSON has all required fields and proper structure.

Return JSON:
{
  "isValid": boolean,
  "missingFields": string[],
  "structureIssues": string[]
}`

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'unknown'
        if (!(await rateLimit(ip, 5, 60 * 1000))) { // 5 requests per minute
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            )
        }

        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const hasPro = await hasProAccess(supabase, user.id)
        if (!hasPro) {
            return NextResponse.json(
                { error: 'Pro subscription required for career guidance' },
                { status: 403 }
            )
        }

        const body = await req.json()

        // Validate input using Zod schema
        const inputValidation = validateInput(careerGuidanceSchema, body)
        if (!inputValidation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: inputValidation.error },
                { status: 400 }
            )
        }

        const { cvContent } = inputValidation.data

        // Check cache first
        const cvHash = await hashCV(cvContent)
        const { data: cachedGuidance } = await supabase
            .from('career_guidance')
            .select('*')
            .eq('user_id', user.id)
            .eq('cv_hash', cvHash)
            .single()

        if (cachedGuidance) {
            return NextResponse.json({
                guidance: cachedGuidance.guidance,
                fromCache: true,
                cachedAt: cachedGuidance.created_at
            })
        }

        // STEP 1: Extract career information
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: CAREER_EXTRACTION_PROMPT },
            {
                role: 'user', content: `Extract career information from this CV:

${cvContent}`
            }
        ]

        const extractionCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.3,
        })

        const careerInfo = JSON.parse(extractionCompletion.choices[0].message.content || '{}')

        if (!careerInfo || Object.keys(careerInfo).length === 0) {
            throw new Error('Failed to extract career information')
        }

        // STEP 2: Generate structured guidance
        const guidanceMessages: ChatCompletionMessageParam[] = [
            { role: 'system', content: CAREER_GUIDANCE_PROMPT },
            {
                role: 'user',
                content: `Generate career guidance for:
${JSON.stringify(careerInfo, null, 2)}`
            }
        ]

        const guidanceCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: guidanceMessages,
            response_format: { type: 'json_object' },
            temperature: 0.7,
        })

        const guidance = JSON.parse(guidanceCompletion.choices[0].message.content || '{}')

        if (!guidance || Object.keys(guidance).length === 0) {
            throw new Error('Failed to generate career guidance')
        }

        // STEP 3: Validate output structure
        const validationCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: OUTPUT_VALIDATION_PROMPT },
                {
                    role: 'user', content: `Validate this guidance:
${JSON.stringify(guidance, null, 2)}`
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        })
        const validation = JSON.parse(validationCompletion.choices[0].message.content || '{}')

        if (!validation.isValid) {
            console.warn('Guidance validation issues:', validation)
            // Still return the guidance but log the issues
        }

        // Store in database for caching
        await supabase
            .from('career_guidance')
            .insert({
                user_id: user.id,
                cv_hash: cvHash,
                guidance,
            })

        return NextResponse.json({
            guidance,
            careerInfo,
            validationStatus: validation.isValid ? 'passed' : 'warning'
        })
    } catch (error) {
        console.error('Error generating career guidance:', error)
        return NextResponse.json(
            { error: 'Failed to generate career guidance' },
            { status: 500 }
        )
    }
}


