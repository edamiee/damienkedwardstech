import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Damien K. Edwards — AI & Data Engineer",
  description:
    "Freelance AI and data engineering — pipelines, LLM integrations, and the systems on top. Blog, white papers, and gated project work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
