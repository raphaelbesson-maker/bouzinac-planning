import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string[]> = {
  '/planning':  ['Admin', 'Atelier'],
  '/simulateur':['Admin', 'ADV'],
  '/adv':       ['Admin', 'ADV'],
  '/portail':   ['Admin', 'ADV', 'Client'],
  '/admin':     ['Admin'],
}

// Role is cached in a short-lived cookie so we skip the DB query on every request.
const ROLE_COOKIE = 'bz_role'
const ROLE_COOKIE_MAX_AGE = 3600 // 1 hour

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl === 'your-supabase-project-url') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() is required by Supabase to prevent session fixation attacks.
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/login')) {
    if (user) {
      // Redirect to the right module based on cached role
      const cachedRole = request.cookies.get(ROLE_COOKIE)?.value
      const home = cachedRole === 'ADV' ? '/adv' : cachedRole === 'Client' ? '/portail' : '/planning'
      const res = NextResponse.redirect(new URL(home, request.url))
      res.cookies.delete(ROLE_COOKIE)
      return res
    }
    return supabaseResponse
  }

  if (!user) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete(ROLE_COOKIE)
    return res
  }

  // Use cached role to skip DB query on every navigation
  let role = request.cookies.get(ROLE_COOKIE)?.value

  if (!role) {
    const { data: operateur } = await supabase
      .from('operateurs')
      .select('role')
      .eq('id', user.id)
      .single()
    role = operateur?.role ?? ''

    // User authenticated but not provisioned in operateurs — sign out to avoid redirect loop
    if (!role) {
      await supabase.auth.signOut()
      const res = NextResponse.redirect(new URL('/login', request.url))
      res.cookies.delete(ROLE_COOKIE)
      return res
    }

    supabaseResponse.cookies.set(ROLE_COOKIE, role, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ROLE_COOKIE_MAX_AGE,
      path: '/',
    })
  }

  // Redirect to the appropriate home module if accessing a forbidden route
  const HOME: Record<string, string> = { Admin: '/planning', Atelier: '/planning', ADV: '/adv', Client: '/portail' }
  const home = HOME[role] ?? '/login'

  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL(home, request.url))
    }
  }

  supabaseResponse.headers.set('x-user-role', role)
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
