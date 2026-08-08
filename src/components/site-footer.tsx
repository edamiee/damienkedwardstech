export function SiteFooter({ name, tagline }: { name: string; tagline: string }) {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-4xl flex-wrap justify-between gap-2 px-6 py-5 text-xs text-muted">
        <span>© {new Date().getFullYear()} {name}</span>
        <span>{tagline}</span>
      </div>
    </footer>
  );
}
