import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Fetch position details and associated tailored CVs
        const { data: position, error: positionError } = await supabase
            .from('job_positions')
            .select('*')
            .eq('id', id)
            .eq('user_id', session.user.id)
            .single()

        if (positionError) throw positionError

        const { data: tailoredCVs, error: cvsError } = await supabase
            .from('tailored_cvs')
            .select('id, version, is_active, created_at')
            .eq('job_position_id', id)
            .eq('user_id', session.user.id)
            .order('version', { ascending: false })

        if (cvsError) throw cvsError

        return NextResponse.json({ ...position, tailored_cvs: tailoredCVs })
    } catch (error) {
        console.error('Error fetching job position:', error)
        return NextResponse.json(
            { error: 'Failed to fetch job position' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { status, notes, applied_date, submitted_cv_id } = body

        const updates: Record<string, unknown> = {}
        if (status) updates.status = status
        if (notes !== undefined) updates.notes = notes
        if (applied_date) updates.applied_date = applied_date
        if (submitted_cv_id !== undefined) updates.submitted_cv_id = submitted_cv_id

        const { data, error } = await supabase
            .from('job_positions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', session.user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating job position:', error)
        return NextResponse.json(
            { error: 'Failed to update job position' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { error } = await supabase
            .from('job_positions')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting job position:', error)
        return NextResponse.json(
            { error: 'Failed to delete job position' },
            { status: 500 }
        )
    }
}
