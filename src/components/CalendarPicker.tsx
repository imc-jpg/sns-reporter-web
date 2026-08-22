'use client';

import React, { useState, useEffect } from 'react';

interface CalendarPickerProps {
  initialStartDate?: string;
  initialEndDate?: string;
  mode: 'single' | 'range' | 'disabled';
  onApply: (startDate: string, endDate: string) => void;
}

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPicker({ initialStartDate, initialEndDate, mode, onApply }: CalendarPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date(initialStartDate || Date.now()));
  
  const parseLocalDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  };

  const [startDate, setStartDate] = useState<Date | null>(parseLocalDate(initialStartDate));
  const [endDate, setEndDate] = useState<Date | null>(parseLocalDate(initialEndDate));

  useEffect(() => {
    setStartDate(parseLocalDate(initialStartDate));
    setEndDate(parseLocalDate(initialEndDate));
    if (initialStartDate) {
      setCurrentDate(parseLocalDate(initialStartDate) || new Date());
    }
  }, [initialStartDate, initialEndDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const isPastDate = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const handleDateClick = (day: number) => {
    if (mode === 'disabled') return;
    if (isPastDate(day)) return;

    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    if (mode === 'single') {
      setStartDate(clickedDate);
      setEndDate(null);
      onApply(formatDate(clickedDate), formatDate(clickedDate));
      return;
    }

    if (mode === 'range') {
      if (!startDate || (startDate && endDate)) {
        // Start new selection
        setStartDate(clickedDate);
        setEndDate(null);
      } else if (startDate && !endDate) {
        let finalStart = startDate;
        let finalEnd = clickedDate;
        
        if (clickedDate < startDate) {
          finalStart = clickedDate;
          finalEnd = startDate;
        }
        
        setStartDate(finalStart);
        setEndDate(finalEnd);
        onApply(formatDate(finalStart), formatDate(finalEnd));
      }
    }
  };

  const isSelected = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const time = d.getTime();
    if (startDate && startDate.getTime() === time) return true;
    if (endDate && endDate.getTime() === time) return true;
    return false;
  };

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getTime();
    return d > startDate.getTime() && d < endDate.getTime();
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: '10px' }} />);
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const selected = isSelected(i);
      const inRange = isInRange(i);
      const isPast = isPastDate(i);
      const d = new Date(year, month, i);
      const isStart = startDate && startDate.getTime() === d.getTime();
      const isEnd = endDate && endDate.getTime() === d.getTime();
      const isSingle = isStart && (!endDate || startDate.getTime() === endDate.getTime());

      let wrapperStyle: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '32px',
        margin: '2px 0'
      };

      if (inRange) {
        wrapperStyle.backgroundColor = 'var(--color-range-bg, #E6F0FF)';
      } else if (selected && !isSingle) {
        if (isStart) {
          wrapperStyle.background = 'linear-gradient(to right, transparent 50%, var(--color-range-bg, #E6F0FF) 50%)';
        } else if (isEnd) {
          wrapperStyle.background = 'linear-gradient(to right, var(--color-range-bg, #E6F0FF) 50%, transparent 50%)';
        }
      }

      days.push(
        <div key={i} style={wrapperStyle}>
          <div
            onClick={() => handleDateClick(i)}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-[0.88rem] transition-[color,background-color,box-shadow] duration-200 ${
              isPast
                ? 'text-slate-300 dark:text-slate-600 font-medium'
                : selected
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-800 dark:text-slate-100 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${mode === 'disabled' || isPast ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ zIndex: 1 }}
          >
            {i}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const getModeText = () => {
    if (mode === 'disabled') return '선택 불가';
    if (mode === 'single') return '단일 날짜 선택';
    return '기간 선택';
  };

  return (
    <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700" style={{
      borderRadius: '16px',
      padding: '24px 12px',
      width: '100%',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      opacity: mode === 'disabled' ? 0.6 : 1,
      pointerEvents: mode === 'disabled' ? 'none' : 'auto',
      transition: 'opacity 0.3s'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {getModeText()}
        </div>
      </div>

      {/* Month Navigator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <button type="button" onClick={handlePrevMonth} className="text-slate-600 dark:text-slate-300" style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>{'<'}</button>
        <div className="text-slate-900 dark:text-slate-100" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
          {currentDate.getMonth() + 1}월
        </div>
        <button type="button" onClick={handleNextMonth} className="text-slate-600 dark:text-slate-300" style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>{'>'}</button>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Weekdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
          {DAYS_OF_WEEK.map((day, i) => (
            <div key={day} className={`text-[0.85rem] font-bold ${i === 0 ? 'text-red-500 dark:text-red-400' : i === 6 ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}`}>{day}</div>
          ))}
        </div>
        
        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
}
