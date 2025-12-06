import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit } from '@/middleware/rateLimit'

// Mock Supabase client
vi.mock('@/lib/supabase-server', () => ({
    createServerSupabaseClient: vi.fn()
}))

import { createServerSupabaseClient } from '@/lib/supabase-server'

const mockSupabase = {
    from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
                })
            })
        }),
        insert: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
        }),
        update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
        })
    })
}

describe('Rate Limiter', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)
    })

    it('should allow first request', async () => {
        const ip = '1.1.1.1'
        const limit = 5

        const result = await rateLimit(ip, limit)
        expect(result).toBe(true)
        expect(mockSupabase.from).toHaveBeenCalledWith('rate_limits')
    })

    it('should allow requests within limit', async () => {
        const ip = '2.2.2.2'
        const limit = 3

        // Mock existing record with count below limit
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { id: 'test-id', request_count: 2 },
                            error: null
                        })
                    })
                })
            }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
            })
        })

        const result = await rateLimit(ip, limit)
        expect(result).toBe(true)
    })

    it('should block requests over limit', async () => {
        const ip = '3.3.3.3'
        const limit = 3

        // Mock existing record with count at limit
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { id: 'test-id', request_count: 3 },
                            error: null
                        })
                    })
                })
            })
        })

        const result = await rateLimit(ip, limit)
        expect(result).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
        const ip = '4.4.4.4'
        const limit = 5

        // Mock database error
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: 'CONNECTION_ERROR' }
                        })
                    })
                })
            })
        })

        const result = await rateLimit(ip, limit)
        // Should allow request on database error to avoid blocking legitimate users
        expect(result).toBe(true)
    })
})
