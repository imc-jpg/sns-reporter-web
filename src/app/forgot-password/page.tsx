'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일함을 확인해주세요.');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center', color: 'var(--color-primary)' }}>
          비밀번호 찾기
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
          가입하신 이메일 주소를 입력하시면 비밀번호를 재설정할 수 있는 링크를 보내드립니다.
        </p>
        
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>이메일</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="가입 시 사용한 이메일 입력"
              required 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            {isLoading ? '전송 중...' : '비밀번호 재설정 링크 받기'}
          </button>
          
          <Link 
            href="/login"
            style={{ 
              display: 'block',
              textAlign: 'center',
              backgroundColor: 'transparent', 
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              textDecoration: 'underline'
            }}
          >
            로그인 화면으로 돌아가기
          </Link>
        </form>
      </div>
    </div>
  );
}
