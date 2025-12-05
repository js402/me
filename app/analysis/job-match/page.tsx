'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2, FileText, ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { useCVStore } from "@/hooks/useCVStore"
import { supabase } from "@/lib/supabase"

export default function JobMatchPage() {
    const router = useRouter()
    const { content: cvContent, jobDescription, setJobDescription } = useCVStore()

    const [matchResult, setMatchResult] = useState<{
        matchScore: number
        matchingSkills: string[]
        missingSkills: string[]
        recommendations: string[]
    } | null>(null)
    const [isMatching, setIsMatching] = useState(false)
    const [matchError, setMatchError] = useState('')

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/auth?redirect=analysis/job-match')
            }
        }
        checkAuth()

        if (!cvContent) {
            router.push('/')
        }
    }, [cvContent, router])

    const handleJobMatch = async () => {
        if (!jobDescription.trim()) return

        setIsMatching(true)
        setMatchError('')
        setMatchResult(null)

        try {
            const response = await fetch('/api/evaluate-job-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cvContent,
                    jobDescription
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to evaluate job match')
            }

            const data = await response.json()
            setMatchResult(data)
        } catch (err) {
            setMatchError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsMatching(false)
        }
    }

    if (!cvContent) return null

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Analysis
                </Button>

                <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm">
                            <Sparkles className="h-3 w-3" />
                            PREMIUM
                        </div>
                    </div>

                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                                <FileText className="h-6 w-6" />
                            </div>
                            Job Match Analysis
                        </CardTitle>
                        <p className="text-muted-foreground mt-2">
                            Paste a job description to see how well your CV matches the requirements.
                        </p>
                    </CardHeader>

                    <CardContent className="p-6">
                        <div className="space-y-6">
                            <div className="relative">
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                    Job Description
                                </label>
                                <textarea
                                    className="w-full min-h-[200px] p-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                    placeholder="Paste the full job description here..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <p className="text-xs text-muted-foreground text-center sm:text-left">
                                    We&apos;ll analyze skills, experience, and keywords to give you a match score.
                                </p>
                                <Button
                                    onClick={handleJobMatch}
                                    disabled={isMatching || !jobDescription.trim()}
                                    className="w-full sm:w-auto min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                                    size="lg"
                                >
                                    {isMatching ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            Evaluate Match
                                            <Sparkles className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>

                            {matchError && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Analysis Failed</p>
                                        <p className="text-sm opacity-90">{matchError}</p>
                                        {matchError.includes('Pro subscribers') && (
                                            <Button
                                                variant="link"
                                                className="p-0 h-auto text-red-700 dark:text-red-300 underline mt-1"
                                                onClick={() => router.push('/pricing')}
                                            >
                                                Upgrade to Pro to unlock this feature
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {matchResult && (
                                <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    {/* Score Section */}
                                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
                                        <div className="relative h-32 w-32 flex items-center justify-center">
                                            <svg className="h-full w-full transform -rotate-90">
                                                <circle
                                                    className="text-slate-100 dark:text-slate-800"
                                                    strokeWidth="8"
                                                    stroke="currentColor"
                                                    fill="transparent"
                                                    r="58"
                                                    cx="64"
                                                    cy="64"
                                                />
                                                <circle
                                                    className={`${matchResult.matchScore >= 80 ? 'text-green-500' :
                                                        matchResult.matchScore >= 50 ? 'text-amber-500' : 'text-red-500'
                                                        } transition-all duration-1000 ease-out`}
                                                    strokeWidth="8"
                                                    strokeDasharray={365}
                                                    strokeDashoffset={365 - (365 * matchResult.matchScore) / 100}
                                                    strokeLinecap="round"
                                                    stroke="currentColor"
                                                    fill="transparent"
                                                    r="58"
                                                    cx="64"
                                                    cy="64"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                                                    {matchResult.matchScore}%
                                                </span>
                                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Match</span>
                                            </div>
                                        </div>
                                        <h3 className="mt-4 font-semibold text-lg text-center">
                                            {matchResult.matchScore >= 80 ? 'Excellent Match!' :
                                                matchResult.matchScore >= 50 ? 'Good Potential' : 'Low Match'}
                                        </h3>

                                        <Button
                                            onClick={() => router.push('/analysis/tailor-cv')}
                                            className="mt-6 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 transition-all hover:scale-105"
                                        >
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Tailor CV for this Job
                                        </Button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="p-6 rounded-2xl bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                            <h4 className="font-semibold mb-4 text-green-700 dark:text-green-400 flex items-center gap-2">
                                                <div className="p-1 bg-green-100 dark:bg-green-900/40 rounded-full">
                                                    <Sparkles className="h-4 w-4" />
                                                </div>
                                                Matching Skills
                                            </h4>
                                            <ul className="space-y-2">
                                                {matchResult.matchingSkills.map((skill, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                                        {skill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                            <h4 className="font-semibold mb-4 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                                <div className="p-1 bg-amber-100 dark:bg-amber-900/40 rounded-full">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                Missing / Weak Areas
                                            </h4>
                                            <ul className="space-y-2">
                                                {matchResult.missingSkills.map((skill, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                                        {skill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                        <h4 className="font-semibold mb-4 text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                            <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                                                <Sparkles className="h-4 w-4" />
                                            </div>
                                            Recommendations
                                        </h4>
                                        <ul className="space-y-3">
                                            {matchResult.recommendations.map((rec, i) => (
                                                <li key={i} className="flex gap-3 text-sm p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-blue-100/50 dark:border-blue-900/20">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-bold text-blue-600 dark:text-blue-400">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-slate-700 dark:text-slate-300 pt-0.5">{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
