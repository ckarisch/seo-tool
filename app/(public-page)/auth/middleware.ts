// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token
        },
    }
);

export const config = {
    matcher: [
        '/app/:path*',
        '/api/seo/:path*',
        '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/signin|auth/signup).*)',
    ],
};