'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';
import { useModalA11y } from '@/hooks/useModalA11y';

export default function MissingFinalWorksPopup({ items, customTrigger }: { items: any[], customTrigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const popupMouseDownOnBackdrop = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y(panelRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (items.length === 0 && !customTrigger) return null;

  const modalContent = isOpen && mounted ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} 
        onMouseDown={(e) => {
          popupMouseDownOnBackdrop.current = (e.target === e.currentTarget);
        }}
        onClick={(e) => {
          if (popupMouseDownOnBackdrop.current && e.target === e.currentTarget) {
            setIsOpen(false);
          }
          popupMouseDownOnBackdrop.current = false;
        }}
      />
      <div ref={panelRef} tabIndex={-1} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-[90%] max-w-[420px] shadow-2xl z-[10000]">
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
          미제출 완성본 목록
          <button onClick={() => setIsOpen(false)} aria-label="닫기" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none cursor-pointer bg-transparent border-0">&times;</button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
              미제출 완성본이 없습니다.
            </div>
          ) : (
            items.map(item => {
              const calcDDay = (dateStr: string) => {
                if (!dateStr) return null;
                const [y, m, d] = dateStr.split('-');
                const target = new Date(Number(y), Number(m) - 1, Number(d));
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              };

              const formatDDay = (d: number | null) => {
                if (d === null) return '미설정';
                if (d === 0) return 'D-Day';
                if (d < 0) return `D+${Math.abs(d)}`;
                return `D-${d}`;
              };

              const d = calcDDay(item.deadline);
              const itemColor = d !== null && d <= 0 ? '#ef4444' : d !== null && d <= 3 ? '#f59e0b' : '#3b82f6';

              return (
                <ModalLink 
                  key={item.id} 
                  href={`/final-works/submit?id=${item.id}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer text-inherit no-underline"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1 max-w-[65%]">
                      <div title={item.title} className="text-slate-800 dark:text-slate-100 text-xs font-bold truncate">
                        {item.title}
                      </div>
                      {(item.team || item.content_type) && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.team} {item.team && item.content_type ? '·' : ''} {item.content_type}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                        {item.deadline}
                      </span>
                      <span style={{ color: itemColor }} className="text-xs font-black tracking-tight">
                        {formatDDay(d)}
                      </span>
                    </div>
                  </div>
                </ModalLink>
              );
            })
          )}
        </div>
        <div className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          클릭하면 완성본 제출 화면으로 이동합니다.
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {customTrigger ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="미제출 완성본 목록 열기"
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(true); } }}
          style={{ flex: 1, height: '100%', display: 'flex', justifyContent: 'center' }}
        >
          {customTrigger}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`미제출 완성본 ${items.length}건 목록 열기`}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(true); } }}
          style={{ background: '#FEF3C7', borderRadius: '12px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#B45309', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ background: '#F59E0B', color: 'white', borderRadius: '999px', padding: '2px 8px', fontSize: '0.75rem' }}>{items.length}</span>
          미제출 완성본
        </div>
      )}
      {modalContent}
    </>
  );
}

