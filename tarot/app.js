(function () {
  const state = {
    spread: 'single',
    voice: 'mystic'
  };

  const els = {
    spreadOptions: document.getElementById('spread-options'),
    voiceOptions: document.getElementById('voice-options'),
    question: document.getElementById('question'),
    drawBtn: document.getElementById('draw-btn'),
    setup: document.getElementById('setup'),
    reading: document.getElementById('reading'),
    readingQuestion: document.getElementById('reading-question'),
    readingOpening: document.getElementById('reading-opening'),
    readingClosing: document.getElementById('reading-closing'),
    cards: document.getElementById('cards'),
    againBtn: document.getElementById('again-btn'),
    shareBtn: document.getElementById('share-btn'),
    shareConfirm: document.getElementById('share-confirm')
  };

  function renderOptions(container, source, key) {
    container.innerHTML = '';
    Object.entries(source).forEach(([id, opt]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option' + (state[key] === id ? ' selected' : '');
      btn.dataset.id = id;
      btn.innerHTML =
        '<span class="option-label">' + escapeHtml(opt.label) + '</span>' +
        '<span class="option-desc">' + escapeHtml(opt.description) + '</span>';
      btn.addEventListener('click', () => {
        state[key] = id;
        container.querySelectorAll('.option').forEach(o =>
          o.classList.toggle('selected', o.dataset.id === id)
        );
      });
      container.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function drawUnique(count) {
    const pool = MAJOR_ARCANA.slice();
    const drawn = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      drawn.push(pool.splice(idx, 1)[0]);
    }
    return drawn;
  }

  function renderReading() {
    const spread = SPREADS[state.spread];
    const voice = VOICES[state.voice];
    const question = els.question.value.trim();
    const cards = drawUnique(spread.positions.length);

    els.readingQuestion.textContent = question ? '"' + question + '"' : '';
    els.readingQuestion.hidden = !question;
    els.readingOpening.textContent = voice.opening;
    els.readingClosing.textContent = voice.closing;

    els.cards.className = 'cards spread-' + cards.length;
    els.cards.innerHTML = '';

    cards.forEach((card, i) => {
      const position = spread.positions[i];
      const positionHtml = position
        ? '<div class="card-position">' + escapeHtml(position) + '</div>'
        : '';

      const cardEl = document.createElement('article');
      cardEl.className = 'card';
      cardEl.innerHTML =
        positionHtml +
        '<div class="card-glyph">' + escapeHtml(card.glyph) + '</div>' +
        '<div class="card-name">' + escapeHtml(card.name) + '</div>' +
        '<div class="card-body">' +
          section(voice.framing.themes, card.themes) +
          section(voice.framing.situations, card.situations) +
          section(voice.framing.shadows, card.shadows) +
          section(voice.framing.symbols, card.symbols) +
        '</div>';
      els.cards.appendChild(cardEl);
    });

    els.setup.hidden = true;
    els.reading.hidden = false;
    els.shareConfirm.hidden = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function section(label, text) {
    return '<div class="card-section">' +
      '<div class="card-section-label">' + escapeHtml(label) + '</div>' +
      '<div class="card-section-text">' + escapeHtml(text) + '</div>' +
    '</div>';
  }

  function reset() {
    els.reading.hidden = true;
    els.setup.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function copyShareLink() {
    const url = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(url).then(
      () => {
        els.shareConfirm.hidden = false;
        setTimeout(() => { els.shareConfirm.hidden = true; }, 2500);
      },
      () => {
        els.shareConfirm.textContent = 'Could not copy. URL: ' + url;
        els.shareConfirm.hidden = false;
      }
    );
  }

  // Init
  renderOptions(els.spreadOptions, SPREADS, 'spread');
  renderOptions(els.voiceOptions, VOICES, 'voice');
  els.drawBtn.addEventListener('click', renderReading);
  els.againBtn.addEventListener('click', reset);
  els.shareBtn.addEventListener('click', copyShareLink);
})();
