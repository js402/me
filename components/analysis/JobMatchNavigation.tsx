import { useRouter } from 'next/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, FileText } from "lucide-react"

export function JobMatchNavigation() {
  const router = useRouter()

  return (
    <Card className="mt-8 border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative group cursor-pointer hover:shadow-xl transition-all duration-300" onClick={() => router.push('/analysis/job-match')}>
      <div className="absolute top-0 right-0 p-4">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm">
          <Sparkles className="h-3 w-3" />
          PREMIUM
        </div>
      </div>

      <CardContent className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Job Match Analysis</h3>
            <p className="text-muted-foreground">
              See how well your CV matches a specific job description.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-full bg-white dark:bg-slate-800 shadow-sm group-hover:translate-x-2 transition-transform duration-300">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
      </CardContent>
    </Card>
  )
}
