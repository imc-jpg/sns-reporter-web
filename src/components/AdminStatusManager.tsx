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
    <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>상태</span>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
          style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '1.8rem', minWidth: '100px' }}
        >
          <option value="pending">대기</option>
          <option value="revision">기정안 수정요청</option>
          <option value="rejected">반려</option>
          <option value="approved">기획안 통과</option>
          <option value="final_submitted">완성본 제출됨</option>
          <option value="final_revision">완성본 수정요청</option>
          <option value="completed">업로드 대기</option>
          <option value="uploaded">업로드 완료</option>
        </select>
      </div>
      
      <textarea 
        value={comment} 
        onChange={(e) => setComment(e.target.value)} 
        placeholder={(status === 'approved' || status === 'completed' || status === 'uploaded') ? '보충/참고 의견 입력...' : '수정 요청/반려 사유 입력...'}
        rows={1}
        style={{ padding: '0.4rem', fontSize: '0.75rem', width: '100%', minHeight: '3rem', resize: 'vertical' }}
      />
      
      <button 
        onClick={handleSave} 
        disabled={isSaving}
        style={{ width: '100%', padding: '0.3rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
      >
        {isSaving ? '저장...' : '저장하기'}
      </button>
    </div>
  );
}
