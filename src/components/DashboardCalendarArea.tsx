'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function MonthCalendar({ year, month, contents }: { year: number; month: number; contents: any[] }) {
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const today = new Date();

  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevDays = getDaysInMonth(year, month - 1);
  const fullCells = cells.map((d, i) => {
    if (d !== null) return { day: d, current: true };
    if (i < firstDay) return { day: prevDays - firstDay + i + 1, current: false };
    return { day: i - firstDay - daysInMonth + 1, current: false };
  });

  const getEventsForDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const target = `${year}-${pad(month + 1)}-${pad(day)}`;
    return contents.filter(c => {
      const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
      return dateStr === target;
    });
  };

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const isSun = (idx: number) => idx % 7 === 0;
  const isSat = (idx: number) => idx % 7 === 6;

  const dotColors = ['#003378', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
          {MONTH_NAMES[month]} {year}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.4rem' }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#94A3B8', padding: '0.2rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {fullCells.map((cell, idx) => {
          const events = cell.current ? getEventsForDay(cell.day) : [];
          const today_ = cell.current && isToday(cell.day);
          const textColor = !cell.current ? '#D1D5DB' : isSun(idx) ? '#EF4444' : isSat(idx) ? '#3B82F6' : '#1e293b';
          return (
            <div key={idx} style={{ padding: '0.25rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: today_ ? '#003378' : 'transparent',
                color: today_ ? 'white' : textColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.82rem', fontWeight: today_ ? 800 : 500,
              }}>
                {cell.day}
              </div>
              {events.length > 0 && (
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {events.slice(0, 3).map((_, i) => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColors[i % dotColors.length] }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthTable({ year, month, myContents }: { year: number; month: number; myContents: any[] }) {
  const getTeamColor = (team: string) => {
    switch (team) {
      case '유튜브': return { bg: '#fee2e2', text: '#ef4444' };
      case '인스타': return { bg: '#fce7f3', text: '#ec4899' };
      case '블로그': return { bg: '#dcfce7', text: '#22c55e' };
      case '단장 팀': return { bg: '#e0e7ff', text: '#4f46e5' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case '영상(롱폼)': return { bg: '#ffedd5', text: '#f97316' };
      case '영상(숏폼)': return { bg: '#fef3c7', text: '#d97706' };
      case '카드뉴스': return { bg: '#dbeafe', text: '#3b82f6' };
      case '글 기사': return { bg: '#ecfdf5', text: '#10b981' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const filteredContents = myContents.filter(c => {
    const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
    return dateStr.startsWith(monthPrefix);
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E6EBF2' }}>
            {['색상', '날짜', '플랫폼', '콘텐츠 제목', '참여인원', '기획안 / 완성본 / 업로드'].map(h => (
              <th key={h} style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredContents.length === 0 && (
            <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#CBD5E1' }}>해당 월에 콘텐츠가 없습니다</td></tr>
          )}
          {filteredContents.map(item => {
            const tc = getTeamColor(item.team || '');
            const tyc = getTypeColor(item.content_type || '');
            const statusDot: Record<string, string> = {
              pending: '#F59E0B', revision: '#EF4444', approved: '#10B981',
              final_submitted: '#3B82F6', final_revision: '#EF4444', completed: '#003378', uploaded: '#002454'
            };
            const dot = statusDot[item.status] || '#CBD5E1';
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dot, margin: '0 auto' }} />
                </td>
                <td style={{ padding: '0.75rem', color: '#64748B', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  {item.parsedPublishDate && <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{item.parsedPublishDate}</div>}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {item.team && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: tc.bg, color: tc.text, display: 'inline-block' }}>{item.team}</span>}
                    {item.content_type && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: tyc.bg, color: tyc.text, display: 'inline-block' }}>{item.content_type}</span>}
                  </div>
                </td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
                  <Link href={`/proposals/submit?id=${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {item.title}
                  </Link>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 400 }}>{item.author_name}</div>
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.78rem', color: '#475569' }}>
                  {item.author_name || '-'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {(() => {
                    const s = item.status;
                    const step1 = ['approved','final_submitted','final_revision','completed','uploaded'].includes(s);
                    const step2 = ['completed','uploaded'].includes(s);
                    const step3 = s === 'uploaded';
                    const Check = ({ done, warn }: { done: boolean; warn?: boolean }) => (
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        backgroundColor: done ? '#10B981' : 'transparent',
                        border: done ? 'none' : `2px solid ${warn ? '#F59E0B' : '#D1D5DB'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {done && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    );
                    const Line = ({ active }: { active: boolean }) => (
                      <div style={{ flex: 1, height: '2px', backgroundColor: active ? '#10B981' : '#E2E8F0', minWidth: '12px' }} />
                    );
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Check done={step1} warn={s === 'revision'} />
                        <Line active={step1 && step2} />
                        <Check done={step2} warn={s === 'final_revision'} />
                        <Line active={step2 && step3} />
                        <Check done={step3} />
                      </div>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardCalendarArea({ rawContents, myContents }: { rawContents: any[]; myContents: any[] }) {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const handlePrev = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const y1 = baseDate.getFullYear();
  const m1 = baseDate.getMonth();
  const y2 = m1 === 11 ? y1 + 1 : y1;
  const m2 = m1 === 11 ? 0 : m1 + 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>전체 콘텐츠 캘린더</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handlePrev} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={handleNext} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Month 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'stretch' }}>
          <MonthCalendar year={y1} month={m1} contents={rawContents} />
          <MonthTable year={y1} month={m1} myContents={myContents} />
        </div>
        {/* Month 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'stretch' }}>
          <MonthCalendar year={y2} month={m2} contents={rawContents} />
          <MonthTable year={y2} month={m2} myContents={myContents} />
        </div>
      </div>
    </div>
  );
}
