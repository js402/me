import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { hasProAccess } from '@/lib/subscription'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Pro access
    const isPro = await hasProAccess(supabase, session.user.id)
    if (!isPro) {
        return NextResponse.json(
            { error: 'Saving tailored CVs is a Pro feature' },
            { status: 403 }
        )
    }

    try {
        const body = await request.json()
        const { job_position_id, cv_content, tailored_content } = body

        if (!job_position_id || !cv_content || !tailored_content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Calculate hash of original CV
        const original_cv_hash = crypto
            .createHash('sha256')
            .update(cv_content)
            .digest('hex')

        // Get latest version number
        const { data: latestVersion } = await supabase
            .from('tailored_cvs')
            .select('version')
            .eq('job_position_id', job_position_id)
            .order('version', { ascending: false })
            .limit(1)
            .single()

        const nextVersion = (latestVersion?.version || 0) + 1

        // Check version limit (Pro: 5, but for now let's just allow unlimited for Pro)
        // TODO: Implement stricter limits if needed

        const { data, error } = await supabase
            .from('tailored_cvs')
            .insert({
                user_id: session.user.id,
                job_position_id,
                original_cv_hash,
                tailored_content,
                version: nextVersion,
                is_active: true
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error saving tailored CV:', error)
        return NextResponse.json(
            { error: 'Failed to save tailored CV' },
            { status: 500 }
        )
    }
}
