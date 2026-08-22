'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { sanitizeHtml } from '@/utils/sanitize';
import { cleanAuthorName } from '@/utils/dateUtils';

// 기획안(0)/완성본(1)/채팅방(2) 3요소를 "같은 위계"의 화면으로 취급해, 예전엔
// MobileDetailModal(기획안·완성본)과 MobileCommentsPage(채팅방)가 서로 다른 틀
// (헤더·바텀네비 각각 별도 구현)로 나뉘어 있어 화면 전환 모션이 서로 달랐다
// (기획안⇄완성본은 내용만 슬라이드, 채팅방은 화면 전체가 슬라이드) — 요청대로
// 두 컴포넌트를 하나로 합쳐, 손잡이·배지·하단 탭바·닫기 버튼이 있는 "틀" 하나가
// 3요소 모두에 대해 항상 그대로 유지된 채(리마운트 없음) 안쪽 콘텐츠(key={screen})
// 만 슬라이드로 바뀌도록 통일했다.
interface MobileTrioModalProps {
  isOpen: boolean;
  screen: 0 | 1 | 2;
  onScreenChange: (screen: 0 | 1 | 2) => void;
  onClose: () => void;
  item?: any;
  originRect?: DOMRect | null;
  startPeek?: boolean;
  peekTopVh?: number;
  onEdit?: (item: any, type: 'proposal' | 'final') => void;
  user?: any;
  // 3요소 중 처음 들어오는 경우엔 기존 시트(아래→위) 모션을, 이미 이 틀이 열려있는
  // 채로 다른 화면으로 넘어오는 경우엔 좌우 슬라이드 모션을 쓴다 — 셸이 계산해 넘겨준다.
  enterAnim?: 'sheet' | 'slide-left' | 'slide-right';
}

const CLOSE_MS = 420;
const SHEET_CLOSE_MS = 200;
const DEFAULT_PEEK_TOP_VH = 69.2;
const MAX_TEXTAREA_PX = 116; // 대략 4~5줄

const parseBody = (item: any) => {
  try {
    if (item?.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

// ContentsLayout.tsx(PC)의 parseCommentMarkdown과 동일한 안전한 서브셋만 허용.
const parseCommentMarkdown = (text: string) => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:800">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em style="font-style:italic">$1</em>');
  escaped = escaped.replace(/~~(.*?)~~/g, '<del>$1</del>');
  escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#3B82F6;font-weight:700;text-decoration:underline">$1</a>');
  escaped = escaped.replace(/\n/g, '<br />');
  return escaped;
};

const relativeTime = (iso: string) => {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

export default function MobileTrioModal({ isOpen, screen, onScreenChange, onClose, item, originRect, startPeek, peekTopVh, onEdit, user, enterAnim = 'sheet' }: MobileTrioModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const effectivePeekTopVh = peekTopVh ?? DEFAULT_PEEK_TOP_VH;

  // 화면(screen)은 셸이 들고 있는 단일 진실 소스 prop이라 로컬에 별도로 중복
  // 보관하지 않는다(예전엔 MobileDetailModal 내부의 currentTab이 로컬 상태였는데,
  // 셸을 거치지 않고 다른 경로로 "이 값과 이미 같은 type"을 다시 넘기면 동기화
  // effect가 재실행되지 않아 어긋나는 버그가 있었다 — 로컬 복제본 자체를 없애
  // 이 버그 클래스를 구조적으로 없앴다). 방향(좌/우) 계산만 이전 값과 비교해 로컬로 둔다.
  const prevScreenRef = useRef(screen);
  const [tabSlideDir, setTabSlideDir] = useState<'left' | 'right'>('right');
  useEffect(() => {
    if (prevScreenRef.current !== screen) {
      setTabSlideDir(screen > prevScreenRef.current ? 'right' : 'left');
      prevScreenRef.current = screen;
    }
  }, [screen]);

  const modalRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'entering' | 'open' | 'closing'>(originRect ? 'entering' : 'open');
  const [originTransform, setOriginTransform] = useState<string | undefined>(undefined);
  const [viewState, setViewState] = useState<'peek' | 'full'>(startPeek ? 'peek' : 'full');
  const [isClosingPeek, setIsClosingPeek] = useState(false);
  const [isClosingSheet, setIsClosingSheet] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // 내용 블록 탭-투-카피 (기획안/완성본 전용) — 정지 상태에서 한 번 탭하면 "탭하여
  // 복사" 확인 상태로 바뀌고, 한 번 더 탭하면 실제 복사된다.
  const [copyArmedField, setCopyArmedField] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const htmlToPlainText = (html: string) => {
    if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
    const withBreaks = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n');
    const div = document.createElement('div');
    div.innerHTML = withBreaks;
    return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  };
  const handleBlockTap = (fieldKey: string, getPlainText: () => string) => {
    if (copyArmedField === fieldKey) {
      navigator.clipboard?.writeText(getPlainText()).catch(() => {});
      setCopyArmedField(null);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1300);
    } else {
      setCopyArmedField(fieldKey);
    }
  };
  const renderCopyableBlock = (fieldKey: string, label: string, html: string) => {
    const isArmed = copyArmedField === fieldKey;
    const isCopied = copiedField === fieldKey;
    const isVisible = isArmed || isCopied;
    return (
      <div
        onClick={(e) => { e.stopPropagation(); handleBlockTap(fieldKey, () => htmlToPlainText(html)); }}
        className="relative bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs space-y-1.5 cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
      >
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</div>
        <div
          className="rich-text-content text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
        <div 
          className={`absolute inset-0 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-black transition-[opacity,transform,background-color,color] duration-200 ease-out backdrop-blur-xs ${
            isVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          } ${
            isCopied 
              ? 'bg-[#002454]/95 dark:bg-blue-600/95 text-white' 
              : 'bg-slate-900/85 dark:bg-slate-800/95 text-white'
          }`}
        >
          {isCopied ? <>✓ 복사되었습니다</> : <>📋 탭하여 복사</>}
        </div>
      </div>
    );
  };
  const renderHashtagBlock = (fieldKey: string, hashtags: string[]) => {
    const isArmed = copyArmedField === fieldKey;
    const isCopied = copiedField === fieldKey;
    const isVisible = isArmed || isCopied;
    return (
      <div
        onClick={(e) => { e.stopPropagation(); handleBlockTap(fieldKey, () => hashtags.map(kw => `#${kw}`).join(' ')); }}
        className="relative bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs space-y-2 cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
      >
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">#해시태그</div>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((kw, i) => (
            <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">
              #{kw}
            </span>
          ))}
        </div>
        <div 
          className={`absolute inset-0 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-black transition-[opacity,transform,background-color,color] duration-200 ease-out backdrop-blur-xs ${
            isVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          } ${
            isCopied 
              ? 'bg-[#002454]/95 dark:bg-blue-600/95 text-white' 
              : 'bg-slate-900/85 dark:bg-slate-800/95 text-white'
          }`}
        >
          {isCopied ? <>✓ 복사되었습니다</> : <>📋 탭하여 복사</>}
        </div>
      </div>
    );
  };

  // FLIP: 카드의 화면 좌표(originRect)에서 시작해 부모(셸 프레임) 전체 크기로
  // 커지는 transform을 계산한다 — 지금은 이 prop을 넘기는 호출부가 없어 실제로는
  // 쓰이지 않지만(항상 기본 시트 모션), 카드 기반 진입점이 다시 생기면 재사용할
  // 수 있게 남겨둔다.
  // 2차 감사 1번 — 다른 모달과 동일하게 Escape로 닫히도록 함. 이 시트는 스와이프/
  // 손잡이 기반의 커스텀 닫힘 애니메이션(closeAnimated)이 있어 범용 포커스 트랩
  // 훅(useModalA11y) 대신 Escape 리스너만 가볍게 추가 — 풀 트랩은 텍스트 입력창
  // 포커스나 스와이프 제스처와 상호작용할 위험이 있어 범위를 좁혔다.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeAnimated();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setViewState(startPeek ? 'peek' : 'full');
    setIsClosingPeek(false);
    setIsClosingSheet(false);
    const el = modalRef.current;
    const parent = el?.parentElement;
    if (!el || !parent || !originRect || startPeek) {
      setPhase('open');
      return;
    }
    const target = parent.getBoundingClientRect();
    const scaleX = originRect.width / target.width;
    const scaleY = originRect.height / target.height;
    const translateX = originRect.left - target.left;
    const translateY = originRect.top - target.top;
    setOriginTransform(`translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`);
    setPhase('entering');
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase('open')));
  }, [isOpen, originRect, startPeek]);

  const closeAnimated = () => {
    if (startPeek && viewState === 'full') {
      setViewState('peek');
      return;
    }
    if (startPeek) {
      setIsClosingPeek(true);
      setTimeout(onClose, CLOSE_MS);
    } else if (originRect) {
      setPhase('closing');
      setTimeout(onClose, CLOSE_MS);
    } else {
      setIsClosingSheet(true);
      setTimeout(onClose, SHEET_CLOSE_MS);
    }
  };

  // ---- 손잡이(arm) → 한 번 더 당기면 닫힘(confirm) 2단계 풀-투-디스미스 +
  // 좌우 스와이프로 3요소 전환 ----
  // 예전엔 손잡이가 최상단에 항상 고정으로 떠 있어 거슬린다는 요청이 있었다.
  // 이제 손잡이는 평소엔 숨어있다가, 콘텐츠가 맨 위(scrollTop 0)인 상태에서
  // 아래로 한 번 당기면(release) "손잡이가 나타나는" armed 상태가 되고, 그
  // 상태에서 (꼭 손잡이 위가 아니어도) 한 번 더 같은 방식으로 당기면 실제로
  // 닫힌다 — 이 앱에 이미 있는 "탭하여 복사"(1차 탭=arm, 2차 탭=확정)와 같은
  // 2단계 확인 패턴을 그대로 따랐다.
  const mainRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<{ x: number; y: number; scrollTopAtStart: number } | null>(null);
  const suppressNextClick = useRef(false);
  const [handleArmed, setHandleArmed] = useState(false);
  // 하단 기획안/완성본/채팅방+닫기 바도 셸의 메인 하단 바와 동일하게 인스타그램
  // 스타일로 스크롤 방향에 따라 75% 축소/복원한다.
  const lastMainScrollTop = useRef(0);
  const [navShrunk, setNavShrunk] = useState(false);
  useEffect(() => { setHandleArmed(false); setNavShrunk(false); lastMainScrollTop.current = 0; }, [screen]);
  const onMainScroll = () => {
    // arm 판정(onMainPointerUp)이 scrollTop 0~4px를 전부 "맨 위"로 인정하는데, 여기서
    // 0 초과면 바로 해제해버리면 armed 직후(스크롤이 아직 그 잔여값에 머무는 동안)
    // 곧바로 풀려버린다 — 같은 허용 오차(4px)를 써서 arm 조건과 해제 조건을 맞췄다.
    if (handleArmed && (mainRef.current?.scrollTop ?? 0) > 4) setHandleArmed(false);
    const el = mainRef.current;
    if (!el) return;
    const current = el.scrollTop;
    const last = lastMainScrollTop.current;
    if (current <= 4) setNavShrunk(false);
    else if (current > last + 4) setNavShrunk(true);
    else if (current < last - 4) setNavShrunk(false);
    lastMainScrollTop.current = current;
  };
  // 당기기(arm/confirm) 판정 자체가 이번 제스처에서 이미 처리됐는지 — pointerup을
  // 기다리지 않고 pointermove 도중에 바로 처리한다(아래 이유).
  const pullHandledInGesture = useRef(false);
  // arm이 발동하는 순간, 그 직전까지 진행 중이던(관성 포함) 스크롤을 멈추고 맨
  // 위로 스냅한다 — 손잡이가 뜨는 동시에 뒤에서 콘텐츠가 계속 미세하게 밀리면
  // 어색해 보인다는 요청 반영. preventDefault만으로는 이미 시작된 네이티브
  // 관성 스크롤을 확실히 멈추지 못하는 브라우저가 있어, 짧은 시간(~200ms) 동안
  // 매 프레임 scrollTop을 0으로 강제해 관성이 이겨서 다시 밀어내지 못하게 한다.
  const lockScrollAtTop = () => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTop = 0;
    let frames = 0;
    const step = () => {
      if (!mainRef.current || frames > 12) return;
      mainRef.current.scrollTop = 0;
      frames++;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const onMainPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY, scrollTopAtStart: mainRef.current?.scrollTop ?? 0 };
    pullHandledInGesture.current = false;
  };
  // 세로로 당기는 제스처(손잡이 arm→confirm) 판정 — 예전엔 pointerup에서만 확인했는데,
  // 실기기에서 "채팅방은 되는데 기획안/완성본은 안 된다"는 제보로 재조사한 결과: 그
  // 두 화면은 실제로 스크롤이 필요할 만큼 긴 콘텐츠라(채팅방은 대체로 한 화면에 다
  // 들어와 사실상 스크롤이 없었을 뿐), 맨 위에서 아래로 당기면 브라우저가 이걸 진짜
  // 스크롤/오버스크롤 제스처로 인식해 가로채 가버려 pointerup 대신 pointercancel이
  // 발생하고, pointerup에만 걸려있던 이 로직이 아예 호출되지 않는 경우가 실기기에서
  // 있었다(데스크톱 Chrome 마우스 시뮬레이션으로는 이 가로채기가 재현되지 않아 그동안
  // 놓쳤다). pointermove로 실시간 추적해 문턱값을 넘는 즉시(pointerup을 기다리지
  // 않고) 처리하도록 바꿔, 브라우저가 나중에 제스처를 가로채더라도 이미 처리가 끝나
  // 있게 했다.
  const onMainPointerMove = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    if (!start || pullHandledInGesture.current) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const currentScrollTop = mainRef.current?.scrollTop ?? 0;
    // scrollTop 허용 오차(4px) — 콘텐츠가 긴 화면일수록 "맨 위로 스크롤 후 이어서
    // 당기는" 한 번의 연속 동작에서 관성 스크롤이 완전히 0에 안착하기 전에 이 제스처가
    // 시작되는 경우가 흔해, 정확히 0만 인정하면 유독 안 먹히는 것처럼 느껴졌다.
    if (
      dy > 60 && dy > Math.abs(dx) &&
      start.scrollTopAtStart <= 4 && currentScrollTop <= 4
    ) {
      pullHandledInGesture.current = true;
      // 브라우저의 네이티브 스크롤/오버스크롤이 이 제스처를 가로채 진행 중이었을
      // 수 있으니(위 pointercancel 관련 설명 참고), 우리가 판정을 확정짓는 이
      // 순간 그 진행 중이던 스크롤을 멈추고 맨 위로 스냅한다.
      e.preventDefault();
      lockScrollAtTop();
      if (handleArmed) {
        setHandleArmed(false);
        closeAnimated();
      } else {
        setHandleArmed(true);
      }
    }
  };
  const onMainPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || pullHandledInGesture.current) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // 가로 스와이프로 화면 전환 — 손잡이 당기기와 헷갈리지 않도록 세로 이동의
    // 2배 이상 뚜렷하게 가로로 움직인 경우에만 반응한다. 화면 전환은 하단 탭을
    // 눌렀을 때와 완전히 같은 권한 검사를 거쳐야 한다(완성본이 아직 없는데
    // 스와이프로는 그 검사를 건너뛰고 넘어가 버리던 버그 수정) — 아래 goProposal/
    // goFinal/goChat을 그대로 재사용한다.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      // 우측 스와이프(dx>0) → 이전 화면, 좌측(dx<0) → 다음 화면 (하단 탭 순서와 동일).
      const next = (dx > 0 ? Math.max(0, screen - 1) : Math.min(2, screen + 1)) as 0 | 1 | 2;
      if (next !== screen) {
        if (next === 0) goProposal();
        else if (next === 1) goFinal();
        else goChat();
      }
      suppressNextClick.current = true;
    }
  };

  // 화면이 바뀔 때(기획안↔완성본↔채팅방)마다 스크롤 시작 위치를 그 화면에 맞게
  // 되돌린다 — 채팅방은 최신 메시지가 보이는 맨 아래, 나머지는 맨 위.
  useEffect(() => {
    if (!mainRef.current) return;
    if (screen === 2) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight;
    } else {
      mainRef.current.scrollTop = 0;
    }
  }, [screen, item?.id]);

  // ---- 채팅방(코멘트) 데이터 ----
  const [localDiscussions, setLocalDiscussions] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: number; author: string; type: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const bodyObj = parseBody(item);
    setLocalDiscussions(Array.isArray(bodyObj.discussions) ? bodyObj.discussions : []);
    setInputText('');
    setReplyTarget(null);
    setEditingCommentId(null);
    setEditingText('');
  }, [item?.id]);

  // 채팅방에 "진입한 시점"에 아직 대처하지 않은(status가 revision 계열인) 최신
  // 관리자 메시지가 있으면, 그 메시지에만 파란 배경(#003378, "NEW" 표시와 동일
  // 색상)이 잠깐 떠 있다가 스르르 사라지는 하이라이트를 건다 — 이후 도착하는
  // 메시지나 다른 메시지는 대상이 아니다.
  const [highlightMsgId, setHighlightMsgId] = useState<number | null>(null);
  useEffect(() => {
    if (!isOpen || screen !== 2 || !item) return;
    const bodyObj = parseBody(item);
    const discussions: any[] = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];
    const hasUnresolved = String(item.status || '').includes('revision');
    if (!hasUnresolved) return;
    const lastAdminMsg = [...discussions]
      .filter((d) => d.role === 'admin')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!lastAdminMsg) return;
    setHighlightMsgId(lastAdminMsg.id);
    const t = setTimeout(() => setHighlightMsgId(null), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, screen, item?.id]);

  // 실시간 댓글 및 피드백 즉시 수신 (새로고침 없이 상대방 댓글 바로 렌더링)
  useEffect(() => {
    if (!isOpen || !item?.id) return;
    const channel = supabase
      .channel(`modal_realtime_${item.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contents',
          filter: `id=eq.${item.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const bodyObj = parseBody(payload.new);
            if (Array.isArray(bodyObj.discussions)) {
              setLocalDiscussions(bodyObj.discussions);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, item?.id, supabase]);

  if (!isOpen || !item) return null;

  const bodyObj = parseBody(item);
  const isAdmin = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
  const isOwnContent = !!(user?.email && bodyObj.authorEmail && user.email === bodyObj.authorEmail);
  const hasFinalContent = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status) || !!item.final_url;
  const hasUnresolvedFeedback = String(item.status || '').includes('revision');
  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const displayName = cleanAuthorName(rawName) || user?.email?.split('@')[0] || '기자';

  const persist = async (nextDiscussions: any[], statusOverride?: string) => {
    const updatedBody = { ...bodyObj, discussions: nextDiscussions };
    const payload: any = { content_body: JSON.stringify(updatedBody) };
    if (statusOverride) payload.status = statusOverride;
    await supabase.from('contents').update(payload).eq('id', item.id);
    router.refresh();
  };

  // 댓글 수정/삭제는 다른 사용자가 그 사이 남긴 댓글을 덮어쓰지 않도록,
  // 저장 직전 최신 content_body를 다시 불러와 그 위에 반영한다.
  const persistOnFresh = async (transform: (freshDiscussions: any[]) => any[]) => {
    const { data: fresh } = await supabase.from('contents').select('content_body').eq('id', item.id).single();
    let freshBodyObj: any = {};
    try { freshBodyObj = JSON.parse(fresh?.content_body || '{}'); } catch {}
    const freshDiscussions = freshBodyObj.discussions || [];
    const nextDiscussions = transform(freshDiscussions);
    const updatedBody = { ...freshBodyObj, discussions: nextDiscussions };
    await supabase.from('contents').update({ content_body: JSON.stringify(updatedBody) }).eq('id', item.id);
    setLocalDiscussions(nextDiscussions);
    router.refresh();
  };

  const handleToggleLike = (commentId: number) => {
    const userEmail = user?.email || 'anonymous';
    const next = localDiscussions.map((msg) => {
      if (msg.id !== commentId) return msg;
      const likedBy: string[] = msg.likedBy || [];
      const hasLiked = likedBy.includes(userEmail);
      const newLikedBy = hasLiked ? likedBy.filter((e: string) => e !== userEmail) : [...likedBy, userEmail];
      return { ...msg, likedBy: newLikedBy, likes: newLikedBy.length };
    });
    setLocalDiscussions(next);
    persist(next);
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_PX) + 'px';
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    const newMsg = {
      id: Date.now(),
      parentId: replyTarget?.id ?? null,
      type: replyTarget?.type ?? (hasFinalContent ? 'final' : 'proposal'),
      role: isAdmin ? 'admin' : (isOwnContent ? 'writer' : 'crew'),
      text,
      createdAt: new Date().toISOString(),
      author: displayName,
      likes: 0,
      likedBy: [] as string[],
      attachments: [] as any[],
      isSecret: false,
    };
    const next = [...localDiscussions, newMsg];
    setLocalDiscussions(next);
    setInputText('');
    setReplyTarget(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // PC(ContentsLayout.tsx)와 동일한 상태 자동 전환 규칙 — 모바일 채팅방은
    // 지금까지 discussions만 저장하고 status는 건드리지 않아, 관리자가 모바일에서
    // 댓글을 남겨도 "새 댓글(대처 필요)" 표시(status=revision)가 켜지지 않는
    // PC/모바일 비대칭이 있었다. 여기서도 같은 규칙을 적용해 맞춘다: 관리자가
    // 남기면 대처 대기 상태로, 작성자/크루가 남기면 검토 필요 상태로 되돌린다.
    let newStatus = item.status;
    if (isAdmin) {
      if (item.status === 'pending' || item.status === 'review_required') newStatus = 'revision';
      else if (item.status === 'final_submitted') newStatus = 'final_revision';
    } else {
      if (item.status === 'revision' || item.status === 'final_revision' || item.status === 'approved') newStatus = 'review_required';
    }
    persist(next, newStatus !== item.status ? newStatus : undefined).finally(() => setIsSending(false));
  };

  const rootComments = localDiscussions.filter((m) => m.parentId === null || m.parentId === undefined);
  const getReplies = (rootId: number): any[] => {
    const result: any[] = [];
    const traverse = (parentId: number, depth: number) => {
      const children = localDiscussions
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      for (const child of children) {
        result.push({ ...child, depth });
        traverse(child.id, depth + 1);
      }
    };
    traverse(rootId, 1);
    return result;
  };

  const handleDeleteComment = (commentId: number) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
    persistOnFresh((freshDiscussions) => {
      // 해당 댓글과 그 하위 답글(parentId 체인)까지 함께 제거
      const idsToDelete = new Set<number>([commentId]);
      let added = true;
      while (added) {
        added = false;
        freshDiscussions.forEach((c: any) => {
          if (c.parentId && idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
            idsToDelete.add(c.id);
            added = true;
          }
        });
      }
      return freshDiscussions.filter((c: any) => !idsToDelete.has(c.id));
    });
  };

  const handleStartEdit = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text || '');
  };

  const handleSaveEdit = (commentId: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    persistOnFresh((freshDiscussions) =>
      freshDiscussions.map((c: any) => c.id === commentId ? { ...c, text: trimmed, isEdited: true, updatedAt: new Date().toISOString() } : c)
    );
    setEditingCommentId(null);
    setEditingText('');
  };

  const renderCommentRow = (comment: any, depth: number) => {
    const isLiked = !!(comment.likedBy && user?.email && comment.likedBy.includes(user.email));
    const isHighlighted = comment.id === highlightMsgId;
    const isMyComment = comment.author === displayName || (user?.email && comment.authorEmail === user.email);
    const canManageComment = isAdmin || isMyComment;
    const isEditing = editingCommentId === comment.id;

    return (
      <div
        key={comment.id}
        className={`rounded-xl p-1.5 -mx-1.5 transition-colors duration-300 ease-out ${isHighlighted ? 'bg-[#003378]/15' : 'bg-transparent'} ${depth > 0 ? 'pl-9 mt-3 border-l-2 border-slate-100' : 'mt-4 first:mt-0'}`}
      >
        <div className={depth > 0 ? 'pl-3 flex gap-2.5' : 'flex gap-2.5'}>
          <div className={`rounded-full flex items-center justify-center text-white font-black flex-shrink-0 ${
            depth > 0 ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[11px]'
          } ${comment.role === 'admin' ? 'bg-rose-500' : depth > 0 ? 'bg-emerald-600' : 'bg-[#1E3A8A]'}`}>
            {comment.author?.[0] || '익'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span title={comment.author} className={`font-extrabold text-slate-900 truncate ${depth > 0 ? 'text-xs' : 'text-sm'}`}>{comment.author}</span>
                <span className="text-[10px] text-slate-600 font-medium flex-shrink-0">{comment.createdAt ? relativeTime(comment.createdAt) : ''}</span>
                {comment.isEdited && <span className="text-[9px] text-slate-600 flex-shrink-0">(수정됨)</span>}
              </div>
              {canManageComment && !isEditing && (
                <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-slate-400 font-medium">
                  <button onClick={() => handleStartEdit(comment)} className="hover-fine:text-[#003378] cursor-pointer">수정</button>
                  <span>·</span>
                  <button onClick={() => handleDeleteComment(comment.id)} className="hover-fine:text-red-600 cursor-pointer">삭제</button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-1.5 space-y-1.5">
                <textarea
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 leading-relaxed text-slate-900 dark:text-slate-100"
                  rows={2}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setEditingCommentId(null)}
                    className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleSaveEdit(comment.id)}
                    className="px-2.5 py-1 bg-[#002454] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    수정 완료
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`text-slate-700 leading-relaxed break-words mt-0.5 ${depth > 0 ? 'text-xs' : 'text-sm'}`}
                dangerouslySetInnerHTML={{ __html: (comment.isSecret && !canManageComment) ? '🔒 비밀댓글입니다.' : sanitizeHtml(parseCommentMarkdown(comment.text)) }}
              />
            )}

            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-slate-400 font-bold">{comment.likes || 0} Likes</span>
              <button
                onClick={() => setReplyTarget(replyTarget?.id === comment.id ? null : { id: comment.id, author: comment.author, type: comment.type || 'proposal' })}
                className={`text-[11px] font-extrabold cursor-pointer ${replyTarget?.id === comment.id ? 'text-[#003378]' : 'text-slate-400'}`}
              >
                ↗ Reply
              </button>
              <div className="flex-1" />
              <button
                onClick={() => handleToggleLike(comment.id)}
                className="w-6 h-6 flex items-center justify-center flex-shrink-0 cursor-pointer"
              >
                <svg className={`w-4 h-4 ${isLiked ? 'text-[#003378]' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none">
                  <path d="M2 10h4v11H2a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M6 10l3.5-7a2 2 0 0 1 2-1v0a2 2 0 0 1 2 2.3L12.5 8H20a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 20H6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const peekTransform = `translateY(${effectivePeekTopVh}dvh)`;
  const transform = isClosingPeek
    ? 'translateY(100dvh)'
    : viewState === 'peek'
    ? peekTransform
    : phase === 'entering' || phase === 'closing'
    ? originTransform
    : undefined;
  const opacity = originRect && (phase === 'entering' || phase === 'closing') ? 0.5 : 1;
  const rootStyle: React.CSSProperties = {
    transform,
    opacity,
    transformOrigin: 'top left',
    transition: phase === 'entering'
      ? 'none'
      : 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s cubic-bezier(0.22,1,0.36,1)',
  };

  // 기획안 필드 (PC ProposalSubmitForm/ContentsLayout과 동일한 매핑)
  const intentHtml = item.intent || bodyObj.intent || '';
  const compositionHtml = bodyObj.composition || '';
  const filmingPlanHtml = bodyObj.contentBody || '';
  const remarksHtml = item.description || bodyObj.description || '';

  // 완성본 필드
  const postContentHtml = bodyObj.postContent || '';
  const finalDescriptionHtml = bodyObj.finalDescription || '';
  const finalKeywordsRaw = bodyObj.finalKeywords || '';

  const driveUrl = item.final_url || bodyObj.docsUrl || bodyObj.driveUrl || '';
  // 완성본 링크가 구글 드라이브/문서·스프레드시트·프레젠테이션이면, 파일(또는 폴더) ID를
  // 뽑아 각 서비스의 미리보기용 embed URL로 바꿔 실제 내용을 iframe으로 바로 보여준다
  // (요청: 링크 카드만이 아니라 실제 미리보기를 본문/캡션 바로 위에 별도 블록으로).
  // 실데이터로 확인해보니 완성본 링크가 파일(/file/d/ID)뿐 아니라 폴더 공유 링크
  // (/drive/folders/ID)인 경우도 있어 — 폴더는 파일과 embed URL 형식이 달라
  // (embeddedfolderview?id=) 별도로 처리한다.
  const drivePreviewUrl = (() => {
    const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
    const fileMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!fileMatch) return '';
    const fileId = fileMatch[1];
    if (driveUrl.includes('docs.google.com/spreadsheets')) return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
    if (driveUrl.includes('docs.google.com/presentation')) return `https://docs.google.com/presentation/d/${fileId}/preview`;
    if (driveUrl.includes('docs.google.com/document')) return `https://docs.google.com/document/d/${fileId}/preview`;
    return `https://drive.google.com/file/d/${fileId}/preview`;
  })();

  let crewList: string[] = [];
  if (bodyObj.crew) {
    if (typeof bodyObj.crew === 'string') {
      crewList = bodyObj.crew.split(',').map((s: string) => s.trim()).filter(Boolean);
    } else if (Array.isArray(bodyObj.crew)) {
      crewList = bodyObj.crew.map((c: any) => c.name || c).filter(Boolean);
    }
  }
  if (crewList.length === 0 && item.author_name) {
    crewList = [item.author_name];
  }

  const toHashtags = (raw: any) =>
    raw
      ? String(raw).split(/[,\s]+/).map(k => k.trim().replace(/^#+/, '')).filter(Boolean)
      : [];
  const proposalHashtags = toHashtags(item.keywords);
  const finalHashtags = finalKeywordsRaw ? toHashtags(finalKeywordsRaw) : proposalHashtags;

  const screenBadge = screen === 1
    ? { label: '완성본 🎬', bg: 'bg-[#00A859]' }
    : screen === 2
    ? { label: '채팅방 💬', bg: 'bg-[#003378]' }
    : { label: '기획안 📝', bg: 'bg-[#FFB800]' };

  // 완성본이 아직 없을 때 — 업로드 권한이 있는 사용자(작성자 본인 또는 관리자)는
  // 완성본 화면 자체로 이동할 수 있어야 하고, 그 화면 안에서 업로드를 유도한다
  // (화면 진입 자체를 막지 않는다). 권한이 없는 사용자는 기존처럼 안내 토스트만
  // 잠깐 띄우고, 보여줄 게 없는 완성본 대신 채팅방으로 유도한다 — 하단 탭 클릭과
  // 스와이프 전환 양쪽 모두 이 함수 하나로 처리해, 스와이프가 이 권한 검사를
  // 건너뛰어 미업로드 콘텐츠의 완성본으로 그냥 넘어가 버리던 버그를 없앴다.
  const canManageFinal = isAdmin || isOwnContent;
  const goProposal = () => onScreenChange(0);
  const goFinal = () => {
    if (hasFinalContent || canManageFinal) onScreenChange(1);
    else {
      setToastMsg('아직 완성본이 업로드 되지 않았습니다');
      onScreenChange(2);
    }
  };
  const goChat = () => onScreenChange(2);

  return (
    <>
      {viewState === 'peek' && (
        <div
          className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-300"
          onClick={closeAnimated}
        />
      )}
      <div
        ref={modalRef}
        onClick={() => {
          if (suppressNextClick.current) { suppressNextClick.current = false; return; }
          if (viewState === 'peek') setViewState('full');
        }}
        className={`absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden ${viewState === 'peek' ? 'rounded-t-[1.75rem] shadow-2xl cursor-pointer' : ''} ${
          originRect || viewState === 'peek'
            ? ''
            : isClosingSheet
            ? 'animate-out fade-out slide-out-to-bottom duration-200 ease-out fill-mode-forwards'
            : enterAnim === 'slide-right'
            ? 'animate-in fade-in slide-in-from-right duration-250 ease-out'
            : enterAnim === 'slide-left'
            ? 'animate-in fade-in slide-in-from-left duration-250 ease-out'
            : 'animate-in fade-in slide-in-from-bottom duration-300 ease-out'
        }`}
        style={rootStyle}
      >
        {toastMsg && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none px-8">
            <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
              {toastMsg}
            </div>
          </div>
        )}

        {/* 2. Main Scrollable Content — 손잡이(armed일 때만)·배지·화면별 콘텐츠가
            전부 이 하나의 스크롤 컨테이너 안에서 함께 흐른다. 3요소 전환은 이 안의
            key={screen} 블록만 다시 마운트돼 슬라이드되고, 이 <main> 자체와 아래
            하단 탭바/닫기 버튼은 화면이 바뀌어도 전혀 움직이지 않는다. */}
        <main
          ref={mainRef}
          onPointerDown={onMainPointerDown}
          onPointerMove={onMainPointerMove}
          onPointerUp={onMainPointerUp}
          onScroll={onMainScroll}
          // overflowAnchor: 'none' — 손잡이가 armed되며 맨 위에 새로 삽입되면, 크롬의
          // 기본 스크롤 앵커링(뷰포트 위쪽에 콘텐츠가 추가되면 "보이던 내용이 안
          // 밀리도록" scrollTop을 자동으로 보정하는 기능)이 scrollTop을 0 근처에서
          // 갑자기 수십 px로 튀어오르게 만들었다 — 그 직후의 onScroll이 "스크롤이
          // 맨 위에서 벗어났다"고 오판해 armed 상태를 즉시 풀어버려, 결과적으로
          // 손잡이가 뜨자마자 바로 꺼지는 것처럼 보이는 원인이었다(실기기·Playwright
          // 양쪽에서 재현). 이 컨테이너에서는 앵커링을 꺼서 그런 자동 보정 자체가
          // 일어나지 않게 한다.
          style={{ overflowAnchor: 'none', scrollbarGutter: 'stable' }}
          className={`flex-1 p-4 sm:p-5 overflow-x-hidden space-y-4 max-w-xl mx-auto w-full pb-28 text-slate-900 safe-pt ${
            viewState === 'peek' ? 'overflow-y-hidden' : 'overflow-y-auto'
          }`}
        >
          {handleArmed && (
            <div className="flex justify-center py-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-black text-white ${screenBadge.bg}`}>
              {screenBadge.label}
            </span>
            <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-tight">
              <div>{item.author_name}</div>
              {item.created_at && <div>{item.created_at.split('T')[0]}</div>}
            </div>
          </div>

          <div
            key={screen}
            className={tabSlideDir === 'right' ? 'animate-in fade-in slide-in-from-right-8 duration-200 ease-out' : 'animate-in fade-in slide-in-from-left-8 duration-200 ease-out'}
          >
            {screen === 1 ? (
              !hasFinalContent ? (
                // goFinal()이 완성본 업로드 권한이 있는 사용자(작성자/관리자)만 이
                // 상태로 들여보낸다 — 화면 진입 자체는 막지 않고, 여기서 업로드를
                // 직접 유도한다.
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 flex flex-col items-center gap-3 text-center">
                  <span className="text-4xl">📤</span>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200">아직 완성본이 업로드되지 않았습니다</div>
                  <div className="text-xs text-slate-400">완성본을 업로드하면 이 화면에서 바로 확인할 수 있어요</div>
                  <button
                    onClick={() => onEdit?.(item, 'final')}
                    className="glass-cta glass-cta-strong px-5 py-2.5 rounded-xl text-sm font-extrabold text-[#002454] dark:text-white mt-1 active:scale-95 transition-transform cursor-pointer"
                  >
                    📤 완성본 업로드하기
                  </button>
                </div>
              ) : (
              <div className="space-y-4">
                <div className="w-full bg-[#1E293B] rounded-2xl p-5 text-white shadow-md space-y-3.5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-8 h-8" viewBox="0 0 87.3 78">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                      <span className="text-sm font-black text-slate-200">Google Drive</span>
                    </div>
                    {driveUrl && (
                      <a
                        href={driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-white/20 hover-fine:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <span>Open Drive ↗</span>
                      </a>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white leading-snug">{item.title}</h3>
                    <div className="text-xs text-slate-300 font-medium">
                      {item.author_name} • {item.team || 'SNS 기자단'} • {item.content_type || '콘텐츠'}
                    </div>
                  </div>

                  {driveUrl && (
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-blue-300 underline break-all line-clamp-1 block hover-fine:text-blue-100"
                    >
                      {driveUrl}
                    </a>
                  )}
                </div>

                <div className="space-y-3">
                  {drivePreviewUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-100">
                      {/* 숏폼(세로 영상)을 항상 16:9(가로) 틀에 넣으면 위아래가 잘려
                          보였다 — 콘텐츠 유형이 숏폼이면 세로 비율로, 그 외(롱폼
                          영상/카드뉴스/문서 등)는 기존 16:9를 그대로 쓴다. */}
                      <iframe
                        src={drivePreviewUrl}
                        className={`w-full ${item.content_type === '영상(숏폼)' ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video'}`}
                        allow="autoplay"
                        title="완성본 드라이브 미리보기"
                      />
                    </div>
                  )}
                  {postContentHtml && renderCopyableBlock('postContent', '본문 / 캡션 내용', postContentHtml)}
                  {finalDescriptionHtml && renderCopyableBlock('finalDescription', '비고', finalDescriptionHtml)}

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                    <div className="text-xs font-bold text-slate-800">제작 인원</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {crewList.map((name, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
                          <div className="w-6 h-6 rounded-full bg-[#002454] text-white font-black text-[10px] flex items-center justify-center">
                            {name.slice(0, 2)}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {finalHashtags.length > 0 && renderHashtagBlock('finalHashtags', finalHashtags)}
                </div>
              </div>
              )
            ) : screen === 2 ? (
              <div className="space-y-1">
                {rootComments.length === 0 ? (
                  <div className="py-12 flex items-center justify-center text-center text-xs text-slate-400 font-medium px-8">
                    아직 등록된 코멘트가 없습니다.
                  </div>
                ) : (
                  rootComments.map((root, i) => {
                    const showPhaseDivider = i === 0 || rootComments[i - 1].type !== root.type;
                    const replies = getReplies(root.id);
                    return (
                      <React.Fragment key={root.id}>
                        {showPhaseDivider && (
                          <div className="flex justify-center py-2">
                            <span className="px-3 py-1 bg-slate-200/70 text-slate-500 text-[10px] font-black rounded-full">
                              {root.type === 'final' ? '완성본 피드백' : '기획안 피드백'}
                            </span>
                          </div>
                        )}
                        {renderCommentRow(root, 0)}
                        {replies.map((r) => renderCommentRow(r, Math.min(r.depth, 1)))}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-400">제목 (가제)</div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-snug">{item.title}</h3>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">콘텐츠 분류</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold">{item.team || '유튜브'}</span>
                    <span className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold">{item.content_type || '카드뉴스'}</span>
                    {bodyObj.articleType && (
                      <span className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold">{bodyObj.articleType}</span>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">참여인원 (크루)</div>
                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {crewList.map((name, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-[#002454] dark:bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {name.slice(0, 2)}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {intentHtml && renderCopyableBlock('intent', '기획 의도 및 배경', intentHtml)}
                {compositionHtml && renderCopyableBlock('composition', '구성 및 내용', compositionHtml)}
                {filmingPlanHtml && renderCopyableBlock('filmingPlan', '촬영 계획', filmingPlanHtml)}
                {remarksHtml && renderCopyableBlock('remarks', '비고', remarksHtml)}

                {(bodyObj.desiredDate || item.target_date || bodyObj.deadline) && (
                  <div className="grid grid-cols-2 gap-3">
                    {(bodyObj.desiredDate || item.target_date) && (
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs space-y-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">희망 업로드 시기</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{bodyObj.desiredDate || item.target_date}</div>
                      </div>
                    )}
                    {bodyObj.deadline && (
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs space-y-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">데드라인</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{bodyObj.deadline}</div>
                      </div>
                    )}
                  </div>
                )}

                {proposalHashtags.length > 0 && renderHashtagBlock('proposalHashtags', proposalHashtags)}
              </div>
            )}
          </div>

          {screen !== 2 && !(screen === 1 && !hasFinalContent) && (
            <button
              onClick={() => onEdit?.(item, screen === 1 ? 'final' : 'proposal')}
              className="glass-cta glass-cta-strong w-full py-3.5 text-[#002454] dark:text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>✏️</span>
              <span>수정하기</span>
            </button>
          )}
        </main>

        {/* 채팅방 입력창 — 카카오톡처럼 한 줄 높이로 시작해 4~5줄까지만 자동으로
            늘어나고 그 이상은 내부 스크롤. text-base(16px 이상)를 유지해야 한다 —
            14px(text-sm) 미만이면 iOS Safari가 포커스 시 자동으로 화면을 확대해
            버려(요청으로 실기기에서 확인된 버그) 레이아웃이 깨지고, 포커스가
            풀려도 확대 상태가 바로 안 풀려 상단 UI가 화면 밖으로 밀려나 보였다. */}
        {screen === 2 && (
          <div className="px-3 flex-shrink-0" style={{ marginBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
            {replyTarget && (
              <div className="flex items-center gap-2 px-3 py-1.5 mb-1.5 bg-[#EBF3FF] rounded-xl text-xs">
                <span title={`${replyTarget.author}님에게 답장`} className="text-[#003378] font-bold flex-1 truncate">{replyTarget.author}님에게 답장</span>
                <button onClick={() => setReplyTarget(null)} aria-label="답글 취소" className="text-[#003378] font-black">✕</button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 px-3 py-2 shadow-xs">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); autoGrow(); }}
                placeholder="댓글을 입력하세요"
                style={{ fontSize: '16px' }}
                className="flex-1 resize-none outline-none text-slate-800 placeholder:text-slate-400 leading-relaxed py-0.5 max-h-[7.25rem] overflow-y-auto"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isSending}
                aria-label="댓글 보내기"
                className="group w-11 h-11 -m-1.5 flex items-center justify-center flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="w-8 h-8 rounded-full bg-[#002454] group-disabled:bg-slate-300 flex items-center justify-center group-active:scale-95 transition-transform">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12h15M13 6l6 6-6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Bottom Nav — 기획안/완성본/채팅방 3개가 하나의 글래스 캡슐 안에서
            서로 연결된 탭이고, 그 오른쪽에 닫기(✕) 전용 버튼이 따로 떨어져 있다.
            화면이 바뀌어도 이 바 자체는 절대 리마운트되지 않는다. */}
        <div
          className={`absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 transition-transform duration-200 ease-out ${navShrunk ? 'scale-75' : 'scale-100'}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <nav className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <div className="glass-navbar flex items-center h-[3.625rem] rounded-full p-1 gap-1">
              <button
                onClick={goProposal}
                className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-[transform,background-color] duration-300 active:scale-95 ${screen === 0 ? 'glass-navbar-active' : ''}`}
              >
                {/* 셸의 메인 하단 탭바(대시보드/캘린더/전체 리스트)와 같은 선-아이콘
                    스타일로 통일 — 이모지 대신 currentColor 기반 SVG. */}
                <svg className={`w-5 h-5 ${screen === 0 ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={screen === 0 ? 2.2 : 1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />
                </svg>
                <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${screen === 0 ? 'text-white' : 'text-[#757575]'}`}>기획안</span>
              </button>
              <button
                onClick={goFinal}
                className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-[transform,background-color] duration-300 active:scale-95 ${screen === 1 ? 'glass-navbar-active' : ''}`}
              >
                <svg className={`w-5 h-5 ${screen === 1 ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={screen === 1 ? 2.2 : 1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${screen === 1 ? 'text-white' : 'text-[#757575]'}`}>완성본</span>
              </button>
              <button
                onClick={goChat}
                className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-[transform,background-color] duration-300 active:scale-95 ${
                  screen === 2 ? 'glass-navbar-active' : hasUnresolvedFeedback ? 'chat-btn-new' : ''
                }`}
              >
                <svg className={`w-5 h-5 ${screen === 2 || hasUnresolvedFeedback ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={screen === 2 ? 2.2 : 1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${screen === 2 || hasUnresolvedFeedback ? 'text-white' : 'text-[#757575]'}`}>채팅방</span>
              </button>
            </div>
          </nav>
          <button
            onClick={(e) => { e.stopPropagation(); closeAnimated(); }}
            aria-label="닫기"
            className="glass-cta w-[3.625rem] h-[3.625rem] rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
