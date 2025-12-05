import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
    status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const styles = {
        saved: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        applied: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        interviewing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        offer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        withdrawn: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }

    const labels = {
        saved: "Saved",
        applied: "Applied",
        interviewing: "Interviewing",
        offer: "Offer Received",
        rejected: "Rejected",
        withdrawn: "Withdrawn"
    }

    const style = styles[status as keyof typeof styles] || styles.saved
    const label = labels[status as keyof typeof labels] || status

    return (
        <Badge variant="secondary" className={`${style} hover:${style}`}>
            {label}
        </Badge>
    )
}
