import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { getNavLinks } from "@/lib/nav-links";
import { getSiteContent } from "@/lib/site-content";
import { getSiteIndex } from "@/lib/site-index";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [links, content, siteIndex] = await Promise.all([
    getNavLinks(),
    getSiteContent(),
    getSiteIndex(),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader links={links} name={content.site_name} siteIndex={siteIndex} />
      <main className="flex-1">{children}</main>
      <SiteFooter name={content.site_name} tagline={content.footer_tagline} />
      {content.chat_enabled !== "false" && (
        <ChatWidget
          header={content.chat_header}
          subheader={content.chat_subheader}
          exampleQuestion={content.chat_example_question}
        />
      )}
    </div>
  );
}
