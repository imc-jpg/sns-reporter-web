'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { recommendHashtagsFromContent, cleanAuthorName } from '@/utils/dateUtils';

// 수정하기로 기존 콘텐츠를 불러올 때, PC RichTextEditor로 작성된 필드는 HTML로
// 저장돼 있을 수 있는데 이 폼의 입력창은 전부 순수 textarea라 렌더링 없이 태그가
// 그대로 글자로 보인다 — 블록 경계 태그를 개행으로 바꾼 뒤 나머지 태그를 제거해
// 최소한 읽을 수 있는 순수 텍스트로 프리필한다(MobileDetailModal의 복사 기능에
// 쓰던 것과 동일한 전처리).
const stripHtmlToText = (html: string) => {
  if (!html) return '';
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n');
  const div = document.createElement('div');
  div.innerHTML = withBreaks;
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

interface MobileSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'proposal' | 'final';
  user?: any;
  allProfiles?: any[];
  // 완성본 업로드가 이미 존재하는 콘텐츠에 연결돼야 할 때(전체 리스트/캘린더에서
  // 특정 콘텐츠를 선택해 업로드하는 경우) 넘겨준다. 있으면 새 글을 만드는 대신 이
  // 콘텐츠 행을 완성본 전용 필드로 업데이트한다(PC FinalSubmitForm과 동일 매핑).
  // 없으면(대시보드/전체 리스트의 범용 "완성본 업로드" 진입) 아래 콘텐츠 선택
  // 화면에서 고른 콘텐츠를 같은 방식으로 쓴다.
  targetItem?: any;
  // 완성본 업로드를 targetItem 없이(대시보드의 범용 "완성본 업로드" 버튼으로)
  // 열었을 때, "아직 완성본이 없는 내 콘텐츠" 목록을 보여주는 선택 화면에 쓴다.
  contents?: any[];
}

export default function MobileSubmitModal({ isOpen, onClose, mode, user, allProfiles = [], targetItem, contents = [] }: MobileSubmitModalProps) {
  // 완성본 업로드를 특정 콘텐츠 없이 열면(targetItem prop이 없으면), 예전엔 기획안
  // 작성 폼과 거의 똑같은 "새 콘텐츠 만들기" 폼이 떴다 — 그런데 완성본 업로드는
  // 원래 "이미 기획안이 있는 콘텐츠를 골라서 그 완성본을 붙이는" 흐름이어야 한다는
  // 지적으로, targetItem이 없을 때는 먼저 이 화면에서 콘텐츠를 고르게 하고, 고른
  // 순간부터는 targetItem이 있을 때와 완전히 같은(콘텐츠 선택 카드 + 간소화된
  // 완성본 전용 필드) 흐름을 탄다. 아래 effectiveTargetItem이 "실제로 연결할
  // 콘텐츠"의 단일 진실 소스다 — prop으로 이미 왔으면 그걸, 아니면 이 화면에서
  // 고른 것을 쓴다.
  const [pickedTargetItem, setPickedTargetItem] = useState<any>(null);
  const effectiveTargetItem = targetItem || pickedTargetItem;
  // 닫힐 때 리셋 — 이 모달은 isOpen이 false일 때도(다음에 열릴 때를 대비해)
  // 마운트된 채로 남아있어서, 리셋 없이는 다음에 다시 여는 완성본 업로드가
  // 방금 전에 고른 콘텐츠를 그대로 이어받는 문제가 있었다.
  useEffect(() => {
    if (!isOpen) setPickedTargetItem(null);
  }, [isOpen]);
  // 2차 감사 1번 — Escape로 닫기. 폼 입력(텍스트/드래프트 자동저장)이 많아
  // 포커스 트랩 전체 적용은 범위를 좁혀 Escape만 처리.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);
  const supabase = createClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  // 검증/제출 실패 메시지 — 예전엔 브라우저 기본 alert()를 썼는데, 이 앱 전역에서
  // 이미 쓰고 있는 중앙 토스트(MobileDetailModal 등과 동일한 검은 배경/흰 글씨,
  // 1.8초 자동 소멸)로 통일한다.
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Form States using EXACT system values
  const [title, setTitle] = useState('');
  const [team, setTeam] = useState(user?.user_metadata?.team || '인스타');
  const [contentType, setContentType] = useState('카드뉴스');
  const [articleType, setArticleType] = useState('개인기사');
  const [targetMonth, setTargetMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [intent, setIntent] = useState('');
  // PC ProposalSubmitForm 기준 기획안 필드는 기획의도(intent)/구성 및 내용(composition)
  // /촬영 계획(filmingPlan)/비고(description) 네 개의 서로 다른 값이다 — 그런데 모바일
  // 폼은 그동안 "구성 및 내용 설명"이라는 하나의 입력창을 composition이 아니라
  // description에 잘못 바인딩하고 있었다("비고" 전용 입력창 자체가 없었음). 그 결과
  // 모바일에서 작성한 기획안은 상세보기의 "구성 및 내용" 카드가 항상 비어있고, 실제
  // 입력한 내용은 "비고" 카드에 나타나는 라벨 불일치가 있었다 — composition을 별도
  // state로 분리하고 진짜 "비고" 입력창을 추가해 PC와 필드를 맞췄다.
  const [composition, setComposition] = useState('');
  const [description, setDescription] = useState('');
  const [filmingPlan, setFilmingPlan] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [keywords, setKeywords] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  // 완성본 전용 — 기존 "기획 의도"/"구성 및 내용 설명" textarea를 완성본 모드에서는
  // 본문/캡션 내용으로 재활용한다(아래 isAttachingFinal 분기 참고).
  const [postContent, setPostContent] = useState('');

  const isAttachingFinal = mode === 'final' && !!effectiveTargetItem;
  // 작성하기(신규)와 수정하기(기존 콘텐츠 편집)는 하단 UI 구성이 다르다(요청 반영) —
  // targetItem 유무로 구분한다. 임시저장함(작성하기 전용)에서 초안을 불러와 이어
  // 쓰는 경우는 targetItem이 없는 "신규 작성" 흐름 그대로이되, 저장 시 새 글을 또
  // 만들지 않고 그 초안 행을 업데이트해야 하므로 별도로 draftResumeId를 둔다.
  const isEditMode = !!targetItem;
  const [draftResumeId, setDraftResumeId] = useState<number | null>(null);
  const [showDraftsFolder, setShowDraftsFolder] = useState(false);
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState('');

  // PC Crew Selection State
  const rawAuthorName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const authorName = cleanAuthorName(rawAuthorName) || user?.email?.split('@')[0] || '기자';
  const [crew, setCrew] = useState<string[]>([authorName]);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my_team' | 'other_teams'>('my_team');
  const [dbProfiles, setDbProfiles] = useState<any[]>(allProfiles);
  const [emergencyBackup, setEmergencyBackup] = useState<any | null>(null);

  // 긴급 로컬 백업 확인 (새 글 작성 시 비정상 종료 데이터 체크)
  useEffect(() => {
    if (isOpen && !targetItem && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('emergency_mobile_submit_backup');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.title || parsed.intent || parsed.description) {
            setEmergencyBackup(parsed);
          }
        }
      } catch (e) {}
    }
  }, [isOpen, targetItem]);

  // 작성 중 2초 디바운스 로컬 긴급 백업
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    if (!title && !intent && !description) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          'emergency_mobile_submit_backup',
          JSON.stringify({
            title, team, contentType, articleType, intent, composition, description,
            filmingPlan, desiredDate, deadline, keywords, finalUrl, crew,
            savedAt: new Date().toISOString(),
          })
        );
      } catch (e) {}
    }, 2000);

    return () => clearTimeout(timer);
  }, [isOpen, title, team, contentType, articleType, intent, composition, description, filmingPlan, desiredDate, deadline, keywords, finalUrl, crew]);

  const handleRestoreEmergency = () => {
    if (emergencyBackup) {
      if (emergencyBackup.title) setTitle(emergencyBackup.title);
      if (emergencyBackup.team) setTeam(emergencyBackup.team);
      if (emergencyBackup.contentType) setContentType(emergencyBackup.contentType);
      if (emergencyBackup.articleType) setArticleType(emergencyBackup.articleType);
      if (emergencyBackup.intent) setIntent(emergencyBackup.intent);
      if (emergencyBackup.composition) setComposition(emergencyBackup.composition);
      if (emergencyBackup.description) setDescription(emergencyBackup.description);
      if (emergencyBackup.filmingPlan) setFilmingPlan(emergencyBackup.filmingPlan);
      if (emergencyBackup.desiredDate) setDesiredDate(emergencyBackup.desiredDate);
      if (emergencyBackup.deadline) setDeadline(emergencyBackup.deadline);
      if (emergencyBackup.keywords) setKeywords(emergencyBackup.keywords);
      if (emergencyBackup.finalUrl) setFinalUrl(emergencyBackup.finalUrl);
      if (emergencyBackup.crew) setCrew(emergencyBackup.crew);
      setEmergencyBackup(null);
    }
  };

  const handleDiscardEmergency = () => {
    try { localStorage.removeItem('emergency_mobile_submit_backup'); } catch (e) {}
    setEmergencyBackup(null);
  };

  // Fetch real reporter profiles from DB if allProfiles is empty
  useEffect(() => {
    if (allProfiles && allProfiles.length > 0) {
      setDbProfiles(allProfiles);
    } else {
      const fetchProfiles = async () => {
        const { data } = await supabase.from('contents').select('author_name, team').not('author_name', 'is', null);
        if (data) {
          const uniqueProfiles: any[] = [];
          const seen = new Set();
          data.forEach(item => {
            if (item.author_name && !seen.has(item.author_name)) {
              seen.add(item.author_name);
              uniqueProfiles.push({ author_name: item.author_name, team: item.team || 'SNS기자단' });
            }
          });
          setDbProfiles(uniqueProfiles);
        }
      };
      fetchProfiles();
    }
  }, [allProfiles, supabase]);

  // 완성본을 특정 콘텐츠에 연결하는 경우, 그 콘텐츠에 이미 저장된 완성본 필드(재제출/
  // 수정하기로 다시 열린 경우 포함)로 폼을 미리 채운다 — PC FinalSubmitForm의 프리필과
  // 동일한 필드 매핑(postContent/desiredDate/finalKeywords/finalCrew/finalDescription).
  // 폼이 열릴 때(또는 대상이 바뀔 때)마다 "초기 상태" 스니펫도 함께 저장해두는데,
  // 이걸 나중에 취소 버튼에서 변경 여부를 판단하는 기준으로 쓴다(아래 handleCancel).
  const initialSnapshotRef = useRef('');
  useEffect(() => {
    if (!isOpen) return;
    if (isAttachingFinal) {
      let bodyObj: any = {};
      try {
        if (effectiveTargetItem.content_body && effectiveTargetItem.content_body.startsWith('{')) {
          bodyObj = JSON.parse(effectiveTargetItem.content_body);
        }
      } catch (e) {}
      const prefillFinalUrl = effectiveTargetItem.final_url || bodyObj.docsUrl || '';
      const prefillPostContent = stripHtmlToText(bodyObj.postContent || '');
      const prefillDescription = stripHtmlToText(bodyObj.finalDescription || '');
      const prefillKeywords = bodyObj.finalKeywords || effectiveTargetItem.keywords || '';
      const prefillDesiredDate = bodyObj.desiredDate || effectiveTargetItem.target_date || '';
      const crewSource = bodyObj.finalCrew || bodyObj.crew || '';
      const prefillCrew = crewSource
        ? String(crewSource).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [authorName];

      setFinalUrl(prefillFinalUrl);
      setPostContent(prefillPostContent);
      setDescription(prefillDescription);
      setKeywords(prefillKeywords);
      setDesiredDate(prefillDesiredDate);
      setCrew(prefillCrew);

      initialSnapshotRef.current = JSON.stringify({
        finalUrl: prefillFinalUrl, postContent: prefillPostContent, description: prefillDescription,
        keywords: prefillKeywords, desiredDate: prefillDesiredDate, crew: prefillCrew,
      });
    } else if (mode === 'proposal' && targetItem) {
      // 기존 기획안을 "수정하기"로 다시 여는 경우 — 이전엔 이 분기 자체가 없어서
      // (else로 빈 폼 기본값을 채우는 아래 분기에 같이 걸려) 항상 빈 폼으로 열리는
      // 버그가 있었다. handleSubmit의 저장 매핑과 정확히 반대로, targetItem과 그
      // content_body에서 각 필드를 그대로 복원한다(MobileDetailModal의 읽기 전용
      // 표시 로직과 동일한 우선순위: 상위 컬럼 → content_body 순).
      let bodyObj: any = {};
      try {
        if (targetItem.content_body && targetItem.content_body.startsWith('{')) {
          bodyObj = JSON.parse(targetItem.content_body);
        }
      } catch (e) {}
      const prefillIntent = stripHtmlToText(targetItem.intent || bodyObj.intent || '');
      const prefillComposition = stripHtmlToText(bodyObj.composition || '');
      const prefillDescription = stripHtmlToText(targetItem.description || bodyObj.description || '');
      const prefillFilmingPlan = stripHtmlToText(bodyObj.filmingPlan || '');
      const prefillDesiredDate = targetItem.target_date || bodyObj.desiredDate || '';
      const prefillDeadline = bodyObj.deadline || '';
      const prefillKeywords = targetItem.keywords || '';
      const prefillDocsUrl = bodyObj.docsUrl || '';
      const prefillCrew = bodyObj.crew
        ? String(bodyObj.crew).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [authorName];

      setTitle(targetItem.title || '');
      setTeam(targetItem.team || team);
      setContentType(targetItem.content_type || contentType);
      setArticleType(bodyObj.articleType || articleType);
      setTargetMonth(bodyObj.targetMonth || targetMonth);
      setIntent(prefillIntent);
      setComposition(prefillComposition);
      setDescription(prefillDescription);
      setFilmingPlan(prefillFilmingPlan);
      setDesiredDate(prefillDesiredDate);
      setDeadline(prefillDeadline);
      setKeywords(prefillKeywords);
      setFinalUrl(prefillDocsUrl);
      setCrew(prefillCrew);

      initialSnapshotRef.current = JSON.stringify({
        title: targetItem.title || '', team: targetItem.team || team, contentType: targetItem.content_type || contentType,
        articleType: bodyObj.articleType || articleType, intent: prefillIntent, composition: prefillComposition,
        description: prefillDescription, filmingPlan: prefillFilmingPlan, desiredDate: prefillDesiredDate,
        deadline: prefillDeadline, keywords: prefillKeywords, finalUrl: prefillDocsUrl, postContent, crew: prefillCrew,
      });
    } else {
      initialSnapshotRef.current = JSON.stringify({
        title: '', team: user?.user_metadata?.team || '인스타', contentType: '카드뉴스', articleType: '개인기사',
        intent: '', composition: '', description: '', filmingPlan: '', desiredDate: '', deadline: '', keywords: '', finalUrl: '',
        postContent: '', crew: [authorName],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetItem, effectiveTargetItem, isAttachingFinal, mode]);

  const currentSnapshot = () => JSON.stringify({
    title, team, contentType, articleType, intent, composition, description, filmingPlan,
    desiredDate, deadline, keywords, finalUrl, postContent, crew,
  });

  // 손잡이 2단계(arm→confirm) 풀-투-디스미스 — 상세보기(MobileTrioModal)와 완전히
  // 동일한 판정 기준을 그대로 옮겨왔다: 콘텐츠가 맨 위(scrollTop 0~4px 허용)인
  // 상태에서 아래로 당기면(release 기다리지 않고 이동 중 즉시) 손잡이가 나타나고,
  // 그 상태에서 한 번 더 당기면 확정되어 닫힌다. 예전엔 화면 맨 위에 항상 떠
  // 있는 손잡이를 직접 잡고 드래그해야 닫히는 방식(useSwipeDownToDismiss)이었는데,
  // 상세보기 쪽만 새 방식으로 바뀌어 두 화면의 손잡이 동작이 서로 달랐다 — 이 폼도
  // 같은 동작으로 통일한다.
  const mainRef = useRef<HTMLFormElement>(null);
  const swipeStart = useRef<{ x: number; y: number; scrollTopAtStart: number } | null>(null);
  const pullHandledInGesture = useRef(false);
  const [handleArmed, setHandleArmed] = useState(false);
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
  const onMainScroll = () => {
    if (handleArmed && (mainRef.current?.scrollTop ?? 0) > 4) setHandleArmed(false);
  };
  const onMainPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY, scrollTopAtStart: mainRef.current?.scrollTop ?? 0 };
    pullHandledInGesture.current = false;
  };
  const onMainPointerMove = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    if (!start || pullHandledInGesture.current) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const currentScrollTop = mainRef.current?.scrollTop ?? 0;
    if (
      dy > 60 && dy > Math.abs(dx) &&
      start.scrollTopAtStart <= 4 && currentScrollTop <= 4
    ) {
      pullHandledInGesture.current = true;
      e.preventDefault();
      lockScrollAtTop();
      if (handleArmed) {
        setHandleArmed(false);
        handleCancel();
      } else {
        setHandleArmed(true);
      }
    }
  };
  const onMainPointerUp = () => {
    swipeStart.current = null;
  };

  if (!isOpen) return null;

  const handleCancel = () => {
    const hasChanges = currentSnapshot() !== initialSnapshotRef.current;
    if (hasChanges && !window.confirm('변경 사항이 있습니다. 저장하지 않고 나가시겠습니까?')) {
      return;
    }
    onClose();
  };

  const toggleCrewMember = (profileName: string) => {
    if (crew.includes(profileName)) {
      if (profileName !== authorName) {
        setCrew(crew.filter(n => n !== profileName));
      }
    } else {
      setCrew([...crew, profileName]);
    }
  };

  const handleRemoveCrew = (nameToRemove: string) => {
    if (nameToRemove === authorName && crew.length === 1) return; // keep author if only one
    setCrew(crew.filter(n => n !== nameToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAttachingFinal && !title.trim()) {
      setToastMsg('제목을 입력해 주세요.');
      return;
    }

    if (mode === 'final' && !finalUrl.trim()) {
      setToastMsg('구글 드라이브 / URL 링크를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const crewString = crew.join(', ');

      if (isAttachingFinal) {
        // 이 콘텐츠(effectiveTargetItem)에 완성본을 연결 — 새 글을 만들지 않고 기존
        // 행을 완성본 전용 필드로 업데이트한다. PC FinalSubmitForm.tsx의 handleSubmit과
        // 동일한 필드 매핑(postContent/finalKeywords/finalCrew/finalDescription).
        const { data: current } = await supabase.from('contents').select('content_body').eq('id', effectiveTargetItem.id).single();
        let bodyData: any = {};
        try { if (current?.content_body) bodyData = JSON.parse(current.content_body); } catch (e) {}

        const updatedBody = {
          ...bodyData,
          postContent,
          desiredDate,
          finalKeywords: keywords,
          finalCrew: crewString,
          finalDescription: description,
          finalSubmittedAt: bodyData.finalSubmittedAt || new Date().toISOString(),
        };

        const { error } = await supabase.from('contents')
          .update({
            final_url: finalUrl,
            content_body: JSON.stringify(updatedBody),
            status: 'final_submitted',
          })
          .eq('id', effectiveTargetItem.id);

        if (error) throw error;

        setSuccessMsg('완성본이 성공적으로 업로드되었습니다! 🎉');
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessMsg('');
          onClose();
          router.refresh();
        }, 1000);
        return;
      }

      const authorEmail = user?.email || 'user@yonsei.ac.kr';

      // [B4] 수정 시 기존 content_body(댓글, 완성본 필드 등)를 안전하게 병합
      let existingBody: any = {};
      if (targetItem?.id) {
        const { data: latest } = await supabase.from('contents').select('content_body').eq('id', targetItem.id).single();
        if (latest?.content_body) {
          try { existingBody = JSON.parse(latest.content_body); } catch (e) {}
        }
      }

      const bodyObj = {
        ...existingBody,
        authorEmail: existingBody.authorEmail || authorEmail,
        desiredDate,
        deadline,
        intent,
        composition,
        description,
        filmingPlan,
        articleType,
        targetMonth,
        crew: crewString,
        docsUrl: finalUrl || existingBody.docsUrl || '',
      };

      const payload: any = {
        title,
        team,
        content_type: contentType,
        author_name: authorName,
        status: mode === 'final' ? 'final_submitted' : 'pending',
        intent,
        description,
        keywords,
        final_url: mode === 'final' ? finalUrl : (targetItem?.final_url || null),
        target_date: desiredDate || null,
        content_body: JSON.stringify(bodyObj),
      };

      const { error } = targetItem
        ? await supabase.from('contents').update(payload).eq('id', targetItem.id)
        : await supabase.from('contents').insert([{ ...payload, created_at: new Date().toISOString() }]);

      if (error) {
        throw error;
      }

      setSuccessMsg(mode === 'final' ? '완성본이 성공적으로 업로드되었습니다! 🎉' : '기획안이 성공적으로 제출되었습니다! 🎉');
      try { localStorage.removeItem('emergency_mobile_submit_backup'); } catch(e) {}
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMsg('');
        onClose();
        router.refresh();
      }, 1000);

    } catch (err: any) {
      setToastMsg(`제출 중 오류가 발생했습니다: ${err.message || err}`);
      setIsSubmitting(false);
    }
  };

  // 완성본을 기존 콘텐츠에 연결하는 흐름(isAttachingFinal)은 그 대상 자체가 이미
  // 제출된 콘텐츠라 "임시저장" 개념이 자연스럽게 들어맞지 않는다(그 행의 status를
  // draft로 바꾸면 이미 승인된 기획안 자체가 목록에서 사라져 버림) — 이 흐름만
  // 기존 2버튼(제출/취소) 푸터를 그대로 쓰고, 나머지(작성하기/기획안 수정하기)에만
  // 새 임시저장 UI를 적용한다.
  const showDraftUI = !isAttachingFinal;

  // 임시저장 — 현재 폼 내용을 status:'draft'로 저장한다. 이미 저장한 초안을 이어
  // 쓰던 중이거나(draftResumeId) 기존 콘텐츠를 수정하던 중이면(targetItem) 새 행을
  // 또 만들지 않고 그 행을 업데이트하고, 그 외(완전히 새로 작성 중)에는 새 초안
  // 행을 만든다.
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const crewString = crew.join(', ');
      const authorEmail = user?.email || 'user@yonsei.ac.kr';
      const bodyObj = {
        authorEmail, desiredDate, deadline, intent, composition, description, filmingPlan,
        articleType, targetMonth, crew: crewString, docsUrl: finalUrl,
      };
      const payload: any = {
        title, team, content_type: contentType, author_name: authorName,
        status: 'draft', intent, description, keywords,
        final_url: mode === 'final' ? finalUrl : null,
        target_date: desiredDate || null,
        content_body: JSON.stringify(bodyObj),
      };
      const resumeId = draftResumeId ?? (isEditMode && !isAttachingFinal ? targetItem.id : null);
      if (resumeId) {
        const { error } = await supabase.from('contents').update(payload).eq('id', resumeId);
        if (error) throw error;
        setDraftResumeId(resumeId);
      } else {
        const { data, error } = await supabase
          .from('contents')
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select('id')
          .single();
        if (error) throw error;
        setDraftResumeId(data.id);
      }
      setDraftSavedMsg('임시저장되었습니다');
      setTimeout(() => setDraftSavedMsg(''), 1800);
      if (showDraftsFolder) fetchDrafts();
    } catch (err: any) {
      setToastMsg(`임시저장 중 오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 임시저장함 — 내가 저장한 초안(status:'draft', authorEmail 일치) 목록을 불러온다.
  const fetchDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const { data } = await supabase
        .from('contents')
        .select('id, title, author_name, team, content_type, keywords, created_at, content_body')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      const myEmail = user?.email || '';
      const mine = (data || []).filter(row => {
        try {
          const b = row.content_body ? JSON.parse(row.content_body) : {};
          return b.authorEmail === myEmail || row.author_name === myEmail;
        } catch { return false; }
      });
      setDraftItems(mine);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleOpenDraftsFolder = () => {
    setShowDraftsFolder(true);
    fetchDrafts();
  };

  // 초안을 탭하면 그 내용을 폼에 그대로 불러와 이어서 쓸 수 있게 한다.
  const handleLoadDraft = (draft: any) => {
    let b: any = {};
    try { if (draft.content_body) b = JSON.parse(draft.content_body); } catch (e) {}
    setTitle(draft.title || '');
    if (draft.team) setTeam(draft.team);
    if (draft.content_type) setContentType(draft.content_type);
    setArticleType(b.articleType || articleType);
    setTargetMonth(b.targetMonth || targetMonth);
    setIntent(b.intent || '');
    setComposition(b.composition || '');
    setDescription(b.description || '');
    setFilmingPlan(b.filmingPlan || '');
    setDesiredDate(b.desiredDate || '');
    setDeadline(b.deadline || '');
    setKeywords(draft.keywords || '');
    setFinalUrl(b.docsUrl || '');
    setCrew(b.crew ? String(b.crew).split(',').map((s: string) => s.trim()).filter(Boolean) : [authorName]);
    setDraftResumeId(draft.id);
    setShowDraftsFolder(false);
  };

  const filteredProfiles = dbProfiles.filter(p => {
    if (!p.author_name) return false;
    if (memberSearchQuery && !p.author_name.includes(memberSearchQuery)) return false;
    if (activeTab === 'my_team') {
      return team && p.team === team;
    } else {
      return !team || p.team !== team;
    }
  });

  // 완성본 업로드를 targetItem 없이 열었을 때(대시보드의 범용 "완성본 업로드"
  // 버튼) — 아직 완성본이 없고 내가 관리할 수 있는(작성자 본인 또는 관리자)
  // 콘텐츠만 골라 보여준다. 전체 리스트/캘린더의 인라인 "완성본 업로드" 버튼
  // 노출 조건과 같은 기준(canManage && !isFinalAlready)을 그대로 쓴다.
  const isAdminUser = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
  const candidateItems = mode === 'final' && !targetItem && !pickedTargetItem
    ? contents.filter(item => {
        const isFinalAlready = ['completed', 'uploaded', 'final_submitted', 'final_revision'].includes(item.status) || !!item.final_url;
        if (isFinalAlready) return false;
        let authorEmail = '';
        let crewString = '';
        try {
          const b = JSON.parse(item.content_body || '{}');
          authorEmail = b.authorEmail || '';
          crewString = typeof b.crew === 'string' ? b.crew : Array.isArray(b.crew) ? b.crew.map((c: any) => c.name || c).join(',') : '';
        } catch {}
        if (!crewString && item.description) {
          crewString = item.description;
        }
        const isOwnAuthor = (user?.email && authorEmail && authorEmail === user.email) ||
                            (user?.email && item.author_name === user.email) ||
                            (authorName && item.author_name?.includes(authorName));
        const isCrew = (user?.email && crewString.includes(user.email)) ||
                       (authorName && crewString.includes(authorName));
        const isOwn = isOwnAuthor || isCrew;
        return isAdminUser || isOwn;
      })
    : [];
  const needsTargetPicker = mode === 'final' && !targetItem && !pickedTargetItem;

  if (needsTargetPicker) {
    return (
      <div className="absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out">
        {/* 리스트가 먼저 전체 화면을 차지하고, 헤더는 그 위에 그라데이션 블러
            배경과 함께 떠서 리스트가 그 뒤로 스크롤되어 지나가 보이게 한다. */}
        <div className="flex-1 overflow-y-auto px-4 pt-24 pb-24 space-y-2.5">
          {candidateItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              완성본을 업로드할 수 있는 콘텐츠가 없습니다.
            </div>
          ) : (
            candidateItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPickedTargetItem(item)}
                className="w-full text-left p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs active:scale-[0.99] transition-transform"
              >
                <div className="text-sm font-black text-slate-900 truncate">{item.title}</div>
                <div className="text-xs text-slate-500 font-bold mt-0.5">
                  {item.team || '팀'} · {item.author_name} ({item.content_type || '콘텐츠'})
                </div>
              </button>
            ))
          )}
        </div>

        <div className="absolute inset-x-0 top-0 z-10 pointer-events-none" style={{ height: '8rem' }}>
          {/* backdrop-blur는 색상 그라데이션과 달리 요소 경계에서 무조건 딱 끊기기 때문에,
              bg-gradient만으로는 "블러 처리된 영역 vs 아닌 영역"의 경계가 또렷하게 보였다
              (색은 부드럽게 옅어져도 흐림 자체는 그 자리에서 즉시 0이 됨) — mask-image로
              이 블러 레이어 자체의 불투명도를 위→아래로 서서히 줄여, 흐림 정도까지 함께
              부드럽게 사라지도록 했다. */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#F4F5F7] via-[#F4F5F7]/92 to-transparent backdrop-blur-md"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
            }}
          />
          <div className="relative safe-pt px-4 pt-4 pb-3">
            <h2 className="text-base font-black text-slate-900">완성본을 업로드할 콘텐츠 선택</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">기획안이 이미 등록된 콘텐츠 중에서 골라주세요.</p>
          </div>
        </div>

        {/* 뒤로가기 — 우상단 ✕ 대신 우하단에, 예전 코멘트 페이지에서 잠깐 쓰였던
            것과 같은 U턴 화살표(왼쪽을 가리키되 꼬리가 아래로 꼬여 도는 모양)로.
            크기·위치를 메인화면 하단 nav의 돋보기 버튼(glass-cta, 58×58px, 화면
            우측 하단 inset-x-4/bottom 0.75rem)과 정확히 맞췄다. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="뒤로가기"
          className="absolute right-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 glass-cta w-[3.625rem] h-[3.625rem] rounded-full flex items-center justify-center text-slate-700 active:scale-95 transition-transform cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out"
    >
      {/* 검증/제출 실패 안내 — 화면 정중앙, 다른 화면들과 동일한 토스트 스타일 */}
      {toastMsg && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none px-8">
          <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {toastMsg}
          </div>
        </div>
      )}

      {/* 2. Main Full Screen Form Body (100% PC Specs & Crew Selector) — 손잡이는
          상세보기(MobileTrioModal)와 동일하게 평소엔 숨어있다가, 맨 위에서 아래로
          당기면 나타나고(arm) 한 번 더 당기면 확정되어 닫힌다(confirm). 헤더 배지도
          예전엔 화면 위에 떠서 콘텐츠가 그 뒤로 지나가는 방식이었는데, 요청대로
          일반 콘텐츠와 함께 스크롤되는 흐름으로 되돌리고 제목 필드 바로 위에 뒀다. */}
      <form
        ref={mainRef}
        onSubmit={handleSubmit}
        onPointerDown={onMainPointerDown}
        onPointerMove={onMainPointerMove}
        onPointerUp={onMainPointerUp}
        onScroll={onMainScroll}
        style={{ overflowAnchor: 'none' }}
        className="flex-1 safe-pt p-5 overflow-y-auto overflow-x-hidden space-y-4 max-w-xl mx-auto w-full pb-32 text-slate-900"
      >
        {handleArmed && (
          <div className="flex justify-center py-1 -mt-2 mb-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-10 h-1.5 rounded-full bg-slate-300" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="glass-cta flex items-center gap-2 px-3.5 py-2 rounded-2xl">
            <span className="text-base">{mode === 'final' ? '📤' : '✍️'}</span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              {mode === 'final' ? '완성본 업로드' : '기획안 작성'}
            </h2>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-800 font-extrabold text-sm rounded-2xl text-center border border-emerald-200 animate-in fade-in shadow-xs">
            {successMsg}
          </div>
        )}

        {emergencyBackup && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">🛡️</span>
              <div className="min-w-0">
                <div className="text-xs font-black text-blue-950 truncate">작성 중이던 임시 데이터 발견</div>
                <div className="text-[10px] text-blue-700 font-medium truncate">{emergencyBackup.title || '제목 없음'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleRestoreEmergency}
                className="px-2.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              >
                복구하기
              </button>
              <button
                type="button"
                onClick={handleDiscardEmergency}
                className="px-2 py-1.5 bg-white text-slate-500 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
              >
                무시
              </button>
            </div>
          </div>
        )}

        {/* 완성본을 특정 콘텐츠에 연결하는 경우 — 제목/분류는 그 콘텐츠(기획안)에
            이미 정해져 있는 값이라 다시 입력받지 않고, 대상이 무엇인지만 보여준다
            (PC FinalSubmitForm의 "선택된 기획안" 카드와 동일한 역할). */}
        {isAttachingFinal ? (
          <div className="p-4 bg-[#EBF3FF] border border-[#99B3D6]/60 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-[#003378]">완성본을 업로드할 콘텐츠</div>
            <div className="text-sm font-black text-[#002454] leading-snug">{effectiveTargetItem.title}</div>
            <div className="text-xs font-medium text-[#1A4B8C]">
              {effectiveTargetItem.team || '팀'} · {effectiveTargetItem.content_type || '콘텐츠'}
            </div>
          </div>
        ) : (
          <>
            {/* 1. 제목 (가제) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">
                제목 (가제) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="내용을 입력해 주세요"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 shadow-2xs"
              />
            </div>

            {/* 2. 콘텐츠 분류 — select 3개는 2열 그리드로도 문제없이 줄어들지만,
                네이티브 월 선택 컨트롤(type="month")은 iOS Safari에서 내부 세그먼트가
                좁은 그리드 셀 폭까지 줄어들지 못해 카드 밖으로 삐져나오는 문제가
                실기기에서 확인됐다(희망 업로드 시기/데드라인 날짜 입력에서 이미 겪은
                것과 같은 종류의 문제) — 같은 방식으로 그리드에서 빼내 단독 줄에서
                전체 폭을 쓰게 했다. */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">콘텐츠 분류</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={team}
                  onChange={e => setTeam(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-base font-bold text-slate-800 focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 shadow-2xs"
                >
                  <option value="인스타">인스타 팀</option>
                  <option value="유튜브">유튜브 팀</option>
                  <option value="블로그">블로그 팀</option>
                  <option value="단장 팀">단장 팀</option>
                </select>

                <select
                  value={articleType}
                  onChange={e => setArticleType(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-base font-bold text-slate-800 focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 shadow-2xs"
                >
                  <option value="개인기사">개인기사</option>
                  <option value="팀기사">팀기사</option>
                </select>
              </div>

              <select
                value={contentType}
                onChange={e => setContentType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-base font-bold text-slate-800 focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 shadow-2xs"
              >
                <option value="카드뉴스">카드뉴스</option>
                <option value="영상(숏폼)">영상(숏폼)</option>
                <option value="영상(롱폼)">영상(롱폼)</option>
                <option value="글 기사">글 기사</option>
                <option value="사진/기타">사진/기타</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">대상 월</label>
              <input
                type="month"
                value={targetMonth}
                onChange={e => setTargetMonth(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-base font-bold text-slate-800 focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 shadow-2xs"
              />
            </div>
          </>
        )}

        {/* 3. 구글 드라이브 / URL 링크 (완성본 필수, 기획안 선택) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">
            {mode === 'final' ? '구글 드라이브 / URL 링크 *' : '기획안 문서 URL 연결'}
          </label>
          <input
            type="url"
            required={mode === 'final'}
            placeholder="https://drive.google.com/file/d/..."
            value={finalUrl}
            onChange={e => setFinalUrl(e.target.value)}
            className="w-full px-4 py-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-base font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 shadow-2xs"
          />
          {mode === 'final' && (
            <div className="flex items-start gap-1.5 px-3 py-2 text-[11px] text-amber-800 bg-amber-50/90 rounded-xl border border-amber-200/80 font-medium leading-relaxed">
              <span className="flex-shrink-0">💡</span>
              <span>구글 드라이브 공유 설정을 <strong>'링크가 있는 모든 사용자 (뷰어)'</strong>로 지정해야 모달에서 미리보기가 지원됩니다.</span>
            </div>
          )}
        </div>

        {/* 4. 참여인원 (크루) - PC 1:1 선택/추가/삭제 시스템 */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-[#111111] block">참여인원 (크루)</label>
          
          <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3 overflow-x-auto">
            {/* Added Crew Avatars */}
            {crew.map((memberName) => (
              <div key={memberName} className="flex flex-col items-center relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#002454] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                  {memberName.slice(0, 2)}
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">{memberName}</span>

                {/* Remove Red Badge */}
                {crew.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCrew(memberName)}
                    aria-label={`${memberName} 제외`}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-extrabold text-[10px] flex items-center justify-center border border-white shadow-2xs hover-fine:bg-red-600 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Plus Button to Open PC Selection Modal */}
            <button
              type="button"
              onClick={() => setShowMemberSelect(!showMemberSelect)}
              className="w-11 h-11 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-lg hover-fine:border-blue-500 hover-fine:text-blue-600 transition-colors flex-shrink-0"
              title="크루원 추가"
            >
              +
            </button>
          </div>

          {/* Member Selection Drawer (PC 1:1 System) */}
          {showMemberSelect && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setActiveTab('my_team')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'my_team' ? 'border-blue-900 text-blue-900 bg-white' : 'border-transparent text-slate-500'
                  }`}
                >
                  우리 팀 ({team})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('other_teams')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'other_teams' ? 'border-blue-900 text-blue-900 bg-white' : 'border-transparent text-slate-500'
                  }`}
                >
                  다른 팀
                </button>
              </div>

              {/* Search Field */}
              <div className="p-3 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="크루원 이름 검색..."
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Members List */}
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map(p => {
                    const isSelected = crew.includes(p.author_name);
                    return (
                      <div
                        key={p.author_name}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`${p.author_name} (${p.team}) ${isSelected ? '선택 해제' : '크루로 선택'}`}
                        onClick={() => toggleCrewMember(p.author_name)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCrewMember(p.author_name); } }}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900' : 'hover-fine:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span>{p.author_name} <span className="text-[10px] text-slate-600 font-medium">({p.team})</span></span>
                        {isSelected && <span className="text-blue-600 font-extrabold">✓</span>}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-600 font-medium">검색된 단원이 없습니다.</div>
                )}
              </div>

              {/* Close Bar */}
              <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  type="button"
                  onClick={() => setShowMemberSelect(false)}
                  className="text-xs font-bold text-slate-600 hover-fine:text-slate-900"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. 기획 의도 및 배경 — 완성본 연결 모드에서는 완성본 전용 필드인 "본문 /
            캡션 내용"(postContent)로 재활용한다(PC 완성본 폼에 있는 필드, 기획안의
            기획 의도와는 다른 값). */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">
            {isAttachingFinal ? '본문 / 캡션 내용' : '기획 의도 및 배경'}
          </label>
          <textarea
            rows={4}
            placeholder={isAttachingFinal ? '실제로 게시된(될) 본문이나 캡션 내용을 입력해 주세요.' : '기획 의도 및 배경을 상세히 입력해 주세요.'}
            value={isAttachingFinal ? postContent : intent}
            onChange={e => (isAttachingFinal ? setPostContent(e.target.value) : setIntent(e.target.value))}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 resize-none shadow-2xs leading-relaxed"
          />
        </div>

        {/* 6. 구성 및 내용 — 완성본 연결 모드에서는 "비고"(finalDescription)로 재활용. */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#111111] block">
            {isAttachingFinal ? '비고' : '구성 및 내용'}
          </label>
          <textarea
            rows={4}
            placeholder={isAttachingFinal ? '전달하고 싶은 추가 메모가 있다면 입력해 주세요.' : '구성 및 세부 내용 구성을 작성해 주세요.'}
            value={isAttachingFinal ? description : composition}
            onChange={e => (isAttachingFinal ? setDescription(e.target.value) : setComposition(e.target.value))}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 resize-none shadow-2xs leading-relaxed"
          />
        </div>

        {/* 7. 촬영 계획 — 기획안 전용 필드라 완성본 연결 모드에서는 숨긴다. */}
        {!isAttachingFinal && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111111] block">촬영 계획</label>
            <textarea
              rows={3}
              placeholder="촬영 장소, 준비물 및 촬영 일정을 작성해 주세요."
              value={filmingPlan}
              onChange={e => setFilmingPlan(e.target.value)}
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 resize-none shadow-2xs leading-relaxed"
            />
          </div>
        )}

        {/* 7-1. 비고 — 기획안 전용, PC ProposalSubmitForm과 동일하게 description에
            바인딩한다(완성본 연결 모드는 위 6번 필드가 이미 이 값을 담당). */}
        {!isAttachingFinal && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111111] block">비고</label>
            <textarea
              rows={3}
              placeholder="내용을 입력해 주세요."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#002454]/40 dark:focus:ring-[#003378]/60 resize-none shadow-2xs leading-relaxed"
            />
          </div>
        )}

        {/* 8. 희망 업로드 시기 & 데드라인 — 데드라인은 기획안 전용 개념이라 완성본
            연결 모드에서는 희망 업로드 시기만 단독으로 보여준다. */}
        {isAttachingFinal ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111111] block">희망 업로드 시기</label>
            <input
              type="date"
              value={desiredDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDesiredDate(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-base font-medium shadow-2xs"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* 네이티브 date input을 2열 그리드로 나란히 두면, 데스크톱 Chrome에서는
                min-w-0로 문제없이 반씩 줄어들지만 실기기 iOS Safari는 date input의
                내부 mm/dd/yyyy 세그먼트를 그 폭까지 줄이지 못해 상자가 화면 밖으로
                잘리거나 값 자체가 안 보이는 문제가 실제로 확인됐다(사용자 제보
                스크린샷) — 이 두 입력을 아예 세로로 쌓아 각각 화면 전체 폭을 쓰게
                바꿔 네이티브 컨트롤이 절대 줄어들 필요가 없도록 근본적으로 피했다. */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">희망 업로드 시기</label>
              <input
                type="date"
                value={desiredDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDesiredDate(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-base font-medium shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111111] block">데드라인</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-base font-medium shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* 9. 해시태그 / 키워드 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#111111] block">해시태그 / 키워드 (쉼표 또는 스페이스로 구분)</label>
            <button
              type="button"
              onClick={() => {
                const textBody = `${composition || ''} ${description || ''} ${filmingPlan || ''} ${postContent || ''}`;
                const recommended = recommendHashtagsFromContent(title, intent, textBody);
                if (recommended) {
                  setKeywords(recommended);
                } else {
                  alert('기획안 제목이나 의도를 먼저 작성하시면 맞춤 해시태그를 추천해드립니다!');
                }
              }}
              title="Mecab-YAKE 파이프라인 AI 해시태그 자동 추천"
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold active:scale-95 transition-transform cursor-pointer"
            >
              <span className="text-xs">🎲</span>
              <span>해시태그 추천</span>
            </button>
          </div>
          <input
            type="text"
            placeholder="연세대, 축제 카드뉴스 (쉼표/스페이스 혼용 가능)"
            value={keywords}
            onChange={e => {
              const raw = e.target.value;
              const parts = raw.split(/[,\s]+/).map(k => k.trim()).filter(Boolean);
              const isTyping = /[,\s]$/.test(raw);
              setKeywords(isTyping ? raw : parts.join(', '));
            }}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-base font-medium shadow-2xs"
          />
        </div>
      </form>

      {/* 3. Sticky Bottom Action Bar — 상세보기(MobileTrioModal)의 하단 바와 같은
          생김새로 통일했다: 보조 액션(임시저장함/임시저장)은 아이콘만 있는 원형
          버튼, 주 액션(제출/업로드)은 화살표 없이 짧은 텍스트만 있는 넓은 알약
          버튼, 닫기는 3요소와 완전히 같은 원형 ✕ 버튼 — 예전엔 버튼마다 크기·
          모양·텍스트가 제각각(w-1/4 대 w-1/3, 아이콘+텍스트 대 텍스트만, ✕ 대
          "닫기" 대 "취소")이라 통일감이 없었다. */}
      <footer className="absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2">
        {/* 작성하기(신규)엔 임시저장함(초안 목록으로 이동), 수정하기(기존 콘텐츠
            편집)엔 임시저장(그 자리에서 바로 저장) — isAttachingFinal(완성본을
            기존 기획안에 연결하는 좁은 흐름)만 예외로 이 보조 버튼 자체가 없다. */}
        {showDraftUI && (
          <button
            type="button"
            onClick={isEditMode ? handleSaveDraft : handleOpenDraftsFolder}
            disabled={isEditMode && isSavingDraft}
            aria-label={isEditMode ? '임시저장' : '임시저장함'}
            className="glass-cta w-[2.625rem] h-[2.625rem] rounded-full flex items-center justify-center text-base flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            {isEditMode ? '💾' : '🗂️'}
          </button>
        )}
        {/* 제출/업로드 버튼 — 대시보드 플로팅 CTA의 "완성본 업로드" 버튼과 배경색·
            폰트·높이를 맞췄다(glass-cta-sky, #003378, font-normal, h-2.625rem). */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="glass-cta-sky flex-1 h-[2.625rem] text-[#003378] font-normal rounded-full text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          {isSubmitting ? '처리 중...' : mode === 'final' ? '업로드' : '제출하기'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="닫기"
          className="glass-cta w-[2.625rem] h-[2.625rem] rounded-full flex items-center justify-center text-slate-700 text-base flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
        >
          ✕
        </button>
      </footer>

      {/* 임시저장함 — 작성하기 전용, 하단 액션 바 위에서 진입한다. 목록에서 초안을
          탭하면 그 내용을 폼에 그대로 불러와 이어 쓸 수 있고, 상단의 "임시저장하기"로
          지금 폼에 있는 내용(초안함을 열기 전에 쓰고 있던 내용)을 그대로 새 초안으로
          저장할 수 있다. */}
      {showDraftsFolder && (
        <div className="absolute inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-250 ease-out">
          {/* 요청 반영 — 우상단 닫기(✕)를 없애고, 아래 하단 액션 바에 임시저장하기(주)
              + X(닫기, 그 오른쪽) 구성으로 통일했다. */}
          <header className="safe-pt px-4 pt-4 pb-3 flex-shrink-0">
            <h2 className="text-base font-black text-slate-900">임시저장함</h2>
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {isLoadingDrafts ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">불러오는 중...</div>
            ) : draftItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">저장된 임시글이 없습니다.</div>
            ) : (
              draftItems.map(draft => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => handleLoadDraft(draft)}
                  className="w-full text-left p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs active:scale-[0.99] transition-transform"
                >
                  <div className="text-sm font-black text-slate-900 truncate">{draft.title || '(제목 없음)'}</div>
                  <div className="text-xs text-slate-500 font-bold mt-0.5">
                    {draft.content_type || '콘텐츠'} · {draft.created_at ? draft.created_at.split('T')[0] : ''}
                  </div>
                </button>
              ))
            )}
          </div>

          <footer className="p-4 flex-shrink-0 safe-pb">
            {draftSavedMsg && (
              <div className="mb-2 p-2.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl text-center border border-emerald-200 animate-in fade-in">
                {draftSavedMsg}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="glass-cta-primary flex-1 py-4 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <span>💾</span>
                <span>{isSavingDraft ? '저장 중...' : '지금 작성 중인 내용 임시저장하기'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDraftsFolder(false)}
                aria-label="임시저장함 닫기"
                className="glass-cta glass-cta-strong w-14 py-4 text-[#002454] font-extrabold rounded-2xl text-sm flex-shrink-0 active:scale-95 transition-transform"
              >
                ✕
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
