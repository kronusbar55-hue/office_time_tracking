import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_PATHS: Array<{ prefix: string; allowed: string[] }> = [
  { prefix: '/super-admin', allowed: ['SUPER_ADMIN'] },
  { prefix: '/admin', allowed: ['ADMIN'] },
  { prefix: '/live-attendance', allowed: ['ADMIN'] },
  { prefix: '/employees', allowed: ['ADMIN'] },
  { prefix: '/reports', allowed: ['ADMIN'] },
  { prefix: '/projects', allowed: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { prefix: '/tasks', allowed: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { prefix: '/leaves', allowed: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { prefix: '/check-in-out', allowed: ['MANAGER'] },
  { prefix: '/dashboard', allowed: ['ADMIN', 'MANAGER', 'EMPLOYEE'] }
];

const PUBLIC_PATHS = new Set([
  '/login',
  '/auth/login',
  '/auth/super-admin/login',
  '/register',
  '/forgot-password',
  '/unauthorized'
]);

function parseJwtPayload(token?: string) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    if (payload?.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip middleware for static assets and API
  if (
    pathname.includes('.') || 
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('auth_token')?.value;
  const payload = parseJwtPayload(token);
  const role = payload?.role ?? null;
  const orgId = payload?.orgId ?? null;
  const sessionType = payload?.sessionType ?? null;
  const userStatus = payload?.userStatus ?? null;
  const orgStatus = payload?.orgStatus ?? null;

  // 2. Auth checks
  if (!token || !role) {
     const isSuperAdminRoute = pathname.startsWith('/super-admin');
     const loginPath = isSuperAdminRoute ? '/auth/super-admin/login' : '/login';
     const url = req.nextUrl.clone();
     url.pathname = loginPath;
     return NextResponse.redirect(url);
  }

  // 3. Super Admin Cross-Over Protection
  if (role === 'SUPER_ADMIN' && !pathname.startsWith('/super-admin')) {
      const url = req.nextUrl.clone();
      url.pathname = '/super-admin/dashboard';
      return NextResponse.redirect(url);
  }

  if (role !== 'SUPER_ADMIN' && pathname.startsWith('/super-admin')) {
      const url = req.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/super-admin') && sessionType && sessionType !== 'super-admin') {
    const url = req.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  if (!pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN' && sessionType && sessionType !== 'organization') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 4. Role-based Route Guarding
  const match = ROLE_PATHS.find((p) => pathname.startsWith(p.prefix));
  if (match && !match.allowed.includes(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  // 5. Tenant Isolation (Must have orgId if not Super Admin)
  if (role !== 'SUPER_ADMIN' && !orgId && !pathname.startsWith('/auth')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
  }

  if (role !== 'SUPER_ADMIN' && (userStatus === 'INACTIVE' || userStatus === 'SUSPENDED' || orgStatus === 'INACTIVE' || orgStatus === 'SUSPENDED')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('blocked', '1');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/super-admin/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    '/live-attendance/:path*',
    '/employees/:path*',
    '/reports/:path*',
    '/projects/:path*',
    '/tasks/:path*',
    '/leaves/:path*',
    '/check-in-out/:path*'
  ]
};

