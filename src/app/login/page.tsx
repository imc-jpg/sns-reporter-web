'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

const floatingItems = [
  { emoji: '📸', top: '8%', left: '6%', delay: '0s', size: '2rem' },
  { emoji: '🎬', top: '15%', right: '8%', delay: '0.5s', size: '1.8rem' },
  { emoji: '✨', top: '55%', left: '4%', delay: '1s', size: '1.5rem' },
  { emoji: '🎨', bottom: '20%', right: '6%', delay: '0.3s', size: '1.7rem' },
  { emoji: '💡', bottom: '35%', left: '7%', delay: '0.8s', size: '1.6rem' },
  { emoji: '🚀', top: '40%', right: '5%', delay: '1.2s', size: '1.5rem' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (email === 'admin' && password === '0000') {
      window.location.href = '/dashboard?admin=true';
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(-3deg); }
          66% { transform: translateY(-6px) rotate(3deg); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .google-btn:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 32px rgba(0, 52, 121, 0.4) !important;
        }
        .google-btn:active {
          transform: translateY(-1px) !important;
        }
        .email-form-wrapper {
          animation: slideDown 0.25s ease-out;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #c8d8f8 0%, #dce8ff 30%, #e8f0fe 55%, #d4e4ff 80%, #b8cfff 100%)',
        backgroundSize: '300% 300%',
        animation: 'gradientShift 10s ease infinite',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* 배경 장식 원 */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-80px',
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,52,121,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,52,121,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 플로팅 이모지 */}
        {floatingItems.map((item, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: item.top,
            bottom: (item as any).bottom,
            left: item.left,
            right: (item as any).right,
            fontSize: item.size,
            animation: `float 4s ease-in-out infinite`,
            animationDelay: item.delay,
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.75,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
          }}>
            {item.emoji}
          </div>
        ))}

        <div style={{
          width: '100%',
          maxWidth: '420px',
          padding: '0 1.25rem',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* 카드 */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '2.5rem 2.25rem',
            boxShadow: '0 8px 40px rgba(0,52,121,0.15), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(255,255,255,0.9)',
          }}>

            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>🦅</div>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: '#0f172a',
                marginBottom: '0.4rem',
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
              }}>
                SNS기자단{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #003479, #4f7de0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  기획안 관리
                </span>
              </h1>
              <p style={{
                fontSize: '0.8rem',
                color: '#64748b',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}>
                <span>📍</span> 연세대학교 미디어센터
              </p>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fff1f2', color: '#e11d48',
                padding: '0.75rem 1rem', borderRadius: '12px',
                marginBottom: '1.25rem', fontSize: '0.82rem',
                border: '1px solid #fecdd3', fontWeight: 600,
              }}>
                😅 {error}
              </div>
            )}

            {/* ─── 구글 로그인 (PRIMARY) ─── */}
            <div style={{ marginBottom: '1.5rem' }}>


              <button
                type="button"
                className="google-btn"
                onClick={async () => {
                  setIsLoading(true);
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: `${window.location.origin}/auth/callback` }
                  });
                  if (error) { setError(error.message); setIsLoading(false); }
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.9rem',
                  width: '100%',
                  padding: '1.05rem 1.25rem',
                  background: 'linear-gradient(135deg, #003479 0%, #1a56c4 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: 800, fontSize: '1rem',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,52,121,0.3)',
                  transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  letterSpacing: '-0.01em',
                }}
              >
                <div style={{
                  width: '32px', height: '32px',
                  backgroundColor: 'white', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                Google 계정으로 로그인
              </button>

              <p style={{
                textAlign: 'center', fontSize: '0.72rem', color: '#64748b',
                marginTop: '0.6rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              }}>
                <span>✅</span> 연세대 계정 사용 시 자동 연동
              </p>
            </div>

            {/* ─── 이메일 로그인 토글 ─── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px dashed #cbd5e1' }} />
              <button
                type="button"
                onClick={() => setShowEmailForm(!showEmailForm)}
                style={{
                  padding: '0.3rem 0.9rem',
                  background: 'transparent',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '99px',
                  fontSize: '0.7rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#003479'; e.currentTarget.style.color = '#003479'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                {showEmailForm ? '닫기 ↑' : '이메일로 로그인 ↓'}
              </button>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px dashed #cbd5e1' }} />
            </div>

            {/* ─── 이메일 폼 (접힘) ─── */}
            {showEmailForm && (
              <form onSubmit={handleLogin} className="email-form-wrapper" style={{
                display: 'flex', flexDirection: 'column', gap: '0.7rem',
                backgroundColor: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1.5px solid #e9eef5',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>이메일 또는 관리자 ID</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@yonsei.ac.kr"
                    style={{
                      padding: '0.6rem 0.8rem', fontSize: '0.85rem',
                      borderRadius: '8px', border: '1.5px solid #e2e8f0',
                      backgroundColor: 'white', outline: 'none',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      padding: '0.6rem 0.8rem', fontSize: '0.85rem',
                      borderRadius: '8px', border: '1.5px solid #e2e8f0',
                      backgroundColor: 'white', outline: 'none',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Link href="/forgot-password" style={{ color: '#94a3b8', fontSize: '0.68rem', textDecoration: 'underline' }}>
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '0.65rem', fontSize: '0.85rem', fontWeight: 700,
                    backgroundColor: '#e2e8f0', color: '#334155',
                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#cbd5e1'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                >
                  {isLoading ? '로딩 중...' : '이메일로 로그인'}
                </button>

                <Link href="/signup" style={{
                  display: 'block', textAlign: 'center',
                  color: '#94a3b8', fontSize: '0.7rem', textDecoration: 'underline',
                }}>
                  기자단 계정이 없으신가요? 회원가입
                </Link>
              </form>
            )}
          </div>

          {/* 하단 */}
          <p style={{ textAlign: 'center', color: '#6b8ccc', fontSize: '0.72rem', marginTop: '1.25rem', fontWeight: 500 }}>
            🎓 연세대학교 미디어센터 SNS기자단 전용 시스템
          </p>
        </div>
      </div>
    </>
  );
}
