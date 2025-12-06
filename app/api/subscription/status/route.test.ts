import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/api-middleware', () => ({
    withAuth: (handler: (req: NextRequest, context: { supabase: unknown, user: { id: string } }) => Promise<Response>) => async (req: NextRequest) => {
        return handler(req, {
            supabase: (global as any).supabaseMock,
            user: (global as any).mockUser
        })
    }
}))

vi.mock('@/lib/subscription', () => ({
    hasProAccess: vi.fn()
}))

import { GET } from '@/app/api/subscription/status/route'
import { hasProAccess } from '@/lib/subscription'

describe('/api/subscription/status', () => {
    const mockSupabase = {} as any
    const mockRequest = new NextRequest('http://localhost:3000/api/subscription/status')

    beforeEach(() => {
        vi.clearAllMocks()
            ; (global as any).supabaseMock = mockSupabase
            ; (global as any).mockUser = { id: 'test-user-id' }
    })

    it('should return isPro: true for Pro users', async () => {
        vi.mocked(hasProAccess).mockResolvedValue(true)

        const response = await GET(mockRequest)
        const data = await response.json()

        expect(hasProAccess).toHaveBeenCalledWith(mockSupabase, 'test-user-id')
        expect(data).toEqual({
            isPro: true,
            userId: 'test-user-id'
        })
        expect(response.status).toBe(200)
    })

    it('should return isPro: false for Free users', async () => {
        vi.mocked(hasProAccess).mockResolvedValue(false)

        const response = await GET(mockRequest)
        const data = await response.json()

        expect(hasProAccess).toHaveBeenCalledWith(mockSupabase, 'test-user-id')
        expect(data).toEqual({
            isPro: false,
            userId: 'test-user-id'
        })
        expect(response.status).toBe(200)
    })

    it('should handle errors gracefully', async () => {
        vi.mocked(hasProAccess).mockRejectedValue(new Error('Database error'))

        const response = await GET(mockRequest)
        const data = await response.json()

        expect(data).toEqual({
            error: 'Failed to check subscription status'
        })
        expect(response.status).toBe(500)
    })

    it('should call hasProAccess with correct parameters', async () => {
        vi.mocked(hasProAccess).mockResolvedValue(true)
            ; (global as any).mockUser = { id: 'different-user-id' }

        await GET(mockRequest)

        expect(hasProAccess).toHaveBeenCalledWith(mockSupabase, 'different-user-id')
        expect(hasProAccess).toHaveBeenCalledTimes(1)
    })
})
