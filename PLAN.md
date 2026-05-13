# Plan: Kanban Board (HTML/CSS/JS 분리 파일)

## 상태: 구현 완료 (v1)

---

## Context

KOSA 바이브 코딩 day03 실습. To-Do / In Progress / Done 3열 칸반보드를 HTML·CSS·JS 별도 파일로 구현한다. Material Design 미니멀 스타일, CSS 커스텀 프로퍼티 테마 시스템을 따른다. 향후 Supabase 연동(v2)을 위해 Storage 추상화 레이어와 사용자 격리 구조를 포함한다.

---

## 출력 경로

```
src/exercise/bglov/day03/kanban/
├── index.html   — 마크업 전용
├── style.css    — 스타일 전용
├── app.js       — 로직 전용 (IIFE)
└── PLAN.md
```

---

## index.html

- `<link rel="stylesheet" href="style.css">` + `<script src="app.js" defer>`
- 상단 navbar: `.nav-logo` + `.nav-right` (`.user-chip` + `#themeToggle`)
  - `.user-chip`: SVG user 아이콘 + `<span id="userLabel">Guest</span>`
  - `#themeToggle`: SVG sun/moon 아이콘 (CSS로 토글)
- `<main class="board">`: 3개의 `.column` — `data-col="todo"`, `data-col="in-progress"`, `data-col="done"`
- 각 컬럼 구조:
  ```html
  <div class="column" data-col="todo">
    <div class="col-header">
      <h2>To Do</h2>
      <span class="col-count">0</span>
    </div>
    <div class="card-list" id="list-todo"></div>
    <button class="add-btn" data-col="todo">+ Add card</button>
  </div>
  ```
- 카드 템플릿 (JS로 동적 생성):
  ```html
  <div class="card" draggable="true" data-id="...">
    <span class="card-text">...</span>
    <button class="card-del" aria-label="삭제">✕</button>
  </div>
  ```

---

## style.css

### CSS 변수
```css
:root {
  --primary: #3F51B5; --primary-dk: #303F9F;
  --bg: #FAFAFA; --surface: #FFFFFF;
  --text: #212121; --secondary: #757575;
  --divider: #E0E0E0; --shadow: rgba(0,0,0,0.12);
  --col-todo: #E8EAF6; --col-progress: #FFF8E1; --col-done: #E8F5E9;
}
[data-theme="dark"] {
  --bg: #121212; --surface: #1E1E1E;
  --text: #E0E0E0; --secondary: #9E9E9E;
  --divider: #333333; --shadow: rgba(0,0,0,0.4);
  --col-todo: #1A237E33; --col-progress: #F9A82533; --col-done: #1B5E2033;
}
```

### 주요 컴포넌트
- `.navbar`: sticky top, `box-shadow: 0 4px 8px var(--shadow)`, height 56px
- `.user-chip`: pill 모양 (`border-radius: 16px`), `border: 1px solid var(--divider)`
- `#themeToggle`: `.icon-sun` / `.icon-moon` CSS 토글 (`[data-theme="dark"]` 선택자)
- `.board`: `display: flex; flex-wrap: wrap; gap: 1.5rem; padding: 1.5rem`
- `.column`: `flex: 1 1 280px`, `border-radius: 8px`, `box-shadow: 0 2px 4px var(--shadow)`
- `.col-header`: 컬럼별 배경 (`[data-col="todo/in-progress/done"] .col-header`)
- `.card`: `padding: 12px; border-radius: 6px; cursor: grab`
- `.card.dragging`: `opacity: 0.4; cursor: grabbing`
- `.card-list.drag-over`: `background: var(--divider)`
- `@media (max-width: 480px)`: `.user-chip span { display: none; }`

---

## app.js

### 전역 상태
```js
let currentUser = { id: 'guest', label: 'Guest' }; // v2: Supabase auth.user
let cards       = [];   // Card[]
let dragId      = null;
const COLUMNS   = ['todo', 'in-progress', 'done'];
```

### Storage 추상화 (v2 교체 지점)
```js
// v2: 이 객체의 메서드를 Supabase 호출로 교체한다
const Storage = {
  getCards(userId)        { /* localStorage.getItem(`kanban-cards-${userId}`) */ },
  saveCards(userId, cards){ /* localStorage.setItem(...) */ },
};
```

### 함수 목록
| 함수 | 역할 |
|------|------|
| `uid()` | `${Date.now()}-${Math.random().toString(36).slice(2)}` |
| `initUser()` | currentUser 고정 + userLabel 갱신 |
| `loadCards()` | Storage 로드, 비어있으면 샘플 3개 삽입 |
| `saveCards()` | Storage에 cards 저장 |
| `renderAll()` | COLUMNS.forEach → renderColumn |
| `renderColumn(col)` | card-list 재렌더링 + col-count 갱신 (user_id 필터 적용) |
| `createCardEl(card)` | `.card[draggable][data-id]` DOM 생성 |
| `openAddForm(colEl)` | add-btn 숨기고 .add-form 삽입, textarea focus |
| `closeAddForm(colEl)` | .add-form 제거, add-btn 복원 |
| `addCard(col, text)` | cards 추가 → saveCards → renderAll |
| `deleteCard(id)` | cards splice → saveCards → renderAll |
| `moveCard(id, col)` | card.col 변경 → saveCards → renderAll |
| `initDragDrop()` | `.board` 이벤트 위임으로 DnD 처리 |
| `initTheme()` | localStorage + OS prefers-color-scheme 기반 초기 테마 |
| `toggleTheme()` | dataset.theme 전환 + localStorage 저장 |

### 초기화 순서 (DOMContentLoaded)
1. `initTheme()`
2. `initUser()`
3. `loadCards()`
4. `renderAll()`
5. `initDragDrop()`
6. `#themeToggle` click → `toggleTheme()`

### 이벤트 위임 전략 (`.board`)
| 이벤트 | 타겟 | 처리 |
|--------|------|------|
| `dragstart` | `.card` | dragId 설정, `.dragging` 추가 |
| `dragend` | `.card` | `.dragging` 제거, dragId 초기화 |
| `dragover` | `.card-list` | `e.preventDefault()`, `.drag-over` 추가 |
| `dragleave` | `.card-list` | `.drag-over` 제거 |
| `drop` | `.card-list` | `.drag-over` 제거, `moveCard` 호출 |
| `click` | `.card-del` | `deleteCard` 호출 |
| `click` | `.add-btn` | `openAddForm` 호출 |
| `click` | `.btn-confirm` | `addCard` + `closeAddForm` |
| `click` | `.btn-cancel` | `closeAddForm` |
| `keydown` on `.add-input` | — | Ctrl+Enter → 추가, Esc → 취소 |

---

## 검증

1. `index.html`을 브라우저에서 직접 열기 (file:// 프로토콜)
2. navbar "Guest" 레이블 + user-chip 표시 확인
3. 샘플 카드 3개 (`user_id: 'guest'`) 자동 표시 확인
4. "+ Add card" → 텍스트 입력 → Ctrl+Enter 또는 추가 버튼 → 카드 생성
5. 카드 드래그 → 다른 컬럼 드롭 → 이동 및 카운트 변경 확인
6. ✕ 버튼 → 카드 즉시 삭제 확인
7. 새로고침 후 상태 유지 확인 (localStorage 키: `kanban-cards-guest`)
8. 테마 토글 (sun/moon 아이콘 전환, 테마 유지) 확인
9. 창 폭 < 900px → 컬럼 세로 배치, < 480px → user-chip 아이콘만 표시
