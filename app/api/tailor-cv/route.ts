import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { openai } from '@/lib/openai'
import { hasProAccess } from '@/lib/subscription'

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

        // Check for Pro subscription
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
                { error: 'Missing CV content or job description' },
                { status: 400 }
            )
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert CV writer and career coach. Your task is to rewrite a CV to better match a specific job description.
                    
                    Guidelines:
                    1. Analyze the Job Description to identify key skills, keywords, and requirements.
                    2. Rewrite the CV to highlight these relevant areas.
                    3. Adjust the Professional Summary to align with the job's mission.
                    4. Rephrase bullet points in the Experience section to emphasize relevant achievements.
                    5. Do NOT invent experiences or skills the candidate does not have. Stick to the truth but frame it effectively.
                    6. Output the result in clean Markdown format.
                    7. Do not include any conversational text, just the rewritten CV.`
                },
                {
                    role: "user",
                    content: `CV Content:\n${cvContent}\n\nJob Description:\n${jobDescription}`
                }
            ],
            temperature: 0.7,
        })

        const tailoredCV = completion.choices[0].message.content

        return NextResponse.json({ tailoredCV })

    } catch (error) {
        console.error('Tailor CV error:', error)
        return NextResponse.json(
            { error: 'Failed to tailor CV' },
            { status: 500 }
        )
    }
}
