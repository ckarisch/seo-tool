import type { NextRequest } from 'next/server'
import { withAuth } from "next-auth/middleware"

export function middleware(request: NextRequest) {
  const currentUser = request.cookies.get('next-auth.session-token')?.value
  const currentUserSecure = request.cookies.get('__Secure-next-auth.session-token')?.value

  // if (currentUser && !request.nextUrl.pathname.startsWith('/app')) {
  //   return Response.redirect(new URL('/app', request.url))
  // }

  if (!currentUser && !currentUserSecure && request.nextUrl.pathname.startsWith('/app') && !request.nextUrl.pathname.startsWith('/api/auth/signin')) {
    return Response.redirect(new URL('/api/auth/signin', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}

// middleware is applied to all routes, use conditionals to select
