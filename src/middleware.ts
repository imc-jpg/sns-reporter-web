import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * [B13] middleware.ts 신설
 * 기존: 미들웨어 없음 → 인증 게이트가 각 페이지마다 산발적·불일치
 * 역할: 세션 쿠키 갱신(refresh) + 미인증 시 /login 리다이렉트
 * admin 권한 검증은 각 서버 컴포넌트에서 별도 처리
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser()로 매 요청마다 서버에서 세션을 검증하고 만료된 세션을 갱신한다.
  // getSession() 대신 getUser()를 사용하는 것이 보안상 올바름.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청에 미들웨어 적용:
     * - _next/static, _next/image (Next.js 내부 자산)
     * - favicon.ico
     * - 공개 라우트: login, signup, forgot-password, reset-password, auth/*
     * - API 라우트: 각 라우트에서 자체 인증 처리
     */
    '/((?!_next/static|_next/image|favicon.ico|login|signup|forgot-password|reset-password|auth|api).*)',
  ],
};
