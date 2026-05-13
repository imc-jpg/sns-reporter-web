'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

type ContentItem = {
  id: number;
  title: string;
  author_name: string;
  team: string;
  content_type: string;
  status: string;
  created_at: string;
  isMine: boolean;
  parsedCrew: string;
  articleType: string;
  docsUrl: string;
  targetMonth: string;
  finalSubmittedAt: string;
  content_body: string;
};

export default function ContentsLayout({ 
  initialContents, 
  currentUserEmail, 
  currentUserName 
}: { 
  initialContents: ContentItem[], 
  currentUserEmail: string | null,
  currentUserName: string | null
}) {
  const [filterType, setFilterType] = useState('ALL');
  const [filterByMine, setFilterByMine] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-');
    const d = new Date(Number(y), Number(m) - 2);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-');
    const d = new Date(Number(y), Number(m));
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const displayContents = useMemo(() => {
    let filtered = initialContents;
    if (filterByMine) {
      filtered = filtered.filter(item => item.isMine);
    }
    if (filterType !== 'ALL') {
      filtered = filtered.filter(item => item.content_type === filterType || item.team === filterType);
    }

    filtered = filtered.filter(item => {
      let monthStr = item.targetMonth;
      if (!monthStr) {
        const d = new Date(item.created_at);
        monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return monthStr === currentMonth;
    });

    return filtered;
  }, [initialContents, filterByMine, filterType, currentMonth]);

  const getTypeStyle = (typeStr: string) => {
    switch(typeStr) {
      case '영상(롱폼)': return { bg: '#1e3a8a', text: '#ffffff', label: '롱폼' };
      case '영상(숏폼)': return { bg: '#2563eb', text: '#ffffff', label: '숏폼' };
      case '카드뉴스': return { bg: '#0284c7', text: '#ffffff', label: '카드뉴스' };
      case '글 기사': 
      case '기사': return { bg: '#16a34a', text: '#ffffff', label: '기사' };
      default: return { bg: '#64748b', text: '#ffffff', label: typeStr || '기타' };
    }
  };

  const getTeamPlatformIcon = (team: string) => {
    if (team === '유튜브') {
      return (
        <svg fill="#ef4444" viewBox="0 0 24 24" width="20" height="20">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    }
    if (team === '인스타') {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
          <defs>
            <linearGradient id="instaList" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="25%" stopColor="#e6683c" />
                <stop offset="50%" stopColor="#dc2743" />
                <stop offset="75%" stopColor="#cc2366" />
                <stop offset="100%" stopColor="#bc1888" />
            </linearGradient>
          </defs>
          <path fill="url(#instaList)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      );
    }
    if (team === '블로그') {
      return (
        <div style={{ width: '20px', height: '20px', backgroundColor: '#03c75a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif', marginTop: '-2px' }}>b</span>
        </div>
      );
    }
    return <div style={{ width: '20px', height: '20px', backgroundColor: '#94a3b8', borderRadius: '4px' }}></div>;
  };

  const getProgressState = (status: string) => {
    // Return array of 3 for: 기획안 -> 완성본 -> 업로드
    if (status === 'uploaded') return ['green', 'green', 'green'];
    if (status === 'completed') return ['green', 'green', 'white']; 
    if (status === 'final_revision') return ['green', 'yellow', 'white'];
    if (['final_submitted', 'approved'].includes(status)) return ['green', 'white', 'white'];
    if (status === 'revision') return ['yellow', 'white', 'white'];
    return ['white', 'white', 'white']; // draft, pending, rejected
  };

  const ProgressCircles = ({ status }: { status: string }) => {
    const states = getProgressState(status);
    
    const coloredStates = states.filter(s => s !== 'white');
    const whiteStates = states.filter(s => s === 'white');

    const CircleIcon = () => (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
      </svg>
    );

    const MinusIcon = () => (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="18" y2="12"></line>
      </svg>
    );

    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {coloredStates.length > 0 && (
          <div style={{ display: 'flex', borderRadius: '12px', overflow: 'hidden' }}>
            {coloredStates.map((s, i) => (
              <div key={`c-${i}`} style={{
                width: '30px', height: '22px', 
                backgroundColor: s === 'green' ? '#047857' : '#fbbf24',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {s === 'green' ? <CircleIcon /> : <MinusIcon />}
              </div>
            ))}
          </div>
        )}
        {whiteStates.map((_, i) => (
          <div key={`w-${i}`} style={{
            width: '30px', height: '22px',
            backgroundColor: '#ffffff',
            border: '2px solid #cbd5e1',
            borderRadius: '8px',
            boxSizing: 'border-box'
          }}></div>
        ))}
      </div>
    );
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
  };

  const hasDiscussions = (bodyStr: string) => {
    try {
      const obj = JSON.parse(bodyStr);
      return obj.discussions && obj.discussions.length > 0;
    } catch(e) { return false; }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '임시저장';
      case 'pending': return '기획안 검수 대기';
      case 'revision': return '기획안 수정요청';
      case 'rejected': return '반려됨';
      case 'approved': return '기획안 통과';
      case 'final_submitted': return '완성본 제출됨';
      case 'final_revision': return '완성본 수정요청';
      case 'completed': return '업로드 대기';
      case 'uploaded': return '업로드 완료';
      default: return '알 수 없음';
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', alignItems: 'stretch' }}>
      
      {/* Left Pane - List */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={handlePrevMonth} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {currentMonth.split('-')[0]}년 {Number(currentMonth.split('-')[1])}월 콘텐츠
              </h2>
              <button onClick={handleNextMonth} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="ALL">ALL</option>
              <option value="유튜브">유튜브</option>
              <option value="인스타">인스타</option>
              <option value="블로그">블로그</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={filterByMine} onChange={(e) => setFilterByMine(e.target.checked)} style={{ cursor: 'pointer' }}/>
              내 콘텐츠만 보기
            </label>
          </div>
          <Link href="/proposals/submit" style={{ backgroundColor: '#1e3a8a', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            + 새 기획안 작성
          </Link>
        </div>

        {/* List Header Row */}
        <div style={{ display: 'flex', padding: '12px 20px', backgroundColor: '#e2e8f0', borderBottom: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', gap: '10px' }}>
          <div style={{ width: '20px' }}></div>
          <div style={{ flex: '2' }}>콘텐츠 (플랫폼 / 유형 / 제목)</div>
          <div style={{ flex: '1' }}>참여인원</div>
          <div style={{ width: '80px', textAlign: 'center' }}>기사</div>
          <div style={{ width: '90px', textAlign: 'center' }}>기획안 작성일</div>
          <div style={{ width: '90px', textAlign: 'center' }}>완성본 작성일</div>
          <div style={{ width: '60px', textAlign: 'center' }}>피드백</div>
          <div style={{ width: '100px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            진척도 
            <span style={{ cursor: 'help' }} title="기획안 -> 완성본 -> 업로드">❔</span>
          </div>
        </div>

        {/* List Body */}
        <div style={{ flex: '1', overflowY: 'auto', backgroundColor: '#ffffff' }}>
          {displayContents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>해당하는 콘텐츠가 없습니다.</div>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              {displayContents.map(item => {
                const typeStyle = getTypeStyle(item.content_type);
                const isSelected = selectedContent?.id === item.id;
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedContent(item)}
                    style={{ 
                      display: 'flex', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', gap: '10px', 
                      alignItems: 'center', cursor: 'pointer', transition: 'background-color 0.1s',
                      backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                      borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid transparent'
                    }}
                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ width: '20px' }}>
                      <input type="checkbox" onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ flex: '2', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      {getTeamPlatformIcon(item.team)}
                      <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {typeStyle.label}
                      </span>
                      <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </span>
                    </div>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.team}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.parsedCrew || item.author_name}
                      </span>
                    </div>
                    <div style={{ width: '80px', textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>
                      {item.articleType || '개인기사'}
                    </div>
                    <div style={{ width: '90px', textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>
                      {formatDate(item.created_at)}
                    </div>
                    <div style={{ width: '90px', textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>
                      {item.finalSubmittedAt ? formatDate(item.finalSubmittedAt) : '-'}
                    </div>
                    <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hasDiscussions(item.content_body) ? '#3b82f6' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                    </div>
                    <div style={{ width: '100px', display: 'flex', justifyContent: 'center' }}>
                      <ProgressCircles status={item.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Preview */}
      <div style={{ width: '380px', flexShrink: 0, backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
          미리보기
        </div>
        
        {!selectedContent ? (
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            리스트에서 콘텐츠를 선택하면<br/>상세 내용이 표시됩니다.
          </div>
        ) : (() => {
            let bodyObj: any = {};
            try { bodyObj = JSON.parse(selectedContent.content_body); } catch(e) {}
            
            return (
              <div style={{ flex: '1', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{selectedContent.team}</span>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{selectedContent.content_type}</span>
                    <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{getStatusText(selectedContent.status)}</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a', lineHeight: 1.4 }}>
                    {selectedContent.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    작성자: <span style={{ fontWeight: 600, color: '#334155' }}>{selectedContent.author_name}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>진행 구분</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{selectedContent.articleType || '개인기사'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>참여 크루</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{selectedContent.parsedCrew || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>취재 예정</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{bodyObj.targetDate || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>발행 예정</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{bodyObj.deadline || '-'}</div>
                  </div>
                </div>

                {selectedContent.docsUrl && (
                  <a href={selectedContent.docsUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', color: '#0284c7', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>
                    📄 기획안 문서 열기
                  </a>
                )}

                {bodyObj.intent && (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>취지</div>
                    <div className="rich-text-content" style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, wordBreak: 'break-word', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: bodyObj.intent }} />
                  </div>
                )}
                
                {bodyObj.contentBody && (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>주요 내용</div>
                    <div className="rich-text-content" style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, wordBreak: 'break-word', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: bodyObj.contentBody }} />
                  </div>
                )}

                {bodyObj.composition && (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>구성안</div>
                    <div className="rich-text-content" style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, wordBreak: 'break-word', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: bodyObj.composition }} />
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '10px' }}>
                  <Link 
                    href={`/proposals/submit?id=${selectedContent.id}`} 
                    style={{ 
                      flex: 1, textAlign: 'center', padding: '12px', 
                      backgroundColor: ['approved', 'final_submitted', 'final_revision', 'completed', 'uploaded'].includes(selectedContent.status) ? '#f8fafc' : '#1e3a8a', 
                      color: ['approved', 'final_submitted', 'final_revision', 'completed', 'uploaded'].includes(selectedContent.status) ? '#334155' : 'white', 
                      border: ['approved', 'final_submitted', 'final_revision', 'completed', 'uploaded'].includes(selectedContent.status) ? '1px solid #cbd5e1' : 'none', 
                      borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.2s' 
                    }}
                  >
                    기획안 수정/보기
                  </Link>

                  {['approved', 'final_submitted', 'final_revision', 'completed', 'uploaded'].includes(selectedContent.status) && (
                    <Link 
                      href={`/final-works/submit?id=${selectedContent.id}`} 
                      style={{ 
                        flex: 1, textAlign: 'center', padding: '12px', 
                        backgroundColor: '#059669', color: 'white', 
                        borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.2s' 
                      }}
                    >
                      {selectedContent.status === 'approved' ? '완성본 등록' : '완성본 수정/보기'}
                    </Link>
                  )}
                </div>
              </div>
            );
        })()}
      </div>
    </div>
  );
}
