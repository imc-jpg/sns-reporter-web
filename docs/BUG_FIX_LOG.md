# 버그 수정 작업 로그 (2026-08-19)

> 작업 기준 문서: `docs/BUG_AUDIT_2026-08-19.md`
> 빌드 명령: `npm run build` (CLAUDE.md 주의사항)

---

## ✅ 완료된 수정

### B13 — middleware.ts 신설 (긴급·보안)
**파일**: `src/middleware.ts` (신규 생성)
**내용**: 프로젝트 전체에 `middleware.ts`가 없어 인증 게이트가 각 페이지마다 산발적·불일치했음. Supabase `getUser()`를 이용한 서버 측 세션 검증 + 세션 쿠키 자동 갱신 미들웨어 추가. 미인증 요청은 `/login`으로 리다이렉트. admin 권한 검증은 각 서버 컴포넌트에서 별도 처리 (§4.3 Surgical Changes 원칙).

### B13 — admin/users/page.tsx 인증 체크 복구 (긴급·보안)
**파일**: `src/app/(authenticated)/admin/users/page.tsx`
**내용**: 주석 처리되어 있던 인증 체크를 복구하고 `is_admin === true || email === 'admin@admin.com'` 기준 admin 검증까지 추가. curl 한 번으로 전체 회원 PII가 유출되던 경로 차단.

### B9 — /api/crew 인증 게이트 추가 (심각·보안)
**파일**: `src/app/api/crew/route.ts`
**내용**: 인증 체크 전혀 없이 전체 사용자 이메일/이름/팀을 반환하던 라우트에 `getUser()` 인증 게이트 추가. 비로그인 요청에 401 반환.

### B8 — /api/upload 인증 게이트 + 파일 검증 추가 (심각·보안)
**파일**: `src/app/api/upload/route.ts`
**내용**: 무인증으로 service-role 스토리지 업로드를 허용하던 라우트에 인증 게이트 추가. 파일 크기(10MB) 및 허용 타입 목록 검증 추가. 업로드 경로를 `user.id/` 하위로 격리.

### B17 — /api/notifications admin 파라미터 서버 재검증 (긴급·보안)
**파일**: `src/app/api/notifications/route.ts`
**내용**: `?admin=true` URL 파라미터를 그대로 신뢰하던 로직을 제거하고 서버 측 `user.user_metadata.is_admin` 기반으로 교체. 비인증 상태로 `?admin=true`를 붙이면 전체 리포터 콘텐츠가 노출되던 취약점 차단.

### B7 — 알림 API content_body select 추가
**파일**: `src/app/api/notifications/route.ts`
**내용**: select 쿼리에 `content_body`가 빠져 있어 crew/이메일 정밀 매칭이 항상 실패하던 문제 수정. 응답에서는 content_body를 제외하여 불필요한 데이터 전송 방지.

### B10 — /api/deadlines POST admin 체크 추가 (보안)
**파일**: `src/app/api/deadlines/route.ts`
**내용**: 로그인 여부만 확인하고 admin 여부를 검증하지 않아 일반 기자도 전사 공유 마감일을 변경할 수 있었던 문제 수정. `is_admin === true || email === 'admin@admin.com'` 검증 추가.

### B22 — /dashboard, /search의 ?admin=true URL 신뢰 제거 (긴급·보안)
**파일**: `src/app/(authenticated)/dashboard/page.tsx`, `src/app/(authenticated)/search/page.tsx`
**내용**: `isAdmin = searchParams.admin === 'true'` URL 파라미터 기반 판단을 제거하고 서버 측 user 메타데이터 기반으로 교체. `?admin=true`만으로 전체 콘텐츠 열람 + AdminStatusManager 렌더링이 가능했던 취약점 차단.

### B21 — next.config.ts 보안 헤더 추가 (심각·보안)
**파일**: `next.config.ts`
**내용**: CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy 헤더 추가. Next.js 공식 docs 기준 "Without Nonces" 방식 적용. Supabase, jsdelivr CDN 허용 도메인 포함. stored XSS 방어선 확보.

### B5 — 클라이언트 admin 판별 기준 통일 (심각·보안)
**파일**: `src/components/ContentDetailModal.tsx`, `src/components/ContentsLayout.tsx` (6개 패턴)
**내용**: `email.includes('admin')` 부분문자열 매칭 패턴 전체 제거. `is_admin === true || email === 'admin@admin.com'` 또는 `isGlobalAdmin` prop 기준으로 통일. `admin@ymc.com` 허위 참조도 제거.

### B2 — 댓글 저장 시 stale content_body 덮어쓰기 방지 (높음)
**파일**: `src/components/ContentDetailModal.tsx`, `src/components/ContentsLayout.tsx`
**내용**: 댓글 저장 직전 content_body를 DB에서 재조회(`select('content_body').eq('id', ...)`) 후 fresh 데이터에 댓글만 merge하여 update. 모달 오픈 시점의 stale 스냅샷으로 전체 컬럼을 덮어쓰던 버그 수정. (`FinalSubmitForm.tsx`, `MobileSubmitModal.tsx`의 올바른 패턴 참고)

### B16 — scratch.js/scratch2.js .gitignore 추가
**파일**: `.gitignore`
**내용**: `scratch*.js` 패턴을 .gitignore에 추가. service_role 키가 평문으로 포함된 파일이 이후 git 추적되지 않도록 방지. (기존에 이미 커밋된 히스토리는 별도 `git filter-repo` 작업 필요 — 코드 밖 조치)

### B19 — supabase_schema.sql 위험 경고 주석 추가
**파일**: `supabase_schema.sql`
**내용**: 파일 상단에 "라이브 환경에서 실행 금지", "DROP TABLE 포함" 경고 주석 추가. 실수로 운영 DB에 적용하여 전체 데이터를 삭제하는 사고 예방.

### B4 — 모바일 기획안/완성본 수정 시 content_body 안전 병합 (높음)
**파일**: `src/components/mobile/MobileSubmitModal.tsx`
**내용**: 모바일에서 기획안/완성본을 '수정하기'로 열어 저장하거나 임시저장할 때, DB에서 최신 `content_body`를 먼저 조회하여 기존의 피드백 댓글(`discussions`), 완성본 필드(`postContent`, `finalKeywords` 등)를 그대로 유지하면서 수정 필드만 안전하게 merge하도록 개선.

### B14 — XSS 방어 및 HTML 새니타이징 (보안)
**파일**: `src/utils/sanitizeHtml.ts`, `src/components/mobile/MobileTrioModal.tsx`
**내용**: 리치 텍스트 에디터 본문 및 댓글 마크다운 렌더링 시 악성 `<script>`, 인라인 이벤트 핸들러, `javascript:` 슈도 프로토콜을 차단하는 정제 유틸리티 적용.

### UX-01 — 댓글 수정 및 삭제 기능 신설
**파일**: `src/components/mobile/MobileTrioModal.tsx`
**내용**: 채팅방(코멘트)에서 작성자 본인 및 관리자가 댓글을 실시간으로 수정하거나 삭제할 수 있는 기능 추가.

### UX-02 — 구글 드라이브 공개 권한 안내 가이드
**파일**: `src/components/FinalSubmitForm.tsx`, `src/components/mobile/MobileSubmitModal.tsx`
**내용**: 완성본 링크 입력 시 '링크가 있는 모든 사용자(뷰어)' 공개 설정 안내 툴팁을 추가하여 미리보기 권한 오류 방지.

### DAT-01 — 타임존 1일 밀림 방지 날짜 유틸리티
**파일**: `src/utils/dateUtils.ts` (신규)
**내용**: `YYYY-MM-DD` 파싱 시 브라우저 타임존 오차 없이 로컬 날짜를 정확히 계산하는 `parseLocalDate`, `formatKoreanDate`, `calculateDday` 유틸리티 구축.

---

## ⏳ 미완료 (계획 포함, 추후 진행)

- **B3**: status 전이 하드코딩 제거 (ProposalSubmitForm, FinalSubmitForm, MobileSubmitModal)
- **B4**: 모바일 기획안 수정 시 content_body 전체 필드 보존
- **B14**: RichTextEditor DOMPurify 추가 (DOMPurify 패키지 설치 필요)
- **B6**: AdminStatusManager 상태 전이 유효성 검증
- **B12**: 제출 폼 필수값 서버 측 검증

---

## 🔧 코드 밖 필수 조치 (사용자 직접 수행)

1. **Supabase 대시보드**: service_role 키 재발급 → `.env.local` 갱신
2. **Supabase Auth**: admin@admin.com 비밀번호 변경 (현재 `000000`)
3. **git**: `scratch.js`, `scratch2.js`를 git 히스토리에서 제거 (`git filter-repo` 또는 `BFG Repo-Cleaner`)
