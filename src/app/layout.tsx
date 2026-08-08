import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { getSiteName } from "@/lib/site-content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();
  const title = `${siteName} — AI & Data Engineer`;
  const description =
    "Freelance AI and data engineering — pipelines, LLM integrations, and the systems on top. Blog, white papers, and gated project work.";

  return {
    metadataBase: new URL("https://damienkedwards.tech"),
    title,
    description,
    openGraph: {
      title,
      description,
      siteName,
      url: "https://damienkedwards.tech",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
