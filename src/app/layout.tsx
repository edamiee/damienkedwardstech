import type { Metadata } from "next";
import { getSiteName } from "@/lib/site-content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();
  return {
    title: `${siteName} — AI & Data Engineer`,
    description:
      "Freelance AI and data engineering — pipelines, LLM integrations, and the systems on top. Blog, white papers, and gated project work.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
