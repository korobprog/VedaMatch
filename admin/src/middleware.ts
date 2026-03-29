import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  buildVedamatchUrl,
  isPanelRoute,
  isPublicPortalPath,
  isSocialAuthPath,
  resolveVedamatchSurface,
} from './lib/vedamatch-hosts';

export function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.hostname;
  const surface = resolveVedamatchSurface(host);
  const { pathname, search } = request.nextUrl;

  if (surface === 'local' || surface === 'unknown' || surface === 'lkm') {
    return NextResponse.next();
  }

  if (surface === 'portal') {
    if (pathname === '/') {
      return NextResponse.redirect(buildVedamatchUrl(host, 'panel', '/admin-login', search));
    }
    if (isSocialAuthPath(pathname)) {
      return NextResponse.redirect(buildVedamatchUrl(host, 'social', pathname, search));
    }
    if (pathname === '/admin-login' || isPanelRoute(pathname)) {
      return NextResponse.redirect(buildVedamatchUrl(host, 'panel', pathname, search));
    }
    return NextResponse.next();
  }

  if (surface === 'social') {
    if (pathname === '/') {
      return NextResponse.redirect(buildVedamatchUrl(host, 'social', '/login', search));
    }
    if (isSocialAuthPath(pathname)) {
      return NextResponse.next();
    }
    if (pathname === '/admin-login' || isPanelRoute(pathname)) {
      return NextResponse.redirect(buildVedamatchUrl(host, 'panel', pathname === '/admin-login' ? '/admin-login' : pathname, search));
    }
    return NextResponse.redirect(buildVedamatchUrl(host, 'admin', pathname, search));
  }

  if (surface === 'panel') {
    if (pathname === '/') {
      return NextResponse.redirect(buildVedamatchUrl(host, 'panel', '/dashboard', search));
    }
    if (pathname === '/login') {
      return NextResponse.redirect(buildVedamatchUrl(host, 'panel', '/admin-login', search));
    }
    if (pathname === '/register') {
      return NextResponse.redirect(buildVedamatchUrl(host, 'social', pathname, search));
    }
    if (isPublicPortalPath(pathname)) {
      return NextResponse.redirect(buildVedamatchUrl(host, 'admin', pathname, search));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|.*\\.(?:png|jpg|jpeg|webp|svg|ico|css|js|map)$).*)'],
};
