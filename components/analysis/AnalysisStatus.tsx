import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, FileText } from "lucide-react"

interface AnalysisStatusProps {
  isAnalyzing: boolean
  error: string | null
  fromCache: boolean
  cachedAt: string | undefined
  onRetry: () => void
}

export function AnalysisStatus({ isAnalyzing, error, fromCache, cachedAt, onRetry }: AnalysisStatusProps) {
  // Analysis loading state
  if (isAnalyzing) {
    return (
      <Card className="mb-6 border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold">Analyzing your CV...</p>
              <p className="text-sm text-muted-foreground">
                Checking cache and generating insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Cache status indicator
  if (fromCache) {
    return (
      <Card className="mb-6 border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-300">Cached Result</p>
              <p className="text-sm text-muted-foreground">
                This CV was previously analyzed{cachedAt && ` on ${new Date(cachedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="mb-6 border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-red-600 dark:text-red-400">Analysis Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button
            onClick={onRetry}
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
