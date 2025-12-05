interface PageHeaderProps {
    title: string
    description: string
    children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <section className="container mx-auto px-4 py-16 md:py-24">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    {title}
                </h1>
                <p className="text-xl text-muted-foreground">
                    {description}
                </p>
            </div>
            {children}
        </section>
    )
}
