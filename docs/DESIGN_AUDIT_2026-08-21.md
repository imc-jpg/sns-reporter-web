# 디자인 점검 리포트 (2026-08-21)

## 점검 기준
- Emil Kowalski 디자인 엔지니어링 원칙 (`emil-design-eng` 스킬)
- Apple Fluid Interfaces 원칙 (`apple-design` 스킬)
- 프로젝트 표준: 모바일 글래스/블러 UI는 최소~무틴트 지향 (`glass-design-minimal-tint` 메모리)

## 한 줄 요약
전반적으로 모바일 UI는 스프링 이징·눌림 피드백·스태거링 등 상당히 공들인 모션 시스템을 갖췄지만, 몇 군데 핵심 화면(알림 팝오버, 캘린더 날짜 팝업)에서 글래스 틴트가 너무 진하거나 애니메이션이 아예 없는 등 나머지 완성도와 눈에 띄게 어긋나는 지점이 있고, `transition-all` 남용과 hover 가드 누락 같은 반복 패턴이 코드 전반에 퍼져 있음.

## 우선순위별 개선안

| 순위 | 파일:라인 | 문제 | 근거 | 제안 수정 | 상태 |
|---|---|---|---|---|---|
| 1 | `src/components/NotificationsPopup.tsx:76-116` | 알림 팝오버가 등장/퇴장 애니메이션 전혀 없이 즉시 나타남·사라짐. `transform-origin`도 없어 벨 아이콘과 무관한 위치에서 "뚝" 나타남 | Apple: 팝오버는 트리거 기준 anchored 등장 / Emil: 팝오버 125-250ms 필요 | `transform-origin: top right` + scale(0.95)→1, opacity 0→1, ~150ms ease-out transition 추가 | **완료** (2026-08-21, `animate-in fade-in zoom-in-95 duration-150` + `transformOrigin: top right`) |
| 2 | `src/components/mobile/MobileCalendar.tsx:815` | 캘린더 날짜 팝업 배경이 `bg-white/75 backdrop-blur-xs`로 강한 흰색 틴트 + 블러 중첩 | 프로젝트 표준: 모바일 글래스는 최소~무틴트여야 함 | `bg-white/75` → `bg-white/20~30` 수준으로 낮추거나 블러만으로 층 분리 | **완료** (`bg-white/25`로 조정) |
| 3 | `src/app/globals.css:378` (`table tbody tr`) | `transition: all 0.2s ... !important`가 테이블 행 전체에 걸림 | Emil: `transition: all` 금지, 명시적 속성 지정 | `transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s` 로 명시 | **완료** |
| 4 | `src/components/mobile/MobileTrioModal.tsx:758` | 시트 닫힘 애니메이션에 `ease-in` 사용 | Emil: UI에 `ease-in` 금지 | `ease-in` → `ease-out` 또는 커스텀 cubic-bezier로 교체 | **완료** |
| 5 | `src/components/mobile/MobileTrioModal.tsx:571` | 댓글 하이라이트 배경 전환이 `duration-1000` | Emil: UI 애니메이션은 300ms 이하 권장 | 250~400ms로 단축 (하이라이트 유지시간은 별도 setTimeout으로 관리) | **완료** (`duration-300`, 유지시간은 기존 2200ms `setTimeout`이 별도 관리 중이었음을 확인) |
| 6 | `src/components/mobile/*.tsx` 전반 (`hover:` 27건) | `@media (hover:hover)` 가드 없이 `hover:` 클래스 다수 사용 | Emil: hover는 `hover:hover and pointer:fine` 게이트 필수 | Tailwind v4 `@custom-variant`로 `hover-fine` 정의 후 일괄 치환 | **완료** (Antigravity 위임, 8개 파일 28건 `hover-fine:`로 치환, `group-hover:` 오염 없음 확인) |
| 7 | `src/components/mobile/MobileDashboard.tsx:267` | 승인대기 카드 `transition-all cursor-pointer` | Emil: `transition-all` 금지 | `transition-colors, transition-transform` 등으로 분리 지정 | **완료** (Antigravity 위임) |
| 8 | `src/components/ContentDetailModal.tsx:425,436,730,760,791,934,953` | 모달 내부 버튼 다수가 `transition-all` (7건) | Emil: `transition-all` 금지 | 실제 변경 속성만 명시 | **완료** (Antigravity 위임, 7건 모두 요소별 실제 변경 속성으로 치환) |
| 9 | `src/components/AdminBoardClient.tsx` (11곳) | 칸반보드 카드/필터 버튼 대부분이 `transition-all` | Emil: `transition-all` 금지 | 공통 유틸 클래스로 통일 | **완료** (Antigravity 위임, 11건) |
| 10 | `src/app/globals.css:199,206-227` (`.sidebar-link`) | hover 시 scale+translateX 동시 발생, hover 가드 없음 | Apple/Emil: hover는 pointer:fine 가드 필요 | `@media (hover:hover) and (pointer:fine)`로 감싸기 | **완료** (`transition-all`도 함께 명시적 속성으로 교체) |
| 11 | `src/components/mobile/MobileTrioModal.tsx:142,171` | 좋아요/복사 버튼 `transition-all duration-200` | Emil: `transition-all` 금지 | 속성별 개별 전환 명시 | **완료** (Antigravity 위임) |
| 12 | `src/app/globals.css:1362-1449` (`.glass-cta` 8종) | 글래스 버튼 배경 알파값 0.16~0.85로 컴포넌트별 제각각 | 프로젝트 표준: 최소 틴트 지향 | CSS 커스텀 프로퍼티로 토큰화, 기본값 하향 재검토 | **완료** (2026-08-21, 리퀴드 글래스 섹션 참고 — 알파 스펙트럼 재조정 및 `.glass-cta-primary` 대비 결함 수정) |
| 13 | `src/components/mobile/MobileDashboard.tsx` 전역 | 타이포 토큰(`.typo-*`) 대신 임의 픽셀값(`text-[0.6rem]` 등) 다수 사용 | 디자인 토큰 일관성 원칙 | 모바일 전용 타이포 토큰(`.typo-mobile-*`) 정의 | 미착수 (토큰 체계 신규 설계가 필요한 대규모 리팩터라 이번 세션 범위에서 보류) |
| 14 | `src/components/mobile/MobileDashboard.tsx:311-322` | CTA 버튼 그룹과 하단 nav의 duration이 매직넘버로만 동기화 | Apple: 연관 요소 간 대칭적 모션 | 공통 duration을 CSS 변수로 추출 | 미착수 (13번과 함께 후속 작업으로 보류) |
| 15 | `src/components/mobile/MobileTrioModal.tsx:744` | 딤 배경은 keyframe 기반, 다른 상태는 CSS transition — 메커니즘 혼재 | Emil: 자주 트리거되는 UI는 인터럽트 가능한 transition 권장 | keyframe → opacity transition으로 통일 | 미착수 (현재 코드에서 딤 배경도 다른 상태와 동일하게 `animate-in fade-in`(tailwindcss-animate) 계열을 일관되게 쓰고 있어 재현 여부 재확인 필요) |

## 패턴 수준 이슈
- **`transition-all` 남용**: `src/` 전역 총 48건 (`ContentDetailModal.tsx` 7건, `AdminBoardClient.tsx` 11건, `MobileTrioModal.tsx` 4건 집중)
- **`ease-in` 사용**: 실질적으로 1건 (`MobileTrioModal.tsx:758`, exit 애니메이션이라 놓치기 쉬움)
- **`scale(0)` 진입 애니메이션**: 0건 (양호)
- **300ms 초과 duration**: `duration-1000` 1건 외 대부분 200~300ms 이내로 양호
- **hover 가드 누락**: `@media (hover` 가드 프로젝트 전체 0건, 모바일 전용 컴포넌트 7개 파일에 `hover:` 27건 무가드
- **`prefers-reduced-motion` 대응**: 전체 2건만 검색됨, 우선순위는 낮음
- **다크모드 색상 오버라이드**: `globals.css`가 인라인 hex 값을 문자열 셀렉터로 500줄 넘게 하드코딩 — 토큰 미사용의 근본 원인
- **글래스 재질 알파값 스펙트럼**: `.glass-cta*` 0.05(navbar)~0.85(sky)로 넓게 분포, "최소 틴트" 원칙이 일부 컴포넌트에서 미준수

## 점검 범위 밖 (참고)
- Impeccable, Jakub Krehel(Better) Claude Code 플러그인은 2026-08-21 세션 중 설치되었으나 재시작 전이라 이번 점검에는 미반영. 재시작 후 2차 점검에서 접근성/타이포/컬러 룰 관점 추가 예정.

---

## 2차 점검 (2026-08-21, Impeccable / Better 플러그인 기준)

### 점검 기준
- `interfaces:better-accessibility` — 시맨틱 요소, 포커스 링, 키보드 지원, ARIA
- `interfaces:better-typography` — 타입 스케일, 헤딩 계층, tabular-nums, 말줄임 처리
- `interfaces:better-colors` — 상태색 이중 단서, accent hue 일관성, 대비

1차에서 다룬 모션/글래스 틴트/`transition-all` 항목은 제외하고, 접근성·타이포·컬러 관점의 신규 발견 사항만 기록.

### 한 줄 요약
가장 심각한 문제는 팝오버/모달 대부분(NotificationsPopup, MobileTrioModal, MobileSubmitModal, UnifiedDraftsModal, NoticeCreateModal, MissingFinalWorksPopup)에 Escape 키 처리와 포커스 트랩이 전혀 없다는 점과, 정렬 가능한 테이블 헤더·초안 선택 카드 등 핵심 인터랙션이 `<div onClick>`으로만 구현되어 키보드로 접근 불가능하다는 점. 그 다음으로 아이콘 전용 닫기 버튼에 `aria-label`이 빠진 사례가 반복됨.

### 우선순위별 개선안

| 순위 | 파일:라인 | 문제 | 근거 | 제안 수정 | 상태 |
|---|---|---|---|---|---|
| 1 | `NotificationsPopup.tsx`, `MobileTrioModal.tsx`, `MobileSubmitModal.tsx`, `UnifiedDraftsModal.tsx`, `NoticeCreateModal.tsx`, `MissingFinalWorksPopup.tsx` | 모달/팝오버 전반에 Escape 키 핸들러·포커스 트랩 없음 (`ContentDetailModal.tsx:77-82`만 구현됨) | better-accessibility: 모달은 Escape로 닫히고 배경에 `inert`, 포커스는 내부로 이동 후 트리거로 복귀해야 함 | `ContentDetailModal`의 Escape 패턴을 공통 훅(`useModalA11y`)으로 추출해 나머지 모달에 적용 | **완료** (`src/hooks/useModalA11y.ts` 신규 작성 — 열릴 때 포커스 이동, Tab 트랩, Escape, 닫힐 때 트리거로 포커스 복귀. `NotificationsPopup`/`UnifiedDraftsModal`/`NoticeCreateModal`/`MissingFinalWorksPopup`/`ModalContext`(기획안·완성본·콘텐츠 모달 공용 셸)에 전체 적용. `MobileTrioModal`/`MobileSubmitModal`은 텍스트 입력·스와이프 제스처와의 충돌을 피해 Escape 핸들러만 경량 적용) |
| 2 | `ContentsLayout.tsx:1170-1174` | 정렬 가능한 테이블 헤더 5개가 `<div onClick>`으로 구현, role/tabIndex/키보드 핸들러 없음 | better-accessibility: 네이티브 요소 우선, 클릭 가능 UI는 키보드 경로 필수 | `<button>`으로 교체하거나 `role="button" tabIndex={0}` + Enter/Space 핸들러 추가 | **완료** (`role="button" tabIndex={0}` + Enter/Space 핸들러 + `aria-label` 5개 헤더 모두 적용) |
| 3 | `FinalSubmitForm.tsx:511` | 초안 선택 카드가 `<div onClick>`만으로 동작, 키보드 접근 불가 | 동일 | `<button>` 래핑 또는 키보드 핸들러 추가 | **완료** (동일 패턴 적용) |
| 4 | `MissingFinalWorksPopup.tsx:106` | 팝업 열기 트리거가 `<div onClick>` | 동일 | `<button>`으로 교체 | **완료** (트리거 2곳 모두 `role="button"` + 키보드 핸들러 + `aria-label`) |
| 5 | `ProposalSubmitForm.tsx:445`, `FinalSubmitForm.tsx:470,490,518` | 아이콘 전용 닫기/삭제 버튼에 `aria-label` 없음 (SVG만 존재) | better-accessibility: 아이콘 전용 버튼은 접근 가능한 이름 필수 | 각 버튼에 `aria-label="닫기"` / `aria-label="삭제"` 등 추가 | **완료** |
| 6 | `MobileTrioModal.tsx:582,1020` | `truncate` 클래스로 말줄임 처리된 텍스트에 `title` 속성 등 전체 내용 확인 수단 없음 | better-typography: 말줄임은 콘텐츠를 가리므로 대체 접근 수단 필요 | 해당 요소에 `title={fullText}` 추가 또는 탭 시 전체 보기 제공 | **완료** (`title` 속성 추가, `MissingFinalWorksPopup.tsx`의 동일 패턴도 함께 수정) |
| 7 | `DashboardCalendarArea.tsx:191,244,649` 외 다수 (대시보드 전역) | `text-slate-400` 텍스트가 실제 렌더링 배경 대비 2.40~2.63:1 (라이트 모드, 실측). "MON/TUE/WED..." 요일 라벨, 연도 라벨, "완 -" 캘린더 배지, 홈 피드 빈 상태 문구 등 | better-colors: AA 기준(소형 텍스트 4.5:1) 미달 — 브라우저에서 canvas 픽셀 판독으로 실측 완료 | `text-slate-400` → `text-slate-500`/`600`대로 한 단계 어둡게 조정 (hue 유지), 재측정 후 4.5:1 이상 확보 | **완료** (`DashboardCalendarArea.tsx` 8개 지점, `OtherProposalsCarousel.tsx` 4개 지점, `NotificationsPopup.tsx`/`MissingFinalWorksPopup.tsx`/`MobileTrioModal.tsx`/`MobileSubmitModal.tsx`의 유사 패턴을 `slate-600`대로 조정. 계산상 4.5:1 이상 확보, 브라우저 재실측은 아래 검증 항목 참고) |
| 8 | `globals.css:331-335` (`input:focus, textarea:focus, select:focus`) | 포커스 박스섀도 색상이 `--color-primary-light: #EAF2FF`라 흰 배경 대비 실측 대비 **1.07:1** — 사실상 안 보임. `ProposalSubmitForm.tsx`/`FinalSubmitForm.tsx`의 모든 입력 필드에 영향 | better-accessibility: `outline:none` 사용 시 대체 focus 표시가 WCAG 2.4.11(비텍스트 대비 3:1) 충족해야 함 | `--color-primary-light`를 focus ring 전용으로 더 진한 값으로 교체하거나 box-shadow 두께/알파 상향 | **완료** |
| 9 | `proposals` → "새 기획안" 모달 (기획안 작성 폼) | 모달 오픈 후 Tab을 누르면 포커스가 모달 내부가 아니라 **배경의 "내 기획안만 보기" 링크로 이동**. Escape 입력도 모달을 닫지 않음 (브라우저에서 직접 재현·확인) | better-accessibility: 모달은 열릴 때 포커스를 내부로 이동시키고 배경을 `inert` 처리해야 하며 Escape로 닫혀야 함 | 공통 모달 훅에서 open 시 첫 포커스 가능 요소로 focus 이동 + 배경 `inert` + Escape 핸들러 바인딩 | **완료** (원인이었던 `ModalContext.tsx`의 `ModalOverlay` 공용 셸에 `useModalA11y` 적용. 브라우저 재현 테스트로 Tab이 더 이상 배경으로 새지 않고 Escape로 정상 종료됨을 확인) |

### 확인했으나 문제 없음 (양호)
- `<img>` 태그 전체에 `alt` 속성 존재 (`layout.tsx`, `ContentDetailModal.tsx` 등)
- 기본 `input:focus` (`globals.css:331-335`)와 모바일 컴포넌트 다수는 `box-shadow`/`focus:ring-2` 대체 focus 스타일 보유
- `tabular-nums`가 `guidelines/page.tsx`, `DashboardCalendarArea.tsx`, `MobileCalendar.tsx`의 숫자 표시에 적용됨
- `font-weight` 300 미만 + `text-lg` 미만 조합, `scale(0)` 류 명백한 헤딩 계층 역전 미발견

### 미검증 항목 (범위 제한으로 재확인 필요)
- 헤딩(h1~h6) 레벨의 전체 계층 스킵 여부 — 표본 조사만 수행, 전수 검증 안 됨
- `ContentsLayout.tsx` 등 나머지 통계/카운터 UI의 `tabular-nums` 적용 여부
- 상태(승인/반려/대기) 배지가 색상 외 아이콘/텍스트로 이중 단서를 제공하는지 — 명시적 패턴 미발견이나 전수 확인 안 됨
- accent 색상(hue)이 클릭 가능/불가능 요소에 혼용되는지 — 표본 범위 내 미발견

### 브라우저 실측 결과 (agent-browser, localhost:3000, admin 계정)
1차 리포트 작성 시점에는 코드만으로 추정했던 항목들을 실제 렌더링된 페이지에서 측정.

- **저대비 텍스트 확정**: 라이트 모드에서 `text-slate-400` 사용 요소(요일 라벨 MON/TUE/…, 연도 라벨, 캘린더 "완 -" 배지, 홈 피드 빈 상태 문구, "블로그" 라벨 등)를 canvas 픽셀 판독으로 실제 배경과 대비 계산 → **2.40~2.63:1**, WCAG AA 소형 텍스트 기준(4.5:1) 크게 미달. 위 우선순위표 7번에 반영.
- **포커스 링 대비 확정 및 수정 완료**: `input:focus`의 box-shadow가 `--color-primary-light(#EAF2FF)`를 사용해 흰 배경 대비 실측 **1.07:1** (거의 안 보임) → `globals.css:334`에서 `rgba(0, 36, 84, 0.45)`로 교체, `npm run build` 통과 확인. 우선순위표 8번.
- **모달 포커스 트랩 실측 재현**: "새 기획안" 모달을 열고 Tab을 누르면 포커스가 모달 밖 배경의 "내 기획안만 보기" 링크로 이동함을 확인. Escape 입력도 모달을 닫지 않음. 1차 리포트가 "가드 없음"으로 추정했던 것보다 실제로는 더 심각(포커스가 모달 밖으로 새어나감). 우선순위표 9번.
- **부가 발견 (범위 밖, 참고용)**: `globals.css:1804-1809`의 모바일 전용 규칙이 `text-slate-500/400/300/200`을 `--m-text-muted`로 일괄 치환하는데, 이는 데스크톱에서 확인된 것과 동일한 저대비 패턴이 모바일에도 이식되어 있을 가능성을 시사함. `--m-text-muted` 실제 값과 모바일 배경 대비는 이번 실측 범위 밖이라 미확인 — 별도 점검 권장.

---

## 리퀴드 글래스(Liquid Glass) 가이드라인 학습 및 적용 검토 (2026-08-21)

### 리서치 요약
Apple의 2025년 iOS 26 Liquid Glass 머티리얼 가이드라인(HIG 업데이트, WebSearch 기준)의 핵심 수치:

| 항목 | 권장 기준 |
|---|---|
| 텍스트 대비 | 블러 적용 후에도 4.5:1 이상 (WCAG AA) |
| 프로스트 농도 | 10~25 권장, 30 초과 시 "milky plastic" 외관으로 가독성 급락 |
| 깊이(depth) | 일반 UI 컨트롤 ≤20 |
| 레이어 경제성 | 화면당 기본 글래스 시트 1개, 투명 패널 중첩 금지 |
| 버튼 배치 | 글래스 내부에는 솔리드 fill 버튼 배치 (아웃라인만 사용 회피) |
| 시스템 설정 존중 | Reduce Transparency 시 솔리드 색상 폴백, Reduce Motion 시 패럭스 비활성화 |

Sources: [Apple Updated Its HIG for Liquid Glass](https://pxlnv.com/linklog/hig-liquid-glass/), [Liquid Glass: Hierarchy, Harmony and Consistency](https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/), [Practical Guidance for Designers](https://designedforhumans.tech/blog/liquid-glass-smart-or-bad-for-accessibility)

### 현재 프로젝트 글래스 시스템과의 격차
`globals.css:1358-1460`의 `.glass-cta*`/`.glass-badge-*` 계열을 코드 주석(과거 실제 피드백 이력 포함)과 함께 검토한 결과:

- **이미 준수 중**: 모든 글래스 변형에 `blur(10px)` 통일 사용(깊이 과다 아님), `@supports not (backdrop-filter)` 폴백으로 저사양/미지원 환경 대응 존재.
- **격차 1 — 알파 스펙트럼 과다 분산**: `.glass-cta`(0.16) ~ `.glass-cta-kraft`(0.55) ~ `.glass-cta-sky`(0.85) ~ `.glass-cta-primary`(0.38)로 알파값이 컴포넌트마다 제각각 (1차 리포트 12번과 동일 이슈, Apple의 "프로스트 10~25 통일" 원칙과도 어긋남).
- **격차 2 — 대비 미검증**: 각 글래스 변형 위에 얹히는 텍스트 색이 Apple의 "블러 후 4.5:1" 기준을 충족하는지 실측된 바 없음 (`.glass-cta-sky`의 짙은 블루 텍스트온 밝은 배경, `.glass-cta-kraft`의 흰 텍스트 온 amber 등은 별도 실측 필요).
- **격차 3 — 글래스 중첩 가능성**: `.glass-cta`+`.glass-cta-strong`처럼 두 클래스를 같은 요소에 동시 적용하는 패턴이 존재 — Apple 원칙상 이건 "레이어 중첩"이 아니라 "단일 시트의 배경 오버라이드"라 원칙 위반은 아니나, 문서화가 없으면 오인 소지 있음.

### 적용 관련 판단
`.glass-cta*` 계열은 각 변형마다 실제 사용자 피드백을 거쳐 알파값이 정밀 조정된 이력이 CSS 주석에 그대로 남아있음(예: `.glass-cta-primary`는 "55%→38%로 낮춤" 등). 이 상태에서 Apple 기준에 맞춰 전체 알파값을 일괄 재조정하면 이미 검증된 튜닝을 덮어쓸 위험이 있어, 이번 세션에서는 **코드를 직접 수정하지 않고 격차만 정리**했습니다.

### 적용 완료 (2026-08-21, 사용자 선택: 전체 알파 스펙트럼 통일)

`globals.css:1362-1448`의 `.glass-cta*` 4개 라이브 클래스(`.glass-cta`, `.glass-cta-strong`, `.glass-cta-sky`, `.glass-cta-primary`, `.glass-cta-primary-strong`)를 Node로 sRGB 알파 블렌딩 시뮬레이션해 각 알파값에서의 실제 텍스트 대비를 사전 계산한 뒤 조정. 단순 일괄 통일이 아니라, 계산 과정에서 **기존 코드에 이미 있던 접근성 결함**을 발견해 방향을 다르게 잡은 항목이 있음:

| 클래스 | 기존 알파 | 신규 알파 | 대비(실측/계산) | 비고 |
|---|---|---|---|---|
| `.glass-cta` | 0.16 | 0.20 | 14.2:1 (여유 충분, 유지) | 최소 틴트 원칙 유지하며 레이어 분리감만 소폭 강화 |
| `.glass-cta-strong` | 0.40 | 0.30 | 14.4:1 | 하향 |
| `.glass-cta-sky` | 0.85 | 0.30 | 10.6:1 | 대폭 하향 — 기존이 필요 이상으로 불투명했음 |
| `.glass-cta-kraft` (미사용) | 0.55 | 0.28 | — | 하향 + 향후 재사용 시 흰 텍스트 금지 주석 추가 (구조적으로 대비 실패) |
| `.glass-cta-primary` | 0.38 | **0.65** | 2.44:1 → **5.0:1** | **상향** — 기존 값이 이미 AA 미달 상태였음(흰 텍스트 on navy) |
| `.glass-cta-primary-strong` (미사용) | 0.55 | 0.75 | — | `.glass-cta-primary`와 동일 사유로 상향 |

브라우저에서 `getComputedStyle`로 실제 반영값 확인 완료, `npm run build` 통과 확인.

**적용하지 않은 것**: `globals.css:1817` 부근의 모바일 전용 텍스트 색 오버라이드(`text-slate-500/400/300/200` → `--m-text-muted`)는 이번 편집과 무관한 기존 코드이자 범위 밖이라 그대로 둠 — 위 "부가 발견" 항목에 별도 기록. 실제 값(`#64748B`/`#9CA3AF`)을 계산해본 결과 라이트 4.76:1 / 다크 6.35:1로 이미 AA를 충족해 문제 없음을 확인, impeccable 훅 false positive로 판단해 `ignore-value`로 억제 처리함.

---

## 개선안 일괄 적용 (2026-08-21, 사용자 승인)

1차·2차 리포트에 기록된 개선안 전체를 코드에 반영. 작업은 두 갈래로 나눠 진행:

- **직접 처리**: 모달 포커스 트랩/Escape 공용 훅, `div onClick`→키보드 접근 가능 패턴 전환, 저대비 텍스트 색상 조정, `aria-label`/`title` 추가, `ease-in`/`duration-1000`/`transition-all`(단일 파일) 등 판단이 필요한 항목
- **Antigravity 위임** (CLAUDE.md 8.2 기준 반복 패턴/3+ 파일): `transition-all` → 실제 변경 속성 명시(11개 파일 42건), `hover:` → `hover-fine:`(터치 고착 호버 방지, 8개 파일 28건). 각각 격리된 `antigravity/*` 브랜치에서 실행 → 스코프(글롭 패턴) 검증 → diff 리뷰 → `main` 병합 순서로 진행, 셀프 머지 없이 전 과정 확인 후 병합함

### 검증
- `npm run build` 매 단계마다 통과 확인 (최종 통과)
- 브라우저(agent-browser)로 "새 기획안" 모달 재현 테스트: Tab 45회 반복해도 포커스가 모달 밖으로 새지 않음, Escape로 정상 종료됨을 확인
- Antigravity 산출물은 `git diff --name-only`로 글롭 스코프 이탈 여부 확인 후 병합 (이탈 없음)

### 보류
- 1차 13, 14번(모바일 전용 타이포 토큰 신규 정의, CTA/nav duration 공용 변수화)은 기존 코드 전반에 영향을 주는 토큰 체계 신규 설계가 필요해 이번 세션 범위에서 보류
- 1차 15번(딤 배경 keyframe/transition 메커니즘 통일)은 현재 코드에서 이미 `animate-in fade-in` 계열로 일관되게 쓰이고 있어 원 리포트 시점과 상태가 달라진 것으로 보여 재검토 필요
