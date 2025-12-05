import { NextRequest, NextResponse } from 'next/server'
import { openai, DEFAULT_MODEL } from '@/lib/openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { hasProAccess } from '@/lib/subscription'

const JOB_MATCH_PROMPT = `You are an expert career advisor and technical recruiter. Your task is to evaluate how well a candidate's CV matches a specific Job Description (JD) AND extract key details from the JD.

Compare the provided CV against the Job Description and return a JSON object with the following structure:
{
  "matchScore": number, // A score from 0 to 100 representing the fit
  "matchingSkills": string[], // List of skills from the JD that the candidate possesses
  "missingSkills": string[], // List of important skills from the JD that are missing or weak in the CV
  "recommendations": string[], // 3-5 actionable tips to improve the CV for this specific job
  "metadata": {
    "company_name": string, // Extracted company name (or "Unknown Company" if not found)
    "position_title": string, // Extracted job title (or "Unknown Position" if not found)
    "location": string, // Extracted location (or "Remote" / "Unknown" if not found)
    "salary_range": string // Extracted salary range (or "Not specified" if not found)
  }
}

Be strict but fair with the score. Focus on key technical requirements and experience levels.`

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                {
                    error: 'Unauthorized - please sign in',
                    details: authError?.message || 'No user session found'
                },
                { status: 401 }
            )
        }

        const isPro = await hasProAccess(supabase, user.id)
        if (!isPro) {
            return NextResponse.json(
                { error: 'This feature is available only to Pro subscribers' },
                { status: 403 }
            )
        }

        const { cvContent, jobDescription } = await request.json()

        if (!cvContent || !jobDescription) {
            return NextResponse.json(
                { error: 'Both CV content and Job Description are required' },
                { status: 400 }
            )
        }

        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: JOB_MATCH_PROMPT },
            {
                role: 'user',
                content: `CV Content:\n${cvContent}\n\nJob Description:\n${jobDescription}`
            }
        ]

        const completion = await openai.chat.completions.create({
            model: DEFAULT_MODEL,
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.5,
        })

        const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

        return NextResponse.json(result)

    } catch (error) {
        console.error('Error evaluating job match:', error)
        return NextResponse.json(
            {
                error: 'Failed to evaluate job match',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
