'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(`비밀번호 변경 실패: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setSuccess('비밀번호가 성공적으로 변경되었습니다! 3초 후 대시보드로 이동합니다.');
    
    setTimeout(() => {
      router.push('/dashboard');
    }, 3000);
    
    setIsLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center', color: 'var(--color-primary)' }}>
          새 비밀번호 설정
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
          새롭게 사용할 비밀번호를 입력해 주세요.
        </p>
        
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

        <form onSubmit={handleUpdate} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>새 비밀번호</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
              minLength={6}
            />
          </div>

          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>새 비밀번호 확인</label>
            <input 
              type="password" 
              value={passwordConfirm} 
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              required 
              minLength={6}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading || !!success} style={{ marginTop: '0.5rem' }}>
            {isLoading ? '처리 중...' : '비밀번호 변경하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
