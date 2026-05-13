# Coding Conventions
## Kanban Board

---

## 1. 파일 구성

| 파일 | 역할 | 금지 사항 |
|------|------|----------|
| `index.html` | 마크업 전용 | `<style>`, `<script>` 인라인 코드 금지 |
| `style.css` | 스타일 전용 | JS 로직, 인라인 HTML 금지 |
| `app.js` | 로직 전용 | `document.write`, `innerHTML`에 사용자 입력 직접 삽입 금지 |

---

## 2. HTML 컨벤션

### 2.1 속성 순서
```html
<!-- 순서: 의미 → 식별 → 상태 → 이벤트 -->
<div class="card" id="card-1" data-id="uid" draggable="true" aria-label="...">
```

| 순서 | 속성 종류 |
|------|----------|
| 1 | `class` |
| 2 | `id` |
| 3 | `data-*` |
| 4 | `type`, `href`, `src`, `draggable` |
| 5 | `aria-*`, `role` |

### 2.2 네이밍
- **class**: kebab-case (`card-list`, `col-header`, `add-btn`, `user-chip`, `nav-right`)
- **id**: camelCase (`themeToggle`, `userLabel`) — 컬럼 list id 예외: `list-{col}` 패턴
- **data 속성**: kebab-case (`data-col`, `data-id`)

### 2.3 시맨틱 태그

| 요소 | 태그 |
|------|------|
| 상단 내비 | `<nav>` |
| 보드 전체 | `<main>` |
| 컬럼 제목 | `<h2>` |
| 카드 텍스트 | `<span>` |
| 버튼류 | `<button>` (링크 아닌 액션은 항상 button) |

---

## 3. CSS 컨벤션

### 3.1 선택자 우선순위 제한
- **클래스 선택자** 위주 사용
- `!important` 사용 금지
- ID 선택자 스타일 금지 (JS용 훅으로만 사용)

### 3.2 커스텀 프로퍼티
- 모든 색상·그림자는 반드시 커스텀 프로퍼티 경유
- 하드코딩 색상값 금지 (`color: #3F51B5` → `color: var(--primary)`)
- 예외: 커스텀 프로퍼티 값 선언 자체 (`--primary: #3F51B5`)

### 3.3 선언 순서 (컴포넌트 내)
```css
.example {
  /* 1. 레이아웃 */
  display: flex;
  position: relative;
  /* 2. 박스 모델 */
  width: 100%;
  padding: 12px;
  margin: 6px;
  border: none;
  border-radius: 6px;
  /* 3. 시각 */
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 3px var(--shadow);
  /* 4. 타이포그래피 */
  font-size: 0.9rem;
  /* 5. 기타 */
  cursor: grab;
  transition: box-shadow 0.2s;
}
```

### 3.4 미디어 쿼리
- 컴포넌트 정의 뒤에 해당 컴포넌트의 반응형 규칙 배치 (분리 파일 없음)

---

## 4. JavaScript 컨벤션

### 4.1 변수 선언
- `const` 우선, 재할당 필요 시 `let`
- `var` 사용 금지

### 4.2 네이밍

| 종류 | 케이스 | 예시 |
|------|--------|------|
| 변수·함수 | camelCase | `dragId`, `renderAll`, `saveCards`, `currentUser` |
| 상수 (객체 포함) | UPPER_SNAKE 또는 PascalCase | `COLUMNS`, `Storage` |
| CSS 클래스 문자열 | 원본 그대로 | `'card-list'`, `'drag-over'`, `'user-chip'` |

### 4.3 함수
- 한 함수는 한 가지 책임
- 함수 길이 20줄 초과 시 분리 고려
- 화살표 함수: 콜백에 사용, 최상위 선언 함수는 `function` 키워드 사용

```js
// 최상위 함수 선언
function renderAll() { ... }

// 콜백
cards.forEach(card => { ... });
```

### 4.4 스토리지 레이어 규칙

스토리지 접근은 반드시 `Storage` 객체를 통해서만 수행한다.
비즈니스 로직에서 `localStorage`를 직접 호출하면 v2 마이그레이션 시 전체 코드를 수정해야 한다.

```js
// 올바름 — Storage 객체 경유
function saveCards() {
  Storage.saveCards(currentUser.id, cards);
}

// 금지 — localStorage 직접 호출
function saveCards() {
  localStorage.setItem('kanban-cards', JSON.stringify(cards)); // ❌
}
```

### 4.5 사용자 데이터 격리 규칙

카드를 생성·조회·필터링할 때 반드시 `currentUser.id`를 기준으로 처리한다.

```js
// 카드 생성: user_id 반드시 포함
function addCard(col, text) {
  const card = { id: uid(), user_id: currentUser.id, text, col }; // ✅
  cards.push(card);
  saveCards();
  renderAll();
}

// 카드 렌더링: 현재 사용자 소유 카드만 표시
function renderColumn(col) {
  const mine = cards.filter(c => c.col === col && c.user_id === currentUser.id); // ✅
  ...
}
```

### 4.6 DOM 조작
- `document.createElement` + `classList`, `textContent`, `dataset` 사용
- XSS 방지: 사용자 입력은 반드시 `textContent`로 삽입 (innerHTML에 직접 주입 금지)

```js
// 안전
const span = document.createElement('span');
span.textContent = userInput;  // ✅

// 위험 — 금지
el.innerHTML = userInput;  // ❌
```

### 4.7 이벤트
- 이벤트 위임 원칙: 동적 생성 요소의 이벤트는 공통 부모에 위임
- `addEventListener` 사용, `onclick` 인라인 속성 금지

### 4.8 에러 처리
- Storage 접근 실패 대비 try-catch는 `Storage` 객체 내부에서만 처리

```js
const Storage = {
  getCards(userId) {
    try {
      return JSON.parse(localStorage.getItem(`kanban-cards-${userId}`) || '[]');
    } catch {
      return [];
    }
  },
};
```

### 4.9 모듈 방식
- `file://` 프로토콜 호환을 위해 ES module (`type="module"`) 미사용
- 전역 오염 최소화: IIFE로 전체 코드를 감싸기

```js
(function () {
  // 전체 앱 코드
})();
```

---

## 5. 주석

- 주석은 **WHY(이유)**에만 작성. WHAT(무엇)은 코드로 표현
- 함수·클래스 docstring 금지

```js
// 좋음: 이유가 비자명함
// file:// 프로토콜에서 ES module이 동작하지 않으므로 IIFE 패턴 사용
(function () { ... })();

// 좋음: v2 교체 지점 명시
// v2: 이 객체의 메서드를 Supabase 호출로 교체한다
const Storage = { ... };

// 나쁨: 코드를 읽으면 알 수 있음
// 카드를 저장하는 함수
function saveCards() { ... }
```

---

## 6. 금지 사항 요약

| 금지 | 대신 |
|------|------|
| `var` | `const` / `let` |
| `onclick="..."` 인라인 핸들러 | `addEventListener` |
| `innerHTML = userInput` | `textContent = userInput` |
| 하드코딩 색상 | CSS 커스텀 프로퍼티 |
| `!important` | 선택자 구체성 조정 |
| ES module import/export | IIFE |
| npm 패키지 | CDN 또는 바닐라 구현 |
| `localStorage` 직접 호출 (비즈니스 로직) | `Storage` 객체 경유 |
| `user_id` 없는 카드 생성 | `{ ..., user_id: currentUser.id }` 포함 |
