import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import UploadCard from "@/components/UploadCard";
import DashboardCalendar from "@/components/DashboardCalendar";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;

  const { data: profile } = await supabase.from('contents')
    .select('author_name, keywords')
    .eq('title', `PROFILE_${userEmail}`)
    .single();

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const realName = profile?.author_name || userName || null;
  const userGen = profile?.keywords || '';
  const userNameToShow = profile
    ? `${userGen ? userGen + '기 ' : ''}${profile.author_name}`
    : (userName || userEmail?.split('@')[0] || '기자');

  const currentDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // All contents
  const { data: contents } = await supabase
    .from('contents')
    .select('*')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  // Deadlines
  const { data: deadlineRow } = await supabase
    .from('contents')
    .select('content_body')
    .eq('title', 'SYSTEM_DEADLINES')
    .single();

  let deadlines: any = {};
  try { if (deadlineRow?.content_body) deadlines = JSON.parse(deadlineRow.content_body); } catch {}

  const calcDDay = (dateStr: string | null) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date(currentDate.toDateString());
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };
  const proposalDDay = calcDDay(deadlines.proposalDeadline);
  const finalDDay = calcDDay(deadlines.finalDeadline);

  const rawContents = (contents || []).map(item => {
    let pDate = null, emailInJson = '', crewString = '';
    if (item.content_body?.startsWith('{')) {
      try {
        const pb = JSON.parse(item.content_body);
        pDate = pb.publishDate || null;
        emailInJson = pb.authorEmail || '';
        if (typeof pb.crew === 'string') crewString = pb.crew;
        else if (Array.isArray(pb.crew)) crewString = pb.crew.map((c: any) => c.name || '').join(',');
      } catch {}
    }
    const isAuthor = user && (emailInJson === userEmail || item.author_name === userEmail || item.author_name === realName || (realName && item.author_name?.includes(realName)));
    const isCrew = user && realName && crewString.includes(realName);
    const isMine = !!(isAuthor || isCrew);
    return { ...item, parsedPublishDate: pDate, isMine };
  });

  const myContents = rawContents.filter(i => i.isMine);

  // 미제출 완성본: 기획안 통과 (approved) 상태인 항목
  const pendingFinalCount = myContents.filter(i => i.status === 'approved').length;

  const waitingItems = myContents.filter(i =>
    ['pending', 'revision', 'final_submitted', 'final_revision'].includes(i.status)
  ).sort((a, b) => (b.status.includes('revision') ? 1 : 0) - (a.status.includes('revision') ? 1 : 0));

  const completedItems = myContents.filter(i =>
    ['approved', 'completed', 'uploaded'].includes(i.status)
  );

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

  const dDayColor = (d: number | null) => {
    if (d === null) return '#94A3B8';
    if (d <= 3) return '#EF4444';
    if (d <= 7) return '#F59E0B';
    return '#003378';
  };

  const formatDDay = (d: number | null) => {
    if (d === null) return '미설정';
    if (d === 0) return 'D-Day';
    if (d < 0) return `D+${Math.abs(d)}`;
    return `D-${d}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>내 워크스페이스</h2>
      </div>

      {/* ── ROW 1: 업로드 | 승인대기 | 마감일 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 300px', gap: '1.25rem', alignItems: 'stretch' }}>

        {/* 업로드 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <UploadCard />
          {pendingFinalCount > 0 && (
            <div style={{ background: '#FEF3C7', borderRadius: '12px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#B45309' }}>
              <span style={{ background: '#F59E0B', color: 'white', borderRadius: '999px', padding: '2px 8px', fontSize: '0.75rem' }}>{pendingFinalCount}</span>
              미제출 완성본
            </div>
          )}
        </div>

        {/* 승인 대기 중 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            승인 대기 중
            <span style={{ background: '#E6EBF2', color: '#003378', borderRadius: '999px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 800 }}>
              {waitingItems.length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, overflowY: 'auto' }}>
            {waitingItems.length === 0 && (
              <div style={{ color: '#CBD5E1', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>대기 중인 항목이 없습니다</div>
            )}
            {waitingItems.map(item => {
              const isRev = item.status.includes('revision');
              return (
                <Link key={item.id} href={`/${item.status.includes('final') ? 'final-works' : 'proposals'}/submit?id=${item.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    backgroundColor: isRev ? '#FEF3C7' : '#F8FAFC',
                    border: isRev ? 'none' : '1px solid #E2E8F0',
                    borderRadius: '999px',
                    padding: '0.65rem 1.1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '999px', backgroundColor: isRev ? '#F59E0B' : '#F1F5F9', color: isRev ? 'white' : '#64748B', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {item.status.includes('final') ? '완성본' : '기획안'}
                      </span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content_type} · {item.author_name}</div>
                      </div>
                    </div>
                    {isRev
                      ? <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FDE38A', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>!</div>
                      : <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'transparent', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>✏️</div>
                    }
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 마감일 D-Day 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* 기획안 마감 */}
          <div style={{ background: '#003378', borderRadius: '16px', padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#99B3D6', fontSize: '0.8rem', fontWeight: 700 }}>{deadlines.proposalLabel || '기획안 마감일'}</span>
              {deadlines.proposalDeadline && (
                <span style={{ color: '#C0CFE4', fontSize: '0.75rem' }}>{deadlines.proposalDeadline}</span>
              )}
            </div>
            <div style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>
              {formatDDay(proposalDDay)}
            </div>
          </div>
          {/* 완성본 마감 */}
          <div style={{ background: '#E6EBF2', borderRadius: '16px', padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#003378', fontSize: '0.8rem', fontWeight: 700 }}>{deadlines.finalLabel || '완성본 마감일'}</span>
              {deadlines.finalDeadline && (
                <span style={{ color: '#003378', fontSize: '0.75rem', opacity: 0.7 }}>{deadlines.finalDeadline}</span>
              )}
            </div>
            <div style={{ color: dDayColor(finalDDay), fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>
              {formatDDay(finalDDay)}
            </div>
            {!deadlines.finalDeadline && (
              <Link href="/admin/settings" style={{ color: '#99B3D6', fontSize: '0.75rem', marginTop: '0.3rem', textDecoration: 'none' }}>
                관리자 설정에서 마감일 설정 →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 2: 공지사항 | 완료된 콘텐츠 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch' }}>

        {/* 공지사항 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>공지사항</h3>
            <Link href="/notices" style={{ fontSize: '0.78rem', color: '#94A3B8', textDecoration: 'none', fontWeight: 600 }}>전체보기 →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { id: 1, title: '[필독] 기획안 작성 시 주의사항', date: '2026-04-01', isImportant: true },
              { id: 2, title: '[필독] 기획안 작성 시 주의사항', date: '2026-03-28', isImportant: false },
            ].map(notice => (
              <Link key={notice.id} href="/notices" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  {notice.isImportant && (
                    <span style={{ background: '#FDE38A', color: '#B45309', borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>공지사항</span>
                  )}
                  <span style={{ fontSize: '0.88rem', fontWeight: notice.isImportant ? 700 : 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notice.title}</span>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8', whiteSpace: 'nowrap', marginLeft: 'auto', flexShrink: 0 }}>{notice.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 완료된 콘텐츠 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
              완료된 콘텐츠
              <span style={{ background: '#E6EBF2', color: '#003378', borderRadius: '999px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 800, marginLeft: '0.5rem' }}>
                {completedItems.length}
              </span>
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '200px' }}>
            {completedItems.length === 0 && (
              <div style={{ color: '#CBD5E1', fontSize: '0.9rem', textAlign: 'center', marginTop: '1.5rem' }}>완료된 콘텐츠가 없습니다</div>
            )}
            {completedItems.map(item => {
              const isUp = item.status === 'uploaded';
              const isComp = item.status === 'completed';
              const cBg = isUp ? '#99B3D6' : isComp ? '#C0CFE4' : '#E6EBF2';
              const bBg = isUp ? '#002454' : isComp ? '#99B3D6' : '#FFFFFF';
              const bCol = isUp ? 'white' : isComp ? '#002454' : '#003378';
              return (
                <Link key={item.id} href={`/${item.status === 'approved' ? 'final-works/submit?initialId' : 'final-works/submit?id'}=${item.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ backgroundColor: cBg, borderRadius: '999px', padding: '0.65rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '999px', backgroundColor: bBg, color: bCol, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {item.team || '팀 없음'}
                      </span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content_type} · {item.author_name}</div>
                      </div>
                    </div>
                    {item.parsedPublishDate && (
                      <span style={{ fontSize: '0.78rem', backgroundColor: bBg, color: bCol, padding: '4px 10px', borderRadius: '999px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {item.parsedPublishDate}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 3: 캘린더 | 내 콘텐츠 전체 ── */}
      <div>
        <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>전체 현황 / 전체 콘텐츠 캘린더</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* 이번달 + 다음달 캘린더 */}
          <DashboardCalendar contents={rawContents} />

          {/* 내 콘텐츠 전체 테이블 */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E6EBF2' }}>
                  {['색상', '날짜', '플랫폼', '콘텐츠 제목', '참여인원', '기획안 / 완성본 / 업로드'].map(h => (
                    <th key={h} style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myContents.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#CBD5E1' }}>콘텐츠가 없습니다</td></tr>
                )}
                {myContents.map(item => {
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
                        {/* 3단계 진행 체크박스: 기획안 통과 → 완성본 통과 → 게시 완료 */}
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
        </div>
      </div>
    </div>
  );
}
