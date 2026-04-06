'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function FinalSubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams?.get('id') || '';
  const supabase = createClient();
  
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState(initialId);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  const [formData, setFormData] = useState({
    finalUrl: '',
    publishDate: '', // 희망 발행일 추가
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSelectable = async () => {
      const { data, error } = await supabase
        .from('contents')
        .select('id, title, author_name')
        .eq('status', 'approved')
        .is('final_url', null);
      
      if (data) {
        setAvailableProposals(data);
      }
      setIsLoadingProps(false);
    };
    fetchSelectable();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposalId) {
      alert("완성본을 제출할 기획안을 선택해주세요.");
      return;
    }
    
    setIsSubmitting(true);
    
    const payload: any = {
      final_url: formData.finalUrl,
      status: 'completed'
    };
    
    // 만약 날짜를 입력했다면 payload에 포함
    if (formData.publishDate) {
      payload.publish_date = formData.publishDate;
    }
    
    const { error } = await supabase
      .from('contents')
      .update(payload)
      .eq('id', selectedProposalId);

    setIsSubmitting(false);

    if (error) {
      alert('오류 발생: ' + error.message);
    } else {
      alert('완성본이 성공적으로 제출되었습니다!');
      router.push('/final-works');
      router.refresh();
    }
  };

  if (isLoadingProps) return <div style={{ padding: '3rem', textAlign: 'center' }}>로딩 중...</div>;

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        새 완성본 작성
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        기안이 통과된 문서 중 하나를 선택하고, 완성된 작업물(URL)과 희망 업로드 날짜를 설정해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="flex-col gap-4">
        <div className="flex-col gap-2">
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>연결할 기획안 선택 <span style={{color: 'red'}}>*</span></label>
          <select 
            value={selectedProposalId} 
            onChange={(e) => setSelectedProposalId(e.target.value)} 
            required 
            style={{ marginBottom: '1rem', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}
          >
            <option value="" disabled>-- 완료할 기획안을 선택하세요 --</option>
            {availableProposals.map(prop => (
              <option key={prop.id} value={prop.id}>
                {prop.title} (작성자: {prop.author_name})
              </option>
            ))}
          </select>
          {availableProposals.length === 0 && (
             <div style={{ fontSize: '0.8rem', color: 'var(--status-revision)' }}>제출 대상인(통과된) 기획안이 없습니다. 대시보드에서 상태를 변경해주세요.</div>
          )}
        </div>

        <div className="flex-col gap-2">
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>완성본 링크 (URL) <span style={{color: 'red'}}>*</span></label>
          <input 
            type="url" 
            name="finalUrl"
            value={formData.finalUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
            placeholder="https://drive.google.com/... 또는 https://instagram.com/..." 
            required 
          />
        </div>
        
        <div className="flex-col gap-2">
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>희망 발행일 (선택사항)</label>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.2rem' }}>해당 콘텐츠가 SNS에 업로드 되었으면 하는 날짜를 지정해주시면 대시보드 캘린더에 표시됩니다.</p>
          <input 
            type="date" 
            name="publishDate"
            value={formData.publishDate}
            onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
            style={{ padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => router.back()} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', fontWeight: 600 }}>
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting || availableProposals.length === 0} style={{ flex: 2 }}>
            {isSubmitting ? '제출 중...' : '완성본 제출완료'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FinalSubmitForm />
    </Suspense>
  );
}
