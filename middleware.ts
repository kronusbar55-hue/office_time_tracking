import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Minimal RBAC middleware for UI routing. This reads the JWT payload (without signature verification)
// to determine role and redirect users attempting to access restricted routes. API routes still
// perform full authorization server-side.

const ROLE_PATHS: Array<{ prefix: string; allowed: string[] }> = [
  { prefix: '/dashboard/super-admin', allowed: ['super-admin'] },
  { prefix: '/auth/super-admin/admins', allowed: ['super-admin'] },
  { prefix: '/dashboard/admin', allowed: ['admin', 'super-admin'] },
  { prefix: '/dashboard/manager', allowed: ['manager', 'admin', 'super-admin'] },
  { prefix: '/admin', allowed: ['admin', 'super-admin'] },
  { prefix: '/live-attendance', allowed: ['admin', 'hr', 'super-admin'] },
  { prefix: '/employees', allowed: ['admin', 'hr', 'super-admin'] },
  { prefix: '/monitor', allowed: ['admin', 'manager', 'employee', 'hr', 'super-admin'] },
  { prefix: '/technologies', allowed: ['admin', 'hr', 'super-admin'] },
  { prefix: '/project-updates', allowed: ['admin', 'manager', 'super-admin'] },
  { prefix: '/reports', allowed: ['admin', 'hr', 'super-admin'] },
  { prefix: '/projects', allowed: ['admin', 'manager', 'employee', 'super-admin'] },
  { prefix: '/tasks', allowed: ['admin', 'manager', 'employee', 'super-admin'] },
  { prefix: '/leaves', allowed: ['admin', 'hr', 'manager', 'employee', 'super-admin'] },
  { prefix: '/check-in-out', allowed: ['manager', 'admin', 'super-admin'] }
];

function parseJwtPayload(token?: string) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload;
  } catch (e) {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // only protect certain prefixes
  const match = ROLE_PATHS.find((p) => pathname.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  const payload = parseJwtPayload(token);
  const role = payload?.role ?? null;

  if (!role || !match.allowed.includes(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/live-attendance/:path*',
    '/monitor/:path*',
    '/technologies/:path*',
    '/project-updates/:path*',
    '/employees/:path*',
    '/reports/:path*',
    '/projects/:path*',
    '/tasks/:path*',
    '/leaves/:path*',
    '/check-in-out/:path*',
    '/auth/super-admin/admins/:path*'
  ]
};
