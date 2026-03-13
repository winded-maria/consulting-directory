// ===== Password Gate =====
const PASS_HASH = '2d79f86a42867f719631947b195937617dbe25e4bd277b5c8027e9348540d0e7'; // sha256 of password

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

(function setupPasswordGate() {
  const gate = document.getElementById('password-gate');
  const form = document.getElementById('password-form');
  const input = document.getElementById('password-input');
  const error = document.getElementById('password-error');

  // Check if already authenticated this session
  if (sessionStorage.getItem('ccc-auth') === 'true') {
    gate.hidden = true;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hash = await sha256(input.value.trim());
    if (hash === PASS_HASH) {
      sessionStorage.setItem('ccc-auth', 'true');
      gate.hidden = true;
    } else {
      error.hidden = false;
      input.value = '';
      input.focus();
    }
  });

  input.focus();
})();

// ===== Configuration =====
const SHEET_ID = '1A-_lsUAWcPNtLrj9BLsODJBliTgKIzOtBJwzHth6xTY';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0&headers=2`;

// Predefined filter categories
const EXPERTISE_TAGS = [
  'EiE', 'ECD', 'ECE', 'ECDiE', 'SEL', 'MHPSS', 'PSS', 'TVET',
  'Disability Inclusion', 'Gender'
];

const SKILL_TAGS = [
  'Research', 'M&E', 'MEL', 'MEAL', 'Curriculum Development',
  'Teacher Professional Development', 'Facilitation', 'Evaluation',
  'Policy', 'Play-based Learning', 'Strategic Planning', 'Training'
];

// ===== State =====
let allConsultants = [];
let activeExpertise = new Set();
let activeSkills = new Set();
let activeLanguages = new Set();
let activeCountries = new Set();
let searchQuery = '';

// Dynamic tags (populated after data loads)
let LANGUAGE_TAGS = [];
let COUNTRY_TAGS = [];

// ===== DOM Elements =====
const searchInput = document.getElementById('search');
const clearSearchBtn = document.getElementById('clear-search');
const expertiseFilters = document.getElementById('expertise-filters');
const skillsFilters = document.getElementById('skills-filters');
const clearFiltersBtn = document.getElementById('clear-filters');
const languageFilters = document.getElementById('language-filters');
const countryFilters = document.getElementById('country-filters');
const cardsGrid = document.getElementById('cards-grid');
const loadingEl = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const resultsCount = document.getElementById('results-count');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const resetAll = document.getElementById('reset-all');

// ===== Data Fetching =====
async function fetchConsultants() {
  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();

    // Parse the Google Visualization JSON response
    // Response format: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
    const match = text.match(/google\.visualization\.Query\.setResponse\(({[\s\S]+})\)/);
    if (!match) throw new Error('Could not parse spreadsheet data');

    const data = JSON.parse(match[1]);
    const cols = data.table.cols;
    const rows = data.table.rows;

    // Map column indices
    const colMap = {};
    cols.forEach((col, i) => {
      if (col.label) colMap[col.label.trim()] = i;
    });

    // Parse rows into consultant objects
    return rows.map(row => {
      const get = (label) => {
        const idx = colMap[label];
        if (idx === undefined) return '';
        const cell = row.c[idx];
        return cell && cell.v ? String(cell.v).trim() : '';
      };

      return {
        name: get('Name'),
        email: get('Email'),
        location: get('Location'),
        expertise: get('Areas of experience and/or interest'),
        languages: get('Working languages'),
        linkedin: get('LinkedIn'),
        notes: get("Anything else you'd like others to know"),
      };
    }).filter(c => c.name); // Filter out empty rows
  } catch (err) {
    console.error('Failed to fetch consultant data:', err);
    loadingEl.innerHTML = `
      <p style="color: var(--gray-500);">Could not load data. Please try refreshing the page.</p>
    `;
    return [];
  }
}

// ===== Tag Extraction =====
function extractTags(expertiseText) {
  const tags = [];
  const upper = expertiseText.toUpperCase();

  // Check expertise tags
  EXPERTISE_TAGS.forEach(tag => {
    const tagUpper = tag.toUpperCase();
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${escapeRegex(tagUpper)}\\b`);
    if (regex.test(upper)) {
      tags.push(tag);
    }
  });

  // Check skill tags
  SKILL_TAGS.forEach(tag => {
    const tagUpper = tag.toUpperCase();
    if (tag === 'M&E' || tag === 'MEL' || tag === 'MEAL') {
      // Special handling for M&E variants
      if (upper.includes(tagUpper) || upper.includes('M&E') || upper.includes('MONITORING')) {
        if (!tags.includes(tag)) tags.push(tag);
      }
    } else {
      const regex = new RegExp(escapeRegex(tagUpper), 'i');
      if (regex.test(expertiseText)) {
        tags.push(tag);
      }
    }
  });

  return [...new Set(tags)];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== Dynamic Tag Extraction =====
const KNOWN_LANGUAGES = [
  'Arabic', 'Danish', 'English', 'French', 'German', 'Greek', 'Hebrew',
  'Hindi', 'Indonesian', 'Italian', 'Japanese', 'Portuguese', 'Russian',
  'Spanish', 'Swahili', 'Swedish', 'Urdu'
];

function normalizeLanguage(raw) {
  // Strip emoji prefixes
  const cleaned = raw.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
  // Match against known languages (case-insensitive prefix match)
  for (const lang of KNOWN_LANGUAGES) {
    if (cleaned.toLowerCase().startsWith(lang.toLowerCase())) return lang;
  }
  // Check for abbreviations
  const abbrMap = { 'en': 'English', 'fr': 'French', 'sp': 'Spanish', 'por': 'Portuguese', 'ja': 'Japanese' };
  const lower = cleaned.toLowerCase().replace(/[^a-z]/g, '');
  for (const [abbr, lang] of Object.entries(abbrMap)) {
    if (lower === abbr || lower.startsWith(abbr)) return lang;
  }
  return null; // skip unrecognizable entries
}

// US state abbreviations and codes to normalize
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC'
]);

const COUNTRY_ALIASES = {
  'US': 'USA', 'U.S.': 'USA', 'U.S': 'USA', 'United States': 'USA',
  'UK': 'United Kingdom', 'MX': 'Mexico'
};

function normalizeCountry(raw) {
  // Strip all parenthetical content first, then handle dual locations
  const noParen = raw.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  // Handle entries with "and" or "/" (dual locations) — take first
  const parts = noParen.split(/\band\b|\//i);
  const primary = parts[0].trim();
  // Split by comma
  const cleaned = primary;

  const segments = cleaned.split(',').map(s => s.trim()).filter(Boolean);

  // Walk backwards through segments to find a real country (skip US states, cities, parentheticals)
  for (let i = segments.length - 1; i >= 0; i--) {
    let candidate = segments[i];
    // Strip parenthetical notes and extra whitespace
    candidate = candidate.replace(/\([^)]*\)/g, '').trim();
    // Normalize aliases first
    if (COUNTRY_ALIASES[candidate]) candidate = COUNTRY_ALIASES[candidate];
    // Skip US state abbreviations — the country is USA
    if (US_STATES.has(candidate.toUpperCase())) return 'USA';
    // Skip empty or very short non-country strings
    if (!candidate || candidate.length < 2) continue;
    // If it's a known alias result, return it
    if (Object.values(COUNTRY_ALIASES).includes(candidate)) return candidate;
    // Accept if it looks like a country name (not a city — heuristic: if it's the last or only segment)
    if (i === segments.length - 1 || segments.length === 1) return candidate;
  }
  return segments[segments.length - 1]?.replace(/\(.*?\)?/g, '').trim() || null;
}

function buildDynamicTags(consultants) {
  const langSet = new Set();
  const countrySet = new Set();

  consultants.forEach(c => {
    // Split languages by comma, semicolon, newline, or "and"
    if (c.languages) {
      c.languages.split(/[,;\n]|\band\b/).forEach(lang => {
        const normalized = normalizeLanguage(lang.trim());
        if (normalized) langSet.add(normalized);
      });
    }
    if (c.location) {
      const normalized = normalizeCountry(c.location.trim());
      if (normalized) countrySet.add(normalized);
    }
  });

  LANGUAGE_TAGS = [...langSet].sort((a, b) => a.localeCompare(b));
  COUNTRY_TAGS = [...countrySet].sort((a, b) => a.localeCompare(b));
}

// ===== Rendering =====
function renderFilters() {
  expertiseFilters.innerHTML = EXPERTISE_TAGS.map(tag =>
    `<button class="chip${activeExpertise.has(tag) ? ' active' : ''}" data-filter="expertise" data-tag="${tag}">${tag}</button>`
  ).join('');

  skillsFilters.innerHTML = SKILL_TAGS.map(tag =>
    `<button class="chip${activeSkills.has(tag) ? ' active' : ''}" data-filter="skills" data-tag="${tag}">${tag}</button>`
  ).join('');

  languageFilters.innerHTML = LANGUAGE_TAGS.map(tag =>
    `<button class="chip${activeLanguages.has(tag) ? ' active' : ''}" data-filter="language" data-tag="${tag}">${tag}</button>`
  ).join('');

  countryFilters.innerHTML = COUNTRY_TAGS.map(tag =>
    `<button class="chip${activeCountries.has(tag) ? ' active' : ''}" data-filter="country" data-tag="${tag}">${tag}</button>`
  ).join('');

  clearFiltersBtn.hidden = activeExpertise.size === 0 && activeSkills.size === 0 && activeLanguages.size === 0 && activeCountries.size === 0;
}

function renderCards(consultants) {
  if (consultants.length === 0) {
    cardsGrid.innerHTML = '';
    emptyState.hidden = false;
    resultsCount.textContent = '';
    return;
  }

  emptyState.hidden = true;
  resultsCount.textContent = `${consultants.length} consultant${consultants.length !== 1 ? 's' : ''} found`;

  cardsGrid.innerHTML = consultants.map((c, i) => {
    const tags = extractTags(c.expertise);
    const tagsHtml = tags.slice(0, 6).map(t =>
      `<span class="tag">${t}</span>`
    ).join('') + (tags.length > 6 ? `<span class="tag">+${tags.length - 6}</span>` : '');

    const locationHtml = c.location ? `
      <div class="card-location">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        ${c.location}
      </div>` : '';

    const languagesHtml = c.languages ? `
      <div class="card-languages">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
        </svg>
        ${c.languages}
      </div>` : '';

    return `
      <div class="card" data-index="${i}" role="button" tabindex="0" aria-label="View ${c.name}'s profile">
        <div class="card-header">
          <div class="card-name">${c.name}</div>
        </div>
        ${locationHtml}
        ${tags.length > 0 ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        ${languagesHtml}
      </div>
    `;
  }).join('');
}

function openModal(consultant) {
  const c = consultant;
  const tags = extractTags(c.expertise);

  let linksHtml = '';
  if (c.linkedin) {
    linksHtml += `<a href="${c.linkedin}" target="_blank" rel="noopener" class="modal-link linkedin">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      LinkedIn
    </a>`;
  }
  if (c.email) {
    linksHtml += `<a href="mailto:${c.email}" class="modal-link email">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      Email
    </a>`;
  }

  // Check if notes contain a URL (website)
  const urlMatch = c.notes && c.notes.match(/https?:\/\/[^\s,]+/);
  if (urlMatch) {
    linksHtml += `<a href="${urlMatch[0]}" target="_blank" rel="noopener" class="modal-link website">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
      Website
    </a>`;
  }

  // Clean notes — remove URLs that we already show as buttons
  let cleanNotes = c.notes || '';
  if (urlMatch) {
    cleanNotes = cleanNotes.replace(urlMatch[0], '').trim();
    // Remove trailing/leading punctuation leftovers
    cleanNotes = cleanNotes.replace(/^[\s,;.]+|[\s,;.]+$/g, '');
  }

  modalBody.innerHTML = `
    <div class="modal-name">${c.name}</div>
    ${c.location ? `<div class="modal-location">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      ${c.location}
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-section-title">Areas of Expertise</div>
      <p>${c.expertise}</p>
      ${tags.length > 0 ? `<div class="modal-tags" style="margin-top: 0.5rem">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>

    ${c.languages ? `<div class="modal-section">
      <div class="modal-section-title">Working Languages</div>
      <p>${c.languages}</p>
    </div>` : ''}

    ${cleanNotes ? `<div class="modal-section">
      <div class="modal-section-title">Additional Information</div>
      <p>${cleanNotes}</p>
    </div>` : ''}

    ${linksHtml ? `<div class="modal-links">${linksHtml}</div>` : ''}
  `;

  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

// ===== Filtering Logic =====
function filterConsultants() {
  const query = searchQuery.toLowerCase();

  const filtered = allConsultants.filter(c => {
    // Text search
    if (query) {
      const searchable = [c.name, c.location, c.expertise, c.languages].join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    // Expertise filter
    if (activeExpertise.size > 0) {
      const tags = extractTags(c.expertise);
      const hasExpertise = [...activeExpertise].some(t => tags.includes(t));
      if (!hasExpertise) return false;
    }

    // Skills filter
    if (activeSkills.size > 0) {
      const tags = extractTags(c.expertise);
      const hasSkill = [...activeSkills].some(t => tags.includes(t));
      if (!hasSkill) return false;
    }

    // Language filter
    if (activeLanguages.size > 0) {
      const langs = c.languages ? c.languages.split(/[,;\n]|\band\b/).map(l => normalizeLanguage(l.trim())).filter(Boolean) : [];
      const hasLang = [...activeLanguages].some(t => langs.includes(t));
      if (!hasLang) return false;
    }

    // Country filter
    if (activeCountries.size > 0) {
      const country = c.location ? normalizeCountry(c.location.trim()) : '';
      if (!activeCountries.has(country)) return false;
    }

    return true;
  });

  renderCards(filtered);
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Search
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearSearchBtn.hidden = !searchInput.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      filterConsultants();
    }, 250);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.hidden = true;
    filterConsultants();
    searchInput.focus();
  });

  // Filter chips (event delegation)
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    const filter = chip.dataset.filter;
    const tag = chip.dataset.tag;
    const setMap = { expertise: activeExpertise, skills: activeSkills, language: activeLanguages, country: activeCountries };
    const set = setMap[filter];
    if (!set) return;

    if (set.has(tag)) {
      set.delete(tag);
    } else {
      set.add(tag);
    }

    renderFilters();
    filterConsultants();
  });

  // Clear all filters
  clearFiltersBtn.addEventListener('click', resetFilters);
  resetAll.addEventListener('click', () => {
    resetFilters();
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.hidden = true;
    filterConsultants();
  });

  // Card clicks (event delegation)
  cardsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const index = parseInt(card.dataset.index);
    const filtered = getFilteredConsultants();
    if (filtered[index]) openModal(filtered[index]);
  });

  // Keyboard support for cards
  cardsGrid.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.card');
      if (!card) return;
      e.preventDefault();
      card.click();
    }
  });

  // Modal close
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
  });
}

function getFilteredConsultants() {
  const query = searchQuery.toLowerCase();
  return allConsultants.filter(c => {
    if (query) {
      const searchable = [c.name, c.location, c.expertise, c.languages].join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    if (activeExpertise.size > 0) {
      const tags = extractTags(c.expertise);
      if (![...activeExpertise].some(t => tags.includes(t))) return false;
    }
    if (activeSkills.size > 0) {
      const tags = extractTags(c.expertise);
      if (![...activeSkills].some(t => tags.includes(t))) return false;
    }
    if (activeLanguages.size > 0) {
      const langs = c.languages ? c.languages.split(/[,;\n]|\band\b/).map(l => normalizeLanguage(l.trim())).filter(Boolean) : [];
      if (![...activeLanguages].some(t => langs.includes(t))) return false;
    }
    if (activeCountries.size > 0) {
      const country = c.location ? normalizeCountry(c.location.trim()) : '';
      if (!activeCountries.has(country)) return false;
    }
    return true;
  });
}

function resetFilters() {
  activeExpertise.clear();
  activeSkills.clear();
  activeLanguages.clear();
  activeCountries.clear();
  renderFilters();
  filterConsultants();
}

// ===== Init =====
async function init() {
  setupEventListeners();
  renderFilters();

  allConsultants = await fetchConsultants();
  buildDynamicTags(allConsultants);
  loadingEl.hidden = true;

  renderFilters();
  renderCards(allConsultants);
}

init();
