import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // [B17] isAdmin을 URL 파라미터가 아닌 서버 측 user 메타데이터로 판단
    if (!user) {
      return NextResponse.json({ notifications: [] });
    }

    const isAdmin =
      user.user_metadata?.is_admin === true ||
      user.email === 'admin@admin.com';

    const userEmail = user.email || null;

    // Fetch profile for realName
    const { data: profileData } = await supabase
      .from('contents')
      .select('author_name')
      .eq('title', `PROFILE_${userEmail}`)
      .maybeSingle();

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const realName = profileData?.author_name || userName || null;

    // [B7] content_body를 select에 추가하여 crew/이메일 매칭 복구
    const { data: contents } = await supabase
      .from('contents')
      .select('id, title, status, feedback_comment, updated_at, author_name, content_body')
      .neq('content_type', 'SYSTEM_PROFILE')
      .neq('title', 'SYSTEM_DEADLINES')
      .neq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(30);

    if (!contents) {
      return NextResponse.json({ notifications: [] });
    }

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

      // content_body는 응답에 포함하지 않음 (용량 절감)
      const { content_body: _omit, ...rest } = item;
      return { ...rest, isMine };
    });

    const myContents = isAdmin ? rawContents : rawContents.filter(i => i.isMine);

    const myRecentFeedbacks = myContents
      .filter(item => (item.feedback_comment && item.feedback_comment.trim() !== '') || item.status.includes('revision'))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 15);

    return NextResponse.json({ notifications: myRecentFeedbacks });
  } catch (error) {
    console.error('Error fetching notifications API:', error);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}
