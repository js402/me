import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { hasProAccess } from '@/lib/subscription'

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
    try {
        const isPro = await hasProAccess(supabase, user.id)

        return NextResponse.json({
            isPro,
            userId: user.id
        })

    } catch (error) {
        console.error('Error checking subscription status:', error)
        return NextResponse.json(
            { error: 'Failed to check subscription status' },
            { status: 500 }
        )
    }
})
