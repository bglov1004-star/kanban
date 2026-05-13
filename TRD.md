# TRD — Technical Requirements Document
## Kanban Board

---

## 1. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 마크업 | HTML5 | 시맨틱 태그 사용 |
| 스타일 | CSS3 | Custom Properties, Flexbox |
| 로직 | Vanilla JavaScript (ES2020) | 빌드 도구 없음 |
| 스토리지 (v1) | Web Storage API (localStorage) | 사용자 ID 단위로 키 분리 |
| 스토리지 (v2 예정) | Supabase (PostgreSQL + RLS) | Storage 객체만 교체 |
| 인증 (v2 예정) | Supabase Auth | JWT, OAuth |
| 외부 라이브러리 (v1) | 없음 | CDN 허용이지만 필요 없음 |
| 외부 라이브러리 (v2) | Supabase JS CDN | `supabase-js` |

---

## 2. 파일 구조

```
day03/kanban/
├── index.html      # HTML 마크업 전용
├── style.css       # 스타일 전용
├── app.js          # 애플리케이션 로직 전용
└── PLAN.md         # 구현 계획
```

---

## 3. HTML 구조 (index.html)

```html
<html data-theme>
  <head>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <nav class="navbar">
      <span class="nav-logo">Kanban</span>
      <div class="nav-right">
        <!-- 사용자 식별 영역 (v1: Guest 고정, v2: 실제 사용자 정보) -->
        <div class="user-chip">
          <svg class="icon-user">...</svg>
          <span id="userLabel">Guest</span>
        </div>
        <button id="themeToggle">
          <svg class="icon-sun">...</svg>
          <svg class="icon-moon">...</svg>
        </button>
      </div>
    </nav>
    <main class="board">
      <div class="column" data-col="todo">
        <div class="col-header">
          <h2>To Do</h2>
          <span class="col-count">0</span>
        </div>
        <div class="card-list" id="list-todo"></div>
        <button class="add-btn" data-col="todo">+ Add card</button>
      </div>
      <!-- data-col="in-progress", data-col="done" 동일 패턴 -->
    </main>
    <script src="app.js" defer></script>
  </body>
</html>
```

### 카드 엘리먼트 (JS로 동적 생성)
```html
<div class="card" draggable="true" data-id="{uid}">
  <span class="card-text">{text}</span>
  <button class="card-del" aria-label="Delete">✕</button>
</div>
```

### 인라인 Add 폼 (JS로 동적 생성)
```html
<div class="add-form">
  <textarea class="add-input" rows="2" placeholder="카드 내용 입력..."></textarea>
  <div class="add-actions">
    <button class="btn-confirm">추가</button>
    <button class="btn-cancel">취소</button>
  </div>
</div>
```

---

## 4. CSS 아키텍처 (style.css)

### 4.1 커스텀 프로퍼티

```css
:root {
  /* 브랜드 */
  --primary:    #3F51B5;
  --primary-dk: #303F9F;
  /* 배경/표면 */
  --bg:         #FAFAFA;
  --surface:    #FFFFFF;
  /* 텍스트 */
  --text:       #212121;
  --secondary:  #757575;
  /* 구조 */
  --divider:    #E0E0E0;
  --shadow:     rgba(0,0,0,0.12);
  /* 컬럼 헤더 강조색 */
  --col-todo:      #E8EAF6;
  --col-progress:  #FFF8E1;
  --col-done:      #E8F5E9;
}

[data-theme="dark"] {
  --bg:         #121212;
  --surface:    #1E1E1E;
  --text:       #E0E0E0;
  --secondary:  #9E9E9E;
  --divider:    #333333;
  --shadow:     rgba(0,0,0,0.4);
  --col-todo:      #1A237E33;
  --col-progress:  #F9A82533;
  --col-done:      #1B5E2033;
}
```

### 4.2 주요 컴포넌트 스펙

| 선택자 | 핵심 속성 |
|--------|-----------|
| `.board` | `display:flex; gap:1.5rem; flex-wrap:wrap; padding:1.5rem` |
| `.column` | `flex:1 1 280px; border-radius:8px; background:var(--surface); box-shadow:0 2px 4px var(--shadow)` |
| `.col-header` | `background:var(--col-{name}); border-radius:8px 8px 0 0; padding:1rem` |
| `.col-count` | `border-radius:50%; background:var(--primary); color:#fff; min-width:24px` |
| `.card` | `border-radius:6px; padding:12px; margin:6px; box-shadow:0 1px 3px var(--shadow); cursor:grab` |
| `.card.dragging` | `opacity:0.4; cursor:grabbing` |
| `.card-list.drag-over` | `background:var(--divider); border-radius:6px; min-height:60px` |
| `.add-btn` | `width:100%; background:none; border:none; color:var(--secondary); cursor:pointer` |
| `.add-form` | `margin:6px; padding:6px` |
| `.add-input` | `width:100%; border:1px solid var(--divider); border-radius:4px; resize:vertical` |
| `.nav-right` | `display:flex; align-items:center; gap:8px` |
| `.user-chip` | `display:flex; align-items:center; gap:6px; color:var(--secondary); font-size:0.875rem` |

---

## 5. JavaScript 아키텍처 (app.js)

### 5.1 데이터 모델

```js
// Card 객체 — user_id 포함 (v2 Supabase 연동 대비)
{
  id:      string,  // uid() 생성
  user_id: string,  // 현재 사용자 ID (v1: 'guest', v2: Supabase UUID)
  text:    string,  // 카드 본문
  col:     'todo' | 'in-progress' | 'done'
}

// 전역 상태
let currentUser = { id: 'guest', label: 'Guest' }; // v2: Supabase auth.user
let cards       = [];   // Card[]
let dragId      = null; // 드래그 중인 카드 id
```

### 5.2 스토리지 추상화 레이어

스토리지 구현을 교체 가능하도록 `Storage` 객체로 캡슐화한다.
v2에서는 이 객체의 메서드만 Supabase 호출로 교체하면 된다.

```js
// v1 구현 — localStorage
const Storage = {
  getCards(userId) {
    try {
      return JSON.parse(localStorage.getItem(`kanban-cards-${userId}`) || '[]');
    } catch { return []; }
  },
  saveCards(userId, cards) {
    localStorage.setItem(`kanban-cards-${userId}`, JSON.stringify(cards));
  },
};

// v2 교체 예시 — Supabase (참고용, 현재 미구현)
// const Storage = {
//   async getCards(userId) {
//     const { data } = await supabase.from('cards').select('*').eq('user_id', userId);
//     return data ?? [];
//   },
//   async saveCards(userId, cards) { /* upsert */ },
// };
```

### 5.3 사용자 초기화

```js
// v1: 항상 게스트 사용자로 고정
function initUser() {
  currentUser = { id: 'guest', label: 'Guest' };
  document.getElementById('userLabel').textContent = currentUser.label;
}

// v2 교체 예시 — Supabase (참고용, 현재 미구현)
// async function initUser() {
//   const { data: { user } } = await supabase.auth.getUser();
//   currentUser = user
//     ? { id: user.id, label: user.email }
//     : { id: 'guest', label: 'Guest' };
// }
```

### 5.4 함수 목록

| 함수 | 역할 |
|------|------|
| `uid()` | 고유 ID 생성 (`${Date.now()}-${Math.random().toString(36).slice(2)}`) |
| `initUser()` | currentUser 설정 + navbar 레이블 갱신 |
| `loadCards()` | `Storage.getCards(currentUser.id)` → cards 초기화, 비어 있으면 샘플 삽입 |
| `saveCards()` | `Storage.saveCards(currentUser.id, cards)` |
| `renderAll()` | 세 컬럼 모두 재렌더링 + 카운트 배지 갱신 |
| `renderColumn(col)` | 특정 컬럼의 card-list 갱신 |
| `createCardEl(card)` | 카드 DOM 생성 및 이벤트 바인딩 반환 |
| `openAddForm(colEl)` | "+ Add card" 버튼 대신 인라인 폼 렌더 |
| `closeAddForm(colEl)` | 인라인 폼 제거 후 버튼 복원 |
| `addCard(col, text)` | cards 배열에 새 카드 추가 → saveCards → renderAll |
| `deleteCard(id)` | cards에서 해당 id 제거 → saveCards → renderAll |
| `moveCard(id, col)` | 카드 col 변경 → saveCards → renderAll |
| `initDragDrop()` | 보드 전체에 drag 이벤트 위임 등록 |
| `initTheme()` | localStorage + OS 다크모드 감지로 초기 테마 적용 |
| `toggleTheme()` | 테마 전환 + localStorage 저장 |

### 5.5 드래그 앤 드롭 흐름

```
card [dragstart]
  → dragId = card.dataset.id
  → card.classList.add('dragging')

card-list [dragover]
  → e.preventDefault()
  → list.classList.add('drag-over')

card-list [dragleave]
  → list.classList.remove('drag-over')

card-list [drop]
  → list.classList.remove('drag-over')
  → moveCard(dragId, list의 data-col)

card [dragend]
  → card.classList.remove('dragging')
```

### 5.6 이벤트 위임 전략

| 이벤트 | 등록 대상 | 조건부 처리 |
|--------|-----------|-------------|
| `dragstart` / `dragend` | `.board` | `e.target.closest('.card')` |
| `dragover` / `dragleave` / `drop` | `.board` | `e.target.closest('.card-list')` |
| `click` (삭제) | `.board` | `e.target.closest('.card-del')` |
| `click` (add) | `.board` | `e.target.closest('.add-btn')` |
| `click` (confirm/cancel) | `.board` | `e.target.closest('.btn-confirm')` / `'.btn-cancel'` |
| `keydown` | `.add-input` | `Ctrl+Enter` → 추가, `Esc` → 취소 |

---

## 6. 스토리지 스키마

### v1 — localStorage

| 키 패턴 | 값 타입 | 설명 |
|---------|---------|------|
| `kanban-cards-{userId}` | `JSON string` (Card[]) | 사용자별 카드 목록 |
| `kanban-theme` | `'light'` \| `'dark'` | 테마 (브라우저 전역, 사용자 무관) |

> v1에서 userId는 항상 `'guest'`이므로 실제 키는 `kanban-cards-guest`.

### v2 예정 — Supabase

DATABASE_DESIGN.md의 Supabase 테이블 스키마 참조.

---

## 7. 제약 조건

- `npm`, `webpack`, `vite` 등 빌드 도구 사용 금지
- `file://` 프로토콜에서 동작해야 하므로 ES module `import/export` 미사용
- IIFE 또는 단순 스크립트 방식으로 전역 네임스페이스 최소화
- 스토리지 레이어 교체 시 `Storage` 객체 내부만 수정하고 호출부(비즈니스 로직) 변경 금지
