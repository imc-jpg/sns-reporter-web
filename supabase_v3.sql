-- 해당 SQL은 이전에 만든 테이블에 'publish_date' (희망 발행일) 컬럼을 추가하는 명령어입니다.
-- 기존 데이터는 삭제되지 않습니다.
-- Supabase SQL Editor 에서 아래 명령어만 복사해서 실행해주세요!

ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS publish_date DATE;
