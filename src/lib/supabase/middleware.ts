import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000); // 2-second timeout

    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(id));
  };

  const supabase = createServerClient(url, anonKey, {
    global: {
      fetch: customFetch,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error('Supabase middleware auth check failed:', error);
  }
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
