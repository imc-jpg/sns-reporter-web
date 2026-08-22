'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface RealtimeToast {
  id: string;
  title: string;
  message: string;
  type: 'feedback' | 'status' | 'comment' | 'submit';
  contentId?: number;
  createdAt: string;
}

interface RealtimeNotificationContextType {
  unreadCount: number;
  toasts: RealtimeToast[];
  removeToast: (id: string) => void;
  markAllRead: () => void;
  requestNotificationPermission: () => Promise<void>;
  notificationPermission: NotificationPermission;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType>({
  unreadCount: 0,
  toasts: [],
  removeToast: () => {},
  markAllRead: () => {},
  requestNotificationPermission: async () => {},
  notificationPermission: 'default',
});

export const useRealtimeNotification = () => useContext(RealtimeNotificationContext);

export function RealtimeNotificationProvider({
  children,
  userEmail,
  userName,
  isAdmin = false,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  userName: string | null;
  isAdmin?: boolean;
}) {
  const [toasts, setToasts] = useState<RealtimeToast[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  }, []);

  const showSystemNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('System notification error:', e);
      }
    }
  }, []);

  const addToast = useCallback((toast: Omit<RealtimeToast, 'id' | 'createdAt'>) => {
    const newToast: RealtimeToast = {
      ...toast,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    setUnreadCount((prev) => prev + 1);

    // 시스템 브라우저 푸시 발송
    showSystemNotification(toast.title, toast.message);

    // 5초 후 토스트 자동 소멸
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5500);
  }, [showSystemNotification]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Supabase Realtime 채널 구독
  useEffect(() => {
    if (!userEmail) return;

    const channel = supabase
      .channel('realtime_contents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contents',
        },
        (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (!newRecord) return;

          // 특수 시스템 레코드는 제외
          if (newRecord.content_type === 'SYSTEM_PROFILE' || newRecord.title === 'SYSTEM_DEADLINES') return;

          let bodyObj: any = {};
          try {
            bodyObj = JSON.parse(newRecord.content_body || '{}');
          } catch {
            bodyObj = {};
          }

          const authorEmail = bodyObj.authorEmail || '';
          const crew = bodyObj.crew || '';
          const isMyContent = userEmail === authorEmail || (userName && crew.includes(userName)) || crew.includes(userEmail);

          // 1. UPDATE 이벤트 처리 (상태 변경 또는 댓글 추가)
          if (eventType === 'UPDATE' && oldRecord) {
            let oldBody: any = {};
            try {
              oldBody = JSON.parse(oldRecord.content_body || '{}');
            } catch {
              oldBody = {};
            }

            const oldDiscussions: any[] = Array.isArray(oldBody.discussions) ? oldBody.discussions : [];
            const newDiscussions: any[] = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];

            // 새 댓글이 달렸는지 확인
            if (newDiscussions.length > oldDiscussions.length) {
              const latestComment = newDiscussions[newDiscussions.length - 1];
              // 내가 작성한 댓글이 아닌 경우에만 알림
              if (latestComment && latestComment.author !== userName && latestComment.authorEmail !== userEmail) {
                if (isMyContent || isAdmin) {
                  addToast({
                    title: `💬 [${newRecord.title || '콘텐츠'}] 새 코멘트`,
                    message: `${latestComment.author || '누군가'}: "${(latestComment.text || '').slice(0, 35)}..."`,
                    type: 'comment',
                    contentId: newRecord.id,
                  });
                }
              }
            }

            // 상태가 변경되었는지 확인
            if (newRecord.status !== oldRecord.status && isMyContent) {
              const statusLabels: Record<string, string> = {
                revision: '기획안 수정 요청 (피드백 확인 필요)',
                approved: '기획안 승인 완료 🎉',
                final_revision: '완성본 수정 요청 (피드백 확인 필요)',
                completed: '완성본 최종 승인 완료 🎬',
                uploaded: '게시 완료 🚀',
              };
              const label = statusLabels[newRecord.status] || `상태 변경: ${newRecord.status}`;
              addToast({
                title: `📢 [${newRecord.title || '콘텐츠'}] 상태 변경`,
                message: label,
                type: 'status',
                contentId: newRecord.id,
              });
            }
          }

          // 2. INSERT 이벤트 처리 (관리자에게 신규 기획안/완성본 등록 알림)
          if (eventType === 'INSERT' && isAdmin && !isMyContent) {
            if (newRecord.status !== 'draft') {
              addToast({
                title: `📝 새로운 콘텐츠 등록`,
                message: `[${newRecord.title || '제목 없음'}] - ${newRecord.author_name || '기자'}`,
                type: 'submit',
                contentId: newRecord.id,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail, userName, isAdmin, addToast, supabase]);

  return (
    <RealtimeNotificationContext.Provider
      value={{
        unreadCount,
        toasts,
        removeToast,
        markAllRead,
        requestNotificationPermission,
        notificationPermission,
      }}
    >
      {children}

      {/* 화면 상단 플로팅 실시간 토스트 렌더러 */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="pointer-events-auto bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/60 backdrop-blur-md flex items-start gap-3 cursor-pointer hover:bg-slate-800 transition-all animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-base font-bold">
              {toast.type === 'comment' ? '💬' : toast.type === 'status' ? '📢' : '📝'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-slate-100 truncate">{toast.title}</div>
              <div className="text-[11px] text-slate-300 font-medium leading-relaxed mt-0.5 line-clamp-2">
                {toast.message}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </RealtimeNotificationContext.Provider>
  );
}
