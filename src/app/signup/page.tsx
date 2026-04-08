'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name: name,
          team: team
        }
      }
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess('회원가입이 완료되었습니다. 승인 이메일을 확인하거나 로그인 페이지로 이동해주세요.');
    setIsLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>
          회원가입
        </h1>
        
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>이메일 (아이디)</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@yonsei.ac.kr"
              required 
            />
          </div>

          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>이름</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required 
            />
          </div>

          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>소속 팀</label>
            <select 
              value={team} 
              onChange={(e) => setTeam(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.95rem', WebkitAppearance: 'none', appearance: 'none', backgroundColor: 'white' }}
            >
              <option value="" disabled>팀을 선택해주세요</option>
              <option value="유튜브">유튜브</option>
              <option value="인스타">인스타</option>
              <option value="블로그">블로그</option>
              <option value="단장 팀">단장 팀 (기타)</option>
            </select>
          </div>
          
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required 
                minLength={6}
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 0 }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>비밀번호 확인</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={passwordConfirm} 
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required 
                minLength={6}
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 0 }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            {isLoading ? '가입 중...' : '회원가입 완료'}
          </button>
          
          <Link 
            href="/login"
            style={{ 
              display: 'block',
              textAlign: 'center',
              backgroundColor: 'transparent', 
              color: 'var(--color-primary)',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              textDecoration: 'underline'
            }}
          >
            이미 계정이 있으신가요? 로그인하기
          </Link>
        </form>
      </div>
    </div>
  );
}
