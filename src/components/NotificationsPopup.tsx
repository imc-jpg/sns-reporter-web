'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function NotificationsPopup({ userEmail, userName }: { userEmail: string | null, userName: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const isAdminUrl = urlParams.get('admin') === 'true';
      const isBypass = sessionStorage.getItem('isAdminBypass') === 'true';
      const currentIsAdmin = isAdminUrl || isBypass;
      setIsAdmin(currentIsAdmin);

      const fetchFeedbacks = async () => {
        try {
          // 캐싱 방지를 위해 timestamp 추가
          const res = await fetch(`/api/notifications?t=${new Date().getTime()}${currentIsAdmin ? '&admin=true' : ''}`);
          if (res.ok) {
            const data = await res.json();
            
            // 관리자 모드일 경우: 자신이 참여한 것은 이미 포함되어 있고, 만약 어드민 권한으로 더 보고 싶다면 
            // 여기서 API 파라미터로 처리할 수 있으나, 유저 요청에 따라 '내가 포함/작성한 것'만 띄우도록 합니다.
            setNotifications(data.notifications || []);
          } else {
            setNotifications([]);
          }
        } catch (error) {
          console.error("Failed to fetch notifications", error);
          setNotifications([]);
        }
        setLoading(false);
      };
      fetchFeedbacks();
    }
  }, [isOpen]);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#64748b', display: 'flex' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid #f1f5f9' }}></span>
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div style={{ 
            position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', 
            backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
            border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', display: 'flex', flexDirection: 'column' 
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#1e293b' }}>
              최근 피드백 알림
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>불러오는 중...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>새로운 피드백이 없습니다.</div>
              ) : (
                notifications.map(noti => (
                  <Link 
                    key={noti.id} 
                    href={`/${noti.status?.includes('final') ? 'final-works' : 'proposals'}/submit?id=${noti.id}`}
                    onClick={() => setIsOpen(false)}
                    style={{ 
                      display: 'block', padding: '1rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>{noti.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      💬 {noti.feedback_comment || '상태가 변경되었습니다. 확인해주세요.'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '0.5rem', textAlign: 'right' }}>
                      {new Date(noti.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
