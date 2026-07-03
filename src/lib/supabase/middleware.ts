import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.includes("/login") || pathname.includes("/signup");
  const isProtected =
    pathname.includes("/dashboard") ||
    pathname.includes("/scanner") ||
    pathname.includes("/settings");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.split("/")[1]
      ? `/${pathname.split("/")[1]}/login`
      : "/fr/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const locale = pathname.split("/")[1] ?? "fr";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
