# 성능 최적화 감사 (2026-08-19)

버그/보안 감사(`docs/BUG_AUDIT_2026-08-19.md`)와 별개로, 렌더링/데이터 페칭/번들 크기 관점에서 진행한 성능 전용 조사 기록.

## 우선순위 요약

1. `content_body`가 렌더링 1회당 10곳 이상에서 중복 파싱됨 — 가장 쉽고 임팩트 큰 수정
2. `ProgressCircles`가 컴포넌트 내부에서 매 렌더마다 재정의되어 리스트 아이템이 통째로 unmount/remount됨
3. 관리자/검색/공지/임시저장 목록에서 `.range()` 없는 `select('*')` — base64 댓글 이미지가 포함된 content_body까지 통째로 끌어옴
4. `next/dynamic` 전무 — 모달류 대형 컴포넌트가 항상 초기 번들에 포함됨
5. `React.memo`/리스트 아이템 컴포넌트 분리 전무 — 현재는 50개 range 제한 덕에 심각하지 않으나 확장 시 위험
6. base64 첨부 이미지가 원본 해상도 그대로 클라이언트에서 디코딩됨

## 1. React 렌더링 성능

### 발견 A: `ProgressCircles`가 렌더 함수 내부에서 컴포넌트로 재정의됨
- `ContentsLayout.tsx:902-920` — 함수형 컴포넌트 정의 자체가 `ContentsLayout`의 렌더 바디 안에 있어, 부모가 리렌더될 때마다(검색창 타이핑, 체크박스 토글 등) React가 매번 "새로운 컴포넌트 타입"으로 인식 → 화면에 보이는 모든 행(row)의 해당 서브트리가 재조정(reconcile)이 아닌 unmount/remount됨.
- 동일 계열: `getTypeStyle`, `getTeamPlatformIcon`, `getProgressState`, `formatDate`, `hasDiscussions`(848-934)도 매 렌더 재생성되나 이들은 순수 함수라 비용은 낮음. `ProgressCircles`만 실제 remount 비용 발생.

### 발견 B: 리스트 행이 별도 컴포넌트로 분리/메모이제이션되어 있지 않음
- `ContentsLayout.tsx:1220-1331` — `.map()` 내부에서 각 아이템마다 `onClick`/`onChange`/`onMouseEnter` 등 인라인 클로저를 매번 새로 생성. 프로젝트 전체에 `React.memo` 사용 0건(`grep` 확인). 필터/정렬/모달 상태가 전부 같은 최상위 컴포넌트의 `useState`라, 무관한 상태 변경(예: `filterByMine` 체크박스)도 전체 리스트의 행 JSX를 다시 생성.
- `displayContents`/`groupedContents` 자체는 `useMemo`로 감싸져 있으나(785, 822행), 실제 행 JSX 생성부(`.map()`, 1220행)는 메모이제이션되어 있지 않아 매 렌더 전체 실행됨.

### 발견 C: 리스트 가상화(virtualization) 없음
- 현재는 서버 쿼리가 `.range(0, 49)`로 50개 제한이라 당장 문제는 아니지만, 이 제한이 풀리면 렌더링 비용이 데이터 수에 비례해 무한정 늘어날 구조. `react-window` 등 미사용.

### 발견 D: `FinalSubmitForm.tsx`/`ProposalSubmitForm.tsx`/`MobileSubmitModal.tsx`도 동일 패턴
- 파일당 800~1100줄 규모의 단일 컴포넌트에 `useMemo`/`useCallback` 사용이 극히 적음(각 2, 2, 0회). 텍스트 필드 하나 입력할 때마다 폼 전체(크루 선택 리스트, 키워드 칩 리스트 등)가 리렌더됨.

## 2. 데이터 페칭 패턴

### 확인 결과 양호한 부분 (참고)
- N+1 쿼리 패턴 없음 — 상세조회는 클릭 시 1회만 발생.
- `/contents`, `/dashboard`, `/final-works`, `/proposals`의 서버 컴포넌트는 이미 컬럼 스코프(`content_body` 제외) + `.range(0, 49)` 페이지네이션 적용됨 — 잘 되어 있음.
- 같은 페이지 내 동일 데이터 중복 페칭 없음.

### 발견 G: `.range()` 없는 `select('*')` — 실질적 과다 페칭 지점
- `admin/contents/page.tsx:22`, `search/page.tsx:16`, `notices/page.tsx:14` — 전체 테이블을 range 제한 없이 `select('*')`.
- `ProposalSubmitForm.tsx:216`, `FinalSubmitForm.tsx:277` — "이어쓰기" 임시저장 목록을 띄우기 위해 `select('*')`로 모든 draft/approved 행의 전체 `content_body`(댓글 base64 이미지 포함 가능)를 불러옴 — 제목만 보여주는 목록인데 콘텐츠당 수 MB가 딸려올 수 있음.
- `MobileSubmitModal.tsx:486` — 목록/선택용 쿼리에 `content_body`를 명시적으로 select — 불필요.

## 3. 이미지/자산

### 발견 I: `next/image` 프로젝트 전체 미사용
- 모든 이미지가 순수 `<img>` 태그(`ContentsLayout.tsx:886,1513,1572,2949`, `ContentDetailModal.tsx:457,493`, `MobileDashboard.tsx:197`).
- 댓글 첨부 이미지는 base64 data-URL이라 `next/image` 최적화 대상은 아님(근본 해결은 버그 감사에 이미 기재된 "Storage로 이전 + 서버 리사이즈"). 다만 원본 해상도 그대로 클라이언트에서 디코딩되어 ~150-240px로 표시되는 낭비는 있음.
- 정적 로고(`yonsei_media_logo.png`)는 `next/image` 전환으로 캐싱/사이징 이득을 볼 수 있는 좋은 후보.

## 4. 번들 크기

- `package.json` 의존성은 최소한(Supabase, Next, React, tailwindcss-animate)만 있어 의존성발 번들 비대화 위험은 낮음.
- `next/dynamic` 프로젝트 전체 0건. 다음 컴포넌트들이 동적 임포트 후보:
  - `MobileSubmitModal.tsx`(1097줄), `MobileTrioModal.tsx`(961줄), `MobileCalendar.tsx`(965줄) — 모달성 컴포넌트, 열 때만 필요.
  - `FinalSubmitForm.tsx`(817줄) — `ContentsLayout.tsx:5`에서 항상 즉시 import되지만 특정 모달 상태일 때만 렌더링됨.
  - `AdminBoardClient.tsx`(786줄) — admin 전용, 라우트 분리가 제대로 되어 있는지 확인 필요.

## 5. 클라이언트/서버 컴포넌트 분리

- `ContentsLayout.tsx`(3322줄)가 `'use client'` 단일 컴포넌트로, 정적 표시 로직(아이콘 SVG, 배지 스타일, 날짜 포맷)과 진짜 인터랙티브 상태(필터/모달/선택)가 뒤섞여 있어 전체가 클라이언트 번들에 포함됨.
- 프로젝트 전체 43개 파일이 `'use client'`, 총 14,162줄 — 전체 소스(19,121줄) 중 상당 비중.

## 6. 폴링/실시간

- Supabase realtime 구독 전무 — 데이터 실시간 반영 안 됨(성능 문제라기보단 새로고침해야 남의 변경사항이 보이는 UX 갭).
- `setInterval` 2곳(`FinalDeadlineCarousel.tsx:44`, `MobileDashboard.tsx:127`) 모두 4초 주기, cleanup 정상 — 문제 없음.

## 7. `content_body` 중복 파싱

### 발견 O (최우선 수정 대상): 같은 `content_body`가 렌더 1회당 10곳 이상에서 개별 파싱됨
- `ContentsLayout.tsx`에서 `JSON.parse(selectedContent.content_body...)` 호출이 17곳(372, 406, 511, 581, 730, 1377, 1734, 2230, 2264, 2604행 등)에서 독립적으로 발생. 그 중 일부(1734, 2230, 2264행 등)는 이벤트 핸들러가 아니라 **렌더/JSX 경로 안**에 있어, 상세 모달이 리렌더될 때마다 동일한(때로는 수 MB짜리) JSON 문자열을 매번 다시 파싱함.
- **수정 방향**: `useMemo(() => JSON.parse(selectedContent?.content_body || '{}'), [selectedContent?.id])` 하나로 통합하면 렌더당 중복 파싱 10회 이상을 제거 가능. 구현 난이도 낮고 효과 큼.

## 2차 탐색 추가 발견 (DB 인덱스, 캐싱, 폰트, 모바일 캘린더)

### 발견 P (최우선): DB 인덱스가 단 하나도 없음
- `supabase_schema.sql`/`v3`/`v4` 어디에도 `CREATE INDEX` 없음. `contents` 테이블은 PK(`id`) 암묵 인덱스만 존재하고 나머지 컬럼은 전부 순차 스캔.
- `status`, `content_type`, `title`(exact match — `PROFILE_${email}`, `SYSTEM_DEADLINES` 조회용), `created_at`, `author_name`이 거의 모든 페이지에서 필터/정렬 조건으로 사용됨.
- 특히 `dashboard/page.tsx:32,67`의 `.eq('title', 'PROFILE_${email}')`/`.eq('title', 'SYSTEM_DEADLINES')`는 **모든 사용자의 모든 대시보드 로드마다** 전체 `contents` 테이블(이미 base64 이미지로 비대해진 row 포함)을 풀스캔.
- 지금은 데이터 양이 적어 괜찮지만 테이블이 커질수록 모든 목록/대시보드/검색 쿼리가 선형으로 느려지는 구조. **권장 인덱스**: `title`, `status`, `content_type`, `created_at DESC`, 복합 `(content_type, created_at)`.

### 발견 Q: 캐싱 전략 부재 + 대시보드가 매 요청마다 반복 조회
- `dashboard/page.tsx`, `admin/contents/page.tsx`, `mobile/page.tsx` 모두 `export const dynamic = 'force-dynamic'`로 Next.js 캐싱을 완전히 배제.
- 대시보드는 요청마다 순차적으로 4개 Supabase 쿼리(프로필/콘텐츠목록/전체프로필/마감일)를 날리는데, `unstable_cache` 등 캐싱 레이어가 전혀 없음. `SYSTEM_DEADLINES`/`SYSTEM_PROFILE`처럼 거의 안 바뀌는 데이터도 매번 DB에서 다시 읽음.
- `content.ts:80-83`의 `revalidatePath`는 `/admin/contents`, `/search`, `/notices`를 포함하지 않음 — 지금은 이 페이지들이 `force-dynamic`이라 무해하지만, 나중에 캐싱을 도입하면 이 누락 때문에 조용히 stale 데이터가 노출될 수 있는 구조적 함정.
- `unstable_cache`/`revalidateTag`/`fetch cache` 사용 프로젝트 전체 0건 — 캐싱 전략 자체가 없음을 재확인.

### 발견 R: 본문에 실제로 쓰이는 한글 폰트(Pretendard)가 next/font가 아닌 수동 `<link>`로 로드됨
- `layout.tsx:2,7-14`는 `Geist`/`Geist_Mono`에 `next/font/google`을 올바르게 사용하지만, 앱 전체 한글 본문에 쓰이는 Pretendard(`globals.css:16-17`)는 `layout.tsx:38-41`에서 jsdelivr CDN `<link>` 태그로 수동 로드됨.
- 렌더 블로킹 크로스오리진 요청(preconnect로 일부만 완화) + Next의 폰트 서브셋/self-hosting 최적화 미적용 + 서드파티 CDN 의존. `next/font/local`로 자체 호스팅 전환 시 이 네트워크 왕복을 완전히 제거 가능.

### 발견 S: MobileCalendar가 무관한 상태 변경에도 매번 O(셀수×콘텐츠수) JSON.parse 재계산
- `MobileCalendar.tsx:369-389`(`monthEvents`, `datesWithContent`), `354-361`(`getEventsForDay`, 그리드 셀당 1회씩 최대 42회 호출, 511행) — `useMemo` 없이 매 렌더마다 전체 재계산.
- 날씨 로딩 상태, 잠금 토스트 1.8초 타임아웃, 스와이프 애니메이션 등 캘린더 데이터와 무관한 상태 변경(92-97, 109-136, 158-165행)에도 이 O(42×N) JSON.parse 연산이 매번 재실행됨. `useMemo([contents, year, month])`로 감싸면 대부분 제거 가능 — 모바일에서 체감 효과 큰 저비용 수정.

### 기타 확인 사항
- **댓글 첨부 이미지**: 클라이언트 리사이즈/압축 없이 `FileReader.readAsDataURL`로 원본 그대로 base64 인코딩(`ContentsLayout.tsx:709-711`, `ContentDetailModal.tsx:160`) — 완성본 제출은 구글드라이브 링크 방식이라 이 문제와 무관, 댓글 첨부에만 국한.
- **관리자 통계 집계**: SQL `count()`/`group by` 대신 전체 row를 fetch해 JS `.filter().length`로 계산(`dashboard/page.tsx`) — 현재는 range 제한/90일 윈도우로 낮은 심각도지만, 전사 통계가 필요해지면 발견 G와 동일한 스케일링 위험.
- **Supabase 클라이언트 재생성**: 11개 컴포넌트가 `createClient()`를 컴포넌트 바디에서 매 렌더 호출(`ContentsLayout.tsx:95` 등) — `useMemo`나 모듈 스코프 싱글턴으로 대체 가능, 리렌더 빈도가 높은 컴포넌트일수록 누적 비용.
- Tailwind는 v4 CSS-first 설정이라 content-glob 감사 대상 자체가 없음(non-issue).

## 권장 대응조치 (우선순위)
1. **`content_body` 파싱을 `useMemo` 하나로 통합** (발견 O) — 가장 쉽고 확실한 개선
2. **`ProgressCircles`를 컴포넌트 외부로 분리** (발견 A) — 리스트 행 불필요한 remount 제거
3. **`admin/contents`, `search`, `notices`, 임시저장 목록 쿼리에 컬럼 스코프 + `.range()` 적용** (발견 G) — 특히 `content_body` 제외
4. **모달성 대형 컴포넌트를 `next/dynamic`으로 전환** (`MobileSubmitModal`, `MobileTrioModal`, `MobileCalendar`, `FinalSubmitForm`) — 초기 번들 축소
5. 리스트 아이템 컴포넌트 분리 + `React.memo` 적용 — 당장 급하지 않으나 range 제한 완화 전에 선행 필요
6. 정적 로고 이미지를 `next/image`로 전환
7. (버그 감사와 연계) 댓글 첨부 이미지를 Supabase Storage로 이전 — base64 인라인 저장 방식 자체가 이 문서의 여러 문제(과다 페칭, 클라이언트 디코딩 비용, content_body 비대화)의 근본 원인
8. **`contents` 테이블에 인덱스 추가** (`title`, `status`, `content_type`, `created_at`) — 데이터 증가에 대비한 가장 확실한 선제 조치
9. **대시보드의 `SYSTEM_DEADLINES`/`PROFILE_*` 조회를 캐싱**(`unstable_cache` 등) — 거의 변하지 않는 데이터를 매 요청마다 재조회하지 않도록
10. **Pretendard 폰트를 `next/font/local`로 자체 호스팅 전환** — 렌더 블로킹 서드파티 요청 제거
11. **`MobileCalendar`의 `monthEvents`/`getEventsForDay`를 `useMemo`로 감싸기** — 모바일에서 저비용 고효과 수정
