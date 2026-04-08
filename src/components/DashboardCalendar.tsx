'use client';

import { useState } from 'react';

export default function DashboardCalendar({ contents }: { contents: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0~11

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // 현재 월의 시작까지의 빈 칸 채우기
  const days: Array<number | null> = Array.from({ length: firstDay }, () => null as number | null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  // 날짜별로 매칭되는 이벤트를 찾기 (publish_date가 있는 것)
  const getEventsForDay = (day: number) => {
    if (!day) return [];
    
    // YYYY-MM-DD 스트링 생성
    const targetDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return contents.filter(c => c.parsedPublishDate === targetDateStr);
  };

  return (
    <div className="card" style={{ padding: '1.5rem', width: '100%', minWidth: '300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>업로드 캘린더</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>◀</button>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{currentYear}년 {currentMonth + 1}월</span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>▶</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '0.5rem' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{day}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((day, idx) => {
          const events = day ? getEventsForDay(day) : [];
          return (
            <div 
              key={idx} 
              style={{ 
                minHeight: '60px', 
                padding: '0.25rem', 
                border: '1px solid var(--color-border)', 
                borderRadius: '4px', 
                backgroundColor: day ? (events.length > 0 ? '#eff6ff' : 'white') : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.15rem'
              }}
            >
              {day && <div style={{ fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', color: day === new Date().getDate() && currentMonth === new Date().getMonth() ? 'var(--color-primary)' : 'inherit' }}>{day}</div>}
              {events.map((evt, i) => (
                <div key={i} title={evt.title} style={{ 
                  backgroundColor: 'var(--color-primary)', 
                  color: 'white', 
                  fontSize: '0.65rem', 
                  padding: '2px 4px', 
                  borderRadius: '2px', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }}>
                  {evt.author_name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
        완성본 제출 시 설정한 '희망 발행일' 기준
      </div>
    </div>
  );
}
