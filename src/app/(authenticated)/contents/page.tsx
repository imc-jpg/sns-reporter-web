import { createClient } from "@/utils/supabase/server";
import ContentsLayout from "@/components/ContentsLayout";

export default async function ContentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  let realName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  if (userEmail) {
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
    if (profile?.author_name) {
      realName = profile.author_name;
    }
  }

  // Fetch all contents except system profiles
  const { data: contents } = await supabase
    .from('contents')
    .select('*')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('status', 'draft') // optionally hide drafts, or we can keep them for 'mine'
    .order('created_at', { ascending: false });

  // Process contents to extract JSON body fields and check ownership
  const processedContents = (contents || []).map(item => {
    let emailInJson = '';
    let crewString = '';
    let articleType = '';
    let docsUrl = '';
    let targetMonth = '';
    let finalSubmittedAt = '';
    
    try {
      if (item.content_body && item.content_body.startsWith('{')) {
        const obj = JSON.parse(item.content_body);
        emailInJson = obj.authorEmail || '';
        articleType = obj.articleType || '';
        docsUrl = obj.docsUrl || '';
        targetMonth = obj.targetMonth || '';
        finalSubmittedAt = obj.finalSubmittedAt || '';
        if (typeof obj.crew === 'string') {
          crewString = obj.crew;
        } else if (Array.isArray(obj.crew)) {
          crewString = obj.crew.map((c: any) => c.name || '').join(',');
        }
      }
    } catch(e) {}
    
    // Fallbacks
    if (!crewString && item.description) {
      crewString = item.description.split(' (참여:')[0] || '';
    }

    const isAuthor = user && (emailInJson === userEmail || 
                           item.author_name === userEmail || 
                           item.author_name === realName ||
                           (realName && item.author_name?.includes(realName)));
    const isCrew = user && realName && crewString.includes(realName);
    const isMine = isAuthor || isCrew;
    
    return { 
      ...item, 
      isMine, 
      isAuthor, 
      isCrew, 
      parsedCrew: crewString, 
      articleType,
      docsUrl,
      targetMonth,
      finalSubmittedAt
    };
  });

  return (
    <ContentsLayout 
      initialContents={processedContents} 
      currentUserEmail={userEmail} 
      currentUserName={realName} 
    />
  );
}
