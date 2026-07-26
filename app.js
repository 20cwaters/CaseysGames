const PLATES = [
  { bg: '#1D30F5', fg: '#FFFFFF' },
  { bg: '#E63312', fg: '#FFFFFF' },
  { bg: '#F5C518', fg: '#111111' },
  { bg: '#EDE9E0', fg: '#141414' },
  { bg: '#1A7A4C', fg: '#FFFFFF' },
  { bg: '#D9D4C8', fg: '#111111' }
];

function initials(title) {
  return (title || '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3);
}

function cardHTML(game, i) {
  const plate = PLATES[i % PLATES.length];
  const num = String(i + 1).padStart(2, '0');
  const tagLine = (game.tags || []).join(' / ');
  const hasThumb = !!game.thumbnail;

  const plateInner = hasThumb
    ? `<div class="plate-thumb" role="img" aria-label="${escapeHTML(game.title)}" style="background-image: url('${escapeAttr(game.thumbnail)}');"></div>`
    : `<span class="plate-initials" style="color: ${plate.fg};">${escapeHTML(initials(game.title))}</span>`;

  const newBadge = game.isNew ? `<span class="plate-new">NEW</span>` : '';

  return `
    <a class="card" href="${escapeAttr(game.url)}" target="_blank" rel="noopener">
      <div class="plate" style="background: ${plate.bg};">
        ${plateInner}
        <span class="plate-num" style="color: ${plate.fg};">${num}</span>
        ${newBadge}
      </div>
      <div class="card-body">
        <h2 class="card-title">${escapeHTML(game.title)} <span class="arrow">↗</span></h2>
        <p class="card-desc">${escapeHTML(game.description)}</p>
        <div class="card-meta">
          <span>${escapeHTML(game.players)}</span>
          <span>${escapeHTML(game.length)}</span>
          <span class="tag-line">${escapeHTML(tagLine)}</span>
        </div>
      </div>
    </a>
  `;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str ?? '').replace(/"/g, '&quot;');
}

async function init() {
  const grid = document.getElementById('game-grid');
  const countEl = document.getElementById('game-count');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const gate = document.getElementById('adult-gate');
  const gateConfirm = document.getElementById('adult-gate-confirm');
  const gateCancel = document.getElementById('adult-gate-cancel');

  let games = [];
  try {
    const res = await fetch('./games.json', { cache: 'no-store' });
    const data = await res.json();
    games = data.games || [];
  } catch {
    games = [];
  }

  let activeTab = 'all';
  let adultConfirmed = false;

  function render() {
    let filtered;
    if (activeTab === 'adult') {
      filtered = games.filter((g) => g.isAdult);
    } else if (activeTab === 'all') {
      filtered = games.filter((g) => !g.isAdult);
    } else {
      filtered = games.filter((g) => !g.isAdult && (g.tags || []).includes(activeTab));
    }

    if (activeTab === 'adult' && !adultConfirmed) {
      grid.innerHTML = '';
      countEl.textContent = '—';
      return;
    }

    grid.innerHTML = filtered.length
      ? filtered.map(cardHTML).join('')
      : '<p class="grid-empty">No games here yet.</p>';
    countEl.textContent = `${filtered.length}${filtered.length === 1 ? ' GAME' : ' GAMES'}`;
  }

  function setTab(tab) {
    activeTab = tab;
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    if (tab === 'adult' && !adultConfirmed) {
      gate.hidden = false;
    } else {
      gate.hidden = true;
    }

    render();
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  gateConfirm.addEventListener('click', () => {
    adultConfirmed = true;
    gate.hidden = true;
    render();
  });

  gateCancel.addEventListener('click', () => {
    setTab('all');
  });

  render();
}

init();
