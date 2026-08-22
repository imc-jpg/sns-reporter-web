'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { DriveColorIcon, DriveLockedIcon } from './driveIcons';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from './platformIcons';

interface MobileCalendarProps {
  contents: any[];
  allProfiles?: any[];
  // 그리드/리스트 전환 상태를 셸로 끌어올렸다 — 리스트뷰일 때만 셸의 하단 액션바를
  // 띄워야 하기 때문(MobileShell 참고).
  viewType: 'grid' | 'list';
  onViewTypeChange: (v: 'grid' | 'list') => void;
  // 리스트뷰 및 날짜팝업 공통 — 전체 리스트/대시보드와 동일한 선택 상태를 공유한다
  // (MobileFullList와 같은 selectedItem/onSelectItem 패턴). 날짜팝업에서 선택된
  // 콘텐츠는 이제(전체 리스트와 동일하게) 그 항목 블록 자체가 늘어나는 인라인
  // 확장으로 액션 아이콘을 보여준다 — 더 이상 셸의 플로팅 액션바를 쓰지 않는다.
  selectedItem: any;
  onSelectItem: (item: any) => void;
  // 날짜팝업 인라인 확장 아이콘 3개(📋/드라이브상태/💬)가 쓰는 셸의 공용 핸들러 —
  // MobileFullList와 동일한 시그니처.
  user?: any;
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
  onOpenSubmit: (mode: 'proposal' | 'final', targetItem?: any) => void;
  onOpenComments: (item: any) => void;
}

const parseBody = (item: any) => {
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

// 콘텐츠 카드 우측 하단 "유형 · 참여인원" 표시용 — 참여인원(crew)이 있으면 그
// 전원(쉼표 구분)을, 없으면 작성자 한 명만 보여준다. 대시보드/전체 리스트와
// 카드 레이아웃을 통일하며 함께 도입한 헬퍼로, 세 화면 모두 동일한 기준을 쓴다.
const getCrewLabel = (item: any) => {
  const bodyObj = parseBody(item);
  let names: string[] = [];
  if (bodyObj.crew) {
    if (typeof bodyObj.crew === 'string') names = bodyObj.crew.split(',').map((s: string) => s.trim()).filter(Boolean);
    else if (Array.isArray(bodyObj.crew)) names = bodyObj.crew;
  }
  return names.length > 0 ? names.join(', ') : item.author_name;
};

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getPlatformIcon = (contentType: string) => {
  if (!contentType) return <GenericPostIcon className="w-4 h-4" />;
  if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return <YoutubeIcon className="w-4 h-4" />;
  if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return <InstagramIcon className="w-4 h-4" />;
  if (contentType.includes('글') || contentType.includes('블로그')) return <NaverBlogIcon className="w-4 h-4" />;
  return <GenericPostIcon className="w-4 h-4" />;
};

// 그리드뷰 날짜 셀의 이벤트 막대 색 — 플랫폼별 구분:
// 유튜브는 레드(#DC2626), 인스타그램은 옐로우(#FFB800), 네이버블로그는 그린(#16A34A)
const getPlatformColor = (contentType: string) => {
  if (!contentType) return '#64748B';
  if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return '#DC2626';
  if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return '#FFB800';
  if (contentType.includes('글') || contentType.includes('블로그')) return '#16A34A';
  return '#64748B';
};

const getPlatformTextColor = (contentType: string) => {
  if (contentType && (contentType.includes('카드뉴스') || contentType.includes('인스타'))) return '#000000';
  return '#FFFFFF';
};

// Open-Meteo의 WMO weather_code를 아이콘+한글 라벨로 — 전체 코드표 중 서울 날씨
// 안내에 실질적으로 쓰이는 구간만 간추렸다.
const describeWeatherCode = (code: number): { icon: string; label: string } => {
  if (code === 0) return { icon: '☀️', label: '맑음' };
  if (code <= 2) return { icon: '🌤️', label: '대체로 맑음' };
  if (code === 3) return { icon: '☁️', label: '흐림' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: '안개' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: '이슬비' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: '비' };
  if (code >= 71 && code <= 77) return { icon: '❄️', label: '눈' };
  if (code >= 80 && code <= 82) return { icon: '🌦️', label: '소나기' };
  if (code >= 85 && code <= 86) return { icon: '🌨️', label: '눈 소나기' };
  if (code >= 95) return { icon: '⛈️', label: '뇌우' };
  return { icon: '🌡️', label: '' };
};

// 날씨 상태별 시그니처 배경/텍스트 — 실제 색상은 globals.css의 --m-weather-*
// 토큰(라이트/다크 각각 다른 값)을 그대로 참조해, 날짜/기온 숫자가 어떤 테마
// 에서도 배경과 충분한 대비를 이루고 날씨끼리도 색상만으로 뚜렷이 구분된다.
const getWeatherBgColor = (code: number): string => {
  if (code === 0) return 'var(--m-weather-clear-bg)';
  if (code <= 2) return 'var(--m-weather-partly-bg)';
  if (code === 3) return 'var(--m-weather-cloudy-bg)';
  if (code === 45 || code === 48) return 'var(--m-weather-fog-bg)';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'var(--m-weather-rain-bg)';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'var(--m-weather-snow-bg)';
  if (code >= 95) return 'var(--m-weather-storm-bg)';
  return 'var(--m-weather-default-bg)';
};

const getWeatherTextColor = (code: number): string => {
  if (code === 0) return 'var(--m-weather-clear-text)';
  if (code <= 2) return 'var(--m-weather-partly-text)';
  if (code === 3) return 'var(--m-weather-cloudy-text)';
  if (code === 45 || code === 48) return 'var(--m-weather-fog-text)';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'var(--m-weather-rain-text)';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'var(--m-weather-snow-text)';
  if (code >= 95) return 'var(--m-weather-storm-text)';
  return 'var(--m-weather-default-text)';
};

export default function MobileCalendar({ contents, allProfiles = [], viewType, onViewTypeChange, selectedItem, onSelectItem, user, onOpenDetail, onOpenSubmit, onOpenComments }: MobileCalendarProps) {
  // 완성본 미업로드+권한 없음 상태에서 잠김 아이콘을 눌렀을 때 뜨는 안내 토스트 —
  // MobileFullList와 동일한 패턴.
  const [lockedToastVisible, setLockedToastVisible] = useState(false);
  useEffect(() => {
    if (!lockedToastVisible) return;
    const t = setTimeout(() => setLockedToastVisible(false), 1800);
    return () => clearTimeout(t);
  }, [lockedToastVisible]);
  // 상단 바의 Today 버튼을 날씨 위젯으로 교체 — 날짜팝업 안의 별도 Today 버튼(콘텐츠로
  // 이동하는 기존 기능)은 그대로 두고, 이 상단 버튼만 서울 날씨를 보여주는 용도로
  // 바뀐다(요청: 기능 폐지가 아닌 대체). 기상청 API는 키 발급이 필요해, 키 없이 바로
  // 쓸 수 있는 무료 API인 Open-Meteo를 서울 좌표(위도 37.5665, 경도 126.9780) 고정으로
  // 사용한다.
  // 처음엔 버튼을 누르면 현재 날씨 하나만 작은 팝업으로 보여줬는데, "별도 창이 아니라
  // 그리드에서 콘텐츠 표시가 사라지고 날짜별 기온/날씨로 바뀌어야 한다"는 요청으로
  // 팝업을 없애고 그리드 자체를 토글하는 방식으로 바꿨다 — 날짜별로 보여주려면 "지금"
  // 하나가 아니라 여러 날짜의 예보가 필요해 daily 엔드포인트로 바꿨다. Open-Meteo
  // 무료 예보는 최대 16일 앞까지만 제공되므로(과거·먼 미래 날짜는 데이터가 없음),
  // 그 범위 밖의 날짜는 빈 칸으로 남는다 — 이는 무료 API 자체의 한계다.
  const [weatherView, setWeatherView] = useState(false);
  const [dailyWeather, setDailyWeather] = useState<Record<string, { code: number; max: number; min: number }> | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const handleToggleWeatherView = () => {
    setWeatherView(v => !v);
    if (dailyWeather || weatherLoading) return;
    setWeatherLoading(true);
    setWeatherError(false);
    fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&daily=weather_code,temperature_2m_max,temperature_2m_min&past_days=10&forecast_days=16&timezone=Asia%2FSeoul')
      .then(res => {
        if (!res.ok) throw new Error('weather fetch failed');
        return res.json();
      })
      .then(data => {
        const map: Record<string, { code: number; max: number; min: number }> = {};
        (data.daily.time as string[]).forEach((dateStr, i) => {
          map[dateStr] = {
            code: data.daily.weather_code[i],
            max: Math.round(data.daily.temperature_2m_max[i]),
            min: Math.round(data.daily.temperature_2m_min[i]),
          };
        });
        setDailyWeather(map);
      })
      .catch(() => setWeatherError(true))
      .finally(() => setWeatherLoading(false));
  };
  const [currentDate, setCurrentDate] = useState(new Date()); // Defaults to Today's current date
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate()); // Defaults to Today's day number
  const [activeStep, setActiveStep] = useState<'main' | 'date_popup'>('main');
  // 팝업 안에서는 "날짜"가 스와이프 단위다 — 한 날짜의 콘텐츠 여러 개는 세로로
  // 나열하고, 좌우 스와이프는 콘텐츠가 있는 다음/이전 "날짜"로 넘어간다(빈 날짜는
  // 건너뜀). 예: 15일 2개 / 17일 1개 있으면 16일은 스와이프에서 그냥 지나침.
  const [popupDateIndex, setPopupDateIndex] = useState(0);
  // 이전엔 네이티브 가로 스크롤(overflow-x-auto + snap)로 카드를 넘겼는데, "스크롤
  // 느낌이 강하다"는 피드백으로 스크롤 자체를 없애고 transform 기반 스와이프로
  // 바꿨다 — popupViewportRef가 잘려 보이는 창(overflow-hidden), popupScrollRef가
  // 그 안에서 translateX로 움직이는 실제 카드 행이다. 자식 카드들의 offsetLeft는
  // (transform은 레이아웃에 영향을 주지 않으므로) 항상 정적 flex 레이아웃 기준 그대로라,
  // 이전 scrollPopupTo와 똑같은 중앙 정렬 계산식을 그대로 재사용할 수 있다.
  const popupViewportRef = React.useRef<HTMLDivElement>(null);
  const popupScrollRef = React.useRef<HTMLDivElement>(null);
  const [popupTranslateX, setPopupTranslateX] = useState(0);

  // useLayoutEffect(브라우저가 그리기 전에 동기 실행)라 팝업이 막 열렸을 때 "0(초기값)
  // 위치 → 올바른 위치"로 잘못된 좌표가 실제로 화면에 그려지는 순간 자체가 없다 —
  // 그 이후(스와이프/점/오늘 버튼으로) 인덱스가 바뀔 때만 진짜로 눈에 보이는
  // transform 전환(트랜지션)이 재생된다.
  useLayoutEffect(() => {
    const viewport = popupViewportRef.current;
    const row = popupScrollRef.current;
    const target = row?.children[popupDateIndex] as HTMLElement | undefined;
    if (!viewport || !target) return;
    setPopupTranslateX(-(target.offsetLeft - (viewport.clientWidth - target.clientWidth) / 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupDateIndex, activeStep]);

  // 월 스와이프와 동일한 관례: 드래그 중 위치를 따라가지 않고, 손을 뗐을 때 총
  // 이동량(dx)만 보고 한 칸(다음/이전 날짜)만 딱 잘라 넘긴다 — "블록에서 블록으로"
  // 이동한 느낌을 주는 핵심(연속적으로 끌리는 스크롤이 아니라 이산적인 스텝).
  const dateSwipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const handleDateSwipeStart = (e: React.PointerEvent) => {
    dateSwipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleDateSwipeEnd = (e: React.PointerEvent) => {
    const start = dateSwipeStart.current;
    dateSwipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) setPopupDateIndex(i => Math.max(0, i - 1));
      else setPopupDateIndex(i => Math.min(datesWithContent.length - 1, i + 1));
    }
  };

  // 콘텐츠가 없는 빈 날짜 상태에서도 스와이프하면 그 방향의 가장 가까운 "콘텐츠가
  // 있는" 날짜로 바로 넘어간다(요청 반영) — 콘텐츠 카러셀처럼 인덱스를 ±1 하는 게
  // 아니라, 지금 보고 있는 빈 날짜를 기준으로 datesWithContent에서 방향에 맞는
  // 후보만 걸러 그중 가장 가까운 날짜(오른쪽 스와이프=이전 날짜 중 최댓값, 왼쪽
  // 스와이프=다음 날짜 중 최솟값)를 찾는다. 같은 달 안에 그 방향으로 콘텐츠가
  // 전혀 없으면 아무 것도 하지 않는다.
  const handleEmptyDateSwipeEnd = (e: React.PointerEvent) => {
    const start = dateSwipeStart.current;
    dateSwipeStart.current = null;
    if (!start || selectedDay === null) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const candidates = dx > 0
        ? datesWithContent.filter(d => d < selectedDay)
        : datesWithContent.filter(d => d > selectedDay);
      if (candidates.length === 0) return;
      const nearest = dx > 0 ? Math.max(...candidates) : Math.min(...candidates);
      setPopupDateIndex(datesWithContent.indexOf(nearest));
      setSelectedDay(nearest);
    }
  };

  // (예전엔 여기서 document.body/html에 직접 overflow:hidden을 걸어 그리드뷰/
  // 날짜팝업일 때만 페이지 레벨 스크롤을 막았는데, "웹앱 전체에서 이 문서 스크롤
  // 자체가 있으면 안 된다"는 요청으로 MobileShell 레벨의 상시 잠금으로 옮겼다 —
  // 화면별 조건 분기 없이 앱이 떠 있는 동안 항상 잠겨있고, 각 화면 내부의 자체
  // 스크롤 컨테이너(<main>의 overflow-y-auto 등)는 그와 무관하게 정상 동작한다.)

  // 다른 날짜 슬라이드로 넘어가면(스와이프든 "오늘로 이동"이든) 이전 날짜에서
  // 선택했던 항목이 화면 밖으로 사라지므로 선택도 함께 초기화한다 — 안 보이는
  // 항목을 대상으로 액션바가 뜬 채 남아있는 걸 방지.
  useEffect(() => {
    onSelectItem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupDateIndex]);

  const closePopup = () => {
    setActiveStep('main');
    onSelectItem(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Rolling window instead of a hardcoded array so the dropdown never goes stale
  const todayYear = new Date().getFullYear();
  const yearOptions = [todayYear - 1, todayYear, todayYear + 1, todayYear + 2];

  const monthNames = [
    '1월 (Jan)', '2월 (Feb)', '3월 (Mar)', '4월 (Apr)', '5월 (May)', '6월 (Jun)',
    '7월 (Jul)', '8월 (Aug)', '9월 (Sep)', '10월 (Oct)', '11월 (Nov)', '12월 (Dec)'
  ];

  // 월 전환 모션 방향 — 다음 달로 가면(시간이 앞으로 흐르니) 새 달이 오른쪽에서
  // 들어오고, 이전 달로 가면 왼쪽에서 들어온다. 아래 렌더에서 이 값에 따라
  // slide-in-from-left/right 클래스를 고른다.
  const [monthEnterDir, setMonthEnterDir] = useState<'left' | 'right'>('right');

  // Helper for prev/next month
  const handlePrevMonth = () => {
    setMonthEnterDir('left');
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setMonthEnterDir('right');
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 좌우 스와이프로도 월 이동 — 화살표 버튼과 동일한 동작을 제스처로 제공.
  const monthSwipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const handleMonthSwipeStart = (e: React.PointerEvent) => {
    monthSwipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleMonthSwipeEnd = (e: React.PointerEvent) => {
    const start = monthSwipeStart.current;
    monthSwipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) handlePrevMonth();
      else handleNextMonth();
    }
  };
  // "Today"는 이제 단순히 오늘 날짜로 선택만 옮기는 게 아니라, 그 날짜를 탭했을 때와
  // 완전히 동일하게 날짜팝업을 바로 연다. datesWithContent는 지금 보고 있는(바뀌기
  // 전) 달 기준 렌더값이라, 다른 달을 보던 중이면 그대로 못 쓴다 — 오늘이 속한 달의
  // 콘텐츠 날짜 목록을 이 자리에서 다시 계산해 정확한 팝업 인덱스를 구한다.
  const handleToday = () => {
    const today = new Date();
    const ty = today.getFullYear();
    const tm = today.getMonth();
    const td = today.getDate();
    setCurrentDate(today);
    setSelectedDay(td);
    const datesForToday = Array.from(new Set(
      contents
        .map(item => {
          const bodyObj = parseBody(item);
          const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0];
          if (!targetDate) return null;
          const prefix = `${ty}-${String(tm + 1).padStart(2, '0')}`;
          return targetDate.startsWith(prefix) ? Number(targetDate.split('-')[2]) : null;
        })
        .filter((d): d is number => d !== null)
    )).sort((a, b) => a - b);
    setPopupDateIndex(Math.max(0, datesForToday.indexOf(td)));
    setActiveStep('date_popup');
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(Number(e.target.value), month, 1));
  };
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(year, Number(e.target.value), 1));
  };

  // Days calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Grid cells (padding prev month days)
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push({ day: null, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, isCurrentMonth: true });
  }
  const calendarRowCount = Math.ceil(calendarCells.length / 7);

  // 그리드 셀 높이 — 예전엔 h-[6.25rem] 고정값이라 기기 화면이 작거나(6주짜리 달)
  // 위/아래 플로팅 UI(상단 월 선택 바, 하단 네비/액션 버튼)에 맨 위 요일 줄이나
  // 마지막 주가 가려지는 문제가 있었다. 이제 실제로 남는 세로 공간을 측정해 그 달의
  // 실제 주 수(4~6주)로 나눠 셀 높이를 매번 다시 계산한다 — <main>은 이미 하단
  // 네비 영역만큼 padding-bottom을 갖고 있으므로(MobileShell 참고), 그 padding-box
  // 안쪽 경계까지의 거리만 재면 따로 네비 높이를 하드코딩할 필요가 없고, 기기·화면
  // 크기가 달라져도 항상 정확히 맞는다.
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [cellHeightPx, setCellHeightPx] = useState(100);
  useLayoutEffect(() => {
    const computeCellHeight = () => {
      const gridEl = gridRef.current;
      if (!gridEl) return;
      const mainEl = gridEl.closest('main');
      if (!mainEl) return;
      const mainRect = mainEl.getBoundingClientRect();
      const mainStyle = window.getComputedStyle(mainEl);
      const paddingBottom = parseFloat(mainStyle.paddingBottom) || 0;
      const availableBottom = mainRect.bottom - paddingBottom;
      const gridTop = gridEl.getBoundingClientRect().top;
      const gapPx = 4; // gap-1 = 0.25rem, mobile-rem-base가 1rem=16px로 고정
      const totalGap = (calendarRowCount - 1) * gapPx;
      const raw = (availableBottom - gridTop - totalGap) / calendarRowCount;
      // 예전엔 Math.max(60, ...)로 최소 60px를 강제했는데, raw(실제 남는 공간)가
      // 60px보다 작은 경우(6주짜리 달 + 작은 화면 조합) 그리드 총 높이가 실제 가용
      // 공간을 넘어서 버렸다 — <main>이 스크롤 불가(overflow-hidden) 상태라 그 초과분이
      // 그대로 화면 밖으로 잘려서 보이는 버그였다. "항상 화면에 맞게 딱 들어차는 것"이
      // 이 계산의 목적이므로, 아주 작은 화면에서도 절대 넘치지 않도록 하한을 훨씬
      // 낮췄다(완전히 없애면 극단적으로 이론상 음수/0이 될 수 있어 안전장치만 남김).
      setCellHeightPx(Math.max(36, Math.floor(raw)));
    };
    computeCellHeight();
    window.addEventListener('resize', computeCellHeight);
    return () => window.removeEventListener('resize', computeCellHeight);
  }, [calendarRowCount, viewType, year, month]);

  // Filter events for day
  const getEventsForDay = (dayNum: number) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return contents.filter(item => {
      const bodyObj = parseBody(item);
      const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0];
      return targetDate === targetDateStr;
    });
  };

  // Filter events for entire current month (List View) — 날짜순 정렬까지 하려면
  // 필터와 정렬 둘 다에서 같은 날짜 추출 로직이 필요해 헬퍼로 뺐다.
  const getEventDateStr = (item: any) => {
    const bodyObj = parseBody(item);
    return item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0] || '';
  };
  const monthEvents = contents
    .filter(item => {
      const targetDate = getEventDateStr(item);
      if (!targetDate) return false;
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      return targetDate.startsWith(prefix);
    })
    .sort((a, b) => getEventDateStr(a).localeCompare(getEventDateStr(b)));

  // 이번 달에서 콘텐츠가 있는 날짜만 오름차순으로 — 팝업 좌우 스와이프가 넘나드는 단위.
  const datesWithContent = Array.from(
    new Set(
      monthEvents
        .map(item => {
          const bodyObj = parseBody(item);
          const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.targetDate || item.created_at?.split('T')[0];
          return targetDate ? Number(targetDate.split('-')[2]) : null;
        })
        .filter((d): d is number => d !== null)
    )
  ).sort((a, b) => a - b);

  const tappedDayHasContent = selectedDay !== null && datesWithContent.includes(selectedDay);
  const displayDay = tappedDayHasContent
    ? datesWithContent[Math.min(popupDateIndex, datesWithContent.length - 1)]
    : selectedDay;

  const selectedDayItems = displayDay ? getEventsForDay(displayDay) : [];

  return (
    <div className="space-y-4 pb-28 text-slate-900 select-none">
      
      {/* ========================================================= */}
      {/* STATE 1: 캘린더 메인 (월간 캘린더 & 조절 바) — Timeblocks 참고 캡처처럼 흰색
          카드 배경 위에 얹힌 형태가 아니라, 셸의 기본 배경(<main>) 위에 캘린더가
          직접 구성되도록 카드 스타일(bg-white/rounded-3xl/shadow/border)을 제거했다. */}
      {/* ========================================================= */}
      <div className="space-y-4">

        {/* Top Controls: Year/Month Range Dropdowns & View Toggle & Weather — 각자
            독립된 글래스 조각(다른 화면들과 동일한 "해체된 글래스" 관례)이고, main의
            스크롤 컨테이너 상단에 sticky로 고정해 그리드/리스트를 내려도 계속
            보인다. "n월 일정표" 제목·좌우 화살표 내비게이터는 요청대로 제거 —
            월 이동은 이 바의 드롭다운과 아래 좌우 스와이프 제스처로 충분하다.
            예전엔 좌(연/월)·우(뷰전환/날씨) 두 그룹으로 나눠 justify-between으로
            배치했는데, "네 요소가 한 행에 일직선으로 나란히"라는 요청으로 하나의
            flex-nowrap 행에 전부 합쳤다 — 좁은 화면에서도 줄바꿈되지 않도록 뷰
            전환 버튼 라벨을 "리스트 보기"에서 "리스트"로 줄였다. */}
        <div
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
            // Tailwind의 from-[#F4F5F7]/via-[#F4F5F7] 그라데이션 유틸은 다크모드
            // 토큰 매핑이 안 되는 arbitrary-value 클래스라 항상 밝은 회색으로
            // 남는다 — var(--m-bg)를 직접 써서 라이트/다크 전환에 자동으로 따라가게 한다.
            backgroundImage: 'linear-gradient(to bottom, color-mix(in srgb, var(--m-bg) 80%, transparent) 0%, color-mix(in srgb, var(--m-bg) 45%, transparent) 60%, transparent 100%)',
          }}
          className="sticky -top-12 -mt-6 -mx-4 px-4 pt-12 pb-6 z-30 flex items-center flex-nowrap gap-1.5 w-[calc(100%+2rem)] backdrop-blur-md"
        >
          {/* select는 전역 베이스 스타일(input,textarea,select { width:100% })의 대상이라
              w-auto로 그 100%를 명시적으로 덮어써야 한다 — flex-shrink-0만 있고 w-auto가
              빠지면 select가 행 전체 폭을 자기 몫으로 요구해(shrink는 안 하되 basis가
              100%) 다른 컨트롤들을 화면 밖으로 밀어내는 버그가 있었다(1차 구현에서 실측
              발견). */}
          <select
            value={year}
            onChange={handleYearChange}
            className="glass-cta w-auto flex-shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003378]/50"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>

          <select
            value={month}
            onChange={handleMonthChange}
            className="glass-cta w-auto flex-shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003378]/50"
          >
            {monthNames.map((mName, idx) => (
              <option key={idx} value={idx}>{mName}</option>
            ))}
          </select>

          <button
            onClick={() => onViewTypeChange(viewType === 'grid' ? 'list' : 'grid')}
            className="glass-cta flex-1 px-2.5 py-1.5 rounded-xl text-xs font-black text-slate-700 flex items-center justify-center gap-1 whitespace-nowrap active:scale-95 transition-transform"
          >
            <span>{viewType === 'grid' ? '📋 리스트' : '📅 달력'}</span>
          </button>

          {/* 날씨(구 Today) — 팝업으로 값을 보여주던 것을, 탭하면 그리드 자체가
              콘텐츠 대신 날짜별 기온/날씨로 바뀌는 토글로 변경(아래 그리드뷰
              렌더 참고). 콘텐츠로 이동하던 기존 Today 기능은 날짜팝업 안쪽
              버튼(§ 아래 STATE 2)에 그대로 남아있다. */}
          <button
            onClick={handleToggleWeatherView}
            className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap active:scale-95 transition-transform flex items-center justify-center gap-1 ${
              weatherView ? 'bg-[#003378] text-white shadow-sm' : 'glass-cta-sky text-[#003378]'
            }`}
          >
            <span>🌤️</span>
            <span>날씨</span>
          </button>
        </div>

        {/* 좌우 스와이프로 월 이동 — grid/list 뷰 공통. `key`를 연/월로 걸어 달이
            바뀔 때마다 이 서브트리를 통째로 재마운트시키고, 그 순간 tailwindcss-animate의
            enter 애니메이션(슬라이드+페이드)이 자동으로 재생된다 — 부드럽게 스크롤되는
            느낌이 아니라 "블록이 옆에서 들어와 자리 잡는" 느낌을 내려는 의도(요청:
            Figma Smart Animate "Gentle" 정도, 과하지 않게). 스크롤 자체가 필요 없다는
            요청에 맞춰 이 화면은(그리드뷰일 때) 셸의 <main>도 overflow-hidden으로
            잠근다(MobileShell 참고) — 상하 스크롤 없이 좌우 스와이프로만 달을 넘긴다. */}
        <div
          key={`${year}-${month}`}
          onPointerDown={handleMonthSwipeStart}
          onPointerUp={handleMonthSwipeEnd}
          className={`space-y-4 animate-in fade-in duration-200 ease-out ${monthEnterDir === 'left' ? 'slide-in-from-left-8' : 'slide-in-from-right-8'}`}
          // touchAction: 'pan-x'는 그리드뷰(스크롤 자체가 필요 없음)에는 맞지만, 이
          // 래퍼가 리스트뷰까지 함께 감싸고 있어 리스트뷰의 세로 스크롤까지 막아버리는
          // 버그였다(실기기 제보로 발견) — 리스트뷰일 때는 세로 팬을 허용한다.
          style={{ touchAction: viewType === 'grid' ? 'pan-x' : 'pan-y' }}
        >
        {/* GRID VIEW MODE */}
        {viewType === 'grid' ? (
          <>
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <span key={d} className={`text-xs font-extrabold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-[#003378]' : 'text-slate-400'}`}>
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid — Timeblocks 스타일 참고로 재구성: 정사각형 셀 대신
                세로로 넉넉한 셀에 이벤트를 꽉 찬 너비의 막대(pill)로 여러 개 쌓아
                보여준다(기존엔 aspect-square + 최대 2개 축소 뱃지라 가독성이 떨어졌음).
                한 화면에 다 안 들어가면 세로 스크롤(<main>이 이미 지원)로 본다.
                셀 높이는 min-height가 아니라 고정 height다 — min-height를 쓰면 CSS
                grid가 각 행(row) 트랙 높이를 그 행에서 가장 이벤트 많은 셀의 콘텐츠에
                맞춰 자동으로 늘리고, 기본 align-items:stretch 때문에 같은 행의 다른
                셀들까지 전부 그 늘어난 높이로 따라 늘어난다(실측: 이벤트 3개짜리
                날짜가 있던 마지막 줄만 88px→98px로 비정상적으로 커졌었음) — 고정
                height + overflow-hidden으로 모든 셀이 콘텐츠 양과 무관하게 항상
                같은 크기를 유지하도록 했다. */}
            <div ref={gridRef} className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                if (!cell.day) {
                  return <div key={idx} style={{ height: cellHeightPx }} className="bg-slate-50/40 rounded-lg" />;
                }

                const dayEvents = getEventsForDay(cell.day);
                const isSelected = selectedDay === cell.day;
                const dayOfWeek = (firstDayOfWeek + cell.day - 1) % 7;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;
                // 셀 높이가 동적으로 줄어드는 만큼(위 cellHeightPx 계산 참고), 이벤트 막대를
                // 무조건 3개까지 그리면 작은 화면·6주짜리 달에서 마지막 막대가 셀 안에서
                // 잘려 보일 수 있다 — 뱃지(20px)+패딩(8px)+첫 간격(2px)을 뺀 나머지를
                // 막대 한 줄(15px)+간격(2px) 단위로 나눠 실제로 온전히 들어가는 개수만
                // 보여주고, 나머지는 항상 있던 "+N" 요약으로 넘긴다.
                const maxVisibleEvents = Math.max(1, Math.min(3, Math.floor((cellHeightPx - 28) / 17)));
                const visibleEvents = dayEvents.slice(0, maxVisibleEvents);
                const moreCount = dayEvents.length - visibleEvents.length;

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                const weatherInfo = dailyWeather?.[dateStr];
                const weatherBg = weatherView && cell.isCurrentMonth && weatherInfo ? getWeatherBgColor(weatherInfo.code) : undefined;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        setSelectedDay(cell.day);
                        const idx = datesWithContent.indexOf(cell.day);
                        setPopupDateIndex(idx >= 0 ? idx : 0);
                        setActiveStep('date_popup');
                      }
                    }}
                    style={{
                      height: cellHeightPx,
                      background: isSelected ? undefined : weatherBg,
                    }}
                    className={`p-1 rounded-xl flex flex-col gap-0.5 transition-[opacity,background-color,box-shadow] cursor-pointer overflow-hidden ${
                      !cell.isCurrentMonth ? 'opacity-30' : weatherBg ? 'shadow-2xs' : 'hover-fine:bg-slate-50 dark:hover-fine:bg-[#282A30]'
                    } ${isSelected ? 'bg-slate-100 dark:bg-white/10 ring-2 ring-slate-800 dark:ring-white/40 shadow-xs' : ''}`}
                  >
                    {/* Day Number */}
                    <span
                      style={{ fontFamily: 'Inter, sans-serif', color: !isSelected && weatherBg ? getWeatherTextColor(weatherInfo!.code) : undefined }}
                      className={`text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : weatherBg
                          ? ''
                          : isSunday
                          ? 'text-red-500'
                          : isSaturday
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* 날씨 토글이 켜져 있으면 콘텐츠 막대 대신 그 날짜의 기온/날씨를
                        보여준다 — 무료 예보(Open-Meteo)는 최대 16일 앞까지만 데이터가
                        있어, 범위 밖 날짜는 "–"로 표시한다. */}
                    {weatherView ? (
                      <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5">
                        {(() => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                          const w = dailyWeather?.[dateStr];
                          if (w) {
                            return (
                              <>
                                <span className="text-sm leading-none">{describeWeatherCode(w.code).icon}</span>
                                <span className="text-[9px] font-black leading-tight tabular-nums flex items-center justify-center gap-0.5">
                                  <span style={{ color: 'var(--m-weather-temp-max-text)' }}>{w.max}°</span>
                                  <span style={{ color: 'var(--m-weather-temp-sep-text)' }} className="font-normal">/</span>
                                  <span style={{ color: 'var(--m-weather-temp-min-text)' }}>{w.min}°</span>
                                </span>
                              </>
                            );
                          }
                          if (weatherLoading) return <span className="text-[9px] text-slate-300">···</span>;
                          return <span className="text-[10px] text-slate-300">–</span>;
                        })()}
                      </div>
                    ) : (
                      /* DB Event Bars — 꽉 찬 너비 막대로, 최대 3개 + 남은 개수 표시 */
                      <div className="flex-1 min-w-0 space-y-0.5">
                        {visibleEvents.map((item, i) => {
                          return (
                            <div
                              key={i}
                              className="w-full text-[8.5px] font-bold px-1 py-[3px] rounded truncate leading-tight"
                              style={{
                                backgroundColor: getPlatformColor(item.content_type),
                                color: getPlatformTextColor(item.content_type),
                              }}
                            >
                              {item.title}
                            </div>
                          );
                        })}
                        {moreCount > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold px-1">+{moreCount}개</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {weatherView && weatherError && (
              <div className="text-center text-xs text-slate-400 font-medium py-2">날씨 정보를 가져오지 못했습니다.</div>
            )}
          </>
        ) : (
          /* LIST VIEW MODE — 선택 시 전체 리스트/날짜팝업/대시보드와 동일하게 그
             블록 자체가 늘어나며 인라인으로 3개 아이콘이 나타난다(요청 반영, 더
             이상 셸의 공용 플로팅 액션바를 쓰지 않음). */
          <div className="space-y-2.5 pt-2">
            {monthEvents.length > 0 ? (
              monthEvents.map((item, idx) => {
                const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                const bodyObj = parseBody(item);
                const targetDate = item.target_date || bodyObj.desiredDate || item.created_at?.split('T')[0];
                const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
                const isSelected = selectedItem?.id === item.id;
                let authorEmail = '';
                try { authorEmail = JSON.parse(item.content_body || '{}').authorEmail || ''; } catch {}
                const weatherInfo = targetDate ? dailyWeather?.[targetDate] : undefined;
                const weatherBg = weatherView && weatherInfo ? getWeatherBgColor(weatherInfo.code) : undefined;

                return (
                  <div key={item.id || idx} className="flex items-center gap-2.5">
                    {/* 좌측: 독립된 날짜 블록 (날씨 뷰 활성화 시 세로 확장 + 날씨/기온 표시) */}
                    <div
                      style={{ backgroundColor: weatherBg }}
                      className={`text-center flex-shrink-0 flex flex-col items-center justify-center border border-slate-200/80 rounded-xl shadow-xs transition-[width,height,padding,background-color] ${
                        weatherView && weatherInfo
                          ? 'w-[56px] py-1.5 px-1 min-h-[54px]'
                          : 'w-11 h-11 bg-white'
                      }`}
                    >
                      <div
                        style={{ color: weatherBg ? getWeatherTextColor(weatherInfo!.code) : undefined }}
                        className={`font-black ${weatherBg ? '' : 'text-slate-900'} leading-tight ${weatherView && weatherInfo ? 'text-sm' : 'text-base'}`}
                      >
                        {targetDate ? targetDate.slice(8) : '--'}
                      </div>
                      {weatherView && (
                        <div className="flex items-center justify-center gap-1 mt-0.5 min-w-0">
                          {weatherInfo ? (
                            <>
                              <span className="text-xs leading-none">{describeWeatherCode(weatherInfo.code).icon}</span>
                              <div className="flex flex-col text-[8.5px] font-black leading-tight tabular-nums text-left">
                                <span style={{ color: 'var(--m-weather-temp-max-text)' }}>{weatherInfo.max}°</span>
                                <span style={{ color: 'var(--m-weather-temp-min-text)' }}>{weatherInfo.min}°</span>
                              </div>
                            </>
                          ) : weatherLoading ? (
                            <span className="text-[9px] text-slate-300">···</span>
                          ) : (
                            <span className="text-[9px] text-slate-300">–</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 우측: 전체 리스트/대시보드와 완전히 동일한 형태의 콘텐츠 카드 */}
                    <div
                      onClick={() => onSelectItem(isSelected ? null : item)}
                      className={`flex-1 min-w-0 rounded-xl shadow-xs transition-[background-color,box-shadow] cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-white/10 ring-2 ring-slate-800 dark:ring-white/40'
                          : 'bg-slate-50 dark:bg-[#282A30]/70 hover-fine:bg-slate-100 dark:hover-fine:bg-[#282A30]'
                      }`}
                    >
                      <div className="p-3.5 flex items-center justify-between gap-3 active:scale-[0.99]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                            {getPlatformIcon(item.content_type)}
                          </div>
                          <div className="min-w-0">
                            <div className={`text-sm font-bold truncate leading-snug ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-slate-100'}`}>{item.title}</div>
                            {/* 유형 · 참여인원 */}
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                              {item.content_type || '콘텐츠'} · {getCrewLabel(item)}
                            </div>
                          </div>
                        </div>

                        {!isSelected && isFinal && hasDriveLink && (
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-2xs" title="Google Drive Link">
                            <DriveColorIcon />
                          </div>
                        )}
                      </div>

                      {/* 선택 시 인라인 확장 3버튼 영역 */}
                      {isSelected && (() => {
                        const isAdminUser = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
                        const isOwnContent = !!(user?.email && authorEmail && user.email === authorEmail);
                        const canManage = isAdminUser || isOwnContent;
                        return (
                          <div className="px-3.5 pb-3.5 pt-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onOpenDetail(item, 'proposal')}
                              className="flex-1 h-10 rounded-lg bg-[#FFB800] border border-[#E6A600] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                              title="기획안 상세보기"
                            >
                              <span className="text-lg">📋</span>
                            </button>
                            {isFinal && hasDriveLink ? (
                              <button
                                onClick={() => onOpenDetail(item, 'final')}
                                className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                                title="완성본 상세보기"
                              >
                                <DriveColorIcon />
                              </button>
                            ) : canManage ? (
                              <button
                                onClick={() => onOpenSubmit('final', item)}
                                className="flex-1 h-10 rounded-lg bg-[#EBF3FF] border border-[#C0CFE4] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                                title="완성본 업로드"
                              >
                                <span className="text-lg">📤</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setLockedToastVisible(true)}
                                className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                                title="완성본이 아직 업로드되지 않았습니다"
                              >
                                <DriveLockedIcon />
                              </button>
                            )}
                            <button
                              onClick={() => onOpenComments(item)}
                              className="flex-1 h-10 rounded-lg bg-white border-2 border-slate-300 shadow-xs flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                              title="코멘트"
                            >
                              <span className="text-base">💬</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl font-medium">
                {year}년 {month + 1}월에 등록된 콘텐츠 스케줄이 없습니다.
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STATE 2: 캘린더 2 (선택 일자 팝업 / 바텀시트) */}
      {/* ========================================================= */}
      {activeStep === 'date_popup' && selectedDay && (
        // Figma 실제 프레임("캘린더 2(팝업)", 841:80023)을 스크린샷으로 다시 대조한
        // 결과 — 헤더 바(화살표+X)와 흰 카드로 감싼 하나의 팝업 쉘이 아니라, 날짜/날씨
        // 라벨이 카드 밖에 독립적으로 떠 있고 "카드 자체가 곧 그 날짜"인 구조였다.
        // 별도 닫기 버튼도 없다 — 배경(Dim)을 탭하면 닫히고, Today 버튼을 누르면
        // 오늘 날짜 카드로 곧장 이동한다. 날짜/날씨 라벨은 화면 기준 왼쪽 정렬이
        // 아니라 "그 날짜 카드 자신의" 좌상단에 위치해야 한다는 피드백으로, 카드
        // 밖 공용 요소가 아니라 각 날짜 카드 내부(및 빈 상태 박스 내부) 첫 줄로
        // 옮겼다 — 카드가 스와이프로 넘어가면 라벨도 자연히 그 카드와 함께 움직인다.
        <div
          className="fixed inset-0 z-50 bg-white/25 backdrop-blur-xs flex flex-col items-center justify-center gap-3 transition-opacity duration-200 overscroll-none"
          onClick={closePopup}
          onPointerDown={handleDateSwipeStart}
          onPointerUp={tappedDayHasContent ? handleDateSwipeEnd : handleEmptyDateSwipeEnd}
          style={{ touchAction: 'none' }}
        >
          {/* 요청 반영 — 스와이프 감지 영역을 카드 안쪽으로 한정하지 않고 이 배경
              전체(딤 처리된 화면 전체)로 넓혔다. 예전엔 popupViewportRef/빈 상태
              박스 각각에 따로 달려있던 핸들러를 여기 하나로 모았다(안쪽 요소에도
              중복으로 달아두면 포인터 이벤트가 버블링되며 두 번 겹쳐 발동해 카드가
              두 칸씩 넘어가 버리는 문제가 있어, 안쪽 것들은 제거). */}
          {tappedDayHasContent ? (
            <>
              {/* 카드가 화면을 꽉 채우는 게 아니라 다음/이전 날짜 카드가 양옆으로 아주
                  살짝(Figma 실측 기준 한 20px 안팎) 비쳐 보이는 peek 카러셀 — 슬라이드
                  폭을 "컨테이너 100% - 2.75rem"으로 고정해 남는 여백이 좌우 peek로
                  자연스럽게 나뉘도록 한다. 흰 카드 스타일은(예전엔 팝업 전체를 감싸던
                  바깥 셸에 있었던 것을) 이제 각 날짜 슬라이드 자신에게 준다 — "하나의
                  블록이 하나의 날짜"라 카드 자체가 곧 그 날짜의 콘텐츠 목록이다.
                  popupViewportRef(바깥, overflow-hidden으로 잘리는 창)와 popupScrollRef
                  (안쪽, translateX로 옆 카드로 옮겨가는 실제 행) 두 겹 구조 — 네이티브
                  스크롤을 완전히 없애고 스와이프(아래 handleDateSwipe*)로만 카드를
                  넘긴다("스크롤 느낌이 강하다"는 피드백 반영). */}
              <div
                ref={popupViewportRef}
                // pb-8(+pt-1): 가로 스와이프 peek 효과를 위해 overflow-hidden이 꼭
                // 필요한데, 패딩 없이 바로 카드에 붙어있으면 그 hidden 경계가 카드의
                // shadow-2xl(세로 오프셋이 커서 카드 아래쪽으로 특히 많이 번짐)까지
                // 함께 잘라버려 그림자 아래쪽이 뭉텅 잘린 것처럼 부자연스러워 보였다.
                // 카드 자체 높이/가로 스와이프 계산과는 무관한 여백이라 안전하게 추가.
                className="w-full max-w-sm sm:max-w-md overflow-hidden pt-1 pb-8"
                onClick={e => e.stopPropagation()}
                style={{ touchAction: 'pan-x' }}
              >
                <div
                  ref={popupScrollRef}
                  className="flex items-start gap-3"
                  style={{
                    transform: `translateX(${popupTranslateX}px)`,
                    transition: 'transform 0.28s cubic-bezier(0.22,1.1,0.36,1)',
                  }}
                >
                  {datesWithContent.map((day, dateIdx) => {
                    const dayItems = getEventsForDay(day);
                    return (
                      <div
                        key={day}
                        className={`flex-shrink-0 bg-white rounded-3xl shadow-2xl border border-slate-100 h-[60vh] overflow-y-auto ${dateIdx === 0 ? 'ml-5' : ''} ${dateIdx === datesWithContent.length - 1 ? 'mr-5' : ''}`}
                        style={{ width: 'calc(100% - 2.75rem)' }}
                      >
                        {/* Figma 원본(컴포넌트 863:18256)의 행 구조: 아이콘+제목/부제
                            한 줄짜리 컴팩트한 행 + 그 아래 최근 피드백 한 줄(점 구분자) —
                            실제 discussions 데이터가 있을 때만 피드백 줄을 보여준다.
                            탭하면 곧장 미리보기를 여는 대신, 대시보드/전체 리스트와
                            동일하게 "선택"만 한다 — 선택된 항목의 기획안/완성본
                            상세보기·업로드 버튼은 셸의 공용 하단 액션바가 그린다
                            (아래 items-start: 이 날짜 카드가 콘텐츠 개수가 다른 옆
                            날짜 카드와 같은 flex row에 있다 보니, 기본 align-items
                            stretch 때문에 콘텐츠가 적은 카드까지 옆 카드 높이만큼
                            빈 여백으로 늘어나 보이던 문제를 막는다). */}
                        <div className="p-4 space-y-2">
                          {/* 날짜/날씨 라벨 — 이 카드 자신의 날짜 기준, 카드 좌상단(패딩
                              바로 안쪽) 첫 줄. "요일, 월-날짜" 영문 축약형, 왼쪽 정렬. */}
                          <div className="flex items-center gap-1.5 pb-1">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight truncate">
                              <span className={new Date(year, month, day).getDay() === 0 ? 'text-red-500' : ''}>
                                {WEEKDAYS_EN[new Date(year, month, day).getDay()]}
                              </span>
                              , {MONTHS_EN[month]}-{day}
                            </h3>
                            <span className="text-lg flex-shrink-0">⛅</span>
                          </div>
                          {dayItems.map((item, idx) => {
                            const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                            const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
                            const bodyObj = parseBody(item);
                            const discussions = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];
                            const latestFeedback = discussions.length > 0 ? discussions[discussions.length - 1] : null;
                            const isItemSelected = selectedItem?.id === item.id;
                            let authorEmail = '';
                            try { authorEmail = JSON.parse(item.content_body || '{}').authorEmail || ''; } catch {}
                            return (
                              <div
                                key={item.id || idx}
                                onClick={() => onSelectItem(isItemSelected ? null : item)}
                                className={`rounded-2xl overflow-hidden transition-[transform,background-color,border-color,box-shadow] cursor-pointer active:scale-[0.99] shadow-xs border ${
                                  isItemSelected
                                    ? 'bg-[#EAF2FF] border-[#002454] ring-2 ring-[#002454]/20'
                                    : 'bg-slate-50 border-slate-200/80 hover-fine:bg-[#C0CFE4]/25 hover-fine:border-[#C0CFE4]'
                                }`}
                              >
                                <div className="p-3 flex items-center gap-2.5">
                                  {/* 대시보드/전체 리스트/캘린더 리스트뷰와 동일한 배지
                                      형태·배경색(옅은 회색)으로 통일. */}
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F4F5F7]">
                                    {getPlatformIcon(item.content_type)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-sm font-bold truncate leading-snug ${isItemSelected ? 'text-[#002454]' : 'text-slate-900'}`}>{item.title}</div>
                                    <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                      {item.content_type || '콘텐츠'} · {getCrewLabel(item)}
                                    </div>
                                  </div>
                                  {/* 기획안/완성본 구분은 텍스트 배지가 아니라 다른 화면들과
                                      동일하게 드라이브 아이콘 유무로만 — 선택 전(비확장)
                                      상태에서만 정보성으로 표시. */}
                                  {!isItemSelected && isFinal && hasDriveLink && (
                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center flex-shrink-0" title="Google Drive Link">
                                      <DriveColorIcon className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </div>
                                {latestFeedback && (
                                  <div className="px-3 pb-2.5 pt-2 border-t border-slate-200/70 flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1 flex-shrink-0" />
                                    <span className="text-[11px] text-slate-500 leading-snug line-clamp-1">
                                      {latestFeedback.type === 'final' ? '완성본' : '기획안'} - {latestFeedback.text}
                                    </span>
                                  </div>
                                )}
                                {/* 선택 시 인라인 확장 — 전체 리스트와 완전히 동일한 3버튼
                                    구조(📋/완성본 상태별/💬), flex-1로 균등 분배. 더 이상
                                    셸의 플로팅 액션바에 의존하지 않는다. */}
                                {isItemSelected && (() => {
                                  const isAdminUser = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
                                  const isOwnContent = !!(user?.email && authorEmail && user.email === authorEmail);
                                  const canManage = isAdminUser || isOwnContent;
                                  return (
                                    <div className="px-3 pb-3 pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => onOpenDetail(item, 'proposal')}
                                        className="flex-1 h-10 rounded-lg bg-[#FFB800] border border-[#E6A600] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                                        title="기획안 상세보기"
                                      >
                                        <span className="text-lg">📋</span>
                                      </button>
                                      {isFinal && hasDriveLink ? (
                                        <button
                                          onClick={() => onOpenDetail(item, 'final')}
                                          className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                                          title="완성본 상세보기"
                                        >
                                          <DriveColorIcon />
                                        </button>
                                      ) : canManage ? (
                                        <button
                                          onClick={() => onOpenSubmit('final', item)}
                                          className="flex-1 h-10 rounded-lg bg-[#EBF3FF] border border-[#C0CFE4] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                                          title="완성본 업로드"
                                        >
                                          <span className="text-lg">📤</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setLockedToastVisible(true)}
                                          className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                                          title="완성본이 아직 업로드되지 않았습니다"
                                        >
                                          <DriveLockedIcon />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => onOpenComments(item)}
                                        className="flex-1 h-10 rounded-lg bg-white border-2 border-slate-300 shadow-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                        title="코멘트"
                                      >
                                        <span className="text-base">💬</span>
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {datesWithContent.length > 1 && (
                <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {datesWithContent.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => setPopupDateIndex(i)}
                      className={`h-1.5 rounded-full transition-[width,background-color] ${i === popupDateIndex ? 'w-4' : 'w-1.5'}`}
                      style={{ backgroundColor: i === popupDateIndex ? 'var(--m-blue-text-strong, #002454)' : 'var(--m-text-faint, #cbd5e1)' }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div
              className="mx-5 p-4 bg-white rounded-2xl font-medium shadow-xl border border-slate-100"
              onClick={e => e.stopPropagation()}
              style={{ touchAction: 'pan-x' }}
            >
              {displayDay && (
                <div className="flex items-center gap-1.5 pb-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight truncate">
                    <span className={new Date(year, month, displayDay).getDay() === 0 ? 'text-red-500' : ''}>
                      {WEEKDAYS_EN[new Date(year, month, displayDay).getDay()]}
                    </span>
                    , {MONTHS_EN[month]}-{displayDay}
                  </h3>
                  <span className="text-lg flex-shrink-0">⛅</span>
                </div>
              )}
              <div className="py-6 text-center text-xs text-slate-400">
                이 날짜에 등록된 콘텐츠가 없습니다.
              </div>
            </div>
          )}

          {/* Today 버튼 — 날짜 카드(또는 빈 상태 카드) 바로 아래, 중앙 정렬로 상시
              노출한다(요청: 콘텐츠 유무와 무관하게 항상 접근 가능해야 함). 상단 스티키
              바의 "Today"와 같은 재질·라벨을 써서 같은 기능(handleToday)의 지름길임을
              시각적으로도 알 수 있게 했다. */}
          <div className="flex justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleToday}
              className="glass-cta-sky px-3 py-1.5 rounded-xl text-xs font-black text-[#003378] active:scale-95 transition-transform"
            >
              Today
            </button>
          </div>

          {lockedToastVisible && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-8" onClick={e => e.stopPropagation()}>
              <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
                완성본이 아직 업로드되지 않았습니다
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
