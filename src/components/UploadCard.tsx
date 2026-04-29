'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function UploadCard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      style={{ 
        background: '#C0CFE4', /* 파란색 1.5단계 */
        borderRadius: '16px', 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '240px',
        position: 'relative',
        overflow: 'hidden',
        cursor: isOpen ? 'default' : 'pointer',
        transition: 'all 0.3s ease'
      }}
      onClick={() => !isOpen && setIsOpen(true)}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isOpen ? 0 : 1,
        transform: isOpen ? 'scale(0.8) translateY(-20px)' : 'scale(1) translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'none' : 'auto'
      }}>
        <div style={{ 
          width: '72px', height: '72px', borderRadius: '50%', 
          border: '1.5px solid #99B3D6', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '2.5rem', fontWeight: 300, color: '#99B3D6',
          marginBottom: '1rem',
          backgroundColor: 'transparent'
        }}>
          +
        </div>
        <span style={{ fontWeight: 700, color: '#003378', fontSize: '1rem' }}>업로드</span>
      </div>

      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'row',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(1.05) translateY(10px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        padding: '2rem 1rem'
      }}>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: 'none', border: 'none', fontSize: '1.2rem', color: '#003378', cursor: 'pointer', padding: '0.5rem', opacity: 0.5, zIndex: 10 }}
        >
          ✕
        </button>

        {/* Left: 기획안 */}
        <Link href="/proposals/submit" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#003378' }} className="hover-scale">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.6 }}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', opacity: 0.7 }}>기획안</span>
        </Link>

        {/* Divider */}
        <div style={{ width: '1.5px', backgroundColor: '#003378', opacity: 0.15, margin: '1rem 0' }}></div>

        {/* Right: 완성본 */}
        <Link href="/final-works/submit" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#003378' }} className="hover-scale">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.6 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', opacity: 0.7 }}>완성본</span>
        </Link>
      </div>
    </div>
  );
}
