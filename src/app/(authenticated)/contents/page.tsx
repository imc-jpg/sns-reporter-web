import { createClient } from "@/utils/supabase/server";
import ContentsLayout from "@/components/ContentsLayout";
import { isTraineeContent } from "@/utils/trainee";

async function ContentsPageContent({ searchParams }: { searchParams: { openModalId?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  // [성능 최적화] 프로필 조회와 콘텐츠 목록 조회를 Promise.all로 병렬 실행
  const [{ data: profile }, { data: dbContents }] = await Promise.all([
    userEmail
      ? supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('contents')
      .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment, content_body')
      .neq('content_type', 'SYSTEM_PROFILE')
      .neq('title', 'SYSTEM_DEADLINES')
      .neq('content_type', 'NOTICE')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .range(0, 49)
  ]);

  let realName = profile?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const contents = (dbContents || []) as any[];
  // Process contents
  const processedContents = (contents || []).map(item => {
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

    const isAuthor = user && (emailInJson === userEmail || item.author_name === userEmail || 
                           item.author_name === realName ||
                           (realName && item.author_name?.includes(realName)));
    const isCrew = user && realName && crewString.includes(realName);
    const isMine = !!(isAuthor || isCrew);
    
    return { 
      ...item, 
      isMine, 
      isAuthor, 
      isCrew: !!isCrew, 
      parsedCrew: crewString, 
      articleType: bodyObj.articleType || '',
      docsUrl: bodyObj.docsUrl || '',
      targetMonth: bodyObj.targetMonth || '',
      finalSubmittedAt: bodyObj.finalSubmittedAt || '',
    };
  })
  .filter(item => !isTraineeContent(item));

  return (
    <ContentsLayout 
      initialContents={processedContents} 
      currentUserEmail={userEmail} 
      currentUserName={realName} 
      openModalId={searchParams.openModalId ? parseInt(searchParams.openModalId, 10) : undefined}
    />
  );
}

import { Suspense } from 'react';
import Loading from '../loading';

export default function ContentsPage({ searchParams }: any) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
