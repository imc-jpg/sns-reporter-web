import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

/**
 * [B8] /api/upload 인증 게이트 추가
 * 기존: auth.getUser() 체크 없이 service-role로 스토리지에 무제한 업로드 허용
 * 수정: 로그인한 사용자만 접근 + 파일 크기(10MB) 및 허용 타입 검증 추가
 * 현재 코드베이스에서 이 라우트를 호출하는 곳이 없으나,
 * 서버에 살아있으므로 보안 게이트를 추가하여 유지한다.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime',
  'application/pdf',
];

export async function POST(req: NextRequest) {
  // [B8] 인증 검증
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // [B8] 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다 (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 },
      );
    }

    // [B8] 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '허용되지 않는 파일 형식입니다' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${user.id}/${uniqueSuffix}_${sanitizedName}`;

    const { error } = await supabaseAdmin.storage
      .from('final_works')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('final_works').getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
