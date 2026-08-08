export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-4xl flex-wrap justify-between gap-2 px-6 py-5 text-xs text-muted">
        <span>© {new Date().getFullYear()} Damien K. Edwards</span>
        <span>Surveyed with care</span>
      </div>
    </footer>
  );
}
