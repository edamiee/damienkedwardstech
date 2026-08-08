import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session cookie on every request, and gates
// /admin/* and /projects/* behind a logged-in session. Whether that user is
// actually the admin (public.admins) or an invited viewer
// (public.project_viewers) is checked separately in each area's layout,
// since that needs a DB read this middleware shouldn't do on every request.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const publicAdminPaths = ["/admin/login"];
  if (!user && path.startsWith("/admin") && !publicAdminPaths.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  const publicProjectPaths = ["/projects/login"];
  if (
    !user &&
    path.startsWith("/projects") &&
    !publicProjectPaths.includes(path)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/projects/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/projects/:path*"],
};
