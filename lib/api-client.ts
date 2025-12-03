/**
 * Client-side helper function to call the CV analysis API
 */

export interface AnalyzeCVResponse {
    analysis: string
    fromCache: boolean
    cachedAt?: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
    model?: string
    filename?: string
}

export interface AnalyzeCVError {
    error: string
    details?: string
}

import { supabase } from "@/lib/supabase"

export async function analyzeCV(
    cvContent: string,
    customPrompt?: string
): Promise<AnalyzeCVResponse> {
    // Get current session for the token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        throw new Error('User not authenticated')
    }

    const response = await fetch('http://localhost:8080/analyze-cv', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            cvContent,
            prompt: customPrompt,
        }),
    })

    if (!response.ok) {
        const error: AnalyzeCVError = await response.json()
        throw new Error(error.error || 'Failed to analyze CV')
    }

    return response.json()
}

/**
 * Example usage:
 * 
 * import { analyzeCV } from '@/lib/api-client'
 * 
 * try {
 *   const result = await analyzeCV(cvContent)
 *   console.log(result.analysis)
 * } catch (error) {
 *   console.error('Analysis failed:', error)
 * }
 */
