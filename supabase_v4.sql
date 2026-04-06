-- 해당 SQL은 데이터베이스에 'team'(팀)과 'content_type'(종류) 컬럼을 추가합니다.
-- Supabase SQL Editor 에서 아래 명령어만 복사해서 실행해주세요!

ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS team TEXT;
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS content_type TEXT;
