import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit } from '@/middleware/rateLimit'

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Reset the rate limit map if possible, or just use different IPs
        // Since the map is module-level, we can't easily reset it without exposing a reset function.
        // For testing, we'll use unique IPs.
    })

    it('should allow requests within limit', () => {
        const ip = '1.1.1.1'
        const limit = 5

        for (let i = 0; i < limit; i++) {
            expect(rateLimit(ip, limit)).toBe(true)
        }
    })

    it('should block requests over limit', () => {
        const ip = '2.2.2.2'
        const limit = 3

        for (let i = 0; i < limit; i++) {
            rateLimit(ip, limit)
        }

        expect(rateLimit(ip, limit)).toBe(false)
    })

    it('should reset after window expires', async () => {
        const ip = '3.3.3.3'
        const limit = 1
        const windowMs = 100

        expect(rateLimit(ip, limit, windowMs)).toBe(true)
        expect(rateLimit(ip, limit, windowMs)).toBe(false)

        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, windowMs + 50))

        expect(rateLimit(ip, limit, windowMs)).toBe(true)
    })
})
