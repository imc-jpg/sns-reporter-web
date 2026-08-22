'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { cleanAuthorName } from '@/utils/dateUtils';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    team: '',
    gen: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // DB 백업에서 최우선으로 가져오기
        const { data: profile } = await supabase.from('contents').select('team, author_name, keywords').eq('title', `PROFILE_${user.email}`).single();
        const rawName = profile?.author_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
        
        setFormData({
          name: cleanAuthorName(rawName),
          team: profile?.team || user.user_metadata?.team || '',
          gen: profile?.keywords || user.user_metadata?.gen || ''
        });
      }
      setIsLoading(false);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'USER_UPDATED' || event === 'SIGNED_IN')) {
        setFormData(prev => ({
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || prev.name,
          team: session.user.user_metadata?.team || prev.team,
          gen: session.user.user_metadata?.gen || prev.gen
        }));
      }
    });

    return () => authListener?.subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: formData.name,
        name: formData.name,
        team: formData.team,
        gen: formData.gen
      }
    });

    if (error) {
      setMessage(`저장 실패: ${error.message}`);
    } else {
      // 로컬 스토리지에 이중 백업 (구글 초기화 방어용)
      if (user?.email) {
        localStorage.setItem(`team_${user.email}`, formData.team);
        localStorage.setItem(`name_${user.email}`, formData.name);

        // 중앙 DB에 백업하여 다른 컴퓨터 로그인 대응
        const title = `PROFILE_${user.email}`;
        const { data: existing } = await supabase.from('contents').select('id').eq('title', title).single();
        const payload = {
          title: title,
          author_name: formData.name,
          team: formData.team,
          keywords: formData.gen,
          content_type: 'SYSTEM_PROFILE',
          description: user.email,
          status: 'system'
        };
        
        if (existing) {
          await supabase.from('contents').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('contents').insert([payload]);
        }
      }

      setMessage('프로필 설정이 성공적으로 저장되었습니다!');
      router.refresh();
      
      // 메시지 지우기
      setTimeout(() => setMessage(''), 3000);
    }
    setIsSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'gen') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>데이터 불러오는 중...</div>;
  }

  return (
    <div className="animate-enter" style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--color-text-heading)', letterSpacing: '-0.02em' }}>내 프로필 설정</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.75rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
        최초 1회 설정이 필요합니다. 이름과 소속 팀을 저장해 두시면 기획안 작성 시 자동으로 채워지며, 진행 현황을 파악하기 위해 반드시 기입해야 합니다.
      </p>

      {message && (
        <div style={{ padding: '0.9rem 1.25rem', backgroundColor: message.includes('실패') ? 'rgba(254, 242, 242, 0.9)' : 'rgba(240, 253, 244, 0.9)', backdropFilter: 'blur(8px)', color: message.includes('실패') ? '#EF4444' : '#15803D', borderRadius: '14px', marginBottom: '1.5rem', fontWeight: 700, fontSize: '0.88rem', border: message.includes('실패') ? '1px solid rgba(254, 202, 202, 0.8)' : '1px solid rgba(187, 247, 208, 0.8)' }}>
          {message}
        </div>
      )}

      <div className="card motion-card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="flex flex-col gap-2" style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)' }}>기수</label>
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                name="gen" 
                value={formData.gen} 
                onChange={handleChange} 
                placeholder="예: 24" 
                required 
                style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div className="flex flex-col gap-2" style={{ flex: 3 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)' }}>이름 (기자단 활동명)</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="예: 홍길동" 
                required 
                style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)' }}>소속 팀</label>
            <select 
              name="team" 
              value={formData.team} 
              onChange={handleChange} 
              required 
              style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: '12px', backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)', fontSize: '0.9rem', width: '100%', outline: 'none' }}
            >
              <option value="" disabled>-- 팀 선택 --</option>
              <option value="유튜브">유튜브</option>
              <option value="인스타">인스타</option>
              <option value="블로그">블로그</option>
              <option value="단장 팀">단장 팀</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="motion-btn" 
            disabled={isSaving} 
            style={{ marginTop: '0.75rem', padding: '0.85rem', borderRadius: '14px', backgroundColor: '#002454', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0, 36, 84, 0.15)' }}
          >
            {isSaving ? '저장 중...' : '프로필 저장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
