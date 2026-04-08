'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>
          콘텐츠 검수 시스템
        </h1>
        
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div className="flex-col gap-4">
          <button 
            type="button" 
            onClick={async () => {
              setIsLoading(true);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`
                }
              });
              if (error) {
                setError(error.message);
                setIsLoading(false);
              }
            }}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            구글 계정으로 로그인 (Google)
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
            <hr style={{ flex: 1, borderColor: 'var(--color-border)' }} />
            <span style={{ padding: '0 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>또는</span>
            <hr style={{ flex: 1, borderColor: 'var(--color-border)' }} />
          </div>

          <form onSubmit={handleLogin} className="flex-col gap-4">
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>이메일</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@yonsei.ac.kr"
                required 
              />
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>비밀번호</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
              <Link 
                href="/forgot-password"
                style={{ 
                  color: 'var(--color-primary)', 
                  fontSize: '0.8rem', 
                  textDecoration: 'underline' 
                }}
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
              {isLoading ? '로딩 중...' : '이메일로 로그인'}
            </button>
            
            <Link 
              href="/signup"
              style={{ 
                display: 'block',
                textAlign: 'center',
                color: 'var(--color-primary)',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
                textDecoration: 'underline'
              }}
            >
              기자단 계정이 없으신가요? 이메일로 회원가입
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
