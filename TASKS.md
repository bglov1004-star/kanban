# Tasks — AI Agent 작업 목록
## Kanban Board

> AI 코딩 에이전트가 순서대로 실행할 작업 목록이다.
> 각 태스크는 독립적으로 검증 가능하며, 앞 태스크 완료 후 다음으로 진행한다.
> **[v2]** 표시 태스크는 현재 구현하지 않으며, 향후 Supabase 연동 시 추가한다.

---

## Phase 1. 프로젝트 초기화

### T-01. 디렉터리 확인 ✅
- `day03/kanban/` 경로 존재 확인
- `index.html`, `style.css`, `app.js` 파일이 없음을 확인

---

## Phase 2. HTML 마크업 (index.html)

### T-02. HTML 기본 골격 작성 ✅
- `<!DOCTYPE html>`, `<html lang="ko" data-theme>` 선언
- `<head>`: `charset`, `viewport`, `title`, `<link rel="stylesheet" href="style.css">`
- `<body>` 끝에 `<script src="app.js" defer>`

### T-03. Navbar 작성 ✅
- `<nav class="navbar">` 구성:
  - `.nav-logo`: 텍스트 "Kanban"
  - `.nav-right` 내에:
    - `.user-chip`: SVG user 아이콘 + `<span id="userLabel">Guest</span>`
    - `#themeToggle` 버튼: SVG sun + moon 아이콘

### T-04. 보드 및 컬럼 구조 작성 ✅
- `<main class="board">` 안에 `.column[data-col]` 3개 작성
  - `data-col="todo"` → 헤더 텍스트 "To Do", `id="list-todo"`
  - `data-col="in-progress"` → 헤더 텍스트 "In Progress", `id="list-in-progress"`
  - `data-col="done"` → 헤더 텍스트 "Done", `id="list-done"`
- 각 컬럼: `.col-header` (h2 + `.col-count`), `.card-list`, `.add-btn`

---

## Phase 3. CSS 스타일 (style.css)

### T-05. CSS 커스텀 프로퍼티 및 리셋 ✅
- `:root` 라이트 테마 변수 전체 선언
- `[data-theme="dark"]` 다크 테마 오버라이드 전체 선언
- `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`
- `body`: `background: var(--bg); color: var(--text); font-family: ...`

### T-06. Navbar 스타일 ✅
- `position: sticky; top: 0; z-index: 100; height: 56px`
- flex row, space-between, align-center
- `box-shadow: 0 4px 8px var(--shadow)`
- `.nav-logo` 폰트
- `.nav-right`: flex row, gap 8px, align-center
- `.user-chip`: pill 모양, `border: 1px solid var(--divider)`, `color: var(--secondary)`
- `#themeToggle` 버튼 스타일, sun/moon 토글 CSS
- 반응형: `@media (max-width: 480px)` → `.user-chip span { display: none; }`

### T-07. 보드 및 컬럼 스타일 ✅
- `.board`: flex, wrap, gap, padding
- `.column`: flex 1 1 280px, border-radius, shadow
- `.col-header`: 컬럼별 배경색 (`[data-col="todo"]`, `[data-col="in-progress"]`, `[data-col="done"]` 선택자)
- `.col-count`: 원형 배지

### T-08. 카드 스타일 ✅
- `.card`: padding, border-radius, shadow, cursor grab
- `.card:hover`: shadow 강화
- `.card.dragging`: opacity 0.4, cursor grabbing
- `.card-list.drag-over`: 배경 강조

### T-09. 폼 및 버튼 스타일 ✅
- `.add-btn`: full width, no border, secondary 색상, hover bg
- `.add-form`, `.add-input`: 테두리, border-radius, resize vertical
- `.btn-confirm` (primary), `.btn-cancel` (secondary)
- `.card-del`: 투명 bg, secondary color, hover red

---

## Phase 4. JavaScript 로직 (app.js)

### T-10. 유틸 함수 및 전역 상태 초기화 ✅
- `uid()` 구현
- 전역 상태 선언:
  ```js
  let currentUser = { id: 'guest', label: 'Guest' };
  let cards       = [];
  let dragId      = null;
  ```
- `COLUMNS` 상수: `['todo', 'in-progress', 'done']`

### T-11. Storage 추상화 객체 구현 ✅
- `Storage` 객체 작성:
  ```js
  const Storage = {
    getCards(userId) { ... },   // localStorage.getItem(`kanban-cards-${userId}`)
    saveCards(userId, cards) { ... }, // localStorage.setItem(...)
  };
  ```
- v2 교체 대상임을 주석으로 명시

### T-12. 사용자 초기화 ✅
- `initUser()` 구현:
  - `currentUser = { id: 'guest', label: 'Guest' }`
  - `document.getElementById('userLabel').textContent = currentUser.label`

### T-13. localStorage 저장/불러오기 ✅
- `saveCards()` → `Storage.saveCards(currentUser.id, cards)`
- `loadCards()` → `Storage.getCards(currentUser.id)` → cards 초기화, 비어 있으면 샘플 삽입
- 샘플 카드: `{ id: uid(), user_id: currentUser.id, text: 'README 작성', col: 'todo' }` 등 3개
- **카드 생성 시 반드시 `user_id: currentUser.id` 포함**

### T-14. 렌더링 함수 ✅
- `createCardEl(card)` — `.card[draggable][data-id]` DOM 생성, `.card-del` 포함
- `renderColumn(col)` — `#list-{col}` 갱신 + `.col-count` 텍스트 업데이트
  - cards 필터 시 `currentUser.id`로 소유자 검증: `cards.filter(c => c.col === col && c.user_id === currentUser.id)`
- `renderAll()` — 세 컬럼 모두 renderColumn 호출

### T-15. 카드 추가 로직 ✅
- `addCard(col, text)` — `{ id: uid(), user_id: currentUser.id, text, col }` 추가 → saveCards → renderAll
- `openAddForm(colEl)` — `.add-btn` 숨기고 `.add-form` 삽입
- `closeAddForm(colEl)` — `.add-form` 제거, `.add-btn` 복원
- textarea keydown: Ctrl+Enter → addCard, Esc → closeAddForm

### T-16. 카드 삭제 로직 ✅
- `deleteCard(id)` — cards.findIndex + splice + saveCards + renderAll

### T-17. 카드 이동 로직 ✅
- `moveCard(id, col)` — 해당 카드 col 변경 + saveCards + renderAll

### T-18. 드래그 앤 드롭 ✅
- `initDragDrop()` 구현 (`.board`에 이벤트 위임)
  - dragstart / dragend on `.card`
  - dragover / dragleave / drop on `.card-list`
  - drop 시 `moveCard(dragId, targetCol)` 호출

### T-19. 테마 토글 ✅
- `initTheme()` — localStorage 또는 OS 설정 기반 초기 테마 적용
- `toggleTheme()` — `document.documentElement.dataset.theme` 전환 + localStorage 저장
- `#themeToggle` click 이벤트 연결

### T-20. 초기화 진입점 ✅
- IIFE + `DOMContentLoaded` 기반으로 다음 순서로 호출:
  1. `initTheme()`
  2. `initUser()`
  3. `loadCards()`
  4. `renderAll()`
  5. `initDragDrop()`

**검증 체크리스트**:
- [ ] 브라우저에서 `index.html` 직접 열기
- [ ] navbar에 "Guest" 레이블 표시 확인
- [ ] 샘플 카드 3개 (모두 `user_id: 'guest'`) 표시 확인
- [ ] "+ Add card" → 텍스트 입력 → 추가 확인
- [ ] 카드 드래그 → 다른 컬럼 드롭 → 이동 및 카운트 변경 확인
- [ ] ✕ 버튼으로 카드 삭제 확인
- [ ] 새로고침 후 상태 유지 확인 (키: `kanban-cards-guest`)
- [ ] 테마 토글 확인
- [ ] 창 폭 축소 시 세로 배치 확인, 480px 이하에서 user-chip 텍스트 숨김 확인

---

## Phase 5. [v2] Supabase 연동 (향후 구현)

### T-21. [v2] Supabase 프로젝트 설정
- Supabase 프로젝트 생성
- `supabase-js` CDN 추가: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js">`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` 설정

### T-22. [v2] 테이블 및 RLS 생성
- `DATABASE_DESIGN.md` 의 SQL 실행

### T-23. [v2] Auth 연동
- `initUser()` → `supabase.auth.getUser()` 기반으로 교체
- 로그인 UI 추가 (이메일/Google)

### T-24. [v2] Storage 객체 교체
- `Storage.getCards` / `Storage.saveCards` → Supabase JS 호출로 교체
- 비즈니스 로직(addCard, deleteCard, moveCard 등) 변경 없음

### T-25. [v2] localStorage 데이터 마이그레이션
- 기존 `kanban-cards-guest` 데이터를 Supabase로 일괄 INSERT
