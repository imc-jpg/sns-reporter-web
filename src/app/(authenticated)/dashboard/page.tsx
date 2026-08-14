import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import Link from "next/link";
import UploadCard from "@/components/UploadCard";
import DashboardCalendarArea from "@/components/DashboardCalendarArea";
import AdminStatusManager from "@/components/AdminStatusManager";
import MissingFinalWorksPopup from "@/components/MissingFinalWorksPopup";
import PendingItem from "@/components/PendingItem";
import FeedbackBanner from "@/components/FeedbackBanner";
import OtherProposalsCarousel from "@/components/OtherProposalsCarousel";
import NoticeList from "@/components/NoticeList";
import FinalDeadlineCarousel from "@/components/FinalDeadlineCarousel";
import ModalLink from '@/components/ModalLink';
import { isTraineeContent } from "@/utils/trainee";


export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function DashboardPageContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const isAdmin = resolvedParams?.admin === 'true';
  const searchQuery = typeof resolvedParams?.q === 'string' ? resolvedParams.q : '';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;

  const { data: profile } = await supabase.from('contents')
    .select('author_name, keywords')
    .eq('title', `PROFILE_${userEmail}`)
    .maybeSingle();

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const realName = profile?.author_name || userName || null;
  const userGen = profile?.keywords || '';
  const userNameToShow = profile
    ? `${userGen ? userGen + '기 ' : ''}${profile.author_name}`
    : (userName || userEmail?.split('@')[0] || '기자');

  const currentDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // All contents (omit heavy content_body for fast load; range limit to 50)
  const { data: dbContents } = await supabase
    .from('contents')
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('status', 'draft')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .range(0, 49);
  const contents = (dbContents || []) as any[];

  const { data: allProfilesData } = await supabase
    .from('contents')
    .select('author_name, keywords')
    .eq('content_type', 'SYSTEM_PROFILE');
  const allProfiles = allProfilesData || [];
  // Deadlines — use admin client to bypass RLS for system records
  const { data: deadlineRow } = await supabaseAdmin
    .from('contents')
    .select('content_body')
    .eq('title', 'SYSTEM_DEADLINES')
    .maybeSingle();

  let deadlines: any = {};
  try { if (deadlineRow?.content_body) deadlines = JSON.parse(deadlineRow.content_body); } catch {}

  const calcDDay = (dateStr: string | null) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-');
    const target = new Date(Number(y), Number(m) - 1, Number(d));
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };
  const proposalDDay = calcDDay(deadlines.proposalDeadline);
  const finalDDay = calcDDay(deadlines.finalDeadline);

  const dbNotices = (contents || []).filter(c => c.content_type === 'NOTICE');
  const rawContents = (contents || [])
    .filter(c => c.content_type !== 'NOTICE')
    .map(item => {
      let emailInJson = '';
      let crewString = '';
      let bodyObj: any = {};
      try {
        if ((item as any).content_body && (item as any).content_body.startsWith('{')) {
          bodyObj = JSON.parse((item as any).content_body);
          emailInJson = bodyObj.authorEmail || '';
          if (typeof bodyObj.crew === 'string') {
            crewString = bodyObj.crew;
          } else if (Array.isArray(bodyObj.crew)) {
            crewString = bodyObj.crew.map((c: any) => c.name || '').join(',');
          }
        }
      } catch(e) {}
      
      const isAuthor = user && (emailInJson === userEmail || item.author_name === userEmail || item.author_name === realName || (realName && item.author_name?.includes(realName)));
      const isCrew = user && realName && crewString.includes(realName);
      const isMine = !!(isAuthor || isCrew);
      return { 
        ...item, 
        parsedPublishDate: null, 
        isMine, 
        parsedCrew: crewString,
        articleType: bodyObj.articleType || '',
        docsUrl: bodyObj.docsUrl || '',
        targetMonth: bodyObj.targetMonth || '',
        desiredDate: bodyObj.desiredDate || '',
        finalSubmittedAt: bodyObj.finalSubmittedAt || '',
      };
    })
    .filter(item => !isTraineeContent(item));

  const myContents = rawContents.filter(i => i.isMine);

  // 관리자 뷰용 (전체 콘텐츠)
  let displayContents = isAdmin ? rawContents : myContents;
  if (searchQuery) {
    const qLower = searchQuery.toLowerCase();
    displayContents = displayContents.filter(item =>
      item.title?.toLowerCase().includes(qLower) ||
      item.author_name?.toLowerCase().includes(qLower) ||
      item.team?.toLowerCase().includes(qLower) ||
      item.content_type?.toLowerCase().includes(qLower)
    );
  }

  // 미제출 완성본: 기획안 통과 (approved) 상태이면서 완성본 미업로드 항목
  const pendingFinalItems = myContents.filter(i => i.status === 'approved').map(i => {
    return {
      ...i,
      deadline: (i as any).desiredDate || deadlines.finalDeadline || ''
    };
  });

  // 각 콘텐츠의 개별 deadline 추출 (approved 상태 콘텐츠의 기획안 작성 시 설정한 deadline)
  const deadlineItems = pendingFinalItems
    .filter(i => i.deadline)
    .map(i => ({
      id: i.id,
      title: i.title || '제목 없음',
      deadline: i.deadline,
      team: i.team || '',
      content_type: i.content_type || ''
    }));

  const waitingItems = myContents.filter(i =>
    ['pending', 'revision', 'final_submitted', 'final_revision', 'approved'].includes(i.status)
  ).sort((a, b) => {
    if (a.status === 'approved' && b.status !== 'approved') return -1;
    if (b.status === 'approved' && a.status !== 'approved') return 1;
    if (a.status.includes('revision') && !b.status.includes('revision')) return -1;
    if (b.status.includes('revision') && !a.status.includes('revision')) return 1;
    return 0;
  });

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

  const formatDDay = (d: number | null) => {
    if (d === null) return '미설정';
    if (d === 0) return 'D-Day';
    if (d < 0) return `D+${Math.abs(d)}`;
    return `D-${d}`;
  };

  const myRecentFeedbacks = myContents
    .filter(item => (item.feedback_comment && item.feedback_comment.trim() !== '') || item.status.includes('revision'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <FeedbackBanner feedbacks={myRecentFeedbacks} />

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>내 워크스페이스</h2>
      </div>

      {/* ── ROW 1: 업로드 | 승인대기 | 마감일 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: '1.5rem', alignItems: 'stretch' }}>

        <UploadCard pendingFinalItems={pendingFinalItems} />

        {/* 대기 중 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '360px', overflow: 'hidden', borderRadius: '24px', padding: '1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)', background: '#FFFFFF' }}>
          <h3 style={{ fontWeight: 850, fontSize: '1.05rem', marginBottom: '1.1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            대기 중
            <span style={{ background: '#E6EBF2', color: '#003378', borderRadius: '999px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 800 }}>
              {waitingItems.length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, overflowY: 'auto' }}>
            {waitingItems.length === 0 && (
              <div style={{ color: '#CBD5E1', fontSize: '0.9rem', textAlign: 'center', marginTop: '2.5rem', fontWeight: 600 }}>대기 중인 항목이 없습니다</div>
            )}
            {waitingItems.map(item => (
              <PendingItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* 마감일 D-Day 카드 (Figma 디자인 매칭) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 기획안 마감 - 연한 파랑색 카드 */}
          <div style={{ 
            background: '#E6EBF2', 
            borderRadius: '24px', 
            padding: '1.25rem 1.5rem', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            border: '1.5px solid #C0CFE4',
            boxShadow: '0 4px 15px rgba(192, 207, 228, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: '#003378', fontSize: '0.82rem', fontWeight: 800 }}>
                {deadlines.proposalLabel || '기획안 마감'}
              </span>
              {deadlines.proposalDeadline && (
                <span style={{ color: '#003378', fontSize: '0.72rem', fontWeight: 700, opacity: 0.8 }}>
                  {deadlines.proposalDeadline}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ color: '#003378', fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: '1.1' }}>
                {formatDDay(proposalDDay)}
              </div>
              <span style={{ color: '#003378', fontSize: '0.72rem', fontWeight: 700, opacity: 0.8 }}>
                {deadlines.proposalSubLabel || '26-1분기 (5월 콘텐츠)'}
              </span>
            </div>
          </div>

          {/* 완성본 마감 - 각 콘텐츠 개별 deadline 자동 로테이션 */}
          <FinalDeadlineCarousel 
            items={deadlineItems} 
            globalFinalDeadline={deadlines.finalDeadline || null}
            globalFinalLabel={deadlines.finalLabel || null}
            globalFinalSubLabel={deadlines.finalSubLabel || null}
          />
        </div>
      </div>

      {/* ── ROW 2: 다른 사람들의 기획안 | 공지사항 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <OtherProposalsCarousel dbProposals={contents || []} />
        <NoticeList dbNotices={dbNotices} />
      </div>

      {/* ── ROW 3: 캘린더 | 내 콘텐츠 전체 ── */}
      <DashboardCalendarArea rawContents={rawContents} myContents={myContents} allProfiles={allProfiles} />

      {/* ── 관리자 패널: 상태 관리 및 피드백 ── */}
      {isAdmin && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '6px', padding: '2px 10px', fontSize: '0.78rem' }}>관리자</span>
              기획안 상태 관리 ({displayContents.length}건)
            </h3>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E6EBF2', backgroundColor: '#F8FAFC' }}>
                  {['등록일/상태', '팀/종류', '작성자', '콘텐츠 제목', '피드백', '상태 관리'].map(h => (
                    <th key={h} style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayContents.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#CBD5E1' }}>콘텐츠가 없습니다</td></tr>
                )}
                {displayContents.map(item => {
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    draft: { bg: '#e5e7eb', text: '#4b5563' },
                    pending: { bg: '#FEF3C7', text: '#B45309' },
                    revision: { bg: '#FEE2E2', text: '#B91C1C' },
                    rejected: { bg: '#e5e7eb', text: '#4b5563' },
                    approved: { bg: '#D1FAE5', text: '#047857' },
                    final_submitted: { bg: '#DBEAFE', text: '#1D4ED8' },
                    final_revision: { bg: '#FEE2E2', text: '#B91C1C' },
                    completed: { bg: '#E6EBF2', text: '#003378' },
                    uploaded: { bg: '#D1FAE5', text: '#047857' },
                  };
                  const sc = statusColors[item.status] || { bg: '#f3f4f6', text: '#6b7280' };
                  const statusLabel: Record<string, string> = {
                    draft: '임시저장', pending: '대기', revision: '기획안 수정요청', rejected: '반려',
                    approved: '기획안 통과', final_submitted: '완성본 제출', final_revision: '완성본 수정요청',
                    completed: '업로드 대기', uploaded: '업로드 완료'
                  };
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                      <td style={{ padding: '0.85rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </div>
                        <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '999px', backgroundColor: sc.bg, color: sc.text, fontWeight: 700 }}>
                          {statusLabel[item.status] || item.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {item.team && <span>{item.team}</span>}
                          {item.content_type && <span>{item.content_type}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, whiteSpace: 'nowrap', color: '#334155', fontSize: '0.85rem' }}>
                        {item.author_name}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <ModalLink href={`/contents?openModalId=${item.id}`} style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', display: 'block', marginBottom: '0.3rem' }}>
                          {item.title}
                        </ModalLink>
                        {item.parsedPublishDate && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            📅 {item.parsedPublishDate}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', maxWidth: '220px' }}>
                        {item.feedback_comment ? (
                          <div style={{
                            fontSize: '0.82rem', lineHeight: 1.5,
                            color: ['approved','completed','uploaded'].includes(item.status) ? '#1e40af' : '#991b1b',
                            backgroundColor: ['approved','completed','uploaded'].includes(item.status) ? '#eff6ff' : '#fef2f2',
                            padding: '0.6rem 0.8rem', borderRadius: '8px',
                            border: ['approved','completed','uploaded'].includes(item.status) ? '1px solid #bfdbfe' : '1px solid #fecaca',
                            whiteSpace: 'pre-wrap', wordBreak: 'keep-all'
                          }}>
                            💬 {item.feedback_comment}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.82rem', fontStyle: 'italic' }}>피드백 없음</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', minWidth: '180px' }}>
                        <AdminStatusManager item={item} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { Suspense } from 'react';
import Loading from '../loading';

export default function DashboardPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardPageContent searchParams={searchParams} />
    </Suspense>
  );
}
