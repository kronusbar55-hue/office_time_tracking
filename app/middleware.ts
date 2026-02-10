import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Minimal RBAC middleware for UI routing. This reads the JWT payload (without signature verification)
// to determine role and redirect users attempting to access restricted routes. API routes still
// perform full authorization server-side.

const ROLE_PATHS: Array<{ prefix: string; allowed: string[] }> = [
  { prefix: '/admin', allowed: ['admin'] },
  { prefix: '/employees', allowed: ['admin', 'hr'] },
  { prefix: '/reports', allowed: ['admin', 'hr'] },
  { prefix: '/projects', allowed: ['admin', 'manager', 'employee'] },
  { prefix: '/tasks', allowed: ['admin', 'manager', 'employee'] },
  { prefix: '/leaves', allowed: ['admin', 'hr', 'manager', 'employee'] }
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
  matcher: ['/(admin|employees|reports|projects|tasks|leaves)(/:path*)']
};
