import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-click unsubscribe link from newsletter emails. Deliberately no auth —
// the worst case of someone guessing an email is removing it from a
// low-stakes mailing list, and requiring sign-in here would break the
// standard "click to unsubscribe" pattern most mail clients expect.
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (email) {
    const supabase = createAdminClient();
    await supabase.from("subscribers").delete().eq("email", email.toLowerCase());
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Unsubscribed</title>
    <style>
      body { background: #0e211e; color: #efe6d2; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; text-align: center; }
      a { color: #8fd4c4; }
    </style>
  </head>
  <body>
    <div>
      <h1>You're unsubscribed</h1>
      <p>You won't get any more emails from this list.</p>
      <p><a href="https://damienkedwards.tech">Back to the site</a></p>
    </div>
  </body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
