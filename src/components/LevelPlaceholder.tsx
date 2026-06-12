interface Props {
  title: string
  description: string
  ticket: string
}

export function LevelPlaceholder({ title, description, ticket }: Props) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
        À venir — ticket {ticket}
      </p>
    </section>
  )
}
