'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRealtimeNotification } from '@/contexts/RealtimeNotificationContext';
import { useModalA11y } from '@/hooks/useModalA11y';

export default function NotificationsPopup({ userEmail, userName }: { userEmail: string | null, userName: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { unreadCount, markAllRead } = useRealtimeNotification();
  const supabase = createClient();
  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y(panelRef, isOpen, () => setIsOpen(false));

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?t=${new Date().getTime()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
      markAllRead();
    }
  }, [isOpen, fetchFeedbacks, markAllRead]);

  // 최초 로드 시 알림 개수 미리 조회
  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#64748b', display: 'flex' }}
        title="알림"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-6px',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            borderRadius: '9999px',
            border: '2px solid #f1f5f9',
            fontSize: '9px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="animate-in fade-in zoom-in-95 duration-150 ease-out bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden flex flex-col z-50 absolute top-full right-0 mt-2 w-80"
            style={{
              transformOrigin: 'top right'
            }}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-extrabold text-slate-800 dark:text-slate-100 text-sm">
              최근 피드백 알림
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {loading ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">불러오는 중...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">새로운 피드백이 없습니다.</div>
              ) : (
                notifications.map(noti => (
                  <Link 
                    key={noti.id} 
                    href={`/${noti.status?.includes('final') ? 'final-works' : 'proposals'}/submit?id=${noti.id}`}
                    onClick={() => setIsOpen(false)}
                    className="block p-4 border-b border-slate-100 dark:border-slate-800/80 transition-colors bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  >
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{noti.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100 dark:bg-slate-800/80 p-2 rounded-md">
                      💬 {noti.feedback_comment || '상태가 변경되었습니다. 확인해주세요.'}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-right">
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
