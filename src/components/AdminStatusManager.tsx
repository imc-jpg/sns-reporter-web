'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'pending', label: '⏳ 기획안 대기' },
  { value: 'revision', label: '✏️ 기획안 수정요청' },
  { value: 'rejected', label: '🚫 반려' },
  { value: 'approved', label: '✅ 기획안 통과' },
  { value: 'final_submitted', label: '🎬 완성본 제출됨' },
  { value: 'final_revision', label: '🛠️ 완성본 수정요청' },
  { value: 'completed', label: '🚀 업로드 대기' },
  { value: 'uploaded', label: '🎉 업로드 완료' },
];

export default function AdminStatusManager({ 
  item, 
  onStatusChange, 
  onDelete 
}: { 
  item: any; 
  onStatusChange?: (newStatus: string) => void;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(item.status);
  const [isSaving, setIsSaving] = useState(false);

  const updateStatus = async (newStatus: string) => {
    if (newStatus === status || isSaving) return;
    setIsSaving(true);
    setStatus(newStatus);

    const { error } = await supabase
      .from('contents')
      .update({ status: newStatus })
      .eq('id', item.id);

    setIsSaving(false);

    if (error) {
      alert('상태 변경 실패: ' + error.message);
      setStatus(item.status);
    } else {
      if (onStatusChange) onStatusChange(newStatus);
      router.refresh();
    }
  };

  const handlePrevStatus = () => {
    if (status === 'uploaded' || status === 'completed') updateStatus('approved');
    else if (status === 'approved' || status === 'final_submitted' || status === 'final_revision') updateStatus('pending');
    else if (status === 'revision' || status === 'rejected') updateStatus('pending');
  };

  const handleNextStatus = () => {
    if (status === 'pending' || status === 'revision' || status === 'rejected') updateStatus('approved');
    else if (status === 'approved' || status === 'final_submitted' || status === 'final_revision') updateStatus('completed');
  };

  return (
    <div style={{
      backgroundColor: 'var(--color-card-bg)',
      borderRadius: '14px',
      border: 'none',
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      {/* Control bar: Left arrow + Dropdown + Right arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
        <button
          type="button"
          onClick={handlePrevStatus}
          disabled={isSaving || status === 'pending'}
          title="이전 단계로 롤백"
          style={{
            border: 'none',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            borderRadius: '6px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isSaving || status === 'pending') ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 800,
            transition: 'all 0.15s',
            opacity: (isSaving || status === 'pending') ? 0.5 : 1
          }}
        >
          ◀
        </button>

        <select
          value={status}
          onChange={(e) => updateStatus(e.target.value)}
          disabled={isSaving}
          style={{
            flex: 1,
            padding: '2px 6px',
            fontSize: '0.78rem',
            fontWeight: 500,
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'var(--input-glass-bg)',
            color: 'var(--color-text-main)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleNextStatus}
          disabled={isSaving || status === 'uploaded' || status === 'completed'}
          title="다음 단계로 승인"
          style={{
            border: 'none',
            backgroundColor: (isSaving || status === 'uploaded' || status === 'completed') ? 'var(--color-surface)' : '#1E3A8A',
            color: (isSaving || status === 'uploaded' || status === 'completed') ? 'var(--color-text-muted)' : 'white',
            borderRadius: '6px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isSaving || status === 'uploaded' || status === 'completed') ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 800,
            transition: 'all 0.15s'
          }}
        >
          ▶
        </button>
      </div>

      {/* Delete button (when provided) */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="이 콘텐츠 삭제"
          style={{
            border: 'none',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#EF4444',
            borderRadius: '6px',
            padding: '0 8px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          삭제
        </button>
      )}
    </div>
  );
}
