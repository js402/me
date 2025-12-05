interface MatchScoreCircleProps {
    score: number
}

export function MatchScoreCircle({ score }: MatchScoreCircleProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500'
        if (score >= 50) return 'text-amber-500'
        return 'text-red-500'
    }

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'Excellent Match!'
        if (score >= 50) return 'Good Potential'
        return 'Low Match'
    }

    return (
        <div className="flex flex-col items-center justify-center">
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
                        className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
                        strokeWidth="8"
                        strokeDasharray={365}
                        strokeDashoffset={365 - (365 * score) / 100}
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
                        {score}%
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Match</span>
                </div>
            </div>
            <h3 className="mt-4 font-semibold text-lg text-center">
                {getScoreLabel(score)}
            </h3>
        </div>
    )
}
