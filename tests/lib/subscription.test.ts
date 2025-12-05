import { describe, it, expect, vi } from 'vitest'
import { getUserSubscription, hasProAccess } from '@/lib/subscription'
import { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client
const mockSupabase = {
    from: vi.fn(),
}

describe('Subscription Logic', () => {
    describe('getUserSubscription', () => {
        it('should return subscription data when found', async () => {
            const mockData = {
                id: 'sub_123',
                user_id: 'user_123',
                status: 'active',
                price_id: 'price_123',
            }

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
                            }),
                        }),
                    }),
                }),
            })

            const result = await getUserSubscription(mockSupabase as unknown as SupabaseClient, 'user_123')
            expect(result).toEqual(mockData)
        })

        it('should return null when no subscription found', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                            }),
                        }),
                    }),
                }),
            })

            const result = await getUserSubscription(mockSupabase as unknown as SupabaseClient, 'user_123')
            expect(result).toBeNull()
        })
    })

    describe('hasProAccess', () => {
        it('should return true for active subscription', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({
                                    data: { status: 'active' },
                                    error: null
                                }),
                            }),
                        }),
                    }),
                }),
            })

            const result = await hasProAccess(mockSupabase as unknown as SupabaseClient, 'user_123')
            expect(result).toBe(true)
        })

        it('should return true for trialing subscription', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({
                                    data: { status: 'trialing' },
                                    error: null
                                }),
                            }),
                        }),
                    }),
                }),
            })

            const result = await hasProAccess(mockSupabase as unknown as SupabaseClient, 'user_123')
            expect(result).toBe(true)
        })

        it('should return false for canceled/expired subscription', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({
                                    data: { status: 'canceled' },
                                    error: null
                                }),
                            }),
                        }),
                    }),
                }),
            })

            const result = await hasProAccess(mockSupabase as unknown as SupabaseClient, 'user_123')
            expect(result).toBe(false)
        })

        it('should return false when no subscription exists', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: null
                                }),
                            }),
                        }),
                    }),
                }),
            })

            const result = await hasProAccess(mockSupabase as unknown as SupabaseClient, 'user_123')
            expect(result).toBe(false)
        })
    })
})
