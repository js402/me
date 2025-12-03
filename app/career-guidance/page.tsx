'use client'

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { ArrowLeft, Sparkles, Map, Target, TrendingUp } from "lucide-react"

export default function CareerGuidancePage() {
    const router = useRouter()

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-4 gap-2 pl-0 hover:pl-2 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Analysis
                    </Button>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Sparkles className="h-8 w-8 text-purple-600" />
                        In-Depth Career Guidance
                    </h1>
                    <p className="text-muted-foreground">
                        Advanced career planning and strategic advice based on your profile
                    </p>
                </div>

                {/* Mock Content */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="md:col-span-2 border-purple-500/20 bg-purple-50/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-purple-600" />
                                Strategic Career Path
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-40 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center text-muted-foreground">
                                AI Analysis in progress...
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                Market Value Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-32 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Map className="h-5 w-5 text-green-600" />
                                Skill Gap Roadmap
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-32 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-12 text-center p-8 rounded-xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-dashed border-slate-300 dark:border-slate-700">
                    <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        We are currently fine-tuning our advanced career guidance models.
                        Check back soon for personalized career roadmaps and salary insights.
                    </p>
                </div>
            </main>
        </div>
    )
}
