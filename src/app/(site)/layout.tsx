import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { getNavLinks } from "@/lib/nav-links";
import { getSiteContent } from "@/lib/site-content";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [links, content] = await Promise.all([getNavLinks(), getSiteContent()]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader links={links} name={content.site_name} />
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
