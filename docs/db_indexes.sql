-- [P-P] DB 인덱스 추가 (2026-08-19)
-- 배경: supabase_schema.sql에 CREATE INDEX가 전혀 없어 모든 필터/정렬 쿼리가 순차 스캔(seq scan)
-- 현재 데이터 규모에서는 무해하지만 테이블이 커질수록 대시보드/검색/목록 쿼리가 선형으로 느려짐
-- Supabase SQL 에디터에서 실행하세요 (운영 DB에 적용해도 안전 — CREATE INDEX는 데이터를 변경하지 않음)

-- 가장 자주 사용되는 필터: status, content_type
CREATE INDEX IF NOT EXISTS idx_contents_status
  ON public.contents (status);

CREATE INDEX IF NOT EXISTS idx_contents_content_type
  ON public.contents (content_type);

-- 정렬에 자주 사용: created_at DESC
CREATE INDEX IF NOT EXISTS idx_contents_created_at_desc
  ON public.contents (created_at DESC);

-- PROFILE_*, SYSTEM_DEADLINES, SYSTEM_DEADLINES 등 title 기반 exact match 조회 (대시보드 매 요청마다 발생)
CREATE INDEX IF NOT EXISTS idx_contents_title
  ON public.contents (title);

-- 목록 페이지 복합 인덱스 (content_type 필터 + created_at 정렬)
CREATE INDEX IF NOT EXISTS idx_contents_type_created
  ON public.contents (content_type, created_at DESC);

-- author_name 기반 소유권 판별 (isMine 계산에 사용)
CREATE INDEX IF NOT EXISTS idx_contents_author_name
  ON public.contents (author_name);
