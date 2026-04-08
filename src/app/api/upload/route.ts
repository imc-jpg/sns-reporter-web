import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${uniqueSuffix}_${sanitizedName}`;

    const { data, error } = await supabaseAdmin.storage
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
