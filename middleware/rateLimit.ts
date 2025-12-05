const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

export function rateLimit(ip: string, limit: number = 10, windowMs: number = 60 * 1000) {
    const now = Date.now()
    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now }

    if (now - record.lastReset > windowMs) {
        record.count = 0
        record.lastReset = now
    }

    record.count += 1
    rateLimitMap.set(ip, record)

    return record.count <= limit
}
