'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteContent(contentId: string, deleteOnlyFinalWork: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Fetch the content to verify ownership
  const { data: content, error: fetchError } = await supabase
    .from('contents')
    .select('id, author_name, content_body, title')
    .eq('id', contentId)
    .single();

  if (fetchError || !content) {
    return { success: false, error: '콘텐츠를 찾을 수 없습니다.' };
  }

  // Check if user is admin
  const isMaster = user.email === 'admin@admin.com';
  const isDesignatedAdmin = user.user_metadata?.is_admin === true;
  const isAdmin = isMaster || isDesignatedAdmin;

  // Check if user is the author
  let isAuthor = false;
  try {
    const body = JSON.parse(content.content_body || '{}');
    if (body.authorEmail === user.email) isAuthor = true;
  } catch {}

  // Also check by profile name match
  const { data: profileRow } = await supabase
    .from('contents')
    .select('author_name')
    .eq('title', `PROFILE_${user.email}`)
    .single();

  const userName = profileRow?.author_name || user.user_metadata?.full_name || user.user_metadata?.name;
  if (userName && content.author_name?.includes(userName)) isAuthor = true;

  if (!isAdmin && !isAuthor) {
    return { success: false, error: '삭제 권한이 없습니다.' };
  }

  if (deleteOnlyFinalWork) {
    let body: any = {};
    try { body = JSON.parse(content.content_body || '{}'); } catch {}
    delete body.finalKeywords;
    delete body.postContent;
    delete body.thumbnail_url;
    delete body.final_url;

    const { error } = await supabase
      .from('contents')
      .update({
        status: 'approved',
        final_url: null,
        content_body: JSON.stringify(body)
      })
      .eq('id', contentId);
      
    if (error) return { success: false, error: error.message };
  } else {
    let body: any = {};
    try { body = JSON.parse(content.content_body || '{}'); } catch {}
    body.deletedAt = new Date().toISOString();
    body.deletedBy = user.email;
    body.deletedByName = userName || user.email;

    const { error } = await supabase
      .from('contents')
      .update({
        status: 'deleted',
        content_body: JSON.stringify(body)
      })
      .eq('id', contentId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/contents');
  revalidatePath('/dashboard');
  revalidatePath('/proposals');
  revalidatePath('/final-works');
  revalidatePath('/calendar');
  revalidatePath('/trainee-contents');

  return { success: true };
}
