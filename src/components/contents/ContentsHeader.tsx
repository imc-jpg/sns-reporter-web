'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ContentsHeaderProps {
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  filterByMine: boolean;
  onFilterByMineChange: (mine: boolean) => void;
  selectedForDeleteCount: number;
  onDeleteSelected: () => void;
  onOpenDrafts: () => void;
  onOpenNewFinalModal: () => void;
  pageTitle?: string;
  isTraineeMode?: boolean;
  selectedGen?: string;
  onGenChange?: (gen: string) => void;
}

export default function ContentsHeader({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  filterType,
  onFilterTypeChange,
  filterByMine,
  onFilterByMineChange,
  selectedForDeleteCount,
  onDeleteSelected,
  onOpenDrafts,
  onOpenNewFinalModal,
  pageTitle,
  isTraineeMode = false,
  selectedGen = '25기',
  onGenChange
}: ContentsHeaderProps) {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const handlePrevMonth = () => {
    let m = selectedMonth - 1;
    let y = selectedYear;
    if (m < 1) { m = 12; y--; }
    onMonthChange(m);
    onYearChange(y);
  };

  const handleNextMonth = () => {
    let m = selectedMonth + 1;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    onMonthChange(m);
    onYearChange(y);
  };

  const handlePrev = () => {
    if (isTraineeMode && onGenChange) {
      const gens = ['25기', '26기', '27기', 'ALL'];
      const idx = gens.indexOf(selectedGen);
      const prevIdx = idx > 0 ? idx - 1 : gens.length - 1;
      onGenChange(gens[prevIdx]);
    } else {
      handlePrevMonth();
    }
  };

  const handleNext = () => {
    if (isTraineeMode && onGenChange) {
      const gens = ['25기', '26기', '27기', 'ALL'];
      const idx = gens.indexOf(selectedGen);
      const nextIdx = idx < gens.length - 1 ? idx + 1 : 0;
      onGenChange(gens[nextIdx]);
    } else {
      handleNextMonth();
    }
  };

  const titleText = isTraineeMode 
    ? (selectedGen === 'ALL' ? '전체 수습 단원 콘텐츠' : `${selectedGen} 수습 단원 콘텐츠`)
    : (pageTitle ? `${pageTitle} (${selectedMonth}월)` : `${selectedMonth}월 콘텐츠 목록`);

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: 'var(--color-card-bg)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--color-border)',
      position: 'relative',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      {/* Left: Month Navigation & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button"
            onClick={handlePrev}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
            title="이전"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          <div style={{ position: 'relative' }}>
            <h2 
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="typo-h1"
              style={{ margin: 0, whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-heading)' }}
            >
              {titleText}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showMonthDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </h2>
            
            {/* Dropdown Grid (Month or Generation) */}
            {showMonthDropdown && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMonthDropdown(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '12px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--color-card-shadow)', zIndex: 50, width: '240px' }}>
                  {isTraineeMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {['25기', '26기', '27기', 'ALL'].map(gen => (
                        <button
                          key={gen}
                          type="button"
                          onClick={() => {
                            if (onGenChange) onGenChange(gen);
                            setShowMonthDropdown(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            border: 'none',
                            borderRadius: '10px',
                            backgroundColor: selectedGen === gen ? 'var(--color-primary, #1e3a8a)' : 'transparent',
                            color: selectedGen === gen ? 'white' : 'var(--color-text-main)',
                            fontWeight: selectedGen === gen ? 700 : 500,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{gen === 'ALL' ? '전체 수습기수 보기' : `${gen} 수습 단원`}</span>
                          {selectedGen === gen && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <button 
                          type="button"
                          onClick={() => onYearChange(selectedYear - 1)}
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', borderRadius: '8px', padding: '6px', display: 'flex' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <div className="typo-h2" style={{ margin: 0, color: 'var(--color-text-heading)' }}>{selectedYear}년</div>
                        <button 
                          type="button"
                          onClick={() => onYearChange(selectedYear + 1)}
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', borderRadius: '8px', padding: '6px', display: 'flex' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[...Array(12)].map((_, i) => {
                          const m = i + 1;
                          const isSelected = selectedMonth === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                onMonthChange(m);
                                setShowMonthDropdown(false);
                              }}
                              style={{
                                padding: '10px 0',
                                border: 'none',
                                borderRadius: '10px',
                                backgroundColor: isSelected ? 'var(--color-primary, #1e3a8a)' : 'transparent',
                                color: isSelected ? 'white' : 'var(--color-text-main)',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface)' }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                              {m}월
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <button 
            type="button"
            onClick={handleNext}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
            title="다음"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <select 
          value={filterType} 
          onChange={(e) => onFilterTypeChange(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none', backgroundColor: 'var(--input-glass-bg)', fontWeight: 600, color: 'var(--color-text-main)' }}
        >
          <option value="ALL">ALL</option>
          <option value="유튜브">유튜브</option>
          <option value="인스타">인스타</option>
          <option value="블로그">블로그</option>
        </select>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input 
            type="checkbox" 
            checked={filterByMine} 
            onChange={(e) => onFilterByMineChange(e.target.checked)} 
            style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
          />
          내 콘텐츠만 보기
        </label>
      </div>

      {/* Right: Actions Toolbar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {selectedForDeleteCount > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            title="선택된 항목 삭제"
            style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        )}
        <button 
          type="button"
          onClick={onOpenDrafts}
          title="통합 임시저장함"
          style={{ backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        </button>
        <Link 
          href="/proposals/submit" 
          style={{ backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
        >
          + 새 기획안
        </Link>
        <button 
          type="button"
          onClick={onOpenNewFinalModal}
          style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
        >
          + 새 완성본
        </button>
      </div>
    </div>
  );
}
