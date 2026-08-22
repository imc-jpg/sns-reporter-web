'use client';

import { useState } from 'react';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';
import MissingFinalWorksPopup from '@/components/MissingFinalWorksPopup';

interface UploadCardProps {
  pendingFinalItems?: any[];
}

export default function UploadCard({ pendingFinalItems = [] }: UploadCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="card motion-card upload-card-bg"
      style={{ 
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '24px', 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%',
        height: '360px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)'
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Default Center State */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isOpen ? 0 : 1,
        transform: isOpen ? 'scale(0.85) translateY(-15px)' : 'scale(1) translateY(0)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'none' : 'auto'
      }}>
        <div className="upload-icon-circle" style={{
          width: '76px', height: '76px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-primary)',
          marginBottom: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          boxShadow: '0 8px 20px rgba(0, 36, 84, 0.08)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <span style={{ fontWeight: 900, color: 'inherit', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>콘텐츠 업로드</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '4px', opacity: 0.85 }}>마우스를 올려 선택</span>
      </div>

      {/* Hovered Options */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'row',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(1.05) translateY(12px)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        padding: '1.5rem 1rem'
      }}>
        {/* Left: 기획안 */}
        <ModalLink href="/proposals/submit" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'inherit', padding: '1rem', borderRadius: '16px', transition: 'background 0.2s' }} className="hover:bg-white/40">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }} className="hover-scale">
            <div className="upload-icon-circle" style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.65)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </div>
            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'inherit', textAlign: 'center', wordBreak: 'keep-all', whiteSpace: 'normal', lineHeight: 1.3, maxWidth: '100%' }}>기획안 작성</span>
          </div>
        </ModalLink>

        {/* Divider */}
        <div style={{ width: '1px', backgroundColor: 'var(--color-border)', margin: '1.5rem 0' }}></div>

        {/* Right: 완성본 */}
        <MissingFinalWorksPopup
          items={pendingFinalItems}
          customTrigger={
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'inherit', width: '100%', height: '100%', cursor: 'pointer', padding: '1rem', borderRadius: '16px', transition: 'background 0.2s' }} className="hover:bg-white/40">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }} className="hover-scale">
                <div className="upload-icon-circle" style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.65)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'inherit', textAlign: 'center', wordBreak: 'keep-all', whiteSpace: 'normal', lineHeight: 1.3, maxWidth: '100%' }}>완성본 제출</span>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
