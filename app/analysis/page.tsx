'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { supabase } from "@/lib/supabase"
import { analyzeCV } from "@/lib/api-client"
import { useCVStore } from "@/hooks/useCVStore"
import { downloadTextFile } from "@/lib/download-helpers"
import { MissingInfoModal } from "@/components/analysis/MissingInfoModal"
import { AnalysisStatus } from "@/components/analysis/AnalysisStatus"
import { AnalysisResults } from "@/components/analysis/AnalysisResults"
import { JobMatchNavigation } from "@/components/analysis/JobMatchNavigation"

export default function AnalysisPage() {
    const router = useRouter()
    const { content: cvContent, filename, analysis, setAnalysis, appendSupplementalInfo, clear: clearCV } = useCVStore()
    const [isLoading, setIsLoading] = useState(true)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [error, setError] = useState<string>('')
    const [fromCache, setFromCache] = useState<boolean>(false)
    const [cachedAt, setCachedAt] = useState<string | undefined>()

    const [missingInfoQuestions, setMissingInfoQuestions] = useState<string[]>([])
    const [isMissingInfoModalOpen, setIsMissingInfoModalOpen] = useState(false)
    const [isResubmitting, setIsResubmitting] = useState(false)

    const startAnalysis = useCallback(async (content: string) => {
        setIsAnalyzing(true)
        setError('')

        try {
            const result = await analyzeCV(content)

            if (result.status === 'incomplete' && result.questions) {
                setMissingInfoQuestions(result.questions)
                setIsMissingInfoModalOpen(true)
                setIsAnalyzing(false) // Stop loading indicator while user answers
                return
            }

            if (result.status === 'invalid') {
                setError(result.message || 'Invalid CV format')
                return
            }

            setAnalysis(result.analysis)
            setFromCache(result.fromCache)
            setCachedAt(result.cachedAt)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze CV')
        } finally {
            if (!isMissingInfoModalOpen) {
                setIsAnalyzing(false)
            }
        }
    }, [setAnalysis, isMissingInfoModalOpen])

    const handleMissingInfoSubmit = async (answers: string[]) => {
        setIsResubmitting(true)
        setIsMissingInfoModalOpen(false)
        setIsAnalyzing(true)

        try {
            // Append supplemental info to CV store (persists the data)
            appendSupplementalInfo(missingInfoQuestions, answers)

            // Re-analyze with the updated CV content
            const result = await analyzeCV(cvContent)

            if (result.status === 'invalid') {
                setError(result.message || 'Invalid CV format')
            } else {
                setAnalysis(result.analysis)
                setFromCache(result.fromCache)
                setCachedAt(result.cachedAt)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze CV')
        } finally {
            setIsResubmitting(false)
            setIsAnalyzing(false)
        }
    }

    const checkAuthAndLoadCV = useCallback(async () => {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            // Not authenticated, redirect to auth with redirect to analysis
            router.push('/auth?redirect=analysis')
            return
        }

        if (!cvContent) {
            // No CV uploaded, redirect to home
            router.push('/')
            return
        }

        // If we already have analysis, we don't necessarily need to re-run it, 
        // but the user might expect it. The original code ran it every time.
        // We'll keep the behavior but fix the race condition.
        if (!analysis) {
            try {
                await startAnalysis(cvContent)
            } finally {
                setIsLoading(false)
            }
        } else {
            setIsLoading(false)
        }

    }, [router, cvContent, analysis, startAnalysis])

    useEffect(() => {
        checkAuthAndLoadCV()
    }, [checkAuthAndLoadCV])

    const handleDownload = () => {
        downloadTextFile(analysis, `${filename}-analysis.txt`)
    }

    const handleNewCV = () => {
        clearCV()
        router.push('/')
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">CV Analysis</h1>
                    <p className="text-muted-foreground">
                        AI-powered career guidance for {filename}
                    </p>
                </div>

                {/* Analysis Status */}
                <AnalysisStatus
                    isAnalyzing={isAnalyzing}
                    error={error}
                    fromCache={fromCache}
                    cachedAt={cachedAt}
                    onRetry={() => startAnalysis(cvContent)}
                />

                {/* Analysis Results */}
                {analysis && (
                    <>
                        <AnalysisResults
                            analysis={analysis}
                            onDownload={handleDownload}
                        />

                        {/* Job Match Analysis Navigation */}
                        <JobMatchNavigation />
                    </>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-4 justify-end">
                    <Button onClick={() => router.push('/career-guidance')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Get Career Guidance
                    </Button>
                    <Button variant="outline" onClick={handleNewCV}>
                        Analyze Another CV
                    </Button>
                </div>

                {/* Missing Info Modal */}
                <MissingInfoModal
                    isOpen={isMissingInfoModalOpen}
                    questions={missingInfoQuestions}
                    onSubmit={handleMissingInfoSubmit}
                    onCancel={() => {
                        setIsMissingInfoModalOpen(false)
                        handleNewCV()
                    }}
                    isSubmitting={isResubmitting}
                />
            </main>
        </div>
    )
}

