'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useModalA11y } from '@/hooks/useModalA11y';

const ProposalSubmitForm = dynamic(() => import('@/components/ProposalSubmitForm'), { ssr: false });
const FinalSubmitForm = dynamic(() => import('@/components/FinalSubmitForm'), { ssr: false });
const ContentDetailModal = dynamic(() => import('@/components/ContentDetailModal'), { ssr: false });

interface ModalContextType {
  openProposalModal: (id?: string) => void;
  openFinalWorkModal: (id?: string) => void;
  openContentModal: (id: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);

  const [finalWorkId, setFinalWorkId] = useState<string | null>(null);
  const [isFinalWorkOpen, setIsFinalWorkOpen] = useState(false);

  const [contentId, setContentId] = useState<string | null>(null);
  const [isContentOpen, setIsContentOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openProposalModal = (id?: string) => {
    setProposalId(id || null);
    setIsProposalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const openFinalWorkModal = (id?: string) => {
    setFinalWorkId(id || null);
    setIsFinalWorkOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const openContentModal = (id: string) => {
    setContentId(id);
    setIsContentOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeAllModals = () => {
    setIsProposalOpen(false);
    setIsFinalWorkOpen(false);
    setIsContentOpen(false);
    document.body.style.overflow = 'unset';
  };

  const ModalOverlay = ({ children, onClose }: { children: ReactNode, onClose: () => void }) => {
    const isMouseDownOnBackdrop = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);
    // 2차 감사 9번 — 이 오버레이가 기획안/완성본 작성 모달의 공용 셸이라, 열릴 때
    // Tab이 배경으로 새고 Escape가 안 먹던 버그(브라우저에서 실제 재현 확인)가
    // 여기 한 곳만 고치면 두 모달 모두에 적용된다.
    useModalA11y(panelRef, mounted, onClose);
    if (!mounted) return null;
    return createPortal(
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}
        onMouseDown={(e) => {
          isMouseDownOnBackdrop.current = (e.target === e.currentTarget);
        }}
        onClick={(e) => {
          if (isMouseDownOnBackdrop.current && e.target === e.currentTarget) {
            onClose();
          }
          isMouseDownOnBackdrop.current = false;
        }}
      >
        <div ref={panelRef} tabIndex={-1} style={{ width: '100%', maxWidth: '800px', margin: 'auto', position: 'relative', animation: 'scaleIn 0.2s ease-out' }}>
          <button onClick={onClose} aria-label="닫기" style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
          {children}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <ModalContext.Provider value={{ openProposalModal, openFinalWorkModal, openContentModal, closeAllModals }}>
      {children}

      {isProposalOpen && (
        <ModalOverlay onClose={() => window.dispatchEvent(new Event('request-modal-close'))}>
          <ProposalSubmitForm 
            embeddedId={proposalId || undefined} 
            isModal={true}
            onCancel={closeAllModals} 
            onSuccess={() => { closeAllModals(); window.location.reload(); }} 
          />
        </ModalOverlay>
      )}

      {isFinalWorkOpen && (
        <ModalOverlay onClose={() => window.dispatchEvent(new Event('request-modal-close'))}>
          <FinalSubmitForm 
            initialId={finalWorkId || undefined} 
            onCancel={closeAllModals} 
            onSuccess={() => { closeAllModals(); window.location.reload(); }} 
          />
        </ModalOverlay>
      )}

      {isContentOpen && contentId && (
        <ContentDetailModal
          contentId={Number(contentId)}
          onClose={closeAllModals}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
