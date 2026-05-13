# User Flow — 사용자 흐름도
## Kanban Board

> v1: 게스트 사용자 단독 지원. v2 인증 흐름은 별도 섹션에 설계만 기술한다.

---

## 1. 전체 여정 개요 (v1 — 게스트)

```mermaid
flowchart TD
    A([브라우저에서 index.html 열기]) --> B[initUser\n→ currentUser = guest]
    B --> C[initTheme]
    C --> D{kanban-cards-guest\nin localStorage?}
    D -- 없음 --> E[샘플 카드 3개 삽입]
    D -- 있음 --> F[저장된 카드 복원]
    E --> G[보드 렌더링]
    F --> G

    G --> H{사용자 액션}

    H --> I[카드 추가]
    H --> J[카드 이동]
    H --> K[카드 삭제]
    H --> L[테마 전환]

    I --> I1[+ Add card 클릭]
    I1 --> I2[인라인 폼 열림]
    I2 --> I3{텍스트 입력}
    I3 -- 빈 문자열 --> I2
    I3 -- 내용 있음 --> I4[확인 / Ctrl+Enter]
    I3 -- 취소 / Esc --> I5[폼 닫힘]
    I4 --> I6[카드 생성\n+ kanban-cards-guest 저장]
    I6 --> G

    J --> J1[카드 드래그 시작\n카드 반투명 표시]
    J1 --> J2[대상 컬럼 위에서 dragover\n컬럼 배경 강조]
    J2 --> J3{드롭 위치}
    J3 -- 원래 컬럼 --> J4[이동 없음]
    J3 -- 다른 컬럼 --> J5[moveCard 호출\n+ kanban-cards-guest 저장]
    J4 --> G
    J5 --> G

    K --> K1[✕ 버튼 클릭]
    K1 --> K2[카드 즉시 삭제\n+ kanban-cards-guest 저장]
    K2 --> G

    L --> L1[navbar 토글 클릭]
    L1 --> L2[data-theme 전환\n+ kanban-theme 저장]
    L2 --> G
```

---

## 2. 초기 로드 상세 흐름 (v1)

```mermaid
flowchart LR
    A([페이지 로드]) --> B[initUser]
    B --> C[currentUser = guest\nuserLabel = 'Guest']
    C --> D[initTheme]
    D --> E{kanban-theme\nin localStorage?}
    E -- 있음 --> F[저장된 테마 적용]
    E -- 없음 --> G{OS 다크모드?}
    G -- Yes --> H[dark 적용]
    G -- No --> I[light 적용]
    F & H & I --> J[loadCards\ncurrentUser.id = 'guest']
    J --> K{kanban-cards-guest\nin localStorage?}
    K -- 있음 --> L[카드 파싱]
    K -- 없음 --> M[샘플 카드 삽입]
    L & M --> N[renderAll]
    N --> O[initDragDrop]
    O --> P([보드 사용 준비 완료])
```

---

## 3. 카드 추가 상세 흐름

```mermaid
sequenceDiagram
    actor User
    participant Board
    participant Form
    participant Storage

    User->>Board: "+ Add card" 클릭 (특정 컬럼)
    Board->>Form: 인라인 textarea + 버튼 렌더
    User->>Form: 텍스트 입력
    alt 텍스트 있음
        User->>Form: "추가" 클릭 또는 Ctrl+Enter
        Form->>Board: addCard(col, text) 호출
        Board->>Board: card에 user_id = currentUser.id 부여
        Board->>Storage: Storage.saveCards(userId, cards)
        Board->>Board: renderAll()
    else 빈 텍스트
        Form-->>User: 저장 막음 (버튼 비활성)
    else 취소
        User->>Form: "취소" 클릭 또는 Esc
        Form->>Board: 폼 제거, 버튼 복원
    end
```

---

## 4. 드래그 앤 드롭 상세 흐름

```mermaid
sequenceDiagram
    actor User
    participant Card
    participant SourceList as 원래 컬럼
    participant TargetList as 대상 컬럼
    participant Storage

    User->>Card: dragstart
    Card->>Card: opacity 0.4, dragId 기록
    User->>TargetList: dragover
    TargetList->>TargetList: 배경 강조 (drag-over 클래스)
    alt 드롭
        User->>TargetList: drop
        TargetList->>Storage: moveCard(id, col) → Storage.saveCards
        TargetList->>TargetList: renderAll()
    else 드롭 취소
        User->>SourceList: dragend (원래 컬럼)
        Card->>Card: opacity 복원
    end
```

---

## 5. v2 예정 — 인증 흐름 (Supabase Auth)

> 현재 미구현. 구조 설계 목적으로 기술한다.

```mermaid
flowchart TD
    A([페이지 로드]) --> B[initUser]
    B --> C{Supabase 세션\n존재?}
    C -- 있음 --> D[currentUser = auth.user\nuserLabel = email]
    C -- 없음 --> E[로그인 화면 표시]

    E --> F{로그인 방식}
    F -- 이메일/비밀번호 --> G[supabase.auth.signInWithPassword]
    F -- Google OAuth --> H[supabase.auth.signInWithOAuth]
    G & H --> I{인증 성공?}
    I -- 실패 --> E
    I -- 성공 --> D

    D --> J[loadCards\nStorage.getCards = Supabase SELECT]
    J --> K[renderAll]
    K --> L([보드 사용 준비 완료])

    L --> M{사용자 액션}
    M -- 로그아웃 --> N[supabase.auth.signOut]
    N --> E
    M -- 보드 사용 --> L
```

---

## 6. v2 예정 — 멀티 디바이스 실시간 동기화

```mermaid
sequenceDiagram
    participant Device1 as 디바이스 A
    participant Supabase
    participant Device2 as 디바이스 B

    Device1->>Supabase: 카드 추가 (INSERT)
    Supabase-->>Device2: Realtime NOTIFY
    Device2->>Device2: renderAll() 자동 갱신
```
