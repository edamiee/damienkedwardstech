export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Contact</h1>
      <p className="mt-4 max-w-[50ch] text-[15.5px] text-muted">
        Open to freelance and contract AI/data engineering work, and to
        full-time roles. The fastest way to reach me is email.
      </p>
      <a
        href="mailto:damien.k.edwards@gmail.com"
        className="mt-6 inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-bg"
      >
        damien.k.edwards@gmail.com
      </a>
    </div>
  );
}
