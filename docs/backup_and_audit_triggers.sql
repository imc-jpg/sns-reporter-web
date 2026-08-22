-- =========================================================================
-- [데이터 백업 & 유실 방지 시스템] 자동 버전 히스토리 및 감사 로그 트리거
-- =========================================================================
-- 목적: contents 테이블의 데이터가 수정(UPDATE)되거나 삭제(DELETE)될 때마다,
--      수정되기 직전의 전체 본문(content_body), 댓글(discussions), 상태(status),
--      제목 등을 별도 테이블에 자동으로 100% 스냅샷 백업합니다.
-- 적용 방법: Supabase 대시보드 > SQL Editor에 복사하여 [RUN] 실행
-- =========================================================================

-- 1. 버전 히스토리 및 백업 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.content_history (
    history_id BIGSERIAL PRIMARY KEY,
    content_id BIGINT NOT NULL,
    action_type TEXT NOT NULL, -- 'UPDATE' 또는 'DELETE'
    previous_title TEXT,
    previous_author_name TEXT,
    previous_team TEXT,
    previous_content_type TEXT,
    previous_status TEXT,
    previous_content_body TEXT, -- 본문, 크루, 세부 필드 및 댓글 전체 스냅샷
    previous_keywords TEXT,
    previous_intent TEXT,
    previous_description TEXT,
    previous_final_url TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 검색 및 복구 속도를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_content_history_content_id 
    ON public.content_history (content_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_history_changed_at 
    ON public.content_history (changed_at DESC);

-- 3. 자동 스냅샷 백업 트리거 함수 정의
CREATE OR REPLACE FUNCTION public.fn_backup_content_history()
RETURNS TRIGGER AS $$
BEGIN
    -- SYSTEM 관련 특수 레코드(DEADLINES 등)는 히스토리에서 제외하여 용량 절약
    IF OLD.content_type = 'SYSTEM_PROFILE' OR OLD.title = 'SYSTEM_DEADLINES' THEN
        RETURN OLD;
    END IF;

    -- UPDATE 또는 DELETE 발생 시 이전(OLD) 상태 전체를 히스토리 테이블에 스냅샷 저장
    INSERT INTO public.content_history (
        content_id,
        action_type,
        previous_title,
        previous_author_name,
        previous_team,
        previous_content_type,
        previous_status,
        previous_content_body,
        previous_keywords,
        previous_intent,
        previous_description,
        previous_final_url,
        changed_at
    ) VALUES (
        OLD.id,
        TG_OP, -- 'UPDATE' 또는 'DELETE'
        OLD.title,
        OLD.author_name,
        OLD.team,
        OLD.content_type,
        OLD.status,
        OLD.content_body,
        OLD.keywords,
        OLD.intent,
        OLD.description,
        OLD.final_url,
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. contents 테이블에 트리거 연결
DROP TRIGGER IF EXISTS trg_backup_content_history ON public.contents;

CREATE TRIGGER trg_backup_content_history
BEFORE UPDATE OR DELETE ON public.contents
FOR EACH ROW
EXECUTE FUNCTION public.fn_backup_content_history();
