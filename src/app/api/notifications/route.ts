import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  canViewSecretComment,
  isUserContentOwnerOrCrew,
  matchesName,
} from '@/utils/accessControl';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const currentUser = {
      email: userEmail,
      name: realName,
      isAdmin,
    };

    // Note: contents table uses created_at, NOT updated_at
    const { data: contents, error: fetchError } = await supabase
      .from('contents')
      .select('id, title, status, feedback_comment, created_at, author_name, content_body')
      .neq('content_type', 'SYSTEM_PROFILE')
      .neq('title', 'SYSTEM_DEADLINES')
      .neq('status', 'draft')
      .order('id', { ascending: false })
      .limit(40);

    if (fetchError || !contents) {
      console.error('Error fetching contents for notifications:', fetchError);
      return NextResponse.json({ notifications: [] });
    }

    const notifications: any[] = [];

    for (const item of contents) {
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(item.content_body || '{}');
      } catch {
        bodyObj = {};
      }

      const isMine = isUserContentOwnerOrCrew(item, currentUser);

      // A user is notified about their own contents, or admins are notified about all contents
      if (!isMine && !isAdmin) {
        continue;
      }

      const discussions: any[] = Array.isArray(bodyObj.discussions) ? bodyObj.discussions : [];

      // 1. Check discussion comments
      for (const disc of discussions) {
        // Skip user's own comments
        const isMyOwnDisc =
          (userEmail && disc.authorEmail && disc.authorEmail.toLowerCase() === userEmail.toLowerCase()) ||
          (realName && disc.author && matchesName(disc.author, realName));

        if (isMyOwnDisc) continue;

        // If user is admin, only notify if the comment is from a student/writer/crew
        if (isAdmin && !isMine && disc.role === 'admin') continue;

        // Check if current user can view this comment (handles secret comments)
        const canView = canViewSecretComment({
          msg: disc,
          currentUser,
          contentAuthorName: item.author_name,
          contentBody: bodyObj,
        });

        if (canView) {
          notifications.push({
            id: item.id,
            comment_id: disc.id,
            title: item.title,
            status: item.status,
            feedback_comment: disc.text,
            comment_author: disc.author || (disc.role === 'admin' ? '관리자' : '기자'),
            is_secret: !!disc.isSecret,
            created_at: disc.createdAt || item.created_at,
            type: 'comment',
          });
        }
      }

      // 2. Check status revision or legacy feedback_comment
      if (item.status?.includes('revision') || (item.feedback_comment && item.feedback_comment.trim() !== '')) {
        const hasDiscForThis = notifications.some(n => n.id === item.id);
        if (!hasDiscForThis) {
          notifications.push({
            id: item.id,
            title: item.title,
            status: item.status,
            feedback_comment: item.feedback_comment || (item.status.includes('final') ? '완성본 수정 요청 (피드백 확인 필요)' : '기획안 수정 요청 (피드백 확인 필요)'),
            comment_author: '관리자',
            is_secret: false,
            created_at: item.created_at,
            type: 'status',
          });
        }
      }
    }

    // Sort by created_at descending
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ notifications: notifications.slice(0, 25) });
  } catch (error) {
    console.error('Error fetching notifications API:', error);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}
