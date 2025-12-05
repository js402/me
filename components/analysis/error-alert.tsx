import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface ErrorAlertProps {
    error: string
}

export function ErrorAlert({ error }: ErrorAlertProps) {
    const router = useRouter()
    const isPremiumError = error.includes('Pro subscribers')

    return (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
                <FileText className="h-4 w-4" />
            </div>
            <div>
                <p className="font-semibold">Analysis Failed</p>
                <p className="text-sm opacity-90">{error}</p>
                {isPremiumError && (
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
    )
}