import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import AdminStatusManager from "@/components/AdminStatusManager";
import DashboardCalendar from "@/components/DashboardCalendar";
import FeedbackBanner from "@/components/FeedbackBanner";
import UploadCard from "@/components/UploadCard";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const isAdmin = resolvedParams?.admin === 'true';
  const searchQuery = typeof resolvedParams?.q === 'string' ? resolvedParams.q : '';

  const supabase = await createClient();
  const { data: contents, error } = await supabase
    .from('contents')
    .select('*')
    .neq('content_type', 'SYSTEM_PROFILE')
    .order('created_at', { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  // ?„ë¡œ???•ë³´ ê°€?¸ì˜¤ê¸?(ì»¤ìŠ¤?€ ?´ë¦„ ?¬ìš©???„í•´)
  const { data: profile } = await supabase.from('contents')
    .select('author_name, keywords')
    .eq('title', `PROFILE_${userEmail}`)
    .single();

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const realName = profile?.author_name || userName || null;
  const userGen = profile?.keywords || user?.user_metadata?.gen || '';
  const userNameToShow = profile ? `${userGen ? userGen + 'ê¸?' : ''}${profile.author_name}` : (userName || userEmail?.split('@')[0] || 'ê¸°ì');

  const currentDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const rawContents = (contents || [])
    .filter(item => item.status !== 'draft') // Filter out drafts from dashboard
    .map(item => {
      let pDate = null;
      let emailInJson = '';
      let feedbackRead = false;
      let crewString = '';
      if (item.content_body && item.content_body.startsWith('{')) {
        try {
          const pb = JSON.parse(item.content_body);
          pDate = pb.publishDate || null;
          emailInJson = pb.authorEmail || '';
          feedbackRead = pb.feedbackRead === true;
          if (typeof pb.crew === 'string') {
            crewString = pb.crew;
          } else if (Array.isArray(pb.crew)) {
            crewString = pb.crew.map((c: any) => c.name || '').join(',');
          }
        } catch(e) {}
      }
      
      const isAuthor = user && (emailInJson === userEmail || item.author_name === userEmail || item.author_name === realName || (realName && item.author_name?.includes(realName)));
      const isCrew = user && realName && crewString.includes(realName);
      const isMine = isAuthor || isCrew;

      return { ...item, parsedPublishDate: pDate, isMine, isRead: feedbackRead, isAuthor, isCrew };
    }).filter(item => {
      const itemDate = new Date(new Date(item.created_at).toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
    });

  const myContents = rawContents.filter(item => item.isMine);

  const pendingCount = myContents.filter(i => i.status === 'pending').length;
  const revisionCount = myContents.filter(i => i.status === 'revision').length;
  const approvedCount = myContents.filter(i => i.status === 'approved').length;
  const finalSubmittedCount = myContents.filter(i => i.status === 'final_submitted').length;
  const finalRevisionCount = myContents.filter(i => i.status === 'final_revision').length;
  const completedCount = myContents.filter(i => i.status === 'completed').length;
  const uploadedCount = myContents.filter(i => i.status === 'uploaded').length;

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
  
  // ?¼ë“œë°±ì´ ?ˆëŠ” ??ª© (?˜ì •?”ì²­ ?íƒœ?´ê±°?? ë³´ì¶© ?˜ê²¬???ˆìœ¼ë©´ì„œ ?„ì§ ?½ìŒ(Dismiss) ì²˜ë¦¬ ????ê²½ìš°)
  const feedbackItems = myContents.filter(i => {
    if (i.isRead) return false;
    const hasComment = !!i.feedback_comment;
    const isRevision = i.status === 'revision' || i.status === 'final_revision';
    const isApprovedWithComment = (i.status === 'approved' || i.status === 'completed') && hasComment;
    return isRevision || isApprovedWithComment;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'draft': return <span className="badge" style={{backgroundColor: '#e5e7eb', color: '#4b5563'}}>?„ì‹œ?€??/span>;
      case 'pending': return <span className="badge pending">?€ê¸?/span>;
      case 'revision': return <span className="badge revision">ê¸°íš???˜ì •?”ì²­</span>;
      case 'rejected': return <span className="badge" style={{backgroundColor: '#9ca3af', color: 'white'}}>ë°˜ë ¤</span>;
      case 'approved': return <span className="badge approved">ê¸°íš???µê³¼</span>;
      case 'final_submitted': return <span className="badge" style={{backgroundColor: '#059669'}}>?„ì„±ë³??œì¶œ??/span>;
      case 'final_revision': return <span className="badge" style={{backgroundColor: '#dc2626'}}>?„ì„±ë³??˜ì •?”ì²­</span>;
      case 'completed': return <span className="badge" style={{backgroundColor: '#3b82f6'}}>?…ë¡œ???€ê¸?/span>;
      case 'uploaded': return <span className="badge" style={{backgroundColor: '#10b981'}}>?…ë¡œ???„ë£Œ</span>;
      default: return null;
    }
  };

  const getTeamColor = (team: string) => {
    switch(team) {
      case '? íŠœë¸?: return { bg: '#fee2e2', text: '#ef4444' };
      case '?¸ìŠ¤?€': return { bg: '#fce7f3', text: '#ec4899' };
      case 'ë¸”ë¡œê·?: return { bg: '#dcfce7', text: '#22c55e' };
      case '?¨ì¥ ?€': return { bg: '#e0e7ff', text: '#4f46e5' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  }

  const getTypeColor = (typeStr: string) => {
    switch(typeStr) {
      case '?ìƒ(ë¡±í¼)': return { bg: '#ffedd5', text: '#f97316' };
      case '?ìƒ(?í¼)': return { bg: '#fef3c7', text: '#d97706' };
      case 'ì¹´ë“œ?´ìŠ¤': return { bg: '#dbeafe', text: '#3b82f6' };
      case 'ê¸€ ê¸°ì‚¬': return { bg: '#ecfdf5', text: '#10b981' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  }

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          {isAdmin ? `${currentMonth}??ì½˜í…ì¸??„í™© (ê´€ë¦¬ì)` : `${currentMonth}??ê¸°íš???€?„ë¼??}
        </h2>
        {isAdmin && <span className="badge" style={{ backgroundColor: 'var(--color-primary)' }}>ê´€ë¦¬ì ëª¨ë“œ</span>}
      </div>

      {user && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ?˜ì˜?©ë‹ˆ?? <span style={{ color: 'var(--color-primary)' }}>{userNameToShow}</span>?? ?‰
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
              {currentMonth}???˜ì˜ ê¸°íš??ì§„í–‰ ?„í™©???œëˆˆ???•ì¸?˜ì„¸??
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 2fr 1fr', gap: '1.5rem', marginBottom: '2rem', alignItems: 'stretch' }}>
            {/* 1. ?…ë¡œ???ì—­ (ë°˜ì‘??? ë‹ˆë©”ì´??ì»´í¬?ŒíŠ¸) */}
            <UploadCard />

            {/* 2. ?¹ì¸ ?€ê¸?ì¤?*/}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>
                ?¹ì¸ ?€ê¸?ì¤?({myContents.filter(i => ['pending', 'revision', 'final_submitted', 'final_revision'].includes(i.status)).length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto', maxHeight: '180px', paddingRight: '0.5rem' }}>
                {myContents.filter(i => ['pending', 'revision', 'final_submitted', 'final_revision'].includes(i.status))
                  .sort((a, b) => (b.status.includes('revision') ? 1 : 0) - (a.status.includes('revision') ? 1 : 0))
                  .map(item => {
                    const isRev = item.status.includes('revision');
                    return (
                    <Link key={item.id} href={`/${item.status.includes('final') ? 'final-works' : 'proposals'}/submit?id=${item.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ 
                        backgroundColor: isRev ? '#FEF3C7' : '#F8FAFC', 
                        border: isRev ? 'none' : '1px solid #E2E8F0', 
                        borderRadius: '999px', 
                        padding: '0.8rem 1.2rem', 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: '999px', backgroundColor: isRev ? '#F59E0B' : '#F1F5F9', color: isRev ? 'white' : '#64748B', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {item.status.includes('final') ? '?„ì„±ë³? : 'ê¸°íš??}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content_type || 'ì½˜í…ì¸?} - {item.author_name || '?´ë¦„ ?†ìŒ'}</span>
                          </div>
                        </div>
                        {isRev ? 
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FDE38A', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', flexShrink: 0 }}>!</div> 
                          : <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'transparent', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>?ï¸</div>}
                      </div>
                    </Link>
                    );
                  })}
              </div>
            </div>

            {/* 3. ?¹ì¸ ?„ë£Œ */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>
                ?¹ì¸ ?„ë£Œ ({myContents.filter(i => ['approved', 'completed', 'uploaded'].includes(i.status)).length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto', maxHeight: '180px', paddingRight: '0.5rem' }}>
                {myContents.filter(i => ['approved', 'completed', 'uploaded'].includes(i.status))
                  .map(item => {
                    const isUp = item.status === 'uploaded';
                    const isComp = item.status === 'completed';
                    const cBg = isUp ? '#99B3D6' : isComp ? '#C0CFE4' : '#E6EBF2';
                    const bBg = isUp ? '#002454' : isComp ? '#99B3D6' : '#FFFFFF';
                    const bCol = isUp ? 'white' : isComp ? '#002454' : '#003378';
                    return (
                    <Link key={item.id} href={`/${item.status === 'approved' ? 'final-works/submit?initialId' : 'final-works/submit?id'}=${item.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ 
                        backgroundColor: cBg, 
                        border: 'none',
                        borderRadius: '999px', 
                        padding: '0.8rem 1.2rem', 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                          <span style={{ 
                            fontSize: '0.75rem', padding: '6px 12px', borderRadius: '999px', 
                            backgroundColor: bBg, 
                            color: bCol, 
                            fontWeight: 700, whiteSpace: 'nowrap' 
                          }}>
                            {item.team || '?€ ?†ìŒ'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                            <span style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content_type || 'ì½˜í…ì¸?} - {item.author_name || '?´ë¦„ ?†ìŒ'}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', backgroundColor: bBg, color: bCol, padding: '6px 14px', borderRadius: '999px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {item.parsedPublishDate || 'ë¯¸ì •'}
                        </div>
                      </div>
                    </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ?¼ë“œë°??Œë¦¼ ?¹ì…˜ (Client Component) */}
      {!isAdmin && feedbackItems.length > 0 && (
        <FeedbackBanner initialItems={feedbackItems} />
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 3.5 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead style={{ borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '1.5rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>?±ë¡???íƒœ</th>
                  <th style={{ padding: '1.5rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>ë¶„ë¥˜</th>
                  {isAdmin && <th style={{ padding: '1.5rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>?‘ì„±??/th>}
                  <th style={{ padding: '1.5rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', width: isAdmin ? '25%' : '35%' }}>ì½˜í…ì¸??œëª©</th>
                  <th style={{ padding: '1.5rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', width: isAdmin ? '35%' : '45%' }}>?¼ë“œë°?/ ì½”ë©˜??/th>
                  {isAdmin && <th style={{ padding: '1.5rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>ê´€ë¦??µì…˜</th>}
                </tr>
              </thead>
              <tbody>
                {displayContents.length === 0 && (
                  <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>?°ì´?°ê? ?†ìŠµ?ˆë‹¤.</td></tr>
                )}
                {displayContents.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      { (isAdmin || item.isMine ) ? (
                          <StatusBadge status={item.status} />
                      ) : (
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                        {item.team ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', backgroundColor: getTeamColor(item.team).bg, color: getTeamColor(item.team).text }}>
                            {item.team}
                          </span>
                        ) : null}
                        {item.content_type ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', backgroundColor: getTypeColor(item.content_type).bg, color: getTypeColor(item.content_type).text }}>
                            {item.content_type}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    {isAdmin && <td style={{ padding: '1.25rem 1rem', fontWeight: 600, whiteSpace: 'nowrap', color: '#334155' }}>{item.author_name}</td>}
                    <td style={{ padding: '1.5rem 1rem', fontWeight: 500 }}>
                      <Link href={`/proposals/submit?id=${item.id}`} className="hover-title-link" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 800, fontSize: '1.15rem', display: 'block', marginBottom: '0.75rem' }}>
                        {item.title}
                      </Link>
                      {item.parsedPublishDate && (
                        <span style={{ fontSize: '0.8rem', backgroundColor: '#e0e7ff', color: 'var(--color-primary)', padding: '0.3rem 0.6rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}>
                          ?“… ?…ë¡œ???¬ë§: {item.parsedPublishDate}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1.5rem 1rem', verticalAlign: 'top' }}>
                      { (isAdmin || item.isMine) && item.feedback_comment ? (
                        <div style={{ 
                            fontSize: '0.95rem', 
                            lineHeight: '1.5',
                            color: (item.status === 'approved' || item.status === 'completed' || item.status === 'active') ? '#1e40af' : '#991b1b', 
                            backgroundColor: (item.status === 'approved' || item.status === 'completed' || item.status === 'active') ? '#eff6ff' : '#fef2f2', 
                            padding: '1rem', 
                            borderRadius: '12px',
                            border: (item.status === 'approved' || item.status === 'completed' || item.status === 'active') ? '2px solid #bfdbfe' : '2px solid #fecaca',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'keep-all'
                          }}>
                          <div style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            ?’¬ {(item.status === 'approved' || item.status === 'completed') ? 'ì°¸ê³ /ë³´ì¶© ?˜ê²¬' : '?š§ ?˜ì • ?”ì²­ ?¬í•­'}
                          </div>
                          <div style={{ fontWeight: 500 }}>{item.feedback_comment}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.9rem', fontStyle: 'italic' }}>?¼ë“œë°??†ìŒ</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '1rem' }}>
                        <AdminStatusManager item={item} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ?°ì¸¡ ?ë‹¨ ìº˜ë¦°??*/}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '10px' }}>
          <DashboardCalendar contents={displayContents} />
        </div>
      </div>
    </div>
  );
}
