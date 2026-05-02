import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const isAdmin = url.searchParams.get('admin') === 'true';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user && !isAdmin) {
      return NextResponse.json({ notifications: [] });
    }

    const userEmail = user?.email || null;

    // Fetch profile for realName
    let profile = null;
    if (userEmail) {
      const { data } = await supabase
        .from('contents')
        .select('author_name')
        .eq('title', `PROFILE_${userEmail}`)
        .maybeSingle();
      profile = data;
    }

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
    const realName = profile?.author_name || userName || null;

    // Fetch all valid contents
    const { data: contents } = await supabase
      .from('contents')
      .select('id, title, status, feedback_comment, created_at, author_name, content_body')
      .neq('content_type', 'SYSTEM_PROFILE')
      .neq('title', 'SYSTEM_DEADLINES')
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (!contents) {
      return NextResponse.json({ notifications: [] });
    }

    // Exact dashboard matching logic
    const rawContents = contents.map(item => {
      let emailInJson = '', crewString = '';
      if (item.content_body?.startsWith('{')) {
        try {
          const pb = JSON.parse(item.content_body);
          emailInJson = pb.authorEmail || '';
          if (typeof pb.crew === 'string') crewString = pb.crew;
          else if (Array.isArray(pb.crew)) crewString = pb.crew.map((c: any) => c.name || '').join(',');
        } catch {}
      }
      
      const isAuthor = emailInJson === userEmail || item.author_name === userEmail || item.author_name === realName || (realName && item.author_name?.includes(realName));
      const isCrew = realName && crewString.includes(realName);
      const isMine = !!(isAuthor || isCrew);
      
      return { ...item, isMine };
    });

    const myContents = isAdmin ? rawContents : rawContents.filter(i => i.isMine);

    // Get feedbacks
    const myRecentFeedbacks = myContents
      .filter(item => (item.feedback_comment && item.feedback_comment.trim() !== '') || item.status.includes('revision'))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);

    return NextResponse.json({ notifications: myRecentFeedbacks });
  } catch (error) {
    console.error('Error fetching notifications API:', error);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}
