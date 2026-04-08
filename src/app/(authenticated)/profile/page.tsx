'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
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
        
        setFormData({
          name: profile?.author_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>데이터 불러오는 중...</div>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>내 프로필 설정</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        최초 1회 설정이 필요합니다. 이름과 소속 팀을 저장해 두시면 기획안 작성 시 자동으로 채워지며, 진행 현황을 파악하기 위해 반드시 기입해야 합니다.
      </p>

      {message && (
        <div style={{ padding: '1rem', backgroundColor: message.includes('실패') ? '#fee2e2' : '#dcfce7', color: message.includes('실패') ? '#ef4444' : '#15803d', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="flex-col gap-2" style={{ flex: 1 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>기수</label>
              <input 
                type="number" 
                name="gen" 
                value={formData.gen} 
                onChange={handleChange} 
                placeholder="예: 24" 
                required 
              />
            </div>
            <div className="flex-col gap-2" style={{ flex: 3 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>이름 (기자단 활동명)</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="예: 홍길동" 
                required 
              />
            </div>
          </div>
          
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>소속 팀</label>
            <select 
              name="team" 
              value={formData.team} 
              onChange={handleChange} 
              required 
              style={{ padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', width: '100%' }}
            >
              <option value="" disabled>-- 팀 선택 --</option>
              <option value="유튜브">유튜브</option>
              <option value="인스타">인스타</option>
              <option value="블로그">블로그</option>
              <option value="단장 팀">단장 팀</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={isSaving} style={{ marginTop: '1rem' }}>
            {isSaving ? '저장 중...' : '프로필 저장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
