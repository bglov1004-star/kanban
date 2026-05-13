(function () {
  // ── Supabase 설정 (값은 Supabase 대시보드 → Project Settings → API에서 복사) ──
  const SUPABASE_URL      = 'https://uopsymccnnzcphhxmswi.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcHN5bWNjbm56Y3BoaHhtc3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDc5NzEsImV4cCI6MjA5NDE4Mzk3MX0.BbOUzBPvK5iXKqwazvAfqSMYL3--MohPZhZwOebba3g';

  const sb      = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const COLUMNS = ['todo', 'in-progress', 'done'];

  let currentUser = null;
  let cards       = [];
  let dragId      = null;
  let isSignUp    = false;

  // ── Auth UI ───────────────────────────────────────────────────────────────
  function showAuth() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('logoutBtn').style.display   = 'none';
  }

  function hideAuth() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('logoutBtn').style.display   = '';
    document.getElementById('authError').textContent     = '';
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errEl    = document.getElementById('authError');
    errEl.style.color  = '';
    errEl.textContent  = '';

    if (isSignUp) {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) {
        errEl.textContent = error.message;
      } else {
        errEl.style.color = 'var(--primary)';
        errEl.textContent = '가입 완료! 이메일을 확인해주세요.';
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) errEl.textContent = error.message;
      // 성공 시 onAuthStateChange가 hideAuth + loadCards 처리
    }
  }

  function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').textContent     = isSignUp ? '회원가입'            : '로그인';
    document.getElementById('authSubmitBtn').textContent = isSignUp ? '가입하기'            : '로그인';
    document.getElementById('authToggleBtn').textContent = isSignUp ? '로그인'              : '회원가입';
    document.getElementById('authToggleText').textContent= isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?';
    document.getElementById('authError').textContent     = '';
  }

  // ── User ──────────────────────────────────────────────────────────────────
  function setUser(user) {
    currentUser = user;
    document.getElementById('userLabel').textContent = user ? user.email : 'Guest';
  }

  // ── Card Storage (Supabase) ───────────────────────────────────────────────
  async function fetchCards() {
    const { data, error } = await sb
      .from('cards')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });
    if (error) { console.error(error); return []; }
    return data;
  }

  async function loadCards() {
    cards = await fetchCards();
    if (cards.length === 0) {
      const samples = [
        { id: uid(), user_id: currentUser.id, text: 'README 작성',           col: 'todo'        },
        { id: uid(), user_id: currentUser.id, text: '드래그 앤 드롭 테스트', col: 'in-progress' },
        { id: uid(), user_id: currentUser.id, text: '칸반 보드 설계 완료',   col: 'done'        },
      ];
      const { error } = await sb.from('cards').insert(samples);
      if (!error) cards = samples;
    }
    renderAll();
  }

  // ── Card Operations ───────────────────────────────────────────────────────
  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function addCard(col, text) {
    const card = { id: uid(), user_id: currentUser.id, text, col };
    cards.push(card);
    renderAll();
    const { error } = await sb.from('cards').insert(card);
    if (error) { console.error(error); cards = await fetchCards(); renderAll(); }
  }

  async function deleteCard(id) {
    cards = cards.filter(c => c.id !== id);
    renderAll();
    const { error } = await sb.from('cards').delete().eq('id', id);
    if (error) { console.error(error); cards = await fetchCards(); renderAll(); }
  }

  async function moveCard(id, col) {
    const card = cards.find(c => c.id === id);
    if (!card || card.col === col) return;
    card.col = col;
    renderAll();
    const { error } = await sb.from('cards').update({ col }).eq('id', id);
    if (error) { console.error(error); cards = await fetchCards(); renderAll(); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function createCardEl(card) {
    const el = document.createElement('div');
    el.className  = 'card';
    el.draggable  = true;
    el.dataset.id = card.id;

    const text = document.createElement('span');
    text.className   = 'card-text';
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
    const mine = cards.filter(c => c.col === col);
    mine.forEach(card => list.appendChild(createCardEl(card)));
    list.closest('.column').querySelector('.col-count').textContent = mine.length;
  }

  function renderAll() {
    COLUMNS.forEach(col => renderColumn(col));
  }

  // ── Add Form ──────────────────────────────────────────────────────────────
  function openAddForm(colEl) {
    colEl.querySelector('.add-btn').style.display = 'none';

    const form     = document.createElement('div');
    form.className = 'add-form';

    const textarea       = document.createElement('textarea');
    textarea.className   = 'add-input';
    textarea.rows        = 2;
    textarea.placeholder = '카드 내용 입력...';

    const actions     = document.createElement('div');
    actions.className = 'add-actions';

    const confirm       = document.createElement('button');
    confirm.className   = 'btn-confirm';
    confirm.textContent = '추가';

    const cancel       = document.createElement('button');
    cancel.className   = 'btn-cancel';
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
        if (text) { addCard(colEl.dataset.col, text); closeAddForm(colEl); }
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

  // ── Drag & Drop ───────────────────────────────────────────────────────────
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
      if (dragId) moveCard(dragId, list.closest('.column').dataset.col);
    });

    board.addEventListener('click', e => {
      const del = e.target.closest('.card-del');
      if (del) { deleteCard(del.closest('.card').dataset.id); return; }

      const addBtn = e.target.closest('.add-btn');
      if (addBtn) { openAddForm(addBtn.closest('.column')); return; }

      const confirm = e.target.closest('.btn-confirm');
      if (confirm) {
        const form  = confirm.closest('.add-form');
        const colEl = form.closest('.column');
        const text  = form.querySelector('.add-input').value.trim();
        if (text) { addCard(colEl.dataset.col, text); closeAddForm(colEl); }
        return;
      }

      const cancelBtn = e.target.closest('.btn-cancel');
      if (cancelBtn) closeAddForm(cancelBtn.closest('.column'));
    });
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  function initTheme() {
    const saved       = localStorage.getItem('kanban-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme =
      (saved === 'dark' || (!saved && prefersDark)) ? 'dark' : 'light';
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('kanban-theme', next);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDragDrop();

    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    document.getElementById('authToggleBtn').addEventListener('click', toggleAuthMode);
    document.getElementById('logoutBtn').addEventListener('click', () => sb.auth.signOut());
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        hideAuth();
        await loadCards();
      } else {
        setUser(null);
        cards = [];
        renderAll();
        showAuth();
      }
    });
  });
})();
