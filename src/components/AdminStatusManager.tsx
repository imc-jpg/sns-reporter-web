'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AdminStatusManager({ item }: { item: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(item.status);
  const [comment, setComment] = useState(item.feedback_comment || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('contents')
      .update({ status, feedback_comment: comment })
      .eq('id', item.id);
      
    setIsSaving(false);
    
    if (error) {
      alert('오류 발생: ' + error.message);
    } else {
      alert('저장 완료!');
      router.refresh();
    }
  };

  return (
    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
      <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>상태 변경</label>
      <select 
        value={status} 
        onChange={(e) => setStatus(e.target.value)}
        style={{ padding: '0.2rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}
      >
        <option value="pending">대기</option>
        <option value="revision">수정요청</option>
        <option value="approved">기획안 통과</option>
        <option value="completed">최종 검수 완료</option>
      </select>
      
      <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>피드백 코멘트</label>
      <textarea 
        value={comment} 
        onChange={(e) => setComment(e.target.value)} 
        placeholder="피드백 작성..."
        rows={2}
        style={{ padding: '0.2rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}
      />
      
      <button 
        onClick={handleSave} 
        disabled={isSaving}
        style={{ width: '100%', padding: '0.4rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {isSaving ? '저장 중...' : '변경 사항 저장'}
      </button>
    </div>
  );
}
