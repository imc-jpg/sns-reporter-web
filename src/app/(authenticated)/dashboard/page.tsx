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
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';


export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function DashboardPageContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const searchQuery = typeof resolvedParams?.q === 'string' ? resolvedParams.q : '';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // [B22] isAdmin을 URL 파라미터가 아닌 서버 측 user 메타데이터로 판단
  const isAdmin =
    user?.user_metadata?.is_admin === true ||
    user?.email === 'admin@admin.com';
  const userEmail = user?.email || null;

  // [성능 최적화] Promise.all로 모든 서버 쿼리를 병렬 실행하여 워터폴 제거 및 로딩 속도 극대화
  const [
    { data: profile },
    { data: dbContents },
    { data: allProfilesData },
    { data: deadlineRow }
  ] = await Promise.all([
    userEmail
      ? supabase.from('contents')
          .select('author_name, keywords')
          .eq('title', `PROFILE_${userEmail}`)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('contents')
      .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment, content_body')
      .neq('content_type', 'SYSTEM_PROFILE')
      .neq('title', 'SYSTEM_DEADLINES')
      .neq('status', 'draft')
      .neq('status', 'deleted')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .range(0, 49),
    supabase
      .from('contents')
      .select('author_name, keywords')
      .eq('content_type', 'SYSTEM_PROFILE'),
    supabaseAdmin
      .from('contents')
      .select('content_body')
      .eq('title', 'SYSTEM_DEADLINES')
      .maybeSingle()
  ]);

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const realName = profile?.author_name || userName || null;
  const userGen = profile?.keywords || '';
  const userNameToShow = profile
    ? `${userGen ? userGen + '기 ' : ''}${profile.author_name}`
    : (userName || userEmail?.split('@')[0] || '기자');

  const currentDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const contents = (dbContents || []) as any[];
  const allProfiles = allProfilesData || [];

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

  // 팀별 기획안 분량(제출 개수) 완료 여부 — 관리자가 설정한 teamQuotas와 내 팀의 제출 건수를 비교
  const teamQuotas: Record<string, number> = deadlines.teamQuotas || {};

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

  // 내 소속 팀(가장 최근 콘텐츠 기준)의 이번 분기 기획안 목표 개수 대비 제출 개수
  const myTeam = myContents[0]?.team || null;
  const myTeamQuota = myTeam ? teamQuotas[myTeam] : undefined;
  const myProposalCount = myContents.length;
  const proposalQuotaMet = typeof myTeamQuota === 'number' && myTeamQuota > 0 && myProposalCount >= myTeamQuota;

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

  const getTeamPlatformIcon = (team: string) => {
    if (team === '유튜브') {
      return <YoutubeIcon className="w-4 h-4 flex-shrink-0" style={{ width: '18px', height: '18px' }} />;
    }
    if (team === '인스타') {
      return <InstagramIcon className="w-4 h-4 flex-shrink-0" style={{ width: '18px', height: '18px' }} />;
    }
    if (team === '블로그') {
      return <NaverBlogIcon className="w-4 h-4 flex-shrink-0" style={{ width: '18px', height: '18px' }} />;
    }
    return <GenericPostIcon className="w-4 h-4 flex-shrink-0" style={{ width: '18px', height: '18px' }} />;
  };

  const getTypeStyle = (typeStr: string, team?: string) => {
    let label = typeStr || '기타';
    if (typeStr === '영상(롱폼)') label = '롱폼';
    else if (typeStr === '영상(숏폼)') label = '숏폼';
    else if (typeStr === '글 기사') label = '기사';

    switch (team) {
      case '유튜브': return { bg: '#FEE2E2', text: '#DC2626', label };
      case '인스타': return { bg: '#FEF3C7', text: '#D97706', label };
      case '블로그': return { bg: '#DCFCE7', text: '#15803D', label };
      case '단장 팀':
      case '단장단 팀': return { bg: '#EFF6FF', text: '#1D4ED8', label };
      default: return { bg: '#F1F5F9', text: '#475569', label };
    }
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case '유튜브': return { bg: '#fee2e2', text: '#ef4444' };
      case '인스타': return { bg: '#fef3c7', text: '#d97706' };
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

      <div className="animate-enter">
        <FeedbackBanner feedbacks={myRecentFeedbacks} />
      </div>

      {/* 헤더 */}
      <div className="animate-enter stagger-1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <h2 className="typo-h1" style={{ margin: 0 }}>내 워크스페이스</h2>
      </div>

      {/* ── ROW 1: 업로드 | 승인대기 | 마감일 ── */}
      <div className="animate-enter stagger-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[280px_1fr_320px] gap-6 items-stretch">

        <UploadCard pendingFinalItems={pendingFinalItems} />

        {/* 대기 중 */}
        <div className="card motion-card lg:col-span-1 xl:col-span-1" style={{ display: 'flex', flexDirection: 'column', height: '360px', overflow: 'hidden', borderRadius: '24px', padding: '1.5rem' }}>
          <h3 className="typo-h2" style={{ marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            대기 중인 항목
            <span style={{ background: 'var(--color-tint-accent)', color: 'var(--color-chip-text)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
              {waitingItems.length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, overflowY: 'auto' }}>
            {waitingItems.length === 0 && (
              <div className="typo-meta" style={{ textAlign: 'center', marginTop: '3.5rem' }}>대기 중인 항목이 없습니다</div>
            )}
            {waitingItems.map(item => (
              <PendingItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* 마감일 D-Day 카드 */}
        <div className="lg:col-span-2 xl:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 기획안 마감 - 테마 인식 글래스 카드 */}
          <div className="motion-card proposal-card-bg" style={{ 
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '24px', 
            padding: '1.25rem 1.5rem', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            boxShadow: '0 10px 24px -6px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--color-text-heading)', fontSize: '0.82rem', fontWeight: 700 }}>
                {deadlines.proposalLabel || '기획안 마감'}
              </span>
              {deadlines.proposalDeadline && (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
                  {deadlines.proposalDeadline}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              {proposalQuotaMet ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-1px', lineHeight: '1.1' }}>
                  ✅ 완료
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-heading)', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: '1.1' }}>
                  {formatDDay(proposalDDay)}
                </div>
              )}
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85, textAlign: 'right' }}>
                {deadlines.proposalSubLabel || '26-1분기 (5월 콘텐츠)'}
                {typeof myTeamQuota === 'number' && myTeamQuota > 0 && (
                  <><br />{myProposalCount}/{myTeamQuota}건 제출</>
                )}
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
      <div className="animate-enter stagger-2 grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <OtherProposalsCarousel dbProposals={contents || []} />
        <NoticeList dbNotices={dbNotices} />
      </div>

      {/* ── ROW 3: 캘린더 | 내 콘텐츠 전체 ── */}
      <div className="animate-enter stagger-3">
        <DashboardCalendarArea rawContents={rawContents} myContents={myContents} allProfiles={allProfiles} />
      </div>

      {/* ── 관리자 패널: 상태 관리 및 피드백 ── */}
      {isAdmin && (
        <div className="animate-enter stagger-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <h3 className="typo-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
              <span style={{ background: '#002454', color: 'white', borderRadius: '8px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>관리자</span>
              기획안 상태 관리 ({displayContents.length}건)
            </h3>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--table-header-bg)' }}>
                    {['등록일/상태', '유형', '작성자', '콘텐츠 제목', '피드백', '상태 관리'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayContents.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 400 }} className="typo-meta">콘텐츠가 없습니다</td></tr>
                  )}
                  {displayContents.map(item => {
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      draft: { bg: '#F1F5F9', text: '#64748B' },
                      pending: { bg: 'rgba(255, 184, 0, 0.15)', text: '#B45309' },
                      revision: { bg: 'rgba(239, 68, 68, 0.12)', text: '#DC2626' },
                      rejected: { bg: '#F1F5F9', text: '#64748B' },
                      approved: { bg: 'rgba(0, 168, 89, 0.15)', text: '#00A859' },
                      final_submitted: { bg: 'rgba(0, 36, 84, 0.12)', text: '#002454' },
                      final_revision: { bg: 'rgba(239, 68, 68, 0.12)', text: '#DC2626' },
                      completed: { bg: 'rgba(0, 36, 84, 0.16)', text: '#002454' },
                      uploaded: { bg: 'rgba(0, 168, 89, 0.15)', text: '#00A859' },
                    };
                    const sc = statusColors[item.status] || { bg: '#F1F5F9', text: '#64748B' };
                    const statusLabel: Record<string, string> = {
                      draft: '임시저장', pending: '대기', revision: '기획안 수정요청', rejected: '반려',
                      approved: '기획안 통과', final_submitted: '완성본 제출', final_revision: '완성본 수정요청',
                      completed: '업로드 대기', uploaded: '업로드 완료'
                    };
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                        <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 500 }}>
                            {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </div>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: sc.bg, color: sc.text, fontWeight: 600 }}>
                            {statusLabel[item.status] || item.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', flexShrink: 0 }}>
                              {getTeamPlatformIcon(item.team)}
                            </div>
                            {item.content_type && (
                              <span 
                                className="typo-badge"
                                style={{ 
                                  backgroundColor: getTypeStyle(item.content_type, item.team).bg, 
                                  color: getTypeStyle(item.content_type, item.team).text, 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                  fontSize: '0.7rem',
                                  fontWeight: 500
                                }}
                              >
                                {getTypeStyle(item.content_type, item.team).label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 500, whiteSpace: 'nowrap', color: 'var(--color-text-main)', fontSize: '0.82rem' }}>
                          {item.author_name}
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <ModalLink href={`/contents?openModalId=${item.id}`} style={{ textDecoration: 'none', color: 'var(--color-text-main)', fontWeight: 500, fontSize: '0.88rem', display: 'block', marginBottom: '0.3rem' }} className="hover:text-blue-600">
                            {item.title}
                          </ModalLink>
                          {item.parsedPublishDate && (
                            <span style={{ fontSize: '0.7rem', backgroundColor: '#EAF2FF', color: '#002454', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                              📅 {item.parsedPublishDate}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', maxWidth: '240px' }}>
                          {item.feedback_comment ? (
                            <div style={{
                              fontSize: '0.8rem', lineHeight: 1.5,
                              color: ['approved','completed','uploaded'].includes(item.status) ? '#002454' : '#991B1B',
                              backgroundColor: ['approved','completed','uploaded'].includes(item.status) ? '#EAF2FF' : '#FEF2F2',
                              padding: '0.6rem 0.8rem', borderRadius: '10px',
                              whiteSpace: 'pre-wrap', wordBreak: 'keep-all'
                            }}>
                              💬 {item.feedback_comment}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>피드백 없음</span>
                          )}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', minWidth: '180px' }}>
                          <AdminStatusManager item={item} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
