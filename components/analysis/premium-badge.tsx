import { Sparkles } from "lucide-react"

export function PremiumBadge() {
    return (
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm">
            <Sparkles className="h-3 w-3" />
            PREMIUM
        </div>
    )
}
