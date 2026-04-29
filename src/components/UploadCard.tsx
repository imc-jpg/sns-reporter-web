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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(1.1) translateY(20px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'auto' : 'none'
      }}>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', color: '#99B3D6', cursor: 'pointer', padding: '0.5rem' }}
        >
          ✕
        </button>
        <Link href="/proposals/submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '75%', padding: '0.85rem', backgroundColor: '#003378', color: 'white', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', transition: 'transform 0.2s', fontSize: '0.95rem' }} className="hover-scale">
          기획안 제출
        </Link>
        <Link href="/final-works/submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '75%', padding: '0.85rem', backgroundColor: '#002454', color: 'white', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', transition: 'transform 0.2s', fontSize: '0.95rem' }} className="hover-scale">
          완성본 제출
        </Link>
      </div>
    </div>
  );
}
