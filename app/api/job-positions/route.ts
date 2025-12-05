import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const {
            company_name,
            position_title,
            job_description,
            job_url,
            location,
            salary_range,
            match_score,
            matching_skills,
            missing_skills,
            recommendations
        } = body

        // Validate required fields
        if (!company_name || !position_title || !job_description) {
            return NextResponse.json(
                { error: 'Company name, position title, and job description are required' },
                { status: 400 }
            )
        }

        // Check position limit for free users
        // TODO: Implement check based on subscription status

        const { data, error } = await supabase
            .from('job_positions')
            .insert({
                user_id: session.user.id,
                company_name,
                position_title,
                job_description,
                job_url,
                location,
                salary_range,
                match_score,
                matching_skills,
                missing_skills,
                recommendations,
                status: 'saved'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating job position:', error)
        return NextResponse.json(
            { error: 'Failed to create job position' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    try {
        let query = supabase
            .from('job_positions')
            .select('*')
            .eq('user_id', session.user.id)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        query = query.order(sort, { ascending: order === 'asc' })

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ positions: data })
    } catch (error) {
        console.error('Error fetching job positions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch job positions' },
            { status: 500 }
        )
    }
}
