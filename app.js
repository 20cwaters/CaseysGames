const PLATES = [
  { bg: '#1D30F5', fg: '#FFFFFF' },
  { bg: '#E63312', fg: '#FFFFFF' },
  { bg: '#F5C518', fg: '#111111' },
  { bg: '#EDE9E0', fg: '#141414' },
  { bg: '#1A7A4C', fg: '#FFFFFF' },
  { bg: '#D9D4C8', fg: '#111111' }
];

const CATEGORIES = [
  { key: 'party', label: 'Party Games' },
  { key: 'card game', label: 'Card Games' },
  { key: 'word game', label: 'Word Games' },
  { key: 'dice game', label: 'Dice Games' },
  { key: 'board game', label: 'Board Games' }
];

function initials(title) {
  return (title || '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3);
}

function cardHTML(game, i, extraClass) {
  const plate = PLATES[i % PLATES.length];
  const num = String(i + 1).padStart(2, '0');
  const tagLine = (game.tags || []).join(' / ');
  const hasThumb = !!game.thumbnail;

  const plateInner = hasThumb
    ? `<div class="plate-thumb" role="img" aria-label="${escapeHTML(game.title)}" style="background-image: url('${escapeAttr(game.thumbnail)}');"></div>`
    : `<span class="plate-initials" style="color: ${plate.fg};">${escapeHTML(initials(game.title))}</span>`;

  const newBadge = game.isNew ? `<span class="plate-new">NEW</span>` : '';

  return `
    <a class="card${extraClass ? ' ' + extraClass : ''}" href="${escapeAttr(game.url)}" target="_blank" rel="noopener">
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

function rowShell(key, title, countLabel, trackHTML) {
  return `
    <section class="row" data-row="${escapeAttr(key)}">
      <div class="row-header">
        <h2 class="row-title">${escapeHTML(title)}</h2>
        <span class="row-count mono">${countLabel}</span>
      </div>
      <div class="row-viewport">
        <button class="row-nav row-nav-prev" aria-label="Scroll ${escapeAttr(title)} left" type="button">‹</button>
        <div class="row-track">${trackHTML}</div>
        <button class="row-nav row-nav-next" aria-label="Scroll ${escapeAttr(title)} right" type="button">›</button>
      </div>
    </section>
  `;
}

async function init() {
  const countEl = document.getElementById('game-count');
  const rowsContainer = document.getElementById('rows-container');
  const searchInput = document.getElementById('search-input');
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

  let adultConfirmed = false;

  function buildAdultRow(list) {
    const countLabel = adultConfirmed
      ? `${list.length}${list.length === 1 ? ' GAME' : ' GAMES'}`
      : '🔒 LOCKED';

    const track = adultConfirmed
      ? list.map((g, i) => cardHTML(g, i, 'row-card')).join('')
      : `
        <div class="locked-card" data-adult-lock role="button" tabindex="0">
          <span class="locked-card-icon" aria-hidden="true">🔞</span>
          <span class="locked-card-text">18+ Adult</span>
          <span class="locked-card-sub">Tap to unlock</span>
        </div>
      `;

    return rowShell('adult', '18+ Adult', countLabel, track);
  }

  function renderBrowse() {
    const parts = [];

    const newGames = games.filter((g) => g.isNew && !g.isAdult);
    if (newGames.length) {
      const track = newGames.map((g, i) => cardHTML(g, i, 'row-card')).join('');
      parts.push(rowShell('new', 'New Releases', `${newGames.length}${newGames.length === 1 ? ' GAME' : ' GAMES'}`, track));
    }

    CATEGORIES.forEach((cat) => {
      const list = games.filter((g) => !g.isAdult && (g.tags || []).includes(cat.key));
      if (!list.length) return;
      const track = list.map((g, i) => cardHTML(g, i, 'row-card')).join('');
      parts.push(rowShell(cat.key, cat.label, `${list.length}${list.length === 1 ? ' GAME' : ' GAMES'}`, track));
    });

    const adultGames = games.filter((g) => g.isAdult);
    if (adultGames.length) {
      parts.push(buildAdultRow(adultGames));
    }

    rowsContainer.innerHTML = parts.length
      ? parts.join('')
      : '<p class="grid-empty">No games here yet.</p>';

    countEl.textContent = `${games.length}${games.length === 1 ? ' GAME' : ' GAMES'}`;

    wireRowNav();
    wireAdultLocks();
  }

  function renderSearch(query) {
    const q = query.trim().toLowerCase();
    const matches = games.filter((g) => {
      if (g.isAdult) return false;
      const haystack = [g.title, g.description, ...(g.tags || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });

    countEl.textContent = `${matches.length} RESULT${matches.length === 1 ? '' : 'S'}`;

    rowsContainer.innerHTML = `
      <section class="row">
        <div class="row-header">
          <h2 class="row-title">Search Results</h2>
        </div>
        <div class="grid">
          ${matches.length
            ? matches.map((g, i) => cardHTML(g, i, '')).join('')
            : '<p class="grid-empty">No games match your search.</p>'}
        </div>
      </section>
    `;
  }

  function render() {
    const query = searchInput.value;
    if (query.trim()) {
      renderSearch(query);
    } else {
      renderBrowse();
    }
  }

  function wireRowNav() {
    rowsContainer.querySelectorAll('.row-viewport').forEach((viewport) => {
      const track = viewport.querySelector('.row-track');
      const prev = viewport.querySelector('.row-nav-prev');
      const next = viewport.querySelector('.row-nav-next');
      if (!track || !prev || !next) return;

      if (track.scrollWidth <= track.clientWidth + 4) {
        prev.style.display = 'none';
        next.style.display = 'none';
        return;
      }

      prev.addEventListener('click', () => {
        track.scrollBy({ left: -track.clientWidth * 0.8, behavior: 'smooth' });
      });
      next.addEventListener('click', () => {
        track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' });
      });
    });
  }

  function wireAdultLocks() {
    rowsContainer.querySelectorAll('[data-adult-lock]').forEach((el) => {
      el.addEventListener('click', () => {
        gate.hidden = false;
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          gate.hidden = false;
        }
      });
    });
  }

  searchInput.addEventListener('input', render);

  gateConfirm.addEventListener('click', () => {
    adultConfirmed = true;
    gate.hidden = true;
    render();
  });

  gateCancel.addEventListener('click', () => {
    gate.hidden = true;
  });

  render();
}

init();
