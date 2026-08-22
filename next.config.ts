import type { NextConfig } from "next";

// [B21] CSP 및 보안 헤더 추가
// nonce 없이 next.config.ts headers()에서 정적으로 설정하는 방식 사용
// (공식 docs/content-security-policy.md "Without Nonces" 섹션 참고)
const isDev = process.env.NODE_ENV === 'development';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  img-src 'self' blob: data: https://*.supabase.co;
  font-src 'self' https://cdn.jsdelivr.net;
  connect-src 'self' ${isDev ? 'ws: http: ' : ''}https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com;
  frame-src 'self' https://drive.google.com https://www.youtube.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`;

const nextConfig: NextConfig = {
  // 로컬 와이파이(IP) 및 Cloudflare Tunnel 등 외부 기기 접속 시 Next.js의
  // dev cross-origin 가드가 HMR 및 클라이언트 JS 하이드레이션을 403 차단하지 않도록 허용
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.local",
    "172.24.225.101",
    "172.24.225.101:3000",
    "localhost:3000",
    "localhost",
    "127.0.0.1:3000",
  ],

  async headers() {
    // 개발 모드(next dev)에서는 외부 기기 접속 시 Next.js 핫 리로드 및 클라이언트 청크 로드가
    // CSP에 의해 차단되지 않도록 CSP를 프로덕션 빌드에서만 활성화합니다.
    const headersList: { key: string; value: string }[] = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    if (!isDev) {
      headersList.unshift({
        key: 'Content-Security-Policy',
        value: cspHeader.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim(),
      });
    }

    return [
      {
        source: '/(.*)',
        headers: headersList,
      },
    ];
  },
};

export default nextConfig;
