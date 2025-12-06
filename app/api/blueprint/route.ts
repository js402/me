import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
    try {
        const { data: blueprint, error } = await supabase
            .from('cv_blueprints')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching blueprint:', error)
            return NextResponse.json(
                { error: 'Failed to fetch blueprint' },
                { status: 500 }
            )
        }

        return NextResponse.json(blueprint || null)

    } catch (error) {
        console.error('Error in blueprint API:', error)
        return NextResponse.json(
            { error: 'Failed to fetch blueprint' },
            { status: 500 }
        )
    }
})
