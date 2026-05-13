# Design System
## Kanban Board

Material Design 미니멀 스타일 기반. CSS 커스텀 프로퍼티로 라이트/다크 테마를 관리한다.

---

## 1. 색상 (Color)

### 1.1 브랜드 색상

| 토큰 | Light | Dark | 용도 |
|------|-------|------|------|
| `--primary` | `#3F51B5` (Indigo 500) | `#3F51B5` | 주요 액션, 배지 |
| `--primary-dk` | `#303F9F` (Indigo 700) | `#303F9F` | hover 상태 |

### 1.2 배경/표면

| 토큰 | Light | Dark | 용도 |
|------|-------|------|------|
| `--bg` | `#FAFAFA` | `#121212` | 페이지 배경 |
| `--surface` | `#FFFFFF` | `#1E1E1E` | 카드, 컬럼, navbar 배경 |

### 1.3 텍스트

| 토큰 | Light | Dark | 용도 |
|------|-------|------|------|
| `--text` | `#212121` | `#E0E0E0` | 본문 텍스트 |
| `--secondary` | `#757575` | `#9E9E9E` | 보조 텍스트, placeholder, user-chip |

### 1.4 구조

| 토큰 | Light | Dark | 용도 |
|------|-------|------|------|
| `--divider` | `#E0E0E0` | `#333333` | 구분선, drag-over 배경 |
| `--shadow` | `rgba(0,0,0,0.12)` | `rgba(0,0,0,0.4)` | 그림자 |

### 1.5 컬럼 헤더 강조색

| 토큰 | Light | Dark | 컬럼 |
|------|-------|------|------|
| `--col-todo` | `#E8EAF6` | `#1A237E33` | To Do |
| `--col-progress` | `#FFF8E1` | `#F9A82533` | In Progress |
| `--col-done` | `#E8F5E9` | `#1B5E2033` | Done |

---

## 2. 타이포그래피 (Typography)

| 요소 | 속성 | 값 |
|------|------|-----|
| 기본 폰트 | `font-family` | `'Segoe UI', system-ui, sans-serif` |
| 컬럼 제목 | `font-size` / `font-weight` | `1rem` / `600` |
| 카드 텍스트 | `font-size` | `0.9rem` |
| 카운트 배지 | `font-size` / `font-weight` | `0.75rem` / `700` |
| 버튼 텍스트 | `font-size` | `0.875rem` |
| user-chip 레이블 | `font-size` | `0.875rem` |

---

## 3. 간격 (Spacing)

| 값 | 용도 |
|----|------|
| `4px` | 카드 내부 소형 간격, user-chip gap |
| `8px` | 버튼 패딩, 아이콘 간격, nav-right gap |
| `12px` | 카드 패딩 |
| `16px` | 컬럼 헤더 패딩, 컬럼 패딩 |
| `24px` | 보드 gap, 보드 패딩 |

---

## 4. 모양 (Shape)

| 요소 | `border-radius` |
|------|----------------|
| 컬럼 | `8px` |
| 컬럼 헤더 (상단만) | `8px 8px 0 0` |
| 카드 | `6px` |
| 인라인 폼 입력 | `4px` |
| 카운트 배지 | `50%` (원형) |
| user-chip | `16px` (pill) |

---

## 5. 그림자 (Elevation)

| 단계 | 값 | 사용 요소 |
|------|----|----------|
| 1 (낮음) | `0 1px 3px var(--shadow)` | 카드 |
| 2 (중간) | `0 2px 4px var(--shadow)` | 컬럼 |
| 3 (높음) | `0 4px 8px var(--shadow)` | navbar |

---

## 6. 컴포넌트 스펙

### 6.1 Navbar

```
┌──────────────────────────────────────────────────────┐
│  Kanban           [👤 Guest]                    ☀/🌙 │  ← height: 56px
└──────────────────────────────────────────────────────┘
```

- `position: sticky; top: 0; z-index: 100`
- `background: var(--surface); box-shadow: 0 4px 8px var(--shadow)`
- logo: `font-size: 1.25rem; font-weight: 700; color: var(--primary)`
- `.nav-right`: flex row, gap 8px, align-center
- 토글 버튼: `40×40px`, icon `20×20px`, `border: none; background: none; cursor: pointer`

#### User Chip (`.user-chip`)

```
┌──────────────┐
│ 👤  Guest    │  ← pill 모양, border: 1px solid var(--divider)
└──────────────┘
```

- `display: flex; align-items: center; gap: 6px`
- `padding: 4px 12px; border-radius: 16px`
- `border: 1px solid var(--divider)`
- `color: var(--secondary); font-size: 0.875rem`
- v1: 클릭 비활성 (장식용)
- v2: 클릭 시 드롭다운 (로그아웃 메뉴) 표시

#### v2 예정 — User Dropdown

```
┌──────────────────┐
│ 👤  user@mail    │  ← user-chip
└──────────────────┘
         ▼ 클릭
┌──────────────────┐
│  user@mail.com   │
│ ──────────────── │
│  로그아웃        │
└──────────────────┘
```

### 6.2 Column

```
┌──────────────────────┐
│ To Do           [3]  │  ← col-header (--col-todo 배경)
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ 카드 텍스트   ✕  │ │  ← card
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ 카드 텍스트   ✕  │ │
│ └──────────────────┘ │
│                      │
│   + Add card         │  ← add-btn
└──────────────────────┘
```

- min-height: `200px`
- card-list min-height: `60px` (빈 상태에서도 드롭 가능)

### 6.3 Card

```
┌─────────────────────────────┐
│ 카드 텍스트 내용           ✕ │
└─────────────────────────────┘
```

- ✕ 버튼: `color: var(--secondary)`, hover → `color: #F44336`
- `cursor: grab`, dragging 시 `cursor: grabbing; opacity: 0.4`

### 6.4 Inline Add Form

```
┌─────────────────────────────┐
│ 카드 내용 입력...           │  ← textarea, rows=2
│                             │
├────────────┬────────────────┤
│    추가    │      취소      │
└────────────┴────────────────┘
```

- 확인 버튼: `background: var(--primary); color: #fff`
- 취소 버튼: `background: none; color: var(--secondary)`

### 6.5 Count Badge

```
 [3]  ← 원형, 지름 24px(min), background: var(--primary), color: #fff
```

---

## 7. 상태 (States)

| 상태 | 시각 변화 |
|------|----------|
| Card hover | `box-shadow` 강해짐 |
| Card dragging | `opacity: 0.4`, `cursor: grabbing` |
| Column drag-over | `background: var(--divider)` |
| Add-btn hover | `background: var(--divider)` |
| Del-btn hover | `color: #F44336` |
| Theme toggle hover | `background: var(--divider)` |
| User-chip hover (v2) | `background: var(--divider)` |

---

## 8. 반응형 (Responsive)

| 뷰포트 | 레이아웃 |
|--------|---------|
| ≥ 900px | 컬럼 3개 가로 배치, navbar 1행 |
| < 900px | 컬럼 flex-wrap → 세로 스택 |
| < 480px | user-chip 레이블 숨김 (아이콘만 표시) |

```css
.board {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}
.column {
  flex: 1 1 280px;
}
@media (max-width: 480px) {
  .user-chip span { display: none; }
}
```

---

## 9. 아이콘

SVG 인라인 방식. 외부 라이브러리 불필요.

| 아이콘 | 용도 |
|--------|------|
| Sun (☀) | 라이트 테마 표시 (다크 모드일 때 노출) |
| Moon (🌙) | 다크 테마 표시 (라이트 모드일 때 노출) |
| User (👤) | user-chip 아이콘 |

```css
/* 라이트 모드: moon 표시 */
.icon-sun  { display: none; }
.icon-moon { display: block; }

/* 다크 모드: sun 표시 */
[data-theme="dark"] .icon-sun  { display: block; }
[data-theme="dark"] .icon-moon { display: none; }
```
