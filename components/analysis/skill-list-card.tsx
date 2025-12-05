import { Sparkles, FileText } from "lucide-react"
import { ReactNode } from "react"

interface SkillListCardProps {
    title: string
    skills: string[]
    variant: 'matching' | 'missing' | 'recommendations'
    icon?: ReactNode
}

export function SkillListCard({ title, skills, variant, icon }: SkillListCardProps) {
    const variantStyles = {
        matching: {
            container: 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30',
            title: 'text-green-700 dark:text-green-400',
            iconBg: 'bg-green-100 dark:bg-green-900/40',
            bullet: 'bg-green-500'
        },
        missing: {
            container: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30',
            title: 'text-amber-700 dark:text-amber-400',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            bullet: 'bg-amber-500'
        },
        recommendations: {
            container: 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30',
            title: 'text-blue-700 dark:text-blue-400',
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            bullet: 'bg-blue-500'
        }
    }

    const styles = variantStyles[variant as keyof typeof variantStyles]
    const defaultIcon = variant === 'missing' ? <FileText className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />

    return (
        <div className={`p-6 rounded-2xl border ${styles.container}`}>
            <h4 className={`font-semibold mb-4 flex items-center gap-2 ${styles.title}`}>
                <div className={`p-1 rounded-full ${styles.iconBg}`}>
                    {icon || defaultIcon}
                </div>
                {title}
            </h4>
            <ul className="space-y-2">
                {skills.map((skill, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        {variant === 'recommendations' ? (
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${styles.iconBg} text-xs font-bold ${styles.title}`}>
                                {i + 1}
                            </span>
                        ) : (
                            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${styles.bullet}`} />
                        )}
                        <span className={variant === 'recommendations' ? 'pt-0.5' : ''}>{skill}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
