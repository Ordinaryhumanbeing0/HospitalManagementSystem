import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'hospital_management_system_super_secret_jwt_key_2026_production';
const key = new TextEncoder().encode(secretKey);

const AUTH_COOKIE_NAME = 'hms_auth_token';

// Paths that require authentication
const PROTECTED_PREFIXES = ['/admin', '/doctor', '/patient', '/receptionist', '/dashboard'];

// Role dashboard redirection mapping
const ROLE_DASHBOARDS: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  DOCTOR: '/doctor/dashboard',
  RECEPTIONIST: '/receptionist/dashboard',
  PATIENT: '/patient/dashboard',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  let sessionUser: { id: string; email: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });
      sessionUser = payload as unknown as { id: string; email: string; role: string };
    } catch {
      // Invalid or expired token
      sessionUser = null;
    }
  }

  // 1. If user is logged in and visits login/register, redirect to their role dashboard
  if (sessionUser && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    const targetDashboard = ROLE_DASHBOARDS[sessionUser.role] || '/patient/dashboard';
    if (pathname !== targetDashboard) {
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
  }

  // 2. Check if current path requires authentication
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedPath) {
    if (!sessionUser) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
      return NextResponse.redirect(loginUrl);
    }

    const { role } = sessionUser;

    // Role-specific routing guards
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      const defaultPath = ROLE_DASHBOARDS[role] || '/login';
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    if (pathname.startsWith('/doctor') && role !== 'DOCTOR' && role !== 'ADMIN') {
      const defaultPath = ROLE_DASHBOARDS[role] || '/login';
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    if (pathname.startsWith('/receptionist') && role !== 'RECEPTIONIST' && role !== 'ADMIN') {
      const defaultPath = ROLE_DASHBOARDS[role] || '/login';
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    if (pathname.startsWith('/patient') && role !== 'PATIENT' && role !== 'ADMIN') {
      const defaultPath = ROLE_DASHBOARDS[role] || '/login';
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
