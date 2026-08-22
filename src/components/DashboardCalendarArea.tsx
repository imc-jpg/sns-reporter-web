'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ModalLink from '@/components/ModalLink';
import { useModal } from '@/contexts/ModalContext';
import { DriveColorIcon } from './mobile/driveIcons';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';


const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Weather code interpretation helper
const getWeatherInfo = (code: number) => {
  if (code === 0) return { icon: '☀️', text: '맑음', color: '#F59E0B' };
  if (code === 1) return { icon: '🌤️', text: '대체로 맑음', color: '#F59E0B' };
  if (code === 2) return { icon: '⛅', text: '구름 조금', color: '#64748B' };
  if (code === 3) return { icon: '☁️', text: '흐림', color: '#94A3B8' };
  if ([45, 48].includes(code)) return { icon: '🌫️', text: '안개', color: '#94A3B8' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', text: '비', color: '#3B82F6' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄️', text: '눈', color: '#60A5FA' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', text: '뇌우', color: '#8B5CF6' };
  return { icon: '☀️', text: '맑음', color: '#F59E0B' };
};

interface WeatherData {
  current?: {
    temperature_2m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

// Helper function for date matching (supports single date, range, ISO prefix)
// ※ 리스트 호버 방향(콘텐츠→캘린더)에서만 사용 (getRangeMatchInfo 보조용)
const isDateMatched = (cellDateStr: string, hoveredDateStr: string | null | undefined): boolean => {
  if (!cellDateStr || !hoveredDateStr) return false;
  const cleanHovered = hoveredDateStr.trim();
  if (cleanHovered === cellDateStr || cleanHovered.startsWith(cellDateStr) || cellDateStr.startsWith(cleanHovered)) {
    return true;
  }
  if (cleanHovered.includes('~')) {
    const parts = cleanHovered.split('~').map(s => s.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      return cellDateStr >= parts[0] && cellDateStr <= parts[1];
    }
  }
  return false;
};

// 캘린더 날짜 셀의 범위 매칭 정보 타입
interface RangeMatchInfo {
  isMatched: boolean;
  isRange: boolean;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
}

// 캘린더 셀이 hoveredDate(단일 or 범위) 에 해당하는지 + 위치 판별
const getRangeMatchInfo = (
  cellDateStr: string, 
  hoveredDateStr: string | null | undefined
): RangeMatchInfo => {
  if (!cellDateStr || !hoveredDateStr) {
    return { isMatched: false, isRange: false, isStart: false, isEnd: false, isMiddle: false };
  }
  
  const cleanHovered = hoveredDateStr.trim();

  // 범위 날짜 (e.g. "2026-05-10 ~ 2026-05-15")
  if (cleanHovered.includes('~')) {
    const parts = cleanHovered.split('~').map(s => s.trim().split('T')[0]);
    if (parts.length === 2 && parts[0] && parts[1]) {
      const start = parts[0];
      const end = parts[1];
      if (cellDateStr >= start && cellDateStr <= end) {
        return {
          isMatched: true,
          isRange: start !== end,
          isStart: cellDateStr === start,
          isEnd: cellDateStr === end,
          isMiddle: cellDateStr > start && cellDateStr < end
        };
      }
    }
  }

  // 단일 날짜 — ISO 접두 비교 포함
  const cleanCell = cellDateStr.split('T')[0];
  const cleanHoveredDate = cleanHovered.split('T')[0];
  const matched = cleanCell === cleanHoveredDate || cleanHovered.startsWith(cellDateStr) || cellDateStr.startsWith(cleanHoveredDate);
  return {
    isMatched: matched,
    isRange: false,
    isStart: matched,
    isEnd: matched,
    isMiddle: false
  };
};

// 리스트 row가 캘린더 hoveredDate(단일 날짜)에 해당하는지 판별
// 인자: contentDateStr(콘텐츠 희망일, 단일 or 범위), calHoveredDate(캘린더에서 hover된 단일 날짜)
const isContentMatchedByCalHover = (contentDateStr: string, calHoveredDate: string | null): boolean => {
  if (!contentDateStr || !calHoveredDate) return false;
  const cleanHovered = calHoveredDate.trim().split('T')[0];

  if (contentDateStr.includes('~')) {
    const parts = contentDateStr.split('~').map(s => s.trim().split('T')[0]);
    if (parts.length === 2 && parts[0] && parts[1]) {
      return cleanHovered >= parts[0] && cleanHovered <= parts[1];
    }
  }
  const cleanContent = contentDateStr.split('T')[0];
  return cleanContent === cleanHovered || contentDateStr.startsWith(cleanHovered) || cleanHovered.startsWith(cleanContent);
};

// 범위 콘텐츠나 호버가 현재 달을 벗어나면 "이어지는 두 달" 단위로만 펼침 (예: 7-8월 또는 8-9월)
// — 실제 범위가 몇 달에 걸치든, 호버가 몇 달 떨어져 있든 항상 기준월 ± 1달까지만 확장하고 그 이상은 확장하지 않음
const getMonthSpan = (baseYear: number, baseMonth: number, contents: any[], hoveredDateStr?: string | null) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const key = (y: number, m: number) => `${y}-${pad(m + 1)}`;
  const baseKey = key(baseYear, baseMonth);
  const prevKey = key(baseMonth === 0 ? baseYear - 1 : baseYear, baseMonth === 0 ? 11 : baseMonth - 1);
  const nextKey = key(baseMonth === 11 ? baseYear + 1 : baseYear, baseMonth === 11 ? 0 : baseMonth + 1);

  let extendsBackward = false;
  let extendsForward = false;

  if (hoveredDateStr) {
    // 호버 중일 때는 호버된 콘텐츠의 방향이 다른 콘텐츠의 범위보다 우선 — 7월 콘텐츠를 가리키면 무조건 7-8월
    const clean = hoveredDateStr.trim();
    const hoverKeys = clean.includes('~')
      ? clean.split('~').map(s => s.trim().split('T')[0]).filter(Boolean).map(s => s.substring(0, 7))
      : [clean.split('T')[0].substring(0, 7)];

    hoverKeys.forEach(k => {
      if (k.length !== 7) return;
      if (k < baseKey) extendsBackward = true;
      if (k > baseKey) extendsForward = true;
    });
  } else {
    contents.forEach((item: any) => {
      let bodyObj: any = {};
      try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
      const start = bodyObj.desiredDate || item.desiredDate || item.target_date || bodyObj.targetDate || bodyObj.deadline || '';
      const end = bodyObj.desiredDateEnd || item.desiredDateEnd || bodyObj.targetDateEnd || '';
      if (!start || !end || end === start) return;

      const startKey = start.split('T')[0].substring(0, 7);
      const endKey = end.split('T')[0].substring(0, 7);
      if (startKey === endKey) return;
      if (baseKey < startKey || baseKey > endKey) return;

      if (startKey < baseKey) extendsBackward = true;
      if (endKey > baseKey) extendsForward = true;
    });
  }

  // 앞뒤 동시 확장 신호가 있으면 미래 방향을 우선해 항상 2개월 폭만 유지
  let minKey = baseKey;
  let maxKey = baseKey;
  if (extendsForward) maxKey = nextKey;
  else if (extendsBackward) minKey = prevKey;

  const [minY, minM] = minKey.split('-').map(Number);
  const [maxY, maxM] = maxKey.split('-').map(Number);
  return { minYear: minY, minMonth: minM - 1, maxYear: maxY, maxMonth: maxM - 1 };
};

interface CalendarCell {
  date: Date;
  year: number;
  month: number;
  day: number;
  isDisplayedMonth: boolean;
  isMonthStart: boolean;
}

const buildContinuousCells = (minYear: number, minMonth: number, maxYear: number, maxMonth: number): CalendarCell[] => {
  const firstOfRange = new Date(minYear, minMonth, 1);
  const lastOfRange = new Date(maxYear, maxMonth + 1, 0);

  const gridStart = new Date(firstOfRange);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(lastOfRange);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const cells: CalendarCell[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const d = cursor.getDate();
    const isDisplayedMonth = cursor >= firstOfRange && cursor <= lastOfRange;
    cells.push({ date: new Date(cursor), year: y, month: m, day: d, isDisplayedMonth, isMonthStart: d === 1 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
};

function ContinuousCalendar({
  baseYear,
  baseMonth,
  contents,
  weather,
  hoveredDate,
  clickedDate,
  setHoveredDate,
  setClickedDate,
  onPrev,
  onNext
}: {
  baseYear: number;
  baseMonth: number;
  contents: any[];
  weather: WeatherData | null;
  hoveredDate: string | null;
  clickedDate: string | null;
  setHoveredDate: (d: string | null) => void;
  setClickedDate: (d: string | null) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const isSun = (idx: number) => idx % 7 === 0;
  const isSat = (idx: number) => idx % 7 === 6;

  const { minYear, minMonth, maxYear, maxMonth } = React.useMemo(
    () => getMonthSpan(baseYear, baseMonth, contents, hoveredDate),
    [baseYear, baseMonth, contents, hoveredDate]
  );

  const isSingleMonth = minYear === maxYear && minMonth === maxMonth;
  const titleText = isSingleMonth
    ? `${baseMonth + 1}월`
    : minYear === maxYear
    ? `${minMonth + 1}-${maxMonth + 1}월`
    : `${minYear}.${minMonth + 1} - ${maxYear}.${maxMonth + 1}`;
  const titleYearText = isSingleMonth ? `${baseYear}` : minYear === maxYear ? `${minYear}` : '';
  const cells = React.useMemo(
    () => buildContinuousCells(minYear, minMonth, maxYear, maxMonth),
    [minYear, minMonth, maxYear, maxMonth]
  );

  const getForecastIcon = (year: number, month: number, day: number) => {
    if (!weather?.daily?.time) return null;
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const idx = weather.daily.time.indexOf(dateStr);
    if (idx !== -1 && weather.daily.weather_code) {
      const code = weather.daily.weather_code[idx];
      return getWeatherInfo(code).icon;
    }
    return null;
  };

  const activeDateStr = clickedDate || hoveredDate;

  // 선택/호버된 날짜(들)에 해당하는 요일 인덱스(0: Sun ~ 6: Sat) 세트 계산
  const activeDayOfWeekSet = React.useMemo(() => {
    if (!activeDateStr) return new Set<number>();
    const matchingIndices = new Set<number>();
    cells.forEach((cell, idx) => {
      if (cell.isDisplayedMonth) {
        const cellDateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
        if (getRangeMatchInfo(cellDateStr, activeDateStr).isMatched) {
          matchingIndices.add(idx % 7);
        }
      }
    });
    return matchingIndices;
  }, [cells, activeDateStr]);

  return (
    <div className="card motion-card backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-3xl p-5 shadow-[0_12px_32px_-8px_rgba(0,36,84,0.06),_inset_0_1px_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),_inset_0_1px_1px_0_rgba(255,255,255,0.08)] flex flex-col">
      {/* Month Title & Month Navigation Buttons — 표시 범위가 여러 달이면 "8-9월"처럼 범위로 표시 */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span className="text-slate-950 dark:text-white tracking-tighter tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 900 }}>{titleText}</span>
          {titleYearText && (
            <span className="text-slate-600 dark:text-slate-500 font-extrabold uppercase tracking-wider" style={{ fontSize: '0.78rem' }}>{titleYearText}</span>
          )}
        </div>

        {(onPrev || onNext) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {onPrev && (
              <button
                onClick={onPrev}
                title="이전 달"
                className="motion-btn motion-scale bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  boxShadow: '0 2px 6px rgba(0, 36, 84, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {onNext && (
              <button
                onClick={onNext}
                title="다음 달"
                className="motion-btn motion-scale bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  boxShadow: '0 2px 6px rgba(0, 36, 84, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Days grid headers - 선택된 날짜의 요일은 찐하게, 미선택 요일은 완전히 연하게 표시 */}
        <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', gap: '4px', marginBottom: '0.6rem' }}>
          <div />
          {DAYS.map((d, i) => {
            const hasActiveSelection = activeDayOfWeekSet.size > 0;
            const isDayActive = activeDayOfWeekSet.has(i);

            let headerClass = '';
            if (hasActiveSelection) {
              if (isDayActive) {
                headerClass = 'text-[#002454] dark:text-blue-400 font-black opacity-100 scale-105';
              } else {
                headerClass = 'text-slate-300 dark:text-slate-700 font-bold opacity-30';
              }
            } else {
              headerClass = i === 0 || i === 6 
                ? 'text-slate-500 dark:text-slate-400 font-black' 
                : 'text-slate-400 dark:text-slate-600 font-black';
            }

            return (
              <div
                key={d}
                className={`text-center text-[0.72rem] tracking-widest uppercase py-1 transition-all duration-150 ${headerClass}`}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Continuous Calendar Cells — 여러 달이 이어지는 경우 하나의 그리드로 연속 표시 */}
        <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', gap: '6px 0px' }}>
          {cells.map((cell, idx) => {
            const weekIdx = idx % 7;
            const today_ = cell.isDisplayedMonth && cell.year === currentYear && cell.month === currentMonth && cell.day === currentDate;
            const cellDateStr = cell.isDisplayedMonth ? `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}` : '';
            const activeDateStr = clickedDate || hoveredDate;
            const rangeInfo = cell.isDisplayedMonth ? getRangeMatchInfo(cellDateStr, activeDateStr) : { isMatched: false, isRange: false, isStart: false, isEnd: false, isMiddle: false };
            const isHighlighted = rangeInfo.isMatched;
            const isWeekStart = weekIdx === 0;
            const isWeekEnd = weekIdx === 6;

            const isStartEdge = rangeInfo.isStart || isWeekStart;
            const isEndEdge = rangeInfo.isEnd || isWeekEnd;

            const cellWeatherIcon = cell.isDisplayedMonth ? getForecastIcon(cell.year, cell.month, cell.day) : null;

            const cellNode = (
              <div
                key={idx}
                onClick={() => {
                  if (cell.isDisplayedMonth) {
                    setClickedDate(clickedDate === cellDateStr ? null : cellDateStr);
                  }
                }}
                onMouseEnter={() => {
                  if (cell.isDisplayedMonth) setHoveredDate(cellDateStr);
                }}
                onMouseLeave={() => {
                  if (cell.isDisplayedMonth) setHoveredDate(null);
                }}
                style={{
                  padding: '0.25rem 0',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  position: 'relative',
                  minHeight: '60px',
                  cursor: cell.isDisplayedMonth ? 'pointer' : 'default',
                  zIndex: isHighlighted ? 10 : 1,
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Continuous Range Strip Background Box for Date Ranges & Selected Dates (테두리 없이 도드라지는 밝은 배경) */}
                {isHighlighted && (
                  <div
                    className="calendar-range-strip"
                    style={{
                      left: isStartEdge ? '2px' : '0px',
                      right: isEndEdge ? '2px' : '0px',
                      borderTopLeftRadius: isStartEdge ? '12px' : '0px',
                      borderBottomLeftRadius: isStartEdge ? '12px' : '0px',
                      borderTopRightRadius: isEndEdge ? '12px' : '0px',
                      borderBottomRightRadius: isEndEdge ? '12px' : '0px',
                    }}
                  />
                )}

                {/* Date text — 밝은 배경 위에서 또렷하게 보이는 짙은 네이비 폰트 */}
                <div
                  className={`relative z-[2] w-7 h-7 rounded-lg flex items-center justify-center text-[0.85rem] tabular-nums transition-[color,background-color,transform] duration-150 ${
                    isHighlighted
                      ? 'text-[#002454]! dark:text-[#002454]! font-black'
                      : today_
                      ? 'bg-[#002454] dark:bg-blue-600 text-white font-black shadow-xs'
                      : !cell.isDisplayedMonth
                      ? 'text-slate-300 dark:text-slate-600 font-normal'
                      : isSun(weekIdx) || isSat(weekIdx)
                      ? 'text-slate-500 dark:text-slate-400 font-semibold'
                      : 'text-slate-800 dark:text-slate-100 font-semibold'
                  }`}
                >
                  {cell.day}
                </div>

                {/* Weather indicator icon - UNDER the number */}
                {cellWeatherIcon ? (
                  <span style={{
                    position: 'relative',
                    zIndex: 2,
                    fontSize: '1rem',
                    lineHeight: '1.1',
                    marginTop: '2px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
                    display: 'block'
                  }}>
                    {cellWeatherIcon}
                  </span>
                ) : (
                  <div style={{ height: '1rem', marginTop: '2px' }} />
                )}
              </div>
            );

            // 매 주의 시작(일요일) 칸 앞에만 라벨 컬럼을 추가 — 그 주에 달이 시작하면 작은 월 라벨 표시
            if (!isWeekStart) return cellNode;

            const monthLabelCell = cells
              .slice(idx, idx + 7)
              .find(c => c.isMonthStart && c.isDisplayedMonth);

            return (
              <React.Fragment key={idx}>
                <div
                  className="text-slate-400 dark:text-slate-600"
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    writingMode: monthLabelCell ? 'vertical-rl' : undefined,
                  }}
                >
                  {monthLabelCell ? `${monthLabelCell.month + 1}월` : ''}
                </div>
                {cellNode}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper functions for MonthTable
const getTypeStyle = (typeStr: string, team?: string) => {
  let label = typeStr || '기타';
  if (typeStr === '영상(롱폼)') label = '롱폼';
  else if (typeStr === '영상(숏폼)') label = '숏폼';
  else if (typeStr === '글 기사') label = '기사';

  // 채널 구분은 아이콘으로 이미 표시되므로, 형식 배지는 스위스 스타일의 단일 중립 톤으로 통일
  void team;
  return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', label };
};

const getTeamPlatformIcon = (team: string) => {
  if (team === '유튜브') {
    return <YoutubeIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
  }
  if (team === '인스타') {
    return <InstagramIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
  }
  if (team === '블로그') {
    return <NaverBlogIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
  }
  return <GenericPostIcon className="w-5 h-5 flex-shrink-0" style={{ width: '20px', height: '20px' }} />;
};

const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  const yy = d.getFullYear().toString().slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
};

const getDiscussionsCount = (bodyStr: string) => {
  try {
    const obj = JSON.parse(bodyStr || '{}');
    return obj.discussions && obj.discussions.length > 0 ? obj.discussions.length : 0;
  } catch(e) { return 0; }
};

const getTimelinessStyle = (timeliness: string) => {
  switch (timeliness) {
    case '중요':
      return {
        color: '#002454',
        bg: '#EEF2F8',
        border: '#D6DEEA',
        label: '중요'
      };
    case '보통':
      return {
        color: '#475569',
        bg: '#F1F5F9',
        border: '#E2E8F0',
        label: '보통'
      };
    default:
      return {
        color: '#64748B',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        label: '상시'
      };
  }
};

const formatDesiredDateDisplay = (start: string, end?: string) => {
  if (!start) return null;
  const cleanStart = start.split('T')[0];
  const s = cleanStart.length >= 10 ? cleanStart.substring(5, 10).replace('-', '.') : cleanStart;
  if (!end || end === start) return s;
  const cleanEnd = end.split('T')[0];
  const e = cleanEnd.length >= 10 ? cleanEnd.substring(5, 10).replace('-', '.') : cleanEnd;
  return `${s}~${e}`;
};

function MonthTable({ 
  year, 
  month, 
  myContents, 
  calActiveDate, 
  clickedDate,
  setClickedDate,
  listHoveredDate, 
  setListHoveredDate,
  allProfiles = [] 
}: { 
  year: number; 
  month: number; 
  myContents: any[]; 
  calActiveDate?: string | null; 
  clickedDate?: string | null;
  setClickedDate?: (d: string | null) => void;
  listHoveredDate?: string | null;
  setListHoveredDate?: (d: string | null) => void;
  allProfiles?: any[];
}) {
  const { openContentModal } = useModal();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}`;
  
  const monthlyContents = myContents.filter(c => {
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(c.content_body || '{}'); } catch {}
    
    const dateStr = c.created_at ? c.created_at.split('T')[0] : '';
    let cMonth = bodyObj.targetMonth || c.targetMonth || dateStr.substring(0, 7);
    return cMonth === monthPrefix;
  });

  // 달력 위를 호버하거나 특정 날짜를 클릭했을 때, 해당 날짜에 매칭되는 콘텐츠만 필터링!
  const filteredContents = React.useMemo(() => {
    if (!calActiveDate) return monthlyContents;

    return monthlyContents.filter(item => {
      let bodyObj: any = {};
      try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}

      const desiredDate = bodyObj.desiredDate || item.desiredDate || item.target_date || bodyObj.targetDate || bodyObj.deadline || '';
      const desiredDateEnd = bodyObj.desiredDateEnd || item.desiredDateEnd || bodyObj.targetDateEnd || '';

      const targetDateForHover = desiredDate
        ? (desiredDateEnd && desiredDateEnd !== desiredDate ? `${desiredDate} ~ ${desiredDateEnd}` : desiredDate)
        : (item.target_date || (item.created_at ? item.created_at.split('T')[0] : ''));

      return (
        calActiveDate === targetDateForHover ||
        isContentMatchedByCalHover(targetDateForHover, calActiveDate) ||
        isContentMatchedByCalHover(desiredDate, calActiveDate)
      );
    });
  }, [monthlyContents, calActiveDate]);

  filteredContents.sort((a, b) => {
    let bodyA: any = {};
    let bodyB: any = {};
    try { bodyA = JSON.parse(a.content_body || '{}'); } catch {}
    try { bodyB = JSON.parse(b.content_body || '{}'); } catch {}

    const dateA = bodyA.desiredDate || a.desiredDate || a.target_date || bodyA.targetDate || bodyA.deadline || '9999-99-99';
    const dateB = bodyB.desiredDate || b.desiredDate || b.target_date || bodyB.targetDate || bodyB.deadline || '9999-99-99';

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    const timelinessRank = (t: string) => (t === '중요' ? 1 : t === '보통' ? 2 : 3);
    const rankA = timelinessRank(bodyA.timeliness || (dateA !== '9999-99-99' ? '보통' : '상관없음'));
    const rankB = timelinessRank(bodyB.timeliness || (dateB !== '9999-99-99' ? '보통' : '상관없음'));
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const createdA = new Date(a.created_at || 0).getTime();
    const createdB = new Date(b.created_at || 0).getTime();
    return createdB - createdA;
  });

  const formatCrewName = (name: string) => {
    if (!name) return '';
    if (/^\d+기\s+/.test(name)) return name;
    if (/^\d+\s+/.test(name)) return name.replace(/^(\d+)\s+/, '$1기 ');
    
    const cleanName = name.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === cleanName || p.author_name === name);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return cleanName;
  };

  return (
    <div className="flex flex-col" style={{ padding: 0, height: 'auto', minHeight: '440px' }}>
      
      <div style={{ overflowX: 'auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ minWidth: '650px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* 달력 날짜 필터링 활성 안내 바 */}
          {calActiveDate && (
            <div className="flex items-center justify-between px-4 py-2 bg-blue-50/90 dark:bg-blue-950/50 border-b border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 transition-all">
              <div className="font-bold flex items-center gap-1.5">
                <span>📅</span>
                <span>
                  <strong>{calActiveDate}</strong> {clickedDate ? '선택' : '호버'} 필터링 ({filteredContents.length}건)
                </span>
              </div>
              {clickedDate && setClickedDate && (
                <button
                  onClick={() => setClickedDate(null)}
                  className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  선택 해제 (전체 보기)
                </button>
              )}
            </div>
          )}

          {/* Swiss Grid Table Header */}
          <div className="flex p-3 px-4 rounded-2xl backdrop-blur-md bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.06)] text-[11px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 gap-2.5 select-none">
            <div style={{ width: '84px', textAlign: 'center' }}>희망일</div>
            <div style={{ width: '40px', textAlign: 'center' }}>채널</div>
            <div style={{ width: '60px', textAlign: 'center' }}>형식</div>
            <div style={{ flex: '2', minWidth: '140px' }}>제목</div>
            <div style={{ flex: '1', minWidth: '100px', textAlign: 'left' }}>참여인원</div>
            <div style={{ width: '56px', textAlign: 'center' }}>구분</div>
            <div style={{ width: '84px', textAlign: 'center' }}>일정</div>
            <div style={{ width: '50px', textAlign: 'center' }}>피드백</div>
            <div style={{ width: '56px', textAlign: 'center' }}>드라이브</div>
          </div>

          {/* List Body */}
          <div style={{ flex: '1', backgroundColor: 'transparent' }}>
            {filteredContents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">
                  {calActiveDate ? `${calActiveDate}에 해당하는 콘텐츠가 없습니다.` : '해당 월의 등록된 콘텐츠가 없습니다.'}
                </div>
                {clickedDate && setClickedDate && (
                  <button
                    onClick={() => setClickedDate(null)}
                    className="mt-3 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    전체 목록 보기
                  </button>
                )}
              </div>
            ) : (
              <div style={{ padding: '0 12px 12px 12px' }}>
            {filteredContents.map(item => {
              let bodyObj: any = {};
              try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
              
              const typeStyle = getTypeStyle(item.content_type, item.team);
              const mainAuthor = item.author_name;
              let allCrew = [mainAuthor];
              if (bodyObj.crew && typeof bodyObj.crew === 'string') {
                allCrew = bodyObj.crew.split(',').map((s:string) => s.trim()).filter(Boolean);
              }
              const mainAuthorNameOnly = mainAuthor.replace(/^\d+(기)?\s+/, '');
              const others = allCrew.filter(c => {
                const cClean = c.replace(/^\d+(기)?\s+/, '');
                return cClean !== mainAuthorNameOnly && !mainAuthorNameOnly.includes(cClean);
              });
              const desiredDate = bodyObj.desiredDate || item.desiredDate || item.target_date || bodyObj.targetDate || bodyObj.deadline || '';
              const desiredDateEnd = bodyObj.desiredDateEnd || item.desiredDateEnd || bodyObj.targetDateEnd || '';
              const timeliness = bodyObj.timeliness || (desiredDate ? '중요' : '상관없음');
              const timeStyle = getTimelinessStyle(timeliness);
              const dateDisplay = formatDesiredDateDisplay(desiredDate, desiredDateEnd);

              const articleType = bodyObj.articleType || item.articleType || '개인기사';
              const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
              const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
              
              const targetDateForHover = desiredDate
                ? (desiredDateEnd && desiredDateEnd !== desiredDate ? `${desiredDate} ~ ${desiredDateEnd}` : desiredDate)
                : (item.target_date || (item.created_at ? item.created_at.split('T')[0] : ''));

              const isRowHovered = !!(listHoveredDate && (
                listHoveredDate === targetDateForHover ||
                isContentMatchedByCalHover(targetDateForHover, listHoveredDate)
              ));
              
              return (
                <div 
                  key={item.id} 
                  className={`group motion-row ${isRowHovered ? 'bg-slate-100/90 dark:bg-slate-800/70' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'}`}
                  onClick={() => openContentModal(item.id.toString())}
                  onMouseEnter={() => {
                    if (targetDateForHover) setListHoveredDate?.(targetDateForHover);
                  }}
                  onMouseLeave={() => {
                    setListHoveredDate?.(null);
                  }}
                  style={{
                    display: 'flex', padding: '11px 12px', borderBottom: '1px solid rgba(226, 232, 240, 0.45)', gap: '10px',
                    alignItems: 'center', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s ease',
                    opacity: (listHoveredDate && !isRowHovered) ? 0.4 : 1
                  }}
                >
                  <div style={{ width: '84px', display: 'flex', justifyContent: 'center' }}>
                    <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 text-[0.72rem] font-bold px-2 py-0.5 rounded-md whitespace-nowrap tabular-nums">
                      {dateDisplay || '상시'}
                    </span>
                  </div>
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                    <div className="w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-2xs">
                      {getTeamPlatformIcon(item.team)}
                    </div>
                  </div>
                  <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {typeStyle.label}
                    </span>
                  </div>
                  <div className="text-slate-950 dark:text-white font-bold text-[0.88rem] truncate tracking-tight group-hover:text-[#002454] dark:group-hover:text-blue-400 transition-colors" style={{ flex: '2', minWidth: '140px' }}>
                    {item.title}
                  </div>
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '100px', justifyContent: 'center' }}>
                    {articleType === '개인기사' ? (
                      <span className="text-slate-700 dark:text-slate-200 text-[0.82rem] truncate">
                        <strong className="font-extrabold text-slate-950 dark:text-white">{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                      </span>
                    ) : (
                      <>
                        <span className="text-slate-900 dark:text-white font-extrabold text-[0.82rem] truncate">
                          {item.team}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[0.72rem] truncate font-medium">
                          <strong className="font-bold text-slate-700 dark:text-slate-300">{formatCrewName(mainAuthor)}</strong>{others.length > 0 ? `, ${others.map(formatCrewName).join(', ')}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[0.76rem] font-bold text-center" style={{ width: '56px' }}>
                    {articleType}
                  </div>
                  <div style={{ width: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <div className="text-[#1E3A8A] dark:text-blue-200 bg-blue-50 dark:bg-blue-950/70 rounded px-1.5 py-0.5 text-[0.7rem] font-bold text-center w-full tabular-nums shadow-2xs">
                      기 {formatDate(item.created_at)}
                    </div>
                    <div className={`rounded px-1.5 py-0.5 text-[0.7rem] font-bold text-center w-full tabular-nums shadow-2xs ${bodyObj.finalSubmittedAt ? 'text-[#14532D] dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60'}`}>
                      완 {bodyObj.finalSubmittedAt ? formatDate(bodyObj.finalSubmittedAt) : '-'}
                    </div>
                  </div>
                  <div style={{ width: '50px', display: 'flex', justifyContent: 'center' }}>
                    <div className={`w-7 h-6 rounded-md flex items-center justify-center text-[0.78rem] font-extrabold ${getDiscussionsCount(item.content_body) > 0 ? 'bg-[#EAF2FF] dark:bg-blue-950/60 text-[#002454] dark:text-blue-200 shadow-2xs' : 'bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-600'}`}>
                      {getDiscussionsCount(item.content_body)}
                    </div>
                  </div>
                  <div style={{ width: '56px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {isFinal && hasDriveLink ? (
                      <div 
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                        title="Google Drive Link"
                      >
                        <DriveColorIcon className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-[0.8rem]">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardCalendarArea({ rawContents, myContents, allProfiles = [] }: { rawContents: any[]; myContents: any[]; allProfiles?: any[] }) {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [calHoveredDate, setCalHoveredDate] = useState<string | null>(null);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const [listHoveredDate, setListHoveredDate] = useState<string | null>(null);

  // 달력에서 발생한 활성 날짜 (달력 호버 또는 클릭)
  const calActiveDate = clickedDate || calHoveredDate;
  // 달력에 표시할 하이라이트 날짜 (달력 호버/클릭 or 리스트 호버)
  const calendarHighlightDate = listHoveredDate || calHoveredDate;

  // Real-time Smooth Scroll-following inside container
  // (CSS sticky는 이 대시보드의 실제 스크롤 컨테이너가 window가 아닌 내부 div라
  //  동작하지 않아, 실제 스크롤 가능한 조상을 찾아 따라가는 JS transform 방식으로 복원)
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    let scrollEl: HTMLElement | Window | null = null;
    let curr = containerRef.current?.parentElement;
    while (curr) {
      const style = window.getComputedStyle(curr);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollEl = curr;
        break;
      }
      curr = curr.parentElement;
    }
    if (!scrollEl) scrollEl = window;

    const handleScroll = () => {
      if (!containerRef.current || !calendarRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const calendarHeight = calendarRef.current.offsetHeight;
      const containerHeight = containerRef.current.offsetHeight;
      const maxTranslate = Math.max(0, containerHeight - calendarHeight);

      // 상단에서 20px 위치를 유지하며 우측 리스트 높이 범위 내에서 따라다님
      const topOffset = 20;
      let target = -containerRect.top + topOffset;

      if (target < 0) target = 0;
      if (target > maxTranslate) target = maxTranslate;

      setTranslateY(target);
    };

    const target = scrollEl;
    target.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      target.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Real-time Weather Integration with Open-Meteo API (14-day forecast for 2 weeks)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        // Yonsei University Sinchon campus (Latitude: 37.5598, Longitude: 126.9385)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.5598&longitude=126.9385&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=14&timezone=Asia%2FSeoul'
        );
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch (e) {
        console.error('Failed to fetch weather from Open-Meteo', e);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, []);

  const handlePrev = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Current selected month
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const currentWeather = weather?.current;
  const currentWeatherInfo = currentWeather ? getWeatherInfo(currentWeather.weather_code) : null;

  return (
    <div>
      {/* Swiss Style Header with Frosted Glass Weather Capsule */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <h3 className="font-black text-xl text-slate-950 dark:text-white tracking-tight m-0 flex items-center gap-2.5">
            전체 콘텐츠 캘린더
          </h3>
          <span className="bg-white/90 dark:bg-slate-800/90 rounded-md px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            {month + 1}월 현황
          </span>
          
          {/* Weather Widget Capsule */}
          <div className="flex items-center gap-2 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 rounded-full px-3.5 py-1 text-xs text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span>신촌 캠퍼스</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            {weatherLoading ? (
              <span className="text-slate-600 dark:text-slate-500 font-medium">날씨 확인 중...</span>
            ) : currentWeatherInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.95rem' }}>{currentWeatherInfo.icon}</span>
                <span className="text-slate-600 dark:text-slate-300 font-semibold">{currentWeatherInfo.text}</span>
                <span className="text-slate-950 dark:text-white font-black tabular-nums">{currentWeather?.temperature_2m}°C</span>
              </div>
            ) : (
              <span style={{ color: '#EF4444' }}>날씨 정보 없음</span>
            )}
          </div>
        </div>

        {/* Prev / Next Page Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button 
            onClick={handlePrev} 
            title="이전 달"
            className="motion-btn motion-scale w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-[box-shadow,transform]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button 
            onClick={handleNext} 
            title="다음 달"
            className="motion-btn motion-scale w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-[box-shadow,transform]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      
      {/* Single Month Calendar & Content Table View */}
      {/* 창 너비와 무관하게 항상 좌우 2열 사이드바 레이아웃을 유지한다. 캘린더 컬럼은
          내부 스크롤/높이 제한 없이 실제 크기 그대로 렌더링되고, JS transform으로
          페이지 스크롤을 따라 내려온다(sticky는 이 페이지의 스크롤 컨테이너 구조상 동작하지 않음). */}
      <div ref={containerRef} className="grid grid-cols-[minmax(320px,380px)_1fr] gap-4 sm:gap-6 items-start">
        <div
          ref={calendarRef}
          style={{
            transform: `translateY(${translateY}px)`,
            transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform'
          }}
        >
          <ContinuousCalendar
            baseYear={year}
            baseMonth={month}
            contents={rawContents}
            weather={weather}
            hoveredDate={calendarHighlightDate}
            clickedDate={clickedDate}
            setHoveredDate={setCalHoveredDate}
            setClickedDate={setClickedDate}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
        <div className="min-w-0">
          <MonthTable
            year={year}
            month={month}
            myContents={rawContents}
            calActiveDate={calActiveDate}
            clickedDate={clickedDate}
            setClickedDate={setClickedDate}
            listHoveredDate={listHoveredDate}
            setListHoveredDate={setListHoveredDate}
            allProfiles={allProfiles}
          />
        </div>
      </div>
    </div>
  );
}
