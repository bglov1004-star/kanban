// file:// 프로토콜에서 ES module이 동작하지 않으므로 IIFE 패턴 사용
(function () {
  const COLUMNS = ['todo', 'in-progress', 'done'];

  let currentUser = { id: 'guest', label: 'Guest' };
  let cards       = [];
  let dragId      = null;

  // v2: 이 객체의 메서드를 Supabase 호출로 교체한다
  const Storage = {
    getCards(userId) {
      try {
        return JSON.parse(localStorage.getItem(`kanban-cards-${userId}`) || '[]');
      } catch {
        return [];
      }
    },
    saveCards(userId, data) {
      localStorage.setItem(`kanban-cards-${userId}`, JSON.stringify(data));
    },
  };

  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function initUser() {
    currentUser = { id: 'guest', label: 'Guest' };
    document.getElementById('userLabel').textContent = currentUser.label;
  }

  function saveCards() {
    Storage.saveCards(currentUser.id, cards);
  }

  function loadCards() {
    cards = Storage.getCards(currentUser.id);
    if (cards.length === 0) {
      cards = [
        { id: uid(), user_id: currentUser.id, text: 'README 작성', col: 'todo' },
        { id: uid(), user_id: currentUser.id, text: '드래그 앤 드롭 테스트', col: 'in-progress' },
        { id: uid(), user_id: currentUser.id, text: '칸반 보드 설계 완료', col: 'done' },
      ];
      saveCards();
    }
  }

  function createCardEl(card) {
    const el = document.createElement('div');
    el.className = 'card';
    el.draggable = true;
    el.dataset.id = card.id;

    const text = document.createElement('span');
    text.className = 'card-text';
    text.textContent = card.text;

    const del = document.createElement('button');
    del.className = 'card-del';
    del.setAttribute('aria-label', '삭제');
    del.textContent = '✕';

    el.appendChild(text);
    el.appendChild(del);
    return el;
  }

  function renderColumn(col) {
    const list = document.getElementById(`list-${col}`);
    list.innerHTML = '';

    const mine = cards.filter(c => c.col === col && c.user_id === currentUser.id);
    mine.forEach(card => list.appendChild(createCardEl(card)));

    const colEl = list.closest('.column');
    colEl.querySelector('.col-count').textContent = mine.length;
  }

  function renderAll() {
    COLUMNS.forEach(col => renderColumn(col));
  }

  function openAddForm(colEl) {
    const btn = colEl.querySelector('.add-btn');
    btn.style.display = 'none';

    const form = document.createElement('div');
    form.className = 'add-form';

    const textarea = document.createElement('textarea');
    textarea.className = 'add-input';
    textarea.rows = 2;
    textarea.placeholder = '카드 내용 입력...';

    const actions = document.createElement('div');
    actions.className = 'add-actions';

    const confirm = document.createElement('button');
    confirm.className = 'btn-confirm';
    confirm.textContent = '추가';

    const cancel = document.createElement('button');
    cancel.className = 'btn-cancel';
    cancel.textContent = '취소';

    actions.appendChild(confirm);
    actions.appendChild(cancel);
    form.appendChild(textarea);
    form.appendChild(actions);
    colEl.appendChild(form);

    textarea.focus();

    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        const text = textarea.value.trim();
        if (text) {
          addCard(colEl.dataset.col, text);
          closeAddForm(colEl);
        }
      } else if (e.key === 'Escape') {
        closeAddForm(colEl);
      }
    });
  }

  function closeAddForm(colEl) {
    const form = colEl.querySelector('.add-form');
    if (form) form.remove();
    const btn = colEl.querySelector('.add-btn');
    if (btn) btn.style.display = '';
  }

  function addCard(col, text) {
    cards.push({ id: uid(), user_id: currentUser.id, text, col });
    saveCards();
    renderAll();
  }

  function deleteCard(id) {
    const idx = cards.findIndex(c => c.id === id);
    if (idx !== -1) {
      cards.splice(idx, 1);
      saveCards();
      renderAll();
    }
  }

  function moveCard(id, col) {
    const card = cards.find(c => c.id === id);
    if (card && card.col !== col) {
      card.col = col;
      saveCards();
      renderAll();
    }
  }

  function initDragDrop() {
    const board = document.querySelector('.board');

    board.addEventListener('dragstart', e => {
      const card = e.target.closest('.card');
      if (!card) return;
      dragId = card.dataset.id;
      card.classList.add('dragging');
    });

    board.addEventListener('dragend', e => {
      const card = e.target.closest('.card');
      if (card) card.classList.remove('dragging');
      dragId = null;
    });

    board.addEventListener('dragover', e => {
      const list = e.target.closest('.card-list');
      if (!list) return;
      e.preventDefault();
      list.classList.add('drag-over');
    });

    board.addEventListener('dragleave', e => {
      const list = e.target.closest('.card-list');
      if (list) list.classList.remove('drag-over');
    });

    board.addEventListener('drop', e => {
      const list = e.target.closest('.card-list');
      if (!list) return;
      list.classList.remove('drag-over');
      if (dragId) {
        const col = list.closest('.column').dataset.col;
        moveCard(dragId, col);
      }
    });

    board.addEventListener('click', e => {
      const del = e.target.closest('.card-del');
      if (del) {
        const card = del.closest('.card');
        deleteCard(card.dataset.id);
        return;
      }

      const addBtn = e.target.closest('.add-btn');
      if (addBtn) {
        const colEl = addBtn.closest('.column');
        openAddForm(colEl);
        return;
      }

      const confirm = e.target.closest('.btn-confirm');
      if (confirm) {
        const form = confirm.closest('.add-form');
        const colEl = form.closest('.column');
        const text = form.querySelector('.add-input').value.trim();
        if (text) {
          addCard(colEl.dataset.col, text);
          closeAddForm(colEl);
        }
        return;
      }

      const cancelBtn = e.target.closest('.btn-cancel');
      if (cancelBtn) {
        const colEl = cancelBtn.closest('.column');
        closeAddForm(colEl);
      }
    });
  }

  function initTheme() {
    const saved = localStorage.getItem('kanban-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.dataset.theme = 'dark';
    } else {
      document.documentElement.dataset.theme = 'light';
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('kanban-theme', next);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initUser();
    loadCards();
    renderAll();
    initDragDrop();

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  });
})();
