(function () {
  // ── Config ────────────────────────────────────────────────────────────────
  const SUPABASE_URL      = 'https://uopsymccnnzcphhxmswi.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcHN5bWNjbm56Y3BoaHhtc3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDc5NzEsImV4cCI6MjA5NDE4Mzk3MX0.BbOUzBPvK5iXKqwazvAfqSMYL3--MohPZhZwOebba3g';

  const sb      = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const COLUMNS = ['todo', 'in-progress', 'done'];
  const COL_LABEL = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };

  // ── State ─────────────────────────────────────────────────────────────────
  let currentUser     = null;
  let currentBoard    = null;
  let boards          = [];
  let cards           = [];
  let activities      = [];
  let dragId          = null;
  let editingCardId   = null;
  let realtimeChannel = null;
  let isSignUp        = false;

  // ── Auth ──────────────────────────────────────────────────────────────────
  function showAuth() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('shareBtn').style.display    = 'none';
    showFormView();
  }

  function hideAuth() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('authError').textContent     = '';
  }

  function showFormView() {
    document.getElementById('authFormView').style.display   = '';
    document.getElementById('authVerifyView').style.display = 'none';
    document.getElementById('authError').textContent        = '';
  }

  function showVerify(email) {
    document.getElementById('verifyEmail').textContent      = email;
    document.getElementById('authFormView').style.display   = 'none';
    document.getElementById('authVerifyView').style.display = '';
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errEl    = document.getElementById('authError');
    errEl.style.color = '';
    errEl.textContent = '';

    if (isSignUp) {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) errEl.textContent = error.message;
      else       showVerify(email);
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) errEl.textContent = error.message;
    }
  }

  function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').textContent      = isSignUp ? '회원가입'             : '로그인';
    document.getElementById('authSubmitBtn').textContent  = isSignUp ? '가입하기'             : '로그인';
    document.getElementById('authToggleBtn').textContent  = isSignUp ? '로그인'               : '회원가입';
    document.getElementById('authToggleText').textContent = isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?';
    document.getElementById('authError').textContent      = '';
  }

  function setUser(user) {
    currentUser = user;
    document.getElementById('userLabel').textContent = user ? user.email : 'Guest';
    document.getElementById('logoutBtn').style.display = user ? '' : 'none';
  }

  // ── Boards ────────────────────────────────────────────────────────────────
  async function loadBoards() {
    const { data: owned, error: e1 } = await sb.from('boards')
      .select('*')
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: true });
    if (e1) console.error('boards fetch error:', e1);

    const { data: memberData, error: e2 } = await sb.from('board_members')
      .select('board_id')
      .eq('user_id', currentUser.id);
    if (e2) console.error('board_members fetch error:', e2);

    let joined = [];
    if (memberData?.length) {
      const ids = memberData.map(m => m.board_id);
      const { data: joinedBoards, error: e3 } = await sb.from('boards').select('*').in('id', ids);
      if (e3) console.error('joined boards fetch error:', e3);
      joined = joinedBoards || [];
    }

    boards = [...(owned || []), ...joined];

    if (boards.length === 0) {
      const { data: newBoard, error: e4 } = await sb.from('boards')
        .insert({ name: '내 보드', owner_id: currentUser.id })
        .select()
        .single();
      if (e4) {
        console.error('board create error:', e4);
        return [];
      }
      if (newBoard) {
        boards = [newBoard];
        await sb.from('cards')
          .update({ board_id: newBoard.id })
          .eq('user_id', currentUser.id)
          .is('board_id', null);
      }
    }

    return boards;
  }

  async function selectBoard(board) {
    currentBoard = board;
    renderBoardNav();
    document.getElementById('shareBtn').style.display =
      board.owner_id === currentUser.id ? '' : 'none';
    cards      = [];
    activities = [];
    renderAll();
    renderActivities();
    await Promise.all([loadCards(), loadActivities()]);
    initRealtime(board.id);
  }

  function renderBoardNav() {
    const nameEl   = document.getElementById('boardName');
    const selectEl = document.getElementById('boardSelect');
    if (boards.length <= 1) {
      nameEl.textContent     = currentBoard?.name || '';
      nameEl.style.display   = '';
      selectEl.style.display = 'none';
    } else {
      nameEl.style.display   = 'none';
      selectEl.style.display = '';
      selectEl.innerHTML = boards
        .map(b => `<option value="${b.id}"${b.id === currentBoard?.id ? ' selected' : ''}>${b.name}</option>`)
        .join('');
    }
  }

  // ── Share Modal ───────────────────────────────────────────────────────────
  async function openShareModal() {
    document.getElementById('shareModal').removeAttribute('hidden');
    document.getElementById('inviteEmail').value = '';
    document.getElementById('inviteMsg').textContent = '';
    await renderMemberList();
  }

  function closeShareModal() {
    document.getElementById('shareModal').setAttribute('hidden', '');
  }

  async function renderMemberList() {
    const list = document.getElementById('memberList');
    list.innerHTML = '<li class="member-loading">불러오는 중...</li>';

    const { data: memberData } = await sb.from('board_members')
      .select('user_id')
      .eq('board_id', currentBoard.id);

    if (!memberData?.length) {
      list.innerHTML = '<li class="member-empty">초대된 멤버가 없습니다</li>';
      return;
    }

    const { data: profiles } = await sb.from('profiles')
      .select('id, email')
      .in('id', memberData.map(m => m.user_id));

    list.innerHTML = (profiles || []).map(p => `
      <li class="member-item">
        <span class="member-avatar">${p.email[0].toUpperCase()}</span>
        <span class="member-email">${p.email}</span>
        <button class="member-remove-btn" data-uid="${p.id}" title="제거">✕</button>
      </li>
    `).join('');

    list.querySelectorAll('.member-remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await sb.from('board_members')
          .delete()
          .eq('board_id', currentBoard.id)
          .eq('user_id', btn.dataset.uid);
        await renderMemberList();
      });
    });
  }

  async function handleInvite(e) {
    e.preventDefault();
    const email = document.getElementById('inviteEmail').value.trim();
    const msgEl = document.getElementById('inviteMsg');
    msgEl.style.color = '';
    msgEl.textContent = '';

    const { data: profile } = await sb.from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!profile) {
      msgEl.textContent = '해당 이메일의 사용자를 찾을 수 없습니다';
      return;
    }
    if (profile.id === currentUser.id) {
      msgEl.textContent = '자기 자신은 초대할 수 없습니다';
      return;
    }

    const { error } = await sb.from('board_members')
      .insert({ board_id: currentBoard.id, user_id: profile.id });

    if (error?.code === '23505') {
      msgEl.textContent = '이미 초대된 사용자입니다';
    } else if (error) {
      msgEl.textContent = error.message;
    } else {
      msgEl.style.color = 'var(--primary)';
      msgEl.textContent = `${email} 님을 초대했습니다`;
      document.getElementById('inviteEmail').value = '';
      await renderMemberList();
    }
  }

  // ── Card Detail Modal ─────────────────────────────────────────────────────
  function openCardModal(card) {
    editingCardId = card.id;
    document.getElementById('cardModalText').value     = card.text;
    document.getElementById('cardModalDeadline').value = card.deadline ? card.deadline.slice(0, 10) : '';
    document.getElementById('cardModalPriority').value = card.priority || '';
    document.getElementById('cardModalTags').value     = (card.tags || []).join(', ');
    document.getElementById('cardModal').removeAttribute('hidden');
    document.getElementById('cardModalText').focus();
  }

  function closeCardModal() {
    document.getElementById('cardModal').setAttribute('hidden', '');
    editingCardId = null;
  }

  async function saveCardModal() {
    if (!editingCardId) return;
    const text     = document.getElementById('cardModalText').value.trim();
    const deadline = document.getElementById('cardModalDeadline').value || null;
    const priority = document.getElementById('cardModalPriority').value || null;
    const tags     = document.getElementById('cardModalTags').value
      .split(',').map(t => t.trim()).filter(Boolean);

    if (!text) return;
    closeCardModal();

    const { error } = await sb.from('cards')
      .update({ text, deadline, priority, tags })
      .eq('id', editingCardId);
    if (!error) await logActivity('수정됨', text);
  }

  // ── Card Storage ──────────────────────────────────────────────────────────
  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function loadCards() {
    const { data, error } = await sb.from('cards')
      .select('*')
      .eq('board_id', currentBoard.id)
      .order('created_at', { ascending: true });
    if (error) { console.error(error); return; }

    cards = data || [];

    if (cards.length === 0) {
      const samples = [
        { id: uid(), user_id: currentUser.id, board_id: currentBoard.id, text: 'README 작성',           col: 'todo',        tags: [],        priority: null,     deadline: null },
        { id: uid(), user_id: currentUser.id, board_id: currentBoard.id, text: '드래그 앤 드롭 테스트', col: 'in-progress', tags: ['FE'],    priority: 'medium', deadline: null },
        { id: uid(), user_id: currentUser.id, board_id: currentBoard.id, text: '칸반 보드 설계 완료',   col: 'done',        tags: ['기획'],  priority: null,     deadline: null },
      ];
      const { error: insertErr } = await sb.from('cards').insert(samples);
      if (!insertErr) cards = samples;
    }
    renderAll();
  }

  async function addCard(col, text) {
    if (!currentBoard) {
      const allBoards = await loadBoards();
      if (allBoards.length > 0) await selectBoard(allBoards[0]);
      if (!currentBoard) { console.error('board 없음'); return; }
    }
    const card = {
      id: uid(), user_id: currentUser.id, board_id: currentBoard.id,
      text, col, tags: [], priority: null, deadline: null,
    };
    cards.push(card);
    renderAll();
    const { error } = await sb.from('cards').insert(card);
    if (error) {
      console.error(error);
      cards = cards.filter(c => c.id !== card.id);
      renderAll();
    } else {
      await logActivity('추가됨', text);
    }
  }

  async function deleteCard(id) {
    const card = cards.find(c => c.id === id);
    cards = cards.filter(c => c.id !== id);
    renderAll();
    const { error } = await sb.from('cards').delete().eq('id', id);
    if (error) {
      console.error(error);
      if (card) { cards.push(card); renderAll(); }
    } else if (card) {
      await logActivity('삭제됨', card.text);
    }
  }

  async function moveCard(id, col) {
    const card = cards.find(c => c.id === id);
    if (!card || card.col === col) return;
    const prevCol = card.col;
    card.col = col;
    renderAll();
    const { error } = await sb.from('cards').update({ col }).eq('id', id);
    if (error) {
      console.error(error);
      card.col = prevCol;
      renderAll();
    } else {
      await logActivity(`${COL_LABEL[prevCol]} → ${COL_LABEL[col]}`, card.text);
    }
  }

  // ── Activities ────────────────────────────────────────────────────────────
  async function logActivity(action, cardText) {
    await sb.from('activities').insert({
      board_id:   currentBoard.id,
      user_id:    currentUser.id,
      user_email: currentUser.email,
      action,
      card_text:  cardText,
    });
  }

  async function loadActivities() {
    const { data, error } = await sb.from('activities')
      .select('*')
      .eq('board_id', currentBoard.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) { console.error(error); return; }
    activities = data || [];
    renderActivities();
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  function renderActivities() {
    const list = document.getElementById('activityList');
    if (!activities.length) {
      list.innerHTML = '<li class="activity-empty">활동 내역이 없습니다</li>';
      return;
    }
    list.innerHTML = activities.map(a => `
      <li class="activity-item">
        <span class="activity-avatar">${a.user_email[0].toUpperCase()}</span>
        <div class="activity-content">
          <span class="activity-user">${a.user_email.split('@')[0]}</span>
          <span class="activity-action">${a.action}</span>
          ${a.card_text ? `<span class="activity-card">"${a.card_text}"</span>` : ''}
          <span class="activity-time">${timeAgo(a.created_at)}</span>
        </div>
      </li>
    `).join('');
  }

  function toggleActivityPanel() {
    const panel  = document.getElementById('activityPanel');
    const btn    = document.getElementById('activityBtn');
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
  }

  // ── Real-time ─────────────────────────────────────────────────────────────
  function initRealtime(boardId) {
    if (realtimeChannel) sb.removeChannel(realtimeChannel);

    realtimeChannel = sb.channel(`board:${boardId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'cards',
        filter: `board_id=eq.${boardId}`,
      }, ({ eventType, new: n, old: o }) => {
        if      (eventType === 'INSERT') { if (!cards.find(c => c.id === n.id)) cards.push(n); }
        else if (eventType === 'UPDATE') { const i = cards.findIndex(c => c.id === n.id); if (i !== -1) cards[i] = n; else cards.push(n); }
        else if (eventType === 'DELETE') { cards = cards.filter(c => c.id !== o.id); }
        renderAll();
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'activities',
        filter: `board_id=eq.${boardId}`,
      }, ({ new: n }) => {
        activities.unshift(n);
        if (activities.length > 30) activities.pop();
        renderActivities();
      })
      .subscribe();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function createCardEl(card) {
    const el = document.createElement('div');
    el.className  = `card${card.priority ? ` priority-${card.priority}` : ''}`;
    el.draggable  = true;
    el.dataset.id = card.id;

    const content = document.createElement('div');
    content.className = 'card-content';

    const text = document.createElement('span');
    text.className   = 'card-text';
    text.textContent = card.text;
    content.appendChild(text);

    const hasFooter = card.deadline || card.tags?.length;
    if (hasFooter) {
      const footer = document.createElement('div');
      footer.className = 'card-footer';

      if (card.deadline) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const due   = new Date(card.deadline);
        const span  = document.createElement('span');
        span.className   = `card-deadline${due < today ? ' overdue' : ''}`;
        span.textContent = `📅 ${due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
        footer.appendChild(span);
      }

      if (card.tags?.length) {
        const tagsEl = document.createElement('div');
        tagsEl.className = 'card-tags';
        card.tags.forEach(t => {
          const chip = document.createElement('span');
          chip.className   = 'tag';
          chip.textContent = t;
          tagsEl.appendChild(chip);
        });
        footer.appendChild(tagsEl);
      }

      content.appendChild(footer);
    }

    const del = document.createElement('button');
    del.className = 'card-del';
    del.setAttribute('aria-label', '삭제');
    del.textContent = '✕';

    el.appendChild(content);
    el.appendChild(del);
    return el;
  }

  function renderColumn(col) {
    const list = document.getElementById(`list-${col}`);
    list.innerHTML = '';
    cards.filter(c => c.col === col).forEach(card => list.appendChild(createCardEl(card)));
    list.closest('.column').querySelector('.col-count').textContent =
      cards.filter(c => c.col === col).length;
  }

  function renderAll() { COLUMNS.forEach(col => renderColumn(col)); }

  // ── Add Form ──────────────────────────────────────────────────────────────
  function openAddForm(colEl) {
    colEl.querySelector('.add-btn').style.display = 'none';

    const form = document.createElement('div');
    form.className = 'add-form';

    const textarea       = document.createElement('textarea');
    textarea.className   = 'add-input';
    textarea.rows        = 2;
    textarea.placeholder = '카드 내용 입력...';

    const actions = document.createElement('div');
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
        const t = textarea.value.trim();
        if (t) { addCard(colEl.dataset.col, t); closeAddForm(colEl); }
      } else if (e.key === 'Escape') {
        closeAddForm(colEl);
      }
    });
  }

  function closeAddForm(colEl) {
    colEl.querySelector('.add-form')?.remove();
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
      e.target.closest('.card')?.classList.remove('dragging');
      dragId = null;
    });

    board.addEventListener('dragover', e => {
      const list = e.target.closest('.card-list');
      if (!list) return;
      e.preventDefault();
      list.classList.add('drag-over');
    });

    board.addEventListener('dragleave', e => {
      e.target.closest('.card-list')?.classList.remove('drag-over');
    });

    board.addEventListener('drop', e => {
      const list = e.target.closest('.card-list');
      if (!list) return;
      list.classList.remove('drag-over');
      if (dragId) moveCard(dragId, list.closest('.column').dataset.col);
    });

    board.addEventListener('click', async e => {
      // 삭제 버튼
      const del = e.target.closest('.card-del');
      if (del) { deleteCard(del.closest('.card').dataset.id); return; }

      // 카드 클릭 → 편집 모달 (add form 내부는 제외)
      const card = e.target.closest('.card');
      if (card && !e.target.closest('.add-form')) {
        const data = cards.find(c => c.id === card.dataset.id);
        if (data) { openCardModal(data); return; }
      }

      // Add 버튼
      const addBtn = e.target.closest('.add-btn');
      if (addBtn) { openAddForm(addBtn.closest('.column')); return; }

      // 추가 확인
      const confirmBtn = e.target.closest('.btn-confirm');
      if (confirmBtn) {
        const form  = confirmBtn.closest('.add-form');
        const colEl = form.closest('.column');
        const text  = form.querySelector('.add-input').value.trim();
        if (text) { await addCard(colEl.dataset.col, text); closeAddForm(colEl); }
        return;
      }

      // 취소
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

    // Auth
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    document.getElementById('authToggleBtn').addEventListener('click', toggleAuthMode);
    document.getElementById('backToLoginBtn').addEventListener('click', () => {
      isSignUp = true; toggleAuthMode(); showFormView();
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
      await sb.auth.signOut();
      setUser(null);
      currentBoard = null;
      boards = []; cards = []; activities = [];
      renderAll();
      renderActivities();
      showAuth();
    });

    // Theme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Board selector
    document.getElementById('boardSelect').addEventListener('change', e => {
      const board = boards.find(b => b.id === e.target.value);
      if (board) selectBoard(board);
    });

    // Share
    document.getElementById('shareBtn').addEventListener('click', openShareModal);
    document.getElementById('closeShareBtn').addEventListener('click', closeShareModal);
    document.getElementById('inviteForm').addEventListener('submit', handleInvite);
    document.getElementById('shareModal').addEventListener('click', e => {
      if (e.target.id === 'shareModal') closeShareModal();
    });

    // Card Modal
    document.getElementById('saveCardBtn').addEventListener('click', saveCardModal);
    document.getElementById('cancelCardBtn').addEventListener('click', closeCardModal);
    document.getElementById('closeCardModalBtn').addEventListener('click', closeCardModal);
    document.getElementById('cardModal').addEventListener('click', e => {
      if (e.target.id === 'cardModal') closeCardModal();
    });

    // Activity Panel
    document.getElementById('activityBtn').addEventListener('click', toggleActivityPanel);
    document.getElementById('closeActivityBtn').addEventListener('click', toggleActivityPanel);

    // Auth state listener
    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        hideAuth();
        if (!currentBoard) {
          const allBoards = await loadBoards();
          if (allBoards.length > 0) await selectBoard(allBoards[0]);
        }
      } else {
        setUser(null);
        currentBoard = null;
        boards = []; cards = []; activities = [];
        renderAll();
        renderActivities();
        if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
        showAuth();
      }
    });
  });
})();
