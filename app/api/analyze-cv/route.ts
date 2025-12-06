import { NextResponse } from 'next/server'
import { openai, DEFAULT_MODEL } from '@/lib/openai'
import { hashCV, getCachedAnalysis, storeAnalysis } from '@/lib/cv-cache'
import { withAuth } from '@/lib/api-middleware'
import { validateInput, analyzeCVSchema } from '@/lib/validation'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'



// Step 1: Input Validation Prompt
const INPUT_VALIDATION_PROMPT = `You are a CV structure validator. Your job is to:
1. Determine if the input is a valid CV/Resume or professional profile.
2. If it is NOT a CV (e.g., random text, code, a poem, a recipe), mark it as INVALID.
3. If it IS a CV but has significant gaps (missing name, missing contact info, very sparse experience, missing dates), mark it as INCOMPLETE and generate specific questions to ask the user.
4. If it is a complete and valid CV, mark it as VALID and extract the information.

Return a JSON object with:
{
  "status": "valid" | "incomplete" | "invalid",
  "missingInfoQuestions": string[], // If incomplete, list 3-5 specific questions to gather missing info
  "rejectionReason": string, // If invalid, explain why (e.g., "This appears to be a python script, not a CV")
  "extractedInfo": {
    "name": string,
    "contactInfo": string,
    "experience": Array<{role: string, company: string, duration: string}>,
    "skills": string[],
    "education": Array<{degree: string, institution: string, year: string}>
  }
}

Rules:
- Status "invalid": Use this for completely irrelevant content.
- Status "incomplete": Use this if it looks like a CV but is missing core fields like Name, Contact Info, or has no Experience/Education listed.
- Status "valid": Use this if it has at least Name, Contact Info, and some Experience or Education.
`

// Step 2: Analysis Generation Prompt
const ANALYSIS_GENERATION_PROMPT = `You are an expert career advisor and CV analyst. Based on the validated CV structure, provide a comprehensive analysis in markdown format.

Your analysis MUST include these sections:

# Executive Summary
A brief 2-3 sentence overview of the candidate's profile and key strengths.

# Strengths
- List 4-6 key strengths with specific examples from their experience
- Focus on both technical and soft skills

# Areas for Improvement
- List 3-5 areas where the CV could be enhanced
- Provide actionable suggestions for each

# Career Trajectory Analysis
- Analyze the progression and coherence of their career path
- Identify patterns and strategic moves

# Market Positioning
- How competitive is this profile in the current market?
- What roles/industries are they best suited for?

# Recommendations
- 3-5 specific, actionable recommendations to strengthen their profile

Use proper markdown formatting with headers (##), bullet points (-), and **bold** for emphasis.`

// Step 3: Output Validation Prompt
const OUTPUT_VALIDATION_PROMPT = `You are a quality assurance validator. Check if the analysis meets these requirements:

1. Contains all required sections (Executive Summary, Strengths, Areas for Improvement, Career Trajectory Analysis, Market Positioning, Recommendations)
2. Uses proper markdown formatting
3. Is actionable and specific (not generic)
4. Is between 500-1500 words

Return JSON:
{
  "isValid": boolean,
  "missingSections": string[],
  "qualityIssues": string[]
}`

interface ValidationResult {
    status: 'valid' | 'incomplete' | 'invalid'
    missingInfoQuestions?: string[]
    rejectionReason?: string
    extractedInfo?: Record<string, unknown>
    issues?: string[]
}

export const POST = withAuth(async (request, { supabase, user }) => {
    try {
        const body = await request.json()

        // Validate input using Zod schema
        const inputValidation = validateInput(analyzeCVSchema, body)
        if (!inputValidation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: inputValidation.error },
                { status: 400 }
            )
        }

        const { cvContent } = inputValidation.data

        const cvHash = await hashCV(cvContent)
        const cachedResult = await getCachedAnalysis(supabase, user.id, cvHash)

        if (cachedResult) {
            return NextResponse.json({
                analysis: cachedResult.analysis,
                fromCache: true,
                cachedAt: cachedResult.created_at,
                filename: cachedResult.filename,
                status: 'valid'
            })
        }

        // STEP 1: Validate and extract CV structure
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: INPUT_VALIDATION_PROMPT },
            { role: 'user', content: `Validate this CV:\n\n${cvContent}` }
        ]

        const validationCompletion = await openai.chat.completions.create({
            model: DEFAULT_MODEL,
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.3,
        })

        const validation = JSON.parse(validationCompletion.choices[0]?.message?.content || '{}') as ValidationResult

        // Handle Invalid or Incomplete CVs
        if (validation?.status === 'invalid') {
            return NextResponse.json(
                {
                    error: 'Invalid CV format',
                    message: validation.rejectionReason || 'The uploaded file does not appear to be a valid CV.',
                    status: 'invalid'
                },
                { status: 400 }
            )
        }

        if (validation?.status === 'incomplete') {
            return NextResponse.json(
                {
                    message: 'CV is incomplete',
                    questions: validation.missingInfoQuestions || ['Please provide more details about your experience.'],
                    status: 'incomplete'
                },
                { status: 200 } // Return 200 so frontend can handle it gracefully
            )
        }

        if (!validation?.extractedInfo) {
            return NextResponse.json(
                {
                    error: 'Failed to extract information',
                    status: 'error'
                },
                { status: 500 }
            )
        }

        // STEP 2: Generate analysis based on validated structure
        const analysisMessages: ChatCompletionMessageParam[] = [
            { role: 'system', content: ANALYSIS_GENERATION_PROMPT },
            {
                role: 'user',
                content: `Analyze this CV based on the extracted information:\n\n${JSON.stringify(validation.extractedInfo, null, 2)}\n\nOriginal CV:\n${cvContent}`
            }
        ]

        const analysisCompletion = await openai.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: analysisMessages,
            temperature: 0.7,
            max_tokens: 2500,
        })

        const analysis = analysisCompletion.choices[0]?.message?.content

        if (!analysis) {
            return NextResponse.json(
                { error: 'No analysis generated' },
                { status: 500 }
            )
        }

        // STEP 3: Validate output quality
        const outputValidation = await openai.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: [
                { role: 'system', content: OUTPUT_VALIDATION_PROMPT },
                { role: 'user', content: `Validate this analysis:\n\n${analysis}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        })
        const qualityCheck = JSON.parse(outputValidation.choices[0]?.message?.content || '{}')

        // If quality issues found, log them but still return the analysis
        if (!qualityCheck.isValid) {
            console.warn('Analysis quality issues:', qualityCheck.qualityIssues)
        }

        // Store analysis in cache
        try {
            const filename = `CV-${new Date().toISOString().split('T')[0]}`
            await storeAnalysis(supabase, user.id, cvHash, cvContent, filename, analysis)
        } catch (cacheError) {
            console.warn('Failed to cache analysis:', cacheError)
        }

        return NextResponse.json({
            analysis,
            fromCache: false,
            extractedInfo: validation.extractedInfo,
            qualityCheck: qualityCheck.isValid ? 'passed' : 'warning',
        })
    } catch (error) {
        console.error('Error analyzing CV:', error)

        return NextResponse.json(
            {
                error: 'Failed to analyze CV',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
})
