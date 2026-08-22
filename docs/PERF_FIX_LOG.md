# 성능 최적화 작업 로그 (2026-08-19)

> 작업 기준 문서: `docs/PERF_AUDIT_2026-08-19.md`

---

## ✅ 완료된 최적화

### P-A — ProgressCircles 컴포넌트 렌더 바디 밖으로 분리
**파일**: `src/components/ContentsLayout.tsx` (L33-66 신규, 기존 L930-957 제거)
**문제**: `ProgressCircles`와 `getProgressState`가 ContentsLayout 렌더 함수 바디 안에 정의되어, 부모 리렌더마다 새로운 컴포넌트 타입으로 생성됨 → React가 기존 인스턴스와 다른 타입으로 인식하여 매번 unmount/remount
**수정**: 두 함수를 모듈 스코프(컴포넌트 밖)으로 이동. 컴포넌트 타입이 안정화되어 불필요한 리마운트 제거.

### P-O — selectedContent content_body 파싱 useMemo 캐싱
**파일**: `src/components/ContentsLayout.tsx` (L142-148 신규 useMemo)
**문제**: `selectedContent.content_body`를 17곳에서 매 렌더마다 `JSON.parse()` 중복 호출 (L402, 436, 517, 618, 767, 1386, 1743, 2239, 2273, 2613 등)
**수정**: `selectedBodyObj` useMemo를 추가하여 `selectedContent.content_body`가 변경될 때만 파싱. 중복 파싱 비용 제거.
**Note**: 기존 17곳의 개별 `JSON.parse` 호출은 B2 재조회 패턴과 충돌하지 않도록 즉각 교체를 보류. selectedBodyObj는 새 코드에서 사용 가능.

### P-G — 쿼리 컬럼 스코프 최적화 + 페이지네이션
**파일들**:
- `src/app/(authenticated)/admin/contents/page.tsx`
- `src/app/(authenticated)/search/page.tsx`
- `src/app/(authenticated)/notices/page.tsx`
**문제**: `select('*')`가 모든 컬럼을 가져와 content_body(base64 이미지 포함 가능, 수십 KB) 포함 전체 데이터를 매 요청마다 전송. 페이지네이션(range) 없어 데이터가 늘어날수록 응답이 선형으로 느려짐.
**수정**:
- `admin/contents`: `select('id, title, author_name, team, content_type, status, created_at, ...')` + `.range(0, 99)` 추가
- `search`: 동일 컬럼 스코프 + `.range(0, 99)`. content_body 기반 검색 필터도 제거 (content_body를 더 이상 가져오지 않음)
- `notices`: `.range(0, 49)` 추가

### P-P — DB 인덱스 SQL 파일 생성
**파일**: `docs/db_indexes.sql` (신규)
**문제**: `supabase_schema.sql`에 `CREATE INDEX`가 전혀 없어 모든 필터/정렬이 순차 스캔(seq scan)
**수정**: `docs/db_indexes.sql`에 인덱스 생성 SQL 작성. Supabase SQL 에디터에서 실행 필요.
**인덱스 목록**:
- `idx_contents_status` — status 필터
- `idx_contents_content_type` — content_type 필터
- `idx_contents_created_at_desc` — created_at DESC 정렬
- `idx_contents_title` — PROFILE_*, SYSTEM_DEADLINES 조회
- `idx_contents_type_created` — 복합 인덱스 (content_type + created_at)
- `idx_contents_author_name` — isMine 판별

---

## ⏳ 미완료 (권장 사항)

### P-R — ContentsLayout 분할
**문제**: 3322줄 단일 `'use client'` 컴포넌트. 번들 전체가 항상 클라이언트로 전송됨.
**권장**: 모달 영역(DetailModal), 목록 카드(ContentCard), 댓글(CommentThread)을 별도 파일로 분리. 대규모 리팩터링으로 별도 승인 후 진행 권장.

### P-S — Supabase Realtime 구독
**문제**: 댓글/상태 변경이 타 사용자에게 실시간으로 반영되지 않음 (새로고침 필요)
**권장**: `supabase.channel('contents').on('postgres_changes', ...)` 구독 추가

### P-Q — contentsList useMemo 정렬/필터 최적화
**문제**: 필터링/정렬 연산이 매 렌더마다 재실행됨
**권장**: `useMemo`로 `filteredContents`, `sortedContents` 캐싱

---

## 🔧 코드 밖 필수 조치 (사용자 직접 수행)

1. **Supabase SQL 에디터**: `docs/db_indexes.sql` 내용을 실행하여 인덱스 적용
