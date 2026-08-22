import { createClient } from "@/utils/supabase/server";
import ContentsLayout from "@/components/ContentsLayout";
import { isTraineeContent } from "@/utils/trainee";

async function ContentsPageContent({ searchParams }: { searchParams: { openModalId?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  let realName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  if (userEmail) {
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).maybeSingle();
    if (profile?.author_name) {
      realName = profile.author_name;
    }
  }

  // Fetch contents without heavy content_body and paginated to 50 items
  const { data: dbContents } = await supabase
    .from('contents')
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('content_type', 'NOTICE')
    .neq('status', 'draft')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .range(0, 49);
  const contents = (dbContents || []) as any[];
  // Filter out Trainee (수습 단원 / 25기) contents from regular contents page
  const processedContents = (contents || [])
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
