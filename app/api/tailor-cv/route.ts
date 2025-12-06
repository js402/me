import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { withProAccess } from '@/lib/api-middleware'
import { validateInput, tailorCVSchema } from '@/lib/validation'
import { cleanMarkdown } from '@/lib/markdown'

/**
 * Format blueprint data into readable CV format for tailoring
 * (Same as evaluate-job-match to ensure consistency)
 */
function formatBlueprintForAnalysis(blueprintData: any): string {
    const sections: string[] = []

    // Personal Info
    if (blueprintData.personal?.name) {
        sections.push(`Name: ${blueprintData.personal.name}`)
    }

    if (blueprintData.personal?.summary) {
        sections.push(`Professional Summary: ${blueprintData.personal.summary}`)
    }

    // Contact Info
    const contactParts: string[] = []
    if (blueprintData.contact?.email) contactParts.push(`Email: ${blueprintData.contact.email}`)
    if (blueprintData.contact?.phone) contactParts.push(`Phone: ${blueprintData.contact.phone}`)
    if (blueprintData.contact?.location) contactParts.push(`Location: ${blueprintData.contact.location}`)
    if (blueprintData.contact?.linkedin) contactParts.push(`LinkedIn: ${blueprintData.contact.linkedin}`)
    if (blueprintData.contact?.website) contactParts.push(`Website: ${blueprintData.contact.website}`)

    if (contactParts.length > 0) {
        sections.push(`Contact Information:\n${contactParts.join('\n')}`)
    }

    // Skills
    if (blueprintData.skills && blueprintData.skills.length > 0) {
        const skillsText = blueprintData.skills
            .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
            .map((skill: any) => skill.name)
            .join(', ')
        sections.push(`Skills: ${skillsText}`)
    }

    // Experience
    if (blueprintData.experience && blueprintData.experience.length > 0) {
        const experienceText = blueprintData.experience
            .map((exp: any) =>
                `${exp.role} at ${exp.company} (${exp.duration})` +
                (exp.description ? `\n  ${exp.description}` : '')
            )
            .join('\n\n')
        sections.push(`Professional Experience:\n${experienceText}`)
    }

    // Education
    if (blueprintData.education && blueprintData.education.length > 0) {
        const educationText = blueprintData.education
            .map((edu: any) => `${edu.degree} from ${edu.institution} (${edu.year})`)
            .join('\n')
        sections.push(`Education:\n${educationText}`)
    }

    return sections.join('\n\n')
}

export const POST = withProAccess(async (request: NextRequest, { supabase, user }) => {
    try {
        const body = await request.json()

        // Validate input using Zod schema
        const validation = validateInput(tailorCVSchema, body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error },
                { status: 400 }
            )
        }

        const { jobDescription, matchAnalysis } = validation.data

        // Get user's blueprint (same as job match analysis)
        const { data: blueprint } = await supabase
            .from('cv_blueprints')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (!blueprint) {
            return NextResponse.json(
                { error: 'No CV blueprint found. Please upload a CV first.' },
                { status: 400 }
            )
        }

        // Format blueprint data for tailoring
        const blueprintData = blueprint.profile_data
        const cvContent = formatBlueprintForAnalysis(blueprintData)

        // --------------------------------------------------------
        // STEP 1 — Tailored CV Generation
        // --------------------------------------------------------
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
You are an elite CV writer who tailors CVs to match ANY job description provided in the input.

Your job is to:
1. Identify the target role, required skills, seniority level, and key themes FROM the provided jobDescription.
2. Rewrite the CV so it aligns with that role — truthfully and without fabricating details.
3. Use matchAnalysis to understand:
   - Matching skills to highlight
   - Missing skills to address through truthful adjacent experience
   - Recommendations to incorporate if factually allowed

=========================
STRICT FACTUAL RULES
=========================
1. DO NOT invent skills, tech stacks, tools, roles, or accomplishments.
2. DO NOT invent programming languages or software engineering experience if not present.
3. DO NOT add placeholders like [Year], [University], [Degree].
4. You MAY rephrase, restructure, and emphasize existing factual experience.
5. You MUST ground everything in the cvContent.

=========================
WHAT YOU MUST PRODUCE
=========================
1. A tailored **Professional Summary** that directly positions the candidate as relevant to the target role — using ONLY what is real.
2. Rewritten Experience, Skills, and Education sections.
3. Emphasis on transferable technical skills that relate to the target role.
4. Clean Markdown output ONLY — no commentary, no explanations.

Your output is ONLY the rewritten CV in Markdown.
`
                },
                {
                    role: "user",
                    content: `
CV Content (from accumulated blueprint data):
${cvContent}

Job Description:
${jobDescription}

Match Analysis:
${JSON.stringify(matchAnalysis, null, 2)}
`
                }
            ],
            temperature: 0.7,
        })

        const initialTailoredCV = completion.choices[0].message.content

        if (!initialTailoredCV) {
            throw new Error('OpenAI returned empty content')
        }

        // --------------------------------------------------------
        // STEP 2 — QA Final Polish
        // --------------------------------------------------------
        const finalPolish = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
You are a strict CV Quality Assurance Editor.

Your job:
1. Ensure the rewritten CV is 100% factual according to cvContent.
2. Remove ANY placeholders (e.g., [Year], [Company], [Degree]).
3. Ensure no invented languages, frameworks, or tech appear.
4. Ensure the Professional Summary exists and aligns with the target role.
5. Ensure the tone is concise, professional, and targeted.
6. Output **only** the final clean Markdown CV — no explanation.

You must use:
- Original CV for fact-checking
- Draft tailored CV for rewriting
- Job description only for context (NOT for adding new facts)
`
                },
                {
                    role: "user",
                    content: `
Original CV (from blueprint):
${cvContent}

Job Description:
${jobDescription}

Draft Tailored CV:
${initialTailoredCV}
`
                }
            ],
            temperature: 0.3,
        })

        let tailoredCV = finalPolish.choices[0].message.content

        if (!tailoredCV) {
            throw new Error('OpenAI QA returned empty content')
        }

        tailoredCV = cleanMarkdown(tailoredCV)

        return NextResponse.json({ tailoredCV })

    } catch (error) {
        console.error('Tailor CV error:', error)
        return NextResponse.json(
            { error: 'Failed to tailor CV' },
            { status: 500 }
        )
    }
})
