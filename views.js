/* AarogyaVaani — view layer (pure render functions, no state mutation) */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function animWords(text) {
  const parts = String(text || '').split(/(\s+)/);
  let n = 0;
  return parts.map(part => {
    if (!part.trim()) return part;
    const delay = Math.min(n * 32, 1800);
    n += 1;
    return `<span class="aw" style="animation-delay:${delay}ms">${esc(part)}</span>`;
  }).join('');
}
function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

const KIOSK_STEPS = ['welcome', 'identity', 'demographics', 'consent', 'vitals', 'complaint', 'interview', 'department', 'ayush', 'scan', 'review', 'done'];

/* ============ shell ============ */
const APP_NAV = [
  { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', ic: 'home' },
  { id: 'kiosk', label: 'Patient kiosk', labelHi: 'रोगी कियोस्क', ic: 'user' },
  { id: 'doctor', label: 'Doctor console', labelHi: 'डॉक्टर कंसोल', ic: 'steth' },
  { id: 'triage', label: 'Triage desk', labelHi: 'ट्रायज डेस्क', ic: 'alert' },
  { id: 'ayur', label: 'AyurVaani', labelHi: 'आयुर्वाणी', ic: 'leaf' },
  { id: 'admin', label: 'Admin & audit', labelHi: 'एडमिन', ic: 'shield' }
];

const MODULE_CARDS = [
  {
    id: 'kiosk', n: '01', tone: 'mint', ic: 'user',
    title: 'Patient kiosk', titleHi: 'रोगी कियोस्क',
    cta: 'Open Patient kiosk', ctaHi: 'कियोस्क खोलें',
    bullets: ['Multi-language interface', 'Symptom checker (AI-powered)', 'AYUSH recommendations'],
    bulletsHi: ['बहुभाषी इंटरफ़ेस', 'लक्षण जाँच (एआई)', 'आयुष सुझाव']
  },
  {
    id: 'doctor', n: '02', tone: 'sky', ic: 'steth',
    title: 'Doctor console', titleHi: 'डॉक्टर कंसोल',
    cta: 'Open Doctor console', ctaHi: 'कंसोल खोलें',
    bullets: ['Patient history & reports', 'AI-assisted treatment suggestions', 'Prescription & follow-up management'],
    bulletsHi: ['इतिहास और रिपोर्ट', 'एआई उपचार सुझाव', 'पर्चा और फ़ॉलो-अप']
  },
  {
    id: 'triage', n: '03', tone: 'sand', ic: 'alert',
    title: 'Triage desk', titleHi: 'ट्रायज डेस्क',
    cta: 'Open Triage desk', ctaHi: 'ट्रायज खोलें',
    bullets: ['AI-based risk stratification', 'Queue & token management', 'Real-time patient flow monitoring'],
    bulletsHi: ['जोखिम स्तर', 'कतार और टोकन', 'लाइव रोगी प्रवाह']
  },
  {
    id: 'ayur', n: '04', tone: 'lilac', ic: 'leaf',
    title: 'AyurVaani', titleHi: 'आयुर्वाणी',
    cta: 'Open AyurVaani', ctaHi: 'आयुर्वाणी खोलें',
    bullets: ['Natural language queries', 'Evidence-based AYUSH knowledge', 'Personalized wellness suggestions'],
    bulletsHi: ['प्राकृतिक भाषा प्रश्न', 'आयुष ज्ञान', 'व्यक्तिगत सुझाव']
  },
  {
    id: 'admin', n: '05', tone: 'sage', ic: 'gear',
    title: 'Admin & audit', titleHi: 'एडमिन और ऑडिट',
    cta: 'Open Admin & audit', ctaHi: 'एडमिन खोलें',
    bullets: ['User roles & permissions', 'System logs & audit trail', 'Compliance & MIS reports'],
    bulletsHi: ['भूमिकाएँ', 'सिस्टम लॉग', 'अनुपालन रिपोर्ट']
  }
];

function staffDisplayName() {
  const n = String((STATE.staff && STATE.staff.name) || '').trim();
  if (!n) return isHi() ? 'स्टाफ़' : 'Staff';
  return /dr/i.test(n) ? n : 'Dr. ' + n;
}

function brandLogo(kind) {
  const cls = kind === 'hero' ? 'brand-logo hero-logo' : kind === 'side' ? 'brand-logo sb-logo' : 'brand-logo';
  return `<img class="${cls}" src="./assets/logo.jpg" alt="AarogyaVaani MediKiosk" />`;
}

function brandBlock() {
  return `<div class="brand">${brandLogo()}</div>`;
}

function consultButtons(size) {
  const cls = size === 'lg' ? 'btn primary' : 'btn primary';
  const cls2 = 'btn secondary';
  return `<div class="cta-row">
    <button class="${cls}" data-act="startConsult">${icon('arrow', 16)} ${isHi() ? 'परामर्श शुरू करें' : 'Start Consultation'}</button>
    <button class="${cls2}" data-act="enterApp">${icon('grid', 16)} ${isHi() ? 'मेडीकियोस्क देखें' : 'Explore MediKiosk'}</button>
  </div>`;
}

function notifyMenu() {
  const open = !!(STATE.ui && STATE.ui.notifyOpen);
  const items = (STATE.audit || []).slice().reverse().slice(0, 8);
  return `<div class="notify-wrap">
    <button class="icon-btn" data-act="toggleNotify" aria-expanded="${open ? 'true' : 'false'}" aria-label="${isHi() ? 'सूचनाएँ' : 'Notifications'}">${icon('bell', 18)}${items.length ? `<span class="notify-dot">${items.length}</span>` : ''}</button>
    ${open ? `<div class="notify-panel" role="dialog" aria-label="${isHi() ? 'ऑडिट सूचनाएँ' : 'Audit notifications'}">
      <div class="notify-head"><b>${isHi() ? 'सूचनाएँ' : 'Notifications'}</b><button class="tiny" data-act="toggleNotify">✕</button></div>
      ${items.length ? items.map(a => `<div class="notify-item"><b>${esc(a.action)}</b><small>${esc(a.actor || 'kiosk')} · ${esc(a.time || '')}</small></div>`).join('') : `<p class="quiet" style="padding:12px">${isHi() ? 'अभी कोई सूचना नहीं' : 'No notifications yet'}</p>`}
    </div>` : ''}
  </div>`;
}

function appSidebar() {
  const collapsed = !!(STATE.ui && STATE.ui.sidebarCollapsed);
  const view = STATE.view;
  const nav = APP_NAV.map(item => {
    const on = view === item.id;
    const label = isHi() ? item.labelHi : item.label;
    return `<button class="sb-item ${on ? 'on' : ''}" data-act="setView" data-view="${item.id}" title="${esc(label)}">
      ${icon(item.ic, 18)}<span>${esc(label)}</span>
    </button>`;
  }).join('');
  return `<aside class="app-sidebar ${collapsed ? 'collapsed' : ''}" aria-label="MediKiosk navigation">
    <div class="sb-brand">${brandLogo('side')}</div>
    <nav class="sb-nav">${nav}</nav>
    <div class="sb-foot">
      <button class="sb-item ${view === 'settings' ? 'on' : ''}" data-act="setView" data-view="settings" title="${isHi() ? 'सेटिंग्स' : 'Settings'}">${icon('gear', 18)}<span>${isHi() ? 'सेटिंग्स' : 'Settings'}</span></button>
      <button class="sb-item" data-act="appLogout" title="${isHi() ? 'लॉग आउट' : 'Log out'}">${icon('logout', 18)}<span>${isHi() ? 'लॉग आउट' : 'Log out'}</span></button>
      <div class="sb-ayush">${collapsed ? '' : `<div class="sb-mortar" aria-hidden="true">${landingMortarSvg()}</div><p>“${isHi() ? 'स्वस्थ भारत के लिए समग्र स्वास्थ्य' : 'Holistic Health for a Healthier India'}”</p><small>Ministry of AYUSH</small>`}</div>
    </div>
  </aside>`;
}

function appTopbar() {
  const showSearch = STATE.view === 'dashboard';
  const q = (STATE.ui && STATE.ui.dashQuery) || '';
  return `<header class="topbar app-topbar">
    <div class="top-left">
      <button class="icon-btn" data-act="toggleSidebar" aria-label="${isHi() ? 'साइडबार' : 'Toggle sidebar'}">${icon('grid', 18)}</button>
      ${brandBlock()}
    </div>
    ${showSearch ? `<label class="top-search"><span class="sr-only">${isHi() ? 'मॉड्यूल खोजें' : 'Search modules'}</span>${icon('search', 16)}<input data-field="dashQuery" value="${esc(q)}" placeholder="${isHi() ? 'मरीज़, रिकॉर्ड या मॉड्यूल…' : 'Search patients, records, or modules…'}" /></label>` : '<div class="top-search-spacer"></div>'}
    <div class="top-right">
      ${STATE.view === 'doctor' && !STATE.staffLogin ? `<button class="ai-open-btn ${STATE.ai.open ? 'on' : ''}" data-act="toggleAi" aria-label="${isHi() ? 'DocBot खोलें' : 'Open DocBot'}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 3Z" fill="currentColor"/></svg>
        DocBot
      </button>` : ''}
      ${STATE.view !== 'kiosk' ? notifyMenu() : ''}
      ${STATE.view === 'doctor' && staffVerified()
        ? `<span class="staff-chip profile-chip" title="${esc(staffDisplayName())}"><span class="avatar-mini">${esc(initials(STATE.staff.name || 'DA'))}</span><span class="profile-meta"><b>${esc(staffDisplayName())}</b><small>${isHi() ? 'डॉक्टर' : 'Doctor'}</small></span></span>`
        : STATE.view !== 'kiosk' && STATE.view !== 'landing' && !staffVerified()
          ? `<button class="tiny" data-act="setView" data-view="doctor">${isHi() ? 'स्टाफ़ लॉगिन' : 'Staff login'}</button>`
          : ''}
    </div>
  </header>`;
}

function viewShell(inner) {
  if (STATE.view === 'landing') {
    return `<div class="shell landing-shell">
      <header class="landing-top">
        ${brandBlock()}
        <div class="top-right">
          <button class="btn secondary sm" data-act="enterApp">${isHi() ? 'मेडीकियोस्क में जाएँ' : 'Enter MediKiosk'}</button>
          <button class="btn primary sm" data-act="startConsult">${isHi() ? 'परामर्श शुरू' : 'Start Consultation'}</button>
        </div>
      </header>
      ${inner}
      ${pairOverlay()}
    </div>`;
  }
  return `<div class="shell app-shell ${STATE.ui && STATE.ui.sidebarCollapsed ? 'sb-collapsed' : ''}">
    ${appSidebar()}
    <div class="app-col">
      ${appTopbar()}
      ${inner}
      ${STATE.view !== 'dashboard' && STATE.view !== 'settings' && STATE.view !== 'ayur' ? voiceCommandDock() : ''}
      ${pairOverlay()}
    </div>
  </div>`;
}

function landingMortarSvg() {
  return `<svg viewBox="0 0 88 72" width="88" height="72" aria-hidden="true">
    <ellipse cx="44" cy="62" rx="22" ry="6" fill="#0E7C6B" opacity=".12"/>
    <path d="M18 34h52l-6 22H24z" fill="#0E7C6B"/>
    <path d="M16 30h56c0 4-6 8-28 8S16 34 16 30Z" fill="#147A68"/>
    <path d="M58 12c8 6 12 16 8 22" stroke="#2F7A53" stroke-width="3" fill="none"/>
    <circle cx="66" cy="12" r="5" fill="#3D9B6A"/>
    <path d="M28 18c-6 8-4 16 2 18" stroke="#0A5B4E" stroke-width="2.5" fill="none"/>
  </svg>`;
}

function landingHeroArt() {
  return `<div class="hero-art">${brandLogo('hero')}</div>`;
}

function fmtStat(n) {
  if (n == null || n === '') return '—';
  const x = Number(n);
  if (!Number.isFinite(x)) return esc(n);
  return x.toLocaleString(isHi() ? 'hi-IN' : 'en-IN');
}

function liveStatsPills() {
  const st = (STATE.ui && STATE.ui.stats) || { status: 'idle' };
  if (st.status === 'loading' || st.status === 'idle') {
    return `<div class="stat-pills" role="status">${[0, 1, 2].map(() => `<div class="stat-pill loading"><span class="skel"></span></div>`).join('')}</div>`;
  }
  if (st.status === 'error') {
    return `<div class="stat-pills error-pills" role="alert">
      <p>${esc(st.error || (isHi() ? 'आँकड़े नहीं मिले' : 'Could not load live stats'))}</p>
      <button class="btn secondary sm" data-act="retryStats">${isHi() ? 'फिर कोशिश' : 'Retry'}</button>
    </div>`;
  }
  const d = st.dashboard || {};
  const health = st.health || {};
  const sessions = d.sessions != null ? d.sessions : health.sessions;
  const patients = d.patientsServed != null ? d.patientsServed : sessions;
  const today = d.sessionsToday;
  const growth = d.monthlyGrowthPct;
  return `<div class="stat-pills">
    <div class="stat-pill"><span class="sp-ic">${icon('user', 16)}</span><div><b>${fmtStat(patients)}</b><small>${isHi() ? 'मरीज़ सेवित' : 'Patients served'}</small></div></div>
    <div class="stat-pill"><span class="sp-ic">${icon('grid', 16)}</span><div><b>${fmtStat(sessions)}</b><small>${isHi() ? 'सत्र (स्टोर)' : 'Sessions in store'}</small></div></div>
    <div class="stat-pill"><span class="sp-ic">${icon('clock', 16)}</span><div><b>${today == null ? '—' : fmtStat(today)}</b><small>${isHi() ? 'आज के सत्र' : 'Sessions today'}</small></div></div>
    ${growth == null ? '' : `<div class="stat-pill"><span class="sp-ic">${icon('pulse', 16)}</span><div><b>${growth > 0 ? '+' : ''}${fmtStat(growth)}%</b><small>${isHi() ? 'मासिक वृद्धि' : 'Monthly growth'}</small></div></div>`}
  </div>`;
}

function moduleCard(m, opts) {
  const q = ((opts && opts.query) || '').trim().toLowerCase();
  const title = isHi() ? m.titleHi : m.title;
  const bullets = isHi() ? m.bulletsHi : m.bullets;
  const hay = [title, m.title, (bullets || []).join(' ')].join(' ').toLowerCase();
  if (q && hay.indexOf(q) < 0) return '';
  const cta = isHi() ? m.ctaHi : m.cta;
  return `<article class="mod-card tone-${m.tone}" data-reveal>
    <div class="mod-copy">
      <span class="mod-n">${esc(m.n)}</span>
      <div class="mod-icon">${icon(m.ic, 22)}</div>
      <h3>${esc(title)}</h3>
      <ul>${bullets.map(b => `<li>${icon('check', 14)} ${esc(b)}</li>`).join('')}</ul>
      <button class="btn primary sm" data-act="setView" data-view="${m.id}">${esc(cta)} ${icon('arrow', 14)}</button>
    </div>
    <div class="mod-art" aria-hidden="true">${moduleArt(m.id)}</div>
  </article>`;
}

function moduleArt(id) {
  if (id === 'kiosk') return `<svg viewBox="0 0 120 120" width="120" height="120"><rect x="38" y="18" width="44" height="74" rx="8" fill="#D7EFE4" stroke="#0E7C6B" stroke-width="3"/><rect x="46" y="28" width="28" height="24" rx="4" fill="#0E7C6B"/><circle cx="60" cy="68" r="6" fill="#0E7C6B"/></svg>`;
  if (id === 'doctor') return `<svg viewBox="0 0 120 120" width="120" height="120"><rect x="22" y="28" width="52" height="64" rx="8" fill="#E5F2FC" stroke="#1D6FBE" stroke-width="2"/><path d="M78 44c12 8 14 28 4 40" stroke="#1D6FBE" stroke-width="3" fill="none"/><circle cx="86" cy="88" r="8" fill="#1D6FBE"/></svg>`;
  if (id === 'triage') return `<svg viewBox="0 0 120 120" width="120" height="120"><path d="M60 22 22 88h76z" fill="#FBEBDE" stroke="#9E5615" stroke-width="2"/><path d="M60 48v22M60 78h.01" stroke="#9E5615" stroke-width="3" stroke-linecap="round"/></svg>`;
  if (id === 'ayur') return `<svg viewBox="0 0 120 120" width="120" height="120"><path d="M40 88c0-28 18-48 48-52-4 28-18 48-48 52Z" fill="#EDE4F8" stroke="#6B4EA1" stroke-width="2"/><path d="M36 88h40" stroke="#6B4EA1" stroke-width="3"/></svg>`;
  return `<svg viewBox="0 0 120 120" width="120" height="120"><rect x="28" y="36" width="64" height="44" rx="8" fill="#E8F1EC" stroke="#2F7A53" stroke-width="2"/><path d="M40 78v12h40V78" stroke="#2F7A53" stroke-width="2"/></svg>`;
}

function viewLanding() {
  const steps = isHi()
    ? [['01', 'पंजीकरण', 'भाषा, पहचान और सहमति'], ['02', 'लक्षण', 'आवाज़ या स्पर्श से शिकायत'], ['03', 'एआई आकलन', 'लाल झंडे और आयुष पार्श्व'], ['04', 'डॉक्टर', 'संरचित सारांश की समीक्षा']]
    : [['01', 'Register', 'Language, identity and consent'], ['02', 'Symptoms', 'Voice or touch for the complaint'], ['03', 'AI assessment', 'Red flags and AYUSH context'], ['04', 'Doctor', 'Review the structured summary']];
  const a11y = isHi()
    ? [['६ भाषाएँ', 'हिन्दी से तेलुगु तक'], ['४४px स्पर्श', 'कियोस्क के लिए बड़े बटन'], ['आवाज़', 'बोलें और सुनें'], ['कम गति', 'prefers-reduced-motion']]
    : [['6 languages', 'Hindi through Telugu'], ['44px+ targets', 'Kiosk-sized controls'], ['Voice in & out', 'Speak and listen'], ['Motion-safe', 'Respects reduced motion']];
  return `<main class="landing">
    <section class="hero">
      <div class="hero-copy" data-reveal>
        <span class="eyebrow">${isHi() ? 'आयुष · स्मार्ट ओपीडी' : 'AYUSH · smart OPD'}</span>
        <h1>${isHi() ? 'आरोग्यवाणी मेडीकियोस्क में स्वागत है' : 'Welcome to AarogyaVaani MediKiosk'}</h1>
        <p class="subtitle">${isHi() ? 'स्मार्ट, सुलभ, एआई-सहायक स्वास्थ्य सेवा — रोगी की बात को डॉक्टर-तैयार रिकॉर्ड में बदलती है।' : 'Smart, accessible, AI-assisted healthcare that turns a patient’s story into a doctor-ready record.'}</p>
        ${consultButtons('lg')}
        ${liveStatsPills()}
      </div>
      ${landingHeroArt()}
    </section>
    <section class="land-section" data-reveal>
      <h2>${isHi() ? 'क्या-क्या कर सकते हैं' : 'What you can do'}</h2>
      <p class="subtitle">${isHi() ? 'हर कार्ड असली मॉड्यूल खोलता है।' : 'Each card opens a real working module.'}</p>
      <div class="mod-grid">${MODULE_CARDS.map(m => moduleCard(m)).join('')}</div>
    </section>
    <section class="land-section how" data-reveal>
      <h2>${isHi() ? 'यह कैसे काम करता है' : 'How it works'}</h2>
      <ol class="how-track">
        ${steps.map((s, i) => `<li data-reveal style="--d:${i * 80}ms"><span>${esc(s[0])}</span><b>${esc(s[1])}</b><small>${esc(s[2])}</small></li>`).join('')}
      </ol>
    </section>
    <section class="wisdom" data-reveal>
      <figure>
        <blockquote>${isHi() ? 'पारंपरिक ज्ञान। कल की तकनीक।' : 'Traditional Wisdom. Technology for Tomorrow.'}</blockquote>
        <figcaption>Ministry of AYUSH</figcaption>
      </figure>
      <div class="wisdom-pills">
        <span>Ayurveda</span><span>Yoga</span><span>Unani</span><span>Siddha</span>
      </div>
    </section>
    <section class="land-section a11y-grid" data-reveal>
      <h2>${isHi() ? 'सुलभता' : 'Accessibility highlights'}</h2>
      <div class="a11y-cards">${a11y.map(x => `<div class="a11y-card"><b>${esc(x[0])}</b><small>${esc(x[1])}</small></div>`).join('')}</div>
    </section>
    <section class="land-cta" data-reveal>
      <h2>${isHi() ? 'कियोस्क शुरू करें' : 'Ready for the kiosk'}</h2>
      ${consultButtons('lg')}
    </section>
    <footer class="land-foot">
      <span>${isHi() ? 'सभी के लिए आयुष' : 'AYUSH for All'}</span>
      <span>${isHi() ? 'सुरक्षित और अनुपालन' : 'Secure & Compliant'}</span>
      <span>${isHi() ? 'स्वास्थ्य सेवा को सशक्त' : 'Empowering Healthcare'}</span>
    </footer>
  </main>`;
}

function viewDashboard() {
  const q = (STATE.ui && STATE.ui.dashQuery) || '';
  const cards = MODULE_CARDS.map(m => moduleCard(m, { query: q })).join('');
  const hello = isHi() ? 'मेडीकियोस्क डैशबोर्ड' : 'Good to see you again';
  return `<main class="dash dash-home">
    <section class="dash-hero">
      <div>
        <span class="eyebrow">${hello}</span>
        <h1>${isHi() ? 'कियोस्क में स्वागत है' : 'Welcome to Kiosk'}</h1>
        <p class="welcome-story">${animWords('Designed for the Ministry of Ayush, this smart intake platform beautifully bridges traditional healing with modern technology. By engaging patients in natural, multilingual conversations and instantly digitizing past medical records, it provides doctors with clear, physician-ready summaries—making every consultation smoother, faster, and deeply personalized.')}</p>
      </div>
      <aside class="dash-quote">
        <p>“${isHi() ? 'पारंपरिक ज्ञान। कल की तकनीक।' : 'Traditional Wisdom. Technology for Tomorrow.'}”</p>
        <small>Ministry of AYUSH</small>
        <div class="wisdom-pills compact"><span>Ayurveda</span><span>Yoga</span><span>Unani</span><span>Siddha</span></div>
      </aside>
    </section>
    <h2 class="mod-heading">${isHi() ? 'सिस्टम मॉड्यूल' : 'System Modules'}</h2>
    <p class="quiet">${isHi() ? 'आरोग्यवाणी मेडीकियोस्क के सभी मॉड्यूल' : 'Access all modules of AarogyaVaani · MediKiosk'}</p>
    <div class="mod-grid dash-mods">${cards || `<div class="empty">${isHi() ? 'कोई मॉड्यूल नहीं मिला' : 'No modules match that search'}</div>`}</div>
    <footer class="land-foot dash-foot">
      <span>${isHi() ? 'सभी के लिए आयुष' : 'AYUSH for All'}</span>
      <span>${isHi() ? 'सुरक्षित और अनुपालन' : 'Secure & Compliant'}</span>
      <span>${isHi() ? 'स्वास्थ्य सेवा को सशक्त' : 'Empowering Healthcare'}</span>
    </footer>
  </main>`;
}

function viewSettings() {
  const mute = !!(STATE.voice && STATE.voice.muted);
  return `<main class="dash settings-panel">
    <div class="dash-head"><div><h1>${isHi() ? 'सेटिंग्स' : 'Settings'}</h1>
      <p>${isHi() ? 'भाषा और आवाज़ — कियोस्क यहीं से चलता है।' : 'Language and voice for this kiosk.'}</p></div></div>
    <div class="two-col">
      <section class="card">
        <div class="section-head"><h3>${icon('translate', 16)} ${isHi() ? 'भाषा' : 'Language'}</h3></div>
        <div class="lang-grid" style="margin:16px">${LANGS.map(l => `<button class="lang-tile ${STATE.lang === l.id ? 'on' : ''}" data-act="setLang" data-lang="${l.id}">
          <span class="native">${esc(l.native)}</span><span class="en">${esc(l.english)}</span>
        </button>`).join('')}</div>
      </section>
      <section class="card">
        <div class="section-head"><h3>${icon('volume', 16)} ${isHi() ? 'आवाज़' : 'Voice'}</h3></div>
        <div class="list-row"><div><b>${isHi() ? 'कियोस्क वाचन' : 'Kiosk read-aloud'}</b><small>${mute ? (isHi() ? 'मौन' : 'Muted') : (isHi() ? 'चालू' : 'On')}</small></div>
          <button class="btn secondary sm" data-act="voiceMute">${mute ? (isHi() ? 'अनम्यूट' : 'Unmute') : (isHi() ? 'म्यूट' : 'Mute')}</button></div>
        <div style="padding:16px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary sm" data-act="retryStats">${isHi() ? 'फिर जाँचें' : 'Recheck connection'}</button>
          <button class="btn secondary sm" data-act="enterApp">${isHi() ? 'डैशबोर्ड' : 'Back to dashboard'}</button>
        </div>
      </section>
    </div>
  </main>`;
}

/* ============ voice AI command dock (floating orb + text bar) ============ */
function voiceCommandDock() {
  const V = STATE.voice || { listening: false, busy: false, last: '', reply: '', error: '', live: true, muted: false, log: [] };
  const open = true;
  const status = V.listening
    ? (isHi() ? 'सुन रही हूँ… स्क्रीन के बारे में बोलिए' : 'Listening… speak to fill this screen')
    : V.busy
      ? (isHi() ? 'समझ रही हूँ…' : 'Working on it…')
      : V.live
        ? (isHi() ? 'लाइव मोड चालू — बोलते रहिए' : 'Live mode on — keep talking')
        : (isHi() ? 'माइक दबाएँ, या लिखें — "हिंदी", "नया मरीज़", "सीने में दर्द"' : 'Tap the mic, or type — "Hindi", "new patient", "chest pain"');
  const log = (V.log || []).slice(0, 2);
  return `<div class="voice-dock ${open ? 'open' : ''} ${V.live ? 'live' : ''}">
    ${(V.reply || V.error) ? `<div class="voice-toast ${V.error ? 'err' : ''}">
      ${V.error ? icon('alert', 14) : icon('check', 14)} <span>${esc(V.error || V.reply)}</span>
      <button class="tiny" data-act="voiceDismiss">✕</button>
    </div>` : ''}
    ${log.length && !V.reply && !V.error ? `<div class="voice-log">${log.map(m => `<span class="${m.role}">${esc(m.text)}</span>`).join('')}</div>` : ''}
    <div class="voice-bar">
      <button class="voice-orb ${V.listening ? 'listening' : ''} ${V.busy ? 'busy' : ''}" data-act="voiceOrb" aria-label="${isHi() ? 'आवाज़ से कमांड' : 'Voice command'}" title="${isHi() ? 'आवाज़ से कमांड' : 'Voice command'}">
        ${V.listening
          ? '<span class="orb-wave"></span>'
          : `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"/></svg>`}
      </button>
      <input class="voice-input" data-field="voiceText" value="${esc(V.last || '')}" placeholder="${esc(status)}" aria-label="${isHi() ? 'कमांड लिखें' : 'Type a command'}" />
      <button class="voice-live ${V.live ? 'on' : ''}" data-act="voiceLive" aria-pressed="${V.live ? 'true' : 'false'}" title="${isHi() ? 'लाइव बातचीत' : 'Live conversation'}">${isHi() ? 'लाइव' : 'LIVE'}</button>
      <button class="voice-go ${String(V.last || '').trim() ? '' : 'dis'}" data-act="voiceSend" ${V.busy ? 'disabled' : ''} aria-label="${isHi() ? 'भेजें' : 'Send'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12 20 4l-6 16-3.5-6.5L4 12Z"/><path d="M20 4 10.5 13.5"/></svg>
      </button>
    </div>
  </div>`;
}

function pairOverlay() {
  const pair = STATE.scan && STATE.scan.pair;
  if (!(pair && pair.open)) return '';
  const hi = isHi();
  const received = pair.received || [];
  return `<div class="pair-overlay" role="dialog" aria-modal="true" aria-labelledby="pairTitle">
      <div class="pair-modal">
        <h2 id="pairTitle">${hi ? 'QR दिखाएँ' : 'Show QR code'}</h2>
        <p>${hi ? 'मरीज़: अपने फ़ोन का कैमरा खोलकर यह कोड स्कैन करें।' : 'Patient: open the camera on your phone and scan this code.'}</p>
        ${pair.lanWarn ? `<p class="pair-warn" role="status">${hi
          ? 'यह कियोस्क localhost पर खुला है — फ़ोन नहीं खोल पाएगा। कियोस्क को Wi‑Fi IP से खोलें (जैसे http://192.168.x.x:4173)।'
          : 'This kiosk is on localhost — a phone cannot open that address. Open the kiosk using this computer’s Wi‑Fi IP (for example http://192.168.x.x:4173).'}</p>` : ''}
        ${pair.loading ? `<p class="quiet">${hi ? 'QR बन रहा है…' : 'Generating QR…'}</p>` : ''}
        ${pair.error ? `<p class="scan-error" role="alert">${icon('alert', 14)} ${esc(pair.error)}</p>` : ''}
        <div id="pairQr" class="pair-qr" aria-label="QR code"></div>
        ${pair.code ? `<div class="pair-code-wrap"><span>${hi ? 'पेयरिंग कोड' : 'Pairing code'}</span><b class="pair-code">${esc(pair.code)}</b></div>` : ''}
        ${received.length ? `<div class="pair-received" role="status">${received.map(d => `<div class="pair-doc">${d.preview ? `<img src="${esc(d.preview)}" alt="" />` : ''}<span>${esc(d.filename)}</span></div>`).join('')}</div>` : `<p class="quiet">${hi ? 'फ़ोन से फ़ोटो आने का इंतज़ार…' : 'Waiting for a photo from the phone…'}</p>`}
        <button class="btn secondary pair-close" data-act="closePairQr">${hi ? 'रद्द करें' : 'Cancel'}</button>
      </div>
    </div>`;
}

function kioskFrame(body, opts = {}) {
  const idx = KIOSK_STEPS.indexOf(STATE.step);
  const visible = KIOSK_STEPS.filter(s => s !== 'done');
  const dots = visible.map((s, i) => `<i class="${i < idx ? 'done' : i === idx ? 'now' : ''}"></i>`).join('');
  return `<main class="kiosk-stage">
    ${emergencySideBtn()}
    <section class="kiosk-card">
    <div class="kiosk-head">
      <span class="secure">${icon('lock', 16)} ${isHi() ? 'आपकी जानकारी सुरक्षित है' : 'Your information is protected'}</span>
      <div class="steps">${dots}<span>${Math.max(idx, 0) + 1}/${visible.length}</span></div>
    </div>
    <div class="kiosk-body">${body}</div>
    <div class="kiosk-foot">
      ${opts.back === false ? `<button class="btn ghost" data-act="staff">${icon('phone', 16)} ${t('staff')}</button>` : `<button class="btn ghost" data-act="back">${icon('back', 16)} ${t('back')}</button>`}
      <div style="display:flex;gap:10px;align-items:center">
        ${opts.skip ? `<button class="btn ghost" data-act="skip">${t('skip')}</button>` : ''}
        ${opts.hideNext ? '' : `<button class="btn primary" data-act="next" ${opts.nextDisabled ? 'disabled' : ''}>${esc(opts.nextLabel || t('next'))} ${icon('arrow', 16)}</button>`}
      </div>
    </div>
  </section></main>`;
}

function emergencySideBtn() {
  if (STATE.em && STATE.em.phase) return '';
  return `<button class="em-rail" data-act="emOpen" type="button">
    <span class="em-rail-ic" aria-hidden="true">🚨</span>
    <span class="em-rail-txt"><b>${isHi() ? 'आपात' : 'EMERGENCY'}</b><small>${isHi() ? 'तुरंत मदद?' : 'Need help now?'}</small></span>
  </button>`;
}

function viewEmModule() {
  const E = STATE.em || {};
  if (E.phase === 'form') return viewEmForm();
  if (E.phase === 'ready') return viewEmReady();
  if (E.phase === 'sent') return viewEmSent();
  return viewEmStart();
}

function viewEmStart() {
  return `<main class="kiosk-stage em-stage"><section class="kiosk-card em-card">
    <div class="em-banner">
      <span class="em-ico">🚨</span>
      <div>
        <span class="eyebrow em-eyebrow">${isHi() ? 'आपात मॉड्यूल' : 'EMERGENCY'}</span>
        <h1 class="display">${isHi() ? 'तुरंत चिकित्सा मदद चाहिए?' : 'Need immediate medical help?'}</h1>
        <p class="subtitle">${isHi() ? 'यह केस डॉक्टर की कतार में नहीं जाएगा — सीधे ट्रायज डेस्क पर जाएगा।' : 'This case will not enter the regular OPD queue. It goes straight to the triage desk.'}</p>
      </div>
    </div>
    <div class="kiosk-foot" style="margin-top:8px">
      <button class="btn ghost" data-act="emClose">${isHi() ? 'वापस' : 'Back'}</button>
      <button class="btn em-start" data-act="emBegin">${isHi() ? 'शुरू करें' : 'START'}</button>
    </div>
  </section></main>`;
}

function viewEmForm() {
  const E = STATE.em;
  const err = E.errors || {};
  const yes = E.attendant === 'yes';
  return `<main class="kiosk-stage em-stage"><section class="kiosk-card em-card">
    <span class="eyebrow em-eyebrow">🚨 ${isHi() ? 'आपात इन्टेक' : 'EMERGENCY INTAKE'}</span>
    <h1 class="display">${isHi() ? 'जरूरी जानकारी लिखिए' : 'Tell us what is happening'}</h1>
    <div class="form-grid" style="margin-top:14px">
      ${field({ name: 'emName', label: isHi() ? 'मरीज़ का नाम' : 'Patient name', value: E.name, required: true, ph: isHi() ? 'अर्श सत्संगी' : 'Arsh Satsangi' })}
      <div class="field full">
        <label>${isHi() ? 'क्या समस्या है?' : 'What is the problem?'} <span class="req">*</span></label>
        <textarea class="input ${err.emProblem ? 'err' : ''}" data-field="emProblem" rows="3" placeholder="${isHi() ? 'तेज़ सीने का दर्द…' : 'Severe chest pain…'}">${esc(E.problem)}</textarea>
        ${err.emProblem ? `<span class="hint bad">${esc(err.emProblem)}</span>` : ''}
      </div>
      <div class="field full">
        <label>${isHi() ? 'क्या कोई साथ में है?' : 'Is someone accompanying you?'}</label>
        <div class="seg">
          <button data-act="emAttendant" data-val="yes" class="${yes ? 'on' : ''}">${isHi() ? 'हाँ' : 'Yes'}</button>
          <button data-act="emAttendant" data-val="no" class="${E.attendant === 'no' ? 'on' : ''}">${isHi() ? 'नहीं' : 'No'}</button>
        </div>
        ${err.attendant ? `<span class="hint bad">${esc(err.attendant)}</span>` : ''}
      </div>
      ${yes ? `
        ${field({ name: 'emRelName', label: isHi() ? 'रिश्तेदार का नाम' : "Relative's name", value: E.relName, required: true, ph: isHi() ? 'पूरा नाम' : 'Full name' })}
        ${field({ name: 'emRelPhone', label: isHi() ? 'रिश्तेदार का नंबर' : "Relative's contact", value: E.relPhone, required: true, inputmode: 'numeric', maxlength: 10, ph: '98XXXXXXXX' })}
        ${field({ name: 'emRelRelation', label: isHi() ? 'रिश्ता' : 'Relationship', type: 'select', value: E.relRelation, required: true, options: RELATIONS.map(r => ({ v: r.id, l: L(r) })) })}
      ` : ''}
    </div>
    <div class="kiosk-foot" style="margin-top:18px">
      <button class="btn ghost" data-act="emClose">${isHi() ? 'रद्द' : 'Cancel'}</button>
      <button class="btn em-start" data-act="emContinue">${isHi() ? 'आगे बढ़ें' : 'CONTINUE'}</button>
    </div>
  </section></main>`;
}

function viewEmReady() {
  const E = STATE.em;
  const rel = E.attendant === 'yes';
  const relLab = rel ? (labelOf(RELATIONS, E.relRelation) || E.relRelation) : '';
  return `<main class="kiosk-stage em-stage"><section class="kiosk-card em-card">
    <span class="eyebrow em-eyebrow">🚨 ${isHi() ? 'आपात जानकारी तैयार' : 'Emergency information ready'}</span>
    <h1 class="display">${isHi() ? 'ट्रायज को भेजें' : 'Send to triage'}</h1>
    <div class="em-summary">
      <div><small>${isHi() ? 'मरीज़' : 'Patient'}</small><b>${esc(E.name)}</b></div>
      <div><small>${isHi() ? 'समस्या' : 'Problem'}</small><b>${esc(E.problem)}</b></div>
      <div><small>${isHi() ? 'साथ वाला' : 'Attendant'}</small><b>${rel ? `${esc(relLab)} — ${esc(E.relName)} · ${esc(E.relPhone)}` : (isHi() ? 'आवश्यक नहीं' : 'Not required')}</b></div>
    </div>
    <p class="quiet" style="margin:14px 0 0">${isHi() ? 'यह केस डॉक्टर की सामान्य कतार में नहीं जाएगा। ट्रायज स्टाफ़ रास्ता तय करेगा।' : 'This will not join the regular doctor queue. Triage staff will choose the clinical pathway.'}</p>
    <div class="kiosk-foot" style="margin-top:18px">
      <button class="btn ghost" data-act="emBegin">${isHi() ? 'सही करें' : 'Edit'}</button>
      <button class="btn em-start" data-act="emSend">${isHi() ? 'ट्रायज डेस्क पर भेजें' : 'SEND TO TRIAGE'}</button>
    </div>
  </section></main>`;
}

function viewEmSent() {
  const E = STATE.em;
  return `<main class="kiosk-stage em-stage"><section class="kiosk-card em-card">
    <span class="eyebrow em-eyebrow">🚨 ${isHi() ? 'भेज दिया गया' : 'Sent'}</span>
    <h1 class="display">${isHi() ? 'ट्रायज डेस्क को मिल गया' : 'Triage desk has your case'}</h1>
    <p class="subtitle">${isHi() ? `आपात केस #${esc(E.caseNo || '')}। स्टाफ़ आपको बुलाएगा — कतार में इंतज़ार नहीं करना।` : `Emergency case #${esc(E.caseNo || '')}. Staff will call you — you are not in the regular queue.`}</p>
    <div class="kiosk-foot" style="margin-top:18px">
      <button class="btn em-start" data-act="emClose">${isHi() ? 'कियोस्क पर लौटें' : 'Back to kiosk'}</button>
    </div>
  </section></main>`;
}

/* ============ kiosk steps ============ */
function viewWelcome() {
  const body = `<span class="eyebrow">${icon('translate', 14)} Namaste · नमस्ते · वणक्कम्</span>
    <h1 class="display">${t('welcomeTitle')}</h1>
    <p class="subtitle">${t('welcomeSub')}</p>
    <div class="lang-grid">
      ${LANGS.map(l => `<button class="lang-tile ${STATE.lang === l.id ? 'on' : ''}" data-act="setLang" data-lang="${l.id}">
        <span class="native">${esc(l.native)}</span><span class="en">${esc(l.english)}</span><span class="meta">${esc(l.speakers)}</span>
      </button>`).join('')}
    </div>
    <div class="voice">
      <button class="mic-btn" data-act="speak">${icon('volume', 24)}</button>
      <div class="vtext"><b>${isHi() ? 'सुनकर समझें' : 'Listen instead of reading'}</b>
        <span>${isHi() ? 'बटन दबाइए, हर सवाल आपको पढ़कर सुनाया जाएगा।' : 'Tap to have every question read aloud to you.'}</span></div>
    </div>`;
  return kioskFrame(body, { back: false });
}

function field(o) {
  const err = (STATE.em && STATE.em.errors && STATE.em.errors[o.name]) || (STATE.errors && STATE.errors[o.name]);
  const val = esc(o.value || '');
  let control;
  if (o.type === 'select') {
    control = `<select class="input ${err ? 'err' : ''}" data-field="${o.name}">
      <option value="">${isHi() ? 'चुनिए' : 'Select'}</option>
      ${o.options.map(op => `<option value="${esc(op.v)}" ${o.value === op.v ? 'selected' : ''}>${esc(op.l)}</option>`).join('')}
    </select>`;
  } else if (o.type === 'textarea') {
    control = `<textarea class="input ${err ? 'err' : ''}" data-field="${o.name}" placeholder="${esc(o.ph || '')}">${val}</textarea>`;
  } else if (o.type === 'seg') {
    control = `<div class="seg ${o.compact ? 'compact' : ''}">${o.options.map(op => `<button data-act="setSeg" data-field="${o.name}" data-val="${esc(op.v)}" class="${o.value === op.v ? 'on' : ''}">${esc(op.l)}</button>`).join('')}</div>`;
  } else {
    control = `<input class="input ${err ? 'err' : ''}" data-field="${o.name}" value="${val}" type="${o.type || 'text'}" inputmode="${o.inputmode || 'text'}" placeholder="${esc(o.ph || '')}" ${o.maxlength ? `maxlength="${o.maxlength}"` : ''} />`;
  }
  return `<div class="field ${o.full ? 'full' : ''}">
    <label>${esc(o.label)} ${o.required ? '<span class="req">*</span>' : ''}</label>
    ${control}
    ${err ? `<span class="hint bad">${esc(err)}</span>` : o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ''}
  </div>`;
}

function loginOptionTile(mode, iconSvg, title, sub) {
  const on = STATE.login.mode === mode;
  return `<button class="login-tile ${on ? 'on' : ''}" data-act="setLoginMode" data-mode="${mode}">
    <span class="lt-ic">${iconSvg}</span>
    <span class="lt-txt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
    <span class="lt-tick">${icon('check', 14)}</span>
  </button>`;
}

function viewIdentity() {
  const p = STATE.patient;
  const lg = STATE.login;
  const mode = lg.mode;
  const idLabel = loginLabel();
  const idPh = { abha: '91-2345-6789-0123', aadhaar: '4321 8765 1234', phone: '9876543221' }[mode] || '';
  const head = `<span class="eyebrow">${isHi() ? 'चरण 1 · पहचान' : 'Step 1 · Identity'}</span>
    <h1 class="display">${t('idTitle')}</h1>
    <p class="subtitle">${t('idSub')}</p>
    <div class="login-grid">
      ${loginOptionTile('abha', icon('heartpulse', 20), isHi() ? 'ABHA आईडी से लॉगिन' : 'Login as ABHA ID', isHi() ? 'पुराना रिकॉर्ड अपने आप जुड़ेगा' : 'Link your past records')}
      ${loginOptionTile('aadhaar', icon('shield', 20), isHi() ? 'आधार नंबर से लॉगिन' : 'Login as Aadhaar no', isHi() ? '12 अंकों का आधार' : '12-digit Aadhaar')}
      ${loginOptionTile('phone', icon('phone', 20), isHi() ? 'मोबाइल नंबर से लॉगिन' : 'Login as phone number', isHi() ? 'पिछले विज़िट का नंबर' : 'Number used last visit')}
      ${loginOptionTile('new', icon('user', 20), isHi() ? 'नए मरीज़ हैं' : 'New patient', isHi() ? 'बुनियादी जानकारी भरें' : 'Enter basic details')}
    </div>`;

  let body = head;
  if (mode && mode !== 'new' && !lg.verified) {
    body += `
    <div class="otp-box card">
      <div class="otp-head">${icon('lock', 16)} <b>${esc(idLabel)} ${isHi() ? 'से OTP लॉगिन' : 'OTP login'}</b></div>
      ${lg.otpSent ? `
      <div class="otp-row">
        <input class="input otp-input" data-field="loginOtp" value="${esc(STATE.otp.value)}" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="OTP" />
        <button class="btn primary" data-act="loginVerifyOtp">${t('verifyOtp')}</button>
      </div>
      <span class="hint">${t('loginOtpHint')}</span>` : `
      <div class="field" style="margin-bottom:12px"><label>${esc(idLabel)} <span class="req">*</span></label>
        <input class="input" data-field="loginValue" value="${esc(lg.value)}" inputmode="${mode === 'phone' ? 'numeric' : 'text'}" placeholder="${esc(idPh)}" /></div>
      <button class="btn secondary sm" data-act="loginSendOtp" ${lg.loading ? 'disabled' : ''}>${icon('send', 14)} ${t('sendOtp')}</button>`}
      ${lg.error ? `<span class="hint bad" style="display:block;margin-top:8px">${esc(lg.error)}</span>` : ''}
      <span class="hint" style="margin-top:8px">${t('loginExplain')}</span>
    </div>`;
  }
  if (mode && mode !== 'new' && lg.verified) {
    body += `
    <div class="otp-ok">${icon('check', 15)} ${t('otpVerified')} · ${esc(lg.value)}</div>
    ${loginHistoryCard()}`;
  }
  if (mode === 'new') {
    body += `
    <div class="new-pt card">
      <div class="otp-head">${icon('user', 16)} <b>${isHi() ? 'आपकी बुनियादी जानकारी' : 'Your basic details'}</b></div>
      <div class="form-grid" style="margin-top:10px">
        ${field({ name: 'name', label: isHi() ? 'पूरा नाम' : 'Full name', value: p.name, required: true, ph: isHi() ? 'रमेश कुमार' : 'Ramesh Kumar' })}
        ${field({ name: 'age', label: isHi() ? 'उम्र (साल)' : 'Age (years)', value: p.age, type: 'number', inputmode: 'numeric', ph: '58' })}
        ${field({ name: 'gender', label: isHi() ? 'लिंग' : 'Gender', type: 'seg', value: p.gender, compact: true, full: true, options: GENDERS.map(g => ({ v: g.id, l: L(g) })) })}
        ${field({ name: 'phone', label: isHi() ? 'मोबाइल नंबर' : 'Mobile number', value: p.phone, inputmode: 'numeric', maxlength: 10, ph: '9876543221' })}
        ${field({ name: 'dob', label: isHi() ? 'जन्म तिथि (यदि याद हो)' : 'Date of birth (if known)', value: p.dob, type: 'date' })}
      </div>
      <small class="quiet" style="display:flex;gap:6px;align-items:center;margin-top:10px">${icon('shield', 13)} ${isHi() ? 'बाक़ी जानकारी अगले चरणों में ली जाएगी। कोई ID ज़रूरी नहीं।' : 'The remaining details are collected in the next steps. No ID is required.'}</small>
    </div>`;
  }
  if (mode && mode !== 'new' && !lg.verified) {
    body += `<div class="voice" style="border-style:solid;background:var(--blue-soft);border-color:#BFDDF7">
      ${icon('shield', 22)}
      <div class="vtext"><b>${isHi() ? 'आपकी पहचान गोपनीय रहती है' : 'Your identity stays private'}</b>
      <span>${isHi() ? 'आपकी ID सिर्फ़ पुराने रिकॉर्ड जोड़ने के काम आती है। बिना आपकी मर्ज़ी कुछ साझा नहीं होता।' : 'Your ID is only used to link past records. Nothing is shared without your consent.'}</span></div>
    </div>`;
  }
  return kioskFrame(body, { skip: mode === 'new' });
}

/* (previous ABHA-only identity view replaced by the four-option login above) */

function viewDemographics() {
  const p = STATE.patient;
  const body = `<span class="eyebrow">${isHi() ? 'चरण 2 · बुनियादी जानकारी' : 'Step 2 · Demographics'}</span>
    <h1 class="display">${t('demoTitle')}</h1>
    <p class="subtitle">${t('demoSub')}</p>
    <div class="form-grid">
      ${field({ name: 'name', label: isHi() ? 'पूरा नाम' : 'Full name', value: p.name, required: true, ph: isHi() ? 'रमेश कुमार' : 'Ramesh Kumar', full: true })}
      ${field({ name: 'age', label: isHi() ? 'उम्र (साल)' : 'Age (years)', value: p.age, required: true, type: 'number', inputmode: 'numeric', ph: '58' })}
      ${field({ name: 'dob', label: isHi() ? 'जन्म तिथि (यदि याद हो)' : 'Date of birth (if known)', value: p.dob, type: 'date' })}
      ${field({ name: 'phone', label: isHi() ? 'मोबाइल नंबर' : 'Mobile number', value: p.phone, required: true, inputmode: 'numeric', maxlength: 10, ph: '9876543221' })}
      ${field({ name: 'gender', label: isHi() ? 'लिंग' : 'Gender', type: 'seg', value: p.gender, required: true, compact: true, options: GENDERS.map(g => ({ v: g.id, l: L(g) })) , full: true })}
      ${field({ name: 'blood', label: isHi() ? 'ब्लड ग्रुप' : 'Blood group', type: 'select', value: p.blood, options: BLOOD_GROUPS.map(b => ({ v: b, l: b })) })}
      ${field({ name: 'marital', label: isHi() ? 'वैवाहिक स्थिति' : 'Marital status', type: 'select', value: p.marital, options: MARITAL.map(m => ({ v: m.id, l: L(m) })) })}
      ${field({ name: 'occupation', label: isHi() ? 'काम / पेशा' : 'Occupation', type: 'select', value: p.occupation, options: OCCUPATIONS.map(o => ({ v: o.id, l: L(o) })) })}
      ${field({ name: 'education', label: isHi() ? 'पढ़ाई' : 'Education', type: 'select', value: p.education, options: [{ v: 'none', l: isHi() ? 'स्कूल नहीं' : 'No formal schooling' }, { v: 'primary', l: isHi() ? 'प्राथमिक' : 'Primary' }, { v: 'secondary', l: isHi() ? 'माध्यमिक' : 'Secondary' }, { v: 'graduate', l: isHi() ? 'स्नातक+' : 'Graduate or above' }] })}
    </div>`;
  return kioskFrame(body);
}

/* (contact step removed — phone comes from login / new-patient details) */

function viewConsent() {
  lockRequiredConsents();
  const body = `<span class="eyebrow">${icon('shield', 14)} ${isHi() ? 'चरण 4 · सहमति' : 'Step 4 · Consent'}</span>
    <h1 class="display">${t('consentTitle')}</h1>
    <p class="subtitle">${isHi() ? 'वैकल्पिक बातें अलग से चुनिए। आप उन्हें मना कर सकते हैं, इलाज फिर भी मिलेगा।' : 'Choose optional items separately. You can refuse those and still receive care.'}</p>
    <div class="consent-list">
      ${CONSENTS.map(c => {
        const on = c.required ? true : !!STATE.consents[c.id];
        const detail = isHi() && c.detailHi ? c.detailHi : c.detail;
        const sw = c.required
          ? `<span class="toggle on locked" role="switch" aria-checked="true" aria-disabled="true" aria-label="${esc(L(c))}"><i></i></span>`
          : `<button class="toggle ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${esc(L(c))}" data-act="toggleConsent" data-id="${c.id}"><i></i></button>`;
        return `<div class="consent-item ${on ? 'on' : ''}">
          <div class="c-body">
            <b>${esc(L(c))}</b>
            <small>${esc(detail)}</small>
          </div>
          ${sw}
        </div>`;
      }).join('')}
    </div>
    <p class="quiet" style="margin-top:14px">${icon('lock', 13)} ${isHi() ? 'DPDP अधिनियम 2023 के तहत हर सहमति समय के साथ दर्ज होती है।' : 'Every consent is timestamped and logged under the DPDP Act 2023.'}</p>
    ${voiceBlock()}`;
  return kioskFrame(body, { nextLabel: isHi() ? 'सहमति देकर आगे' : 'Agree and continue' });
}

function viewDepartment() {
  const S = STATE.deptSuggestion || { dept: '', reason: '', source: '', loading: false };
  const sug = DEPARTMENTS.find(d => d.id === S.dept);
  const reason = S.loading
    ? ''
    : S.reason || '';
  const body = `<span class="eyebrow">${icon('brain', 14)} ${isHi() ? 'AI की सलाह · विभाग' : 'AI suggested · Department'}</span>
    <h1 class="display">${isHi() ? 'आपको किस विभाग में जाना चाहिए?' : 'Which department should you visit?'}</h1>
    <p class="subtitle">${isHi()
      ? 'आपकी बात समझकर AI ने सबसे उपयुक्त विभाग सुझाया है — चाहें तो बदल भी सकते हैं।'
      : 'The AI has read your answers and suggested the best-fit department — you can change it if you prefer.'}</p>
    ${sug ? `<div class="ai-dept-card ${S.loading ? 'loading' : ''}">
      <div class="ad-ic">${icon('leaf', 22)}</div>
      <div class="ad-body">
        <small>${isHi() ? 'AI सुझाव' : 'AI suggestion'}</small>
        <b>${esc(L(sug))}</b>
        ${S.loading ? `<span class="ad-reason"><i></i><i></i><i></i> ${isHi() ? 'विश्लेषण जारी…' : 'Analysing…'}</span>` : reason ? `<span class="ad-reason">${esc(reason)}</span>` : ''}
      </div>
      <span class="pill ${STATE.dept === sug.id ? 'ok' : 'info'}">${STATE.dept === sug.id ? (isHi() ? 'चुना गया' : 'Selected') : (isHi() ? 'सुझाव' : 'Suggested')}</span>
    </div>` : ''}
    <div class="choices two">
      ${DEPARTMENTS.map(d => `<button class="choice ${STATE.dept === d.id ? 'on' : ''}" data-act="setDept" data-id="${d.id}">
        <span class="tick">${icon('check', 15)}</span>
        <span class="txt"><b>${esc(L(d))}</b><small>${esc(d.note)}</small></span>
        ${S.dept === d.id ? `<span class="ai-tag">${icon('brain', 12)} AI</span>` : ''}
      </button>`).join('')}
    </div>`;
  return kioskFrame(body, { nextDisabled: !STATE.dept });
}

function viewVitals() {
  const v = STATE.vitals;
  const bmi = calcBmi(v);
  const body = `<span class="eyebrow">${icon('pulse', 14)} ${isHi() ? 'चरण 5 · जाँच' : 'Step 5 · Vitals'}</span>
    <h1 class="display">${t('vitalsTitle')}</h1>
    <p class="subtitle">${t('vitalsSub')}</p>
    <div class="form-grid">
      ${field({ name: 'sys', label: isHi() ? 'बीपी — ऊपरी (mmHg)' : 'BP systolic (mmHg)', value: v.sys, inputmode: 'numeric', ph: '138', vital: true })}
      ${field({ name: 'dia', label: isHi() ? 'बीपी — निचली (mmHg)' : 'BP diastolic (mmHg)', value: v.dia, inputmode: 'numeric', ph: '86' })}
      ${field({ name: 'pulse', label: isHi() ? 'नाड़ी (प्रति मिनट)' : 'Pulse (per minute)', value: v.pulse, inputmode: 'numeric', ph: '92' })}
      ${field({ name: 'spo2', label: 'SpO₂ (%)', value: v.spo2, inputmode: 'numeric', ph: '96' })}
      ${field({ name: 'temp', label: isHi() ? 'तापमान (°F)' : 'Temperature (°F)', value: v.temp, inputmode: 'decimal', ph: '98.6' })}
      ${field({ name: 'rr', label: isHi() ? 'साँस दर (प्रति मिनट)' : 'Respiratory rate', value: v.rr, inputmode: 'numeric', ph: '18' })}
      ${field({ name: 'height', label: isHi() ? 'लंबाई (cm)' : 'Height (cm)', value: v.height, inputmode: 'numeric', ph: '168' })}
      ${field({ name: 'weight', label: isHi() ? 'वज़न (kg)' : 'Weight (kg)', value: v.weight, inputmode: 'decimal', ph: '72' })}
    </div>
    <div class="voice" style="border-style:solid;background:var(--green-soft);border-color:#C9E2D4">
      ${icon('heart', 22)}
      <div class="vtext"><b>${bmi ? `BMI ${bmi.value} · ${bmi.label}` : (isHi() ? 'BMI अपने आप निक���ेगा' : 'BMI is calculated automatically')}</b>
        <span>${isHi() ? 'माप न हों तो छोड़ दीजिए — नर्स बाद में भर सकती हैं।' : 'Leave blank if not measured — the nurse can fill these later.'}</span></div>
      <button class="btn secondary sm" data-act="autoVitals">${isHi() ? 'डिवाइस से पढ़ें' : 'Read from device'}</button>
    </div>`;
  return kioskFrame(body, { skip: true });
}

function viewComplaint() {
  const body = `<span class="eyebrow">${isHi() ? 'चरण 6 · मुख्य शिकायत' : 'Step 6 · Chief complaint'}</span>
    <h1 class="question">${isHi() ? 'आज आपको सबसे ज़्यादा क्या परेशान कर रहा है?' : 'What is troubling you the most today?'}</h1>
    <div class="choices two">
      ${COMPLAINTS.map(c => `<button class="choice ${STATE.answers.complaint === c.id ? 'on' : ''}" data-act="pickComplaint" data-id="${c.id}">
        <span class="co-ico">${icon(c.icon, 26)}</span><span class="txt"><b>${esc(L(c))}</b></span>
      </button>`).join('')}
    </div>
    ${voiceBlock()}`;
  return kioskFrame(body, { nextDisabled: !STATE.answers.complaint });
}

function voiceBlock() {
  const muted = !!(STATE.voice && STATE.voice.muted);
  const doctor = STATE.view === 'doctor';
  const listen = doctor
    ? (isHi() ? 'स्क्रीन सुनें' : 'Listen to this screen')
    : (isHi() ? 'सवाल सुनें' : 'Listen to the question');
  const title = doctor ? listen : t('voiceHint');
  const sub = doctor
    ? (isHi() ? 'कतार या केस सारांश ज़ोर से सुनाया जाएगा। दोबारा सुनें, या म्यूट करें।' : 'Hear the queue or case summary aloud. Repeat, or mute if you prefer silence.')
    : (isHi() ? 'पढ़ना न चाहें तो सुनें — ऊपर से छूकर जवाब चुन लीजिए।' : 'Prefer not to read? Listen instead, then tap an option above.');
  return `<div class="voice ${muted ? 'is-muted' : ''} ${doctor ? 'compact' : ''}">
    <button class="mic-btn" data-act="speak" aria-label="${listen}">${icon('volume', 24)}</button>
    <div class="vtext">
      <b>${title}</b>
      <span>${sub}</span>
    </div>
    <div class="voice-acts">
      <button class="btn secondary sm" data-act="speak">${icon('volume', 15)} ${isHi() ? 'दोबारा सुनें' : 'Repeat'}</button>
      <button class="btn secondary sm ${muted ? 'on' : ''}" data-act="voiceMute">${muted ? (isHi() ? 'अनम्यूट' : 'Unmute') : (isHi() ? 'म्यूट' : 'Mute')}</button>
    </div>
  </div>`;
}

function viewInterview() {
  const list = questionList();
  const q = list[STATE.qIndex];
  if (!q) return kioskFrame('<p class="subtitle">…</p>');
  const cur = STATE.answers[q.key];
  let control = '';
  if (q.scale) {
    control = `<div class="scale">${Array.from({ length: 11 }).map((_, i) => `<button data-act="answer" data-key="${q.key}" data-val="${i}" class="${String(cur) === String(i) ? 'on' : ''}">${i}</button>`).join('')}</div>
      <div class="scale-legend"><span>${isHi() ? 'कोई दर्द नहीं' : 'No pain'}</span><span>${isHi() ? 'सबसे ज़्यादा' : 'Worst possible'}</span></div>`;
  } else if (q.free) {
    control = `<div class="field" style="margin-top:20px"><textarea class="input" data-field="free_${q.key}" placeholder="${isHi() ? 'यहाँ लिखिए या माइक दबाकर बोलिए' : 'Type here or tap the mic and speak'}">${esc(cur || '')}</textarea></div>`;
  } else {
    control = `<div class="choices ${q.options.length > 4 ? 'two' : ''}">${q.options.map(o => {
      const on = q.multi ? has(cur, o.id) : cur === o.id;
      return `<button class="choice ${on ? 'on' : ''}" data-act="answer" data-key="${q.key}" data-val="${o.id}" data-multi="${q.multi ? '1' : ''}">
        <span class="tick">${icon('check', 15)}</span><span class="txt"><b>${esc(L(o))}</b></span></button>`;
    }).join('')}</div>`;
  }
  const answered = q.multi ? (Array.isArray(cur) && cur.length > 0) : (cur !== undefined && cur !== '');
  const body = `<span class="eyebrow">${t('interviewOf')} ${STATE.qIndex + 1} / ${list.length} · ${esc(q.section ? sectionName(q.section) : complaintName())}</span>
    <h1 class="question">${esc(L(q))}</h1>
    ${q.multi ? `<p class="quiet" style="margin-top:8px">${isHi() ? 'एक से ज़्यादा चुन सकते हैं' : 'You can choose more than one'}</p>` : ''}
    ${control}
    <div class="rail">${list.map((_, i) => `<i class="${i <= STATE.qIndex ? 'done' : ''}"></i>`).join('')}</div>
    ${voiceBlock()}`;
  return kioskFrame(body, { nextDisabled: !answered && !q.multi, skip: !q.multi });
}

function viewAyush() {
  const list = ayushList();
  const q = list[STATE.ayushIndex];
  if (!q) return kioskFrame('<p class="subtitle">…</p>');
  const cur = STATE.ayush[q.key];
  const control = `<div class="choices ${q.options.length > 3 ? 'two' : ''}">${q.options.map(o => {
    const on = q.multi ? has(cur, o.id) : cur === o.id;
    return `<button class="choice ${on ? 'on' : ''}" data-act="ayushAnswer" data-key="${q.key}" data-val="${o.id}" data-multi="${q.multi ? '1' : ''}">
      <span class="tick">${icon('check', 15)}</span><span class="txt"><b>${esc(L(o))}</b></span></button>`;
  }).join('')}</div>`;
  const body = `<span class="eyebrow">${icon('leaf', 14)} ${t('ayushTitle')} · ${STATE.ayushIndex + 1}/${list.length}</span>
    <h1 class="question">${esc(L(q))}</h1>
    <span class="dasha-tag">${icon('leaf', 15)} <b>${esc(q.sanskrit)} · ${esc(q.label)}</b> ${q.meaning ? `— ${esc(q.meaning)}` : ''}</span>
    ${control}
    <div class="rail">${list.map((_, i) => `<i class="${i <= STATE.ayushIndex ? 'done' : ''}"></i>`).join('')}</div>
    ${voiceBlock()}`;
  const answered = q.multi ? (Array.isArray(cur) && cur.length > 0) : !!cur;
  return kioskFrame(body, { nextDisabled: !answered && !q.multi, skip: true });
}

function ocrProgressBlock() {
  const o = STATE.ocr;
  const label = o.status === 'done'
    ? (isHi() ? 'पढ़ाई पूरी' : 'Reading complete')
    : o.mode === 'sim' ? (isHi() ? 'सिम्युलेटेड OCR चल रहा है' : 'Simulated OCR in progress')
    : (isHi() ? 'Tesseract.js से पढ़ रहे हैं' : 'Tesseract.js is reading the photo');
  return `<div class="ocr-progress ${o.status === 'done' ? 'done' : ''}">
    <div class="spinner"></div>
    <div class="op-text"><b>${esc(o.name)}</b><span>${label} · ${o.pct}%</span></div>
    <div class="op-bar"><i style="width:${o.pct}%"></i></div>
  </div>`;
}

function viewScan() {
  const s = STATE.scan || { mode: 'idle', facing: 'environment', error: '', bt: { status: 'idle', name: '' }, shot: '' };
  const mode = s.mode || 'idle';
  const bt = s.bt || { status: 'idle', name: '' };
  const hi = isHi();
  const btSupported = typeof navigator !== 'undefined' && !!navigator.bluetooth;
  const camLive = mode === 'live';
  const ocrBusy = STATE.ocr && STATE.ocr.status === 'reading';
  let btStatus = '';
  if (!btSupported) btStatus = hi ? 'इस ब्राउज़र में ब्लूटूथ उपलब्ध नहीं है' : 'Bluetooth not supported in this browser';
  else if (bt.status === 'connecting') btStatus = hi ? 'जोड़ा जा रहा है…' : 'Connecting…';
  else if (bt.status === 'connected') btStatus = (hi ? 'जुड़ गया' : 'Connected') + (bt.name ? ' · ' + bt.name : '');
  else if (bt.status === 'failed') btStatus = hi ? 'असफल — डिवाइस नहीं मिला या अनुमति रद्द हुई' : 'Failed — no device selected or permission was denied';
  else if (bt.status === 'unsupported') btStatus = hi ? 'इस ब्राउज़र में ब्लूटूथ उपलब्ध नहीं है' : 'Bluetooth not supported in this browser';

  const media = mode === 'shot' && s.shot
    ? `<img class="scan-shot" src="${esc(s.shot)}" alt="${hi ? 'स्कैन की गई छवि' : 'Captured scan'}" />`
    : `<video id="scanVideo" class="scan-video${camLive ? ' on' : ''}" playsinline muted autoplay aria-label="${hi ? 'कैमरा प्रीव्यू' : 'Camera preview'}"></video>`;

  const idleHint = mode === 'idle' ? `<div class="scan-idle">
        <span class="scan-idle-ico" aria-hidden="true">${icon('camera', 40)}</span>
        <p><b>${hi ? 'दस्तावेज़ को फ़्रेम के अंदर रखें' : 'Place your document inside the frame'}</b>
        <span>${hi ? 'दस्तावेज़ सीधा और अच्छी रोशनी में रखें' : 'Keep the document flat and well lit'}</span></p>
      </div>` : '';

  let actions = '';
  if (mode === 'idle') {
    actions = `<button class="btn primary" data-act="startScanner" ${s.loading ? 'disabled' : ''} aria-label="${hi ? 'स्कैनर शुरू करें' : 'Start Scanner'}">${s.loading ? (hi ? 'कैमरा खुल रहा है…' : 'Opening camera…') : (hi ? 'स्कैनर शुरू करें' : 'Start Scanner')}</button>`;
  } else if (mode === 'live') {
    actions = `<button class="btn primary" data-act="captureScan" aria-label="${hi ? 'फ़ोटो लें' : 'Capture'}">${icon('camera', 16)} ${hi ? 'फ़ोटो लें' : 'Capture'}</button>
      ${s.canSwitch === false ? '' : `<button class="btn secondary" data-act="switchScanCam" aria-label="${hi ? 'कैमरा बदलें' : 'Switch camera'}">${hi ? (s.facing === 'user' ? 'पीछे का कैमरा' : 'आगे का कैमरा') : (s.facing === 'user' ? 'Rear camera' : 'Front camera')}</button>`}`;
  } else if (mode === 'shot') {
    actions = `<button class="btn secondary" data-act="retakeScan">${hi ? 'फिर से लें' : 'Retake'}</button>
      <button class="btn primary" data-act="useScan" ${ocrBusy ? 'disabled' : ''}>${ocrBusy ? (hi ? 'पढ़ाई हो रही है…' : 'Reading…') : (hi ? 'स्कैन इस्तेमाल करें' : 'Use Scan')}</button>`;
  }

  const docs = STATE.docs || [];
  const docsBlock = docs.length ? `<div class="scan-docs">
      <h3>${hi ? 'जुड़े दस्तावेज़' : 'Attached documents'}</h3>
      ${docs.map(d => `<div class="scan-doc-row">
        ${d.preview ? `<img src="${esc(d.preview)}" alt="" />` : ''}
        <div><b>${esc(d.label)}</b><small>${esc(d.value || '')}${d.date ? ' · ' + esc(d.date) : ''}</small></div>
      </div>`).join('')}
    </div>` : '';

  const body = `<div class="scan-page">
    <span class="eyebrow">${icon('scan', 14)} ${hi ? 'दस्तावेज़ स्कैनर' : 'Document scanner'}</span>
    <h1 class="display">${t('scanTitle')}</h1>
    <p class="subtitle">${hi ? 'पर्ची, लैब रिपोर्ट या चिकित्सकीय दस्तावेज़ कैमरे से स्कैन करें।' : 'Scan a prescription, lab report, or medical document using your camera.'}</p>
    <div class="scan-card">
      <div class="scan-stage">
        ${media}
        ${idleHint}
        <div class="scan-frame" aria-hidden="true">
          <i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
        </div>
        ${(mode === 'idle' || mode === 'live') ? '<div class="scan-line" aria-hidden="true"></div>' : ''}
      </div>
      ${s.error ? `<p class="scan-error" role="alert">${icon('alert', 14)} ${esc(s.error)}</p>` : ''}
      <div class="scan-actions">${actions}</div>
      ${ocrBusy ? ocrProgressBlock() : ''}
      ${docsBlock}
    </div>
    <div class="scan-connect card">
      <h2>${hi ? 'डिवाइस जोड़ें' : 'Connect a device'}</h2>
        <p>${hi ? 'वैकल्पिक ब्लूटूथ स्कैनर, या फ़ोन से अपलोड के लिए QR दिखाएँ।' : 'Optional Bluetooth scanner, or show a QR so the patient can upload from their phone.'}</p>
      <div class="scan-connect-grid">
        <button class="scan-connect-opt" data-act="connectBt" ${!btSupported || bt.status === 'connecting' ? 'disabled' : ''} aria-label="${hi ? 'ब्लूटूथ से जोड़ें' : 'Connect via Bluetooth'}">
          <span class="scan-connect-ico">${icon('bluetooth', 22)}</span>
          <b>${hi ? 'ब्लूटूथ से जोड़ें' : 'Connect via Bluetooth'}</b>
          <small>${esc(btStatus || (hi ? 'पास के डिवाइस खोजें' : 'Discover nearby devices'))}</small>
        </button>
        <button class="scan-connect-opt" data-act="generatePairQr" aria-label="${hi ? 'QR से जोड़ें' : 'Show QR code'}">
          <span class="scan-connect-ico">${icon('qr', 22)}</span>
          <b>${hi ? 'QR से जोड़ें' : 'Show QR code'}</b>
          <small>${hi ? 'मरीज़ अपने फ़ोन से यह कोड स्कैन करे' : 'Patient: scan this code with your phone'}</small>
        </button>
      </div>
    </div>
  </div>`;
  return kioskFrame(body, { skip: true, nextLabel: hi ? 'सारांश देखें' : 'Review summary' });
}

function viewReview() {
  const p = STATE.patient, v = STATE.vitals;
  const bmi = calcBmi(v);
  const row = (k, val) => val ? `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>` : '';
  const body = `<span class="eyebrow">${isHi() ? 'अंतिम जाँच' : 'Final check'}</span>
    <h1 class="display">${t('reviewTitle')}</h1>
    <p class="subtitle">${t('reviewSub')}</p>
    <div class="review-card card">
      <h3>${isHi() ? 'पहचान और पता' : 'Identity and address'} <button class="tiny" data-act="goStep" data-step="demographics">${icon('edit', 13)} ${isHi() ? 'बदलें' : 'Edit'}</button></h3>
      <dl class="kv">
        ${row(isHi() ? 'नाम' : 'Name', p.name)}
        ${row(isHi() ? 'उम्र / लिंग' : 'Age / gender', [p.age && `${p.age}`, genderLabel(p.gender)].filter(Boolean).join(' · '))}
        ${row(isHi() ? 'ब्लड ग्रुप' : 'Blood group', p.blood)}
        ${row(isHi() ? 'मोबाइल' : 'Mobile', p.phone)}
        ${row(isHi() ? 'पता' : 'Address', [p.address, p.city, p.state, p.pincode].filter(Boolean).join(', '))}
        ${row(isHi() ? 'आपात संपर्क' : 'Emergency contact', [p.emgName, p.emgPhone].filter(Boolean).join(' · '))}
        ${row('ABHA', p.abha)}
      </dl>
    </div>
    <div class="review-card card">
      <h3>${isHi() ? 'जाँच' : 'Vitals'} <button class="tiny" data-act="goStep" data-step="vitals">${icon('edit', 13)} ${isHi() ? 'बदलें' : 'Edit'}</button></h3>
      <dl class="kv">
        ${row('BP', v.sys && v.dia ? `${v.sys}/${v.dia} mmHg` : '')}
        ${row(isHi() ? 'नाड़ी' : 'Pulse', v.pulse ? `${v.pulse}/min` : '')}
        ${row('SpO₂', v.spo2 ? `${v.spo2}%` : '')}
        ${row(isHi() ? 'तापमान' : 'Temperature', v.temp ? `${v.temp} °F` : '')}
        ${row('BMI', bmi ? `${bmi.value} · ${bmi.label}` : '')}
      </dl>
      ${(!v.sys && !v.pulse) ? `<p class="quiet">${isHi() ? 'कोई माप दर्ज नहीं — नर्स भरेंगी।' : 'No measurements recorded — nurse will capture these.'}</p>` : ''}
    </div>
    <div class="review-card card">
      <h3>${isHi() ? 'आपकी तकलीफ़' : 'Your problem'} <button class="tiny" data-act="goStep" data-step="complaint">${icon('edit', 13)} ${isHi() ? 'बदलें' : 'Edit'}</button></h3>
      <p style="margin:0">${esc(narrative())}</p>
    </div>
    ${STATE.docs.length ? `<div class="review-card card">
      <h3>${isHi() ? 'जुड़े दस्तावेज़' : 'Attached documents'} <button class="tiny" data-act="goStep" data-step="scan">${icon('edit', 13)} ${isHi() ? 'बदलें' : 'Edit'}</button></h3>
      ${STATE.docs.map(d => `<p style="margin:0 0 6px"><b>${esc(d.label)}</b> — ${esc(d.value)}${d.date ? ' · ' + esc(d.date) : ''}</p>`).join('')}
    </div>` : ''}
    ${STATE.redFlags.length ? `<div class="review-card card" style="border-color:#F0BFB9;background:var(--red-soft)">
      <h3 style="color:var(--red)">${isHi() ? 'ज़रूरी संकेत' : 'Priority signals'}</h3>
      ${STATE.redFlags.map(f => `<p style="margin:0 0 6px"><b>${esc(f.label)}</b> — ${esc(f.evidence)}</p>`).join('')}
      <p class="quiet" style="margin:8px 0 0">${isHi() ? 'यह निदान नहीं है। डॉक्टर खुद जाँच करेंगे।' : 'This is not a diagnosis. Your doctor will decide.'}</p>
    </div>` : ''}
    <p class="quiet" style="margin-top:14px">${icon('shield', 13)} ${isHi() ? 'भेजने पर यह सारांश ड्राफ्ट रहेगा जब तक डॉक्टर पुष्टि न कर दें।' : 'After submission the summary stays a draft until your doctor confirms it.'}</p>`;
  return kioskFrame(body, { nextLabel: isHi() ? 'डॉक्टर को भेजें' : 'Send to doctor' });
}

function viewDone() {
  const p = STATE.patient;
  const body = `<div class="center" style="display:flex;flex-direction:column;align-items:center;margin:auto 0">
    <div class="token-badge">${esc(STATE.token)}</div>
    <h1 class="display" style="margin-top:0">${t('doneTitle')}</h1>
    <p class="subtitle">${isHi() ? `${p.name || 'आप'} जी, अपना टोकन नंबर याद रखिए। स्क्रीन पर नंबर आने पर कमरे में जाइए।` : `${p.name || 'Please'} remember this token. Enter the consultation room when it appears on the screen.`}</p>
    <div class="stats" style="width:100%;max-width:560px;margin-top:22px">
      <div class="stat"><div class="n">${questionList().length + Object.keys(STATE.ayush).length}</div><p>${isHi() ? 'सवाल भरे गए' : 'Answers captured'}</p></div>
      <div class="stat"><div class="n">${STATE.docs.length}</div><p>${isHi() ? 'काग़ज़ जुड़े' : 'Documents attached'}</p></div>
      <div class="stat"><div class="n">${completeness()}%</div><p>${isHi() ? 'हिस्ट्री पूरी' : 'History completeness'}</p></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:26px;flex-wrap:wrap;justify-content:center">
      <button class="btn primary" data-act="openDoctorConsole">${icon('user', 16)} ${isHi() ? 'डॉक्टर कंसोल में देखें' : 'View in Doctor Console'}</button>
      <button class="btn secondary" data-act="ayurHandoff">${icon('leaf', 16)} ${isHi() ? 'आयुर्वेदिक AI से पूछें' : 'Ask the Ayurvedic AI'}</button>
      <button class="btn secondary" data-act="print">${icon('print', 16)} ${isHi() ? 'पर्ची छापें' : 'Print slip'}</button>
      <button class="btn ghost" data-act="restart">${isHi() ? 'नया मरीज़' : 'Next patient'}</button>
    </div>
  </div>`;
  return `<main class="kiosk-stage"><section class="kiosk-card">
    <div class="kiosk-head"><span class="secure">${icon('check', 16)} ${isHi() ? 'पूर्ण' : 'Completed'}</span><span class="pill ok">${isHi() ? 'ड्राफ्ट भेजा गया' : 'Draft submitted'}</span></div>
    <div class="kiosk-body">${body}</div></section></main>`;
}

function viewEmergency() {
  const f = STATE.redFlags.find(x => x.level === 'emergency') || STATE.redFlags[0] || { label: '', evidence: '' };
  return `<main class="emergency-stage"><section class="emergency-card">
    <div class="ring">${icon('alert', 34)}</div>
    <h1>${isHi() ? 'कृपया रुकिए, स्टाफ़ आ रहा है' : 'Please wait, staff are coming'}</h1>
    <p>${isHi() ? 'आपके जवाबों में ऐसा संकेत मिला है जिसे तुरंत देखा जाना चाहिए। ट्रायज नर्स को सूचना भेज दी गई है।' : 'Your answers include a sign that should be checked immediately. The triage nurse has been alerted.'}</p>
    <div class="why"><b>${esc(f.label)}</b><br/>${esc(f.evidence)}<br/><span style="opacity:.85">${isHi() ? 'यह निदान नहीं — केवल प्राथमिकता का संकेत है।' : 'This is a prioritisation signal, not a diagnosis.'}</span></div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn secondary" data-act="ackEmergency">${isHi() ? 'समझ गया, आगे बढ़ें' : 'Understood, continue'}</button>
      <button class="btn danger" style="border:1px solid rgba(255,255,255,.5)" data-act="staff">${icon('phone', 16)} ${isHi() ? 'स्टाफ़ को बुलाएँ' : 'Call staff now'}</button>
    </div>
  </section></main>`;
}

/* ============ staff login gate (doctor / triage / admin) ============ */
function staffLoginCard() {
  const s = STATE.staff;
  return `<div class="staff-wrap"><section class="staff-card card" aria-label="Staff login">
    <div class="staff-brand">${icon('shield', 22)}</div>
    <h1 class="display" style="font-size:26px">${isHi() ? 'डॉक्टर सत्यापन' : 'Doctor verification'}</h1>
    <p class="subtitle" style="font-size:14px">${isHi()
      ? 'डॉक्टर कंसोल, ट्रायज और रिकॉर्ड सिर्फ़ सत्यापित स्टाफ़ के लिए हैं। कृपया पहचान सत्यापित कराएँ।'
      : 'The doctor console, triage desk and records are restricted to verified staff. Please verify your identity to continue.'}</p>
    ${s.otpSent ? `
      <p class="otp-line">${icon('send', 14)} ${isHi() ? 'OTP भेजा गया' : 'OTP sent'} — <b>${esc(s.name)}</b> · ID ${esc(s.id)}</p>
      <div class="otp-row">
        <input class="input otp-input" data-field="staffOtp" value="${esc(s.otp)}" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="Staff OTP" autofocus />
        <button class="btn primary" data-act="staffVerifyOtp" ${s.busy ? 'disabled' : ''}>${t('verifyOtp')}</button>
      </div>
      <span class="hint">${t('loginOtpHint')}</span>` : `
      <div class="field" style="margin-bottom:12px"><label>${isHi() ? 'आपका नाम' : 'Your name'} <span class="req">*</span></label>
        <input class="input" data-field="staffName" value="${esc(s.name)}" placeholder="${isHi() ? 'डॉ. अनीता शर्मा' : 'Dr. Anita Sharma'}" autofocus /></div>
      <div class="field" style="margin-bottom:4px"><label>${isHi() ? 'स्टाफ़ / डॉक्टर आईडी' : 'Staff / doctor ID'} <span class="req">*</span></label>
        <input class="input" data-field="staffId" value="${esc(s.id)}" placeholder="AIIA-DR-0117" /></div>
      <button class="btn primary full-w" data-act="staffSendOtp" style="margin-top:12px" ${s.busy ? 'disabled' : ''}>${icon('send', 15)} ${t('sendOtp')}</button>`}
    ${s.error ? `<div class="banner" style="margin-top:14px;padding:10px 14px">${icon('alert', 18)}<div><small>${esc(s.error)}</small></div></div>` : ''}
    <p class="quiet" style="margin:14px 0 0;font-size:12.5px">${icon('lock', 13)} ${t('loginExplain')}</p>
    <button class="tiny" data-act="staffBack" style="margin-top:12px">${icon('back', 13)} ${isHi() ? 'डैशबोर्ड पर लौटें' : 'Back to dashboard'}</button>
  </section></div>`;
}

/* ============ Gemini-style AI assistant panel (doctor end) ============ */
function aiBubble(m) {
  const me = m.role === 'user';
  return `<div class="ai-msg ${me ? 'user' : 'bot'}">
    ${me ? '' : `<div class="ai-avatar" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 3Z" fill="url(#aiGrad)"/><defs><linearGradient id="aiGrad" x1="4" y1="3" x2="20" y2="18"><stop stop-color="#4E86F7"/><stop offset="1" stop-color="#9B72F2"/></linearGradient></defs></svg></div>`}
    <div class="ai-bubble ${me ? 'me' : 'ai'}">${me ? esc(m.content) : mdLite(m.content)}</div>
  </div>`;
}

function aiAssistantPanel() {
  const A = STATE.ai;
  const sourcePill = A.sending
    ? `<span class="pill urgent">${isHi() ? 'सोच रहा है…' : 'Thinking…'}</span>`
    : A.source === 'local-fallback'
      ? `<span class="pill info">${isHi() ? 'तैयार' : 'Ready'}</span>`
      : A.source
        ? `<span class="pill ok">${isHi() ? 'तैयार' : 'Ready'}</span>`
        : `<span class="pill info">${isHi() ? 'तैयार' : 'Ready'}</span>`;
  const chips = isHi()
    ? [['इस केस का नैदानिक सारांश बनाइए', 'Summarise this case'], ['संभावित निदान सूचिये', 'List differentials'], ['जाँचें सुझाइए', 'Suggest investigations'], ['OPD नोट लिखिए', 'Draft an OPD note']]
    : [['Summarise this case', 'Summarise this case'], ['List differentials', 'List differentials'], ['Suggest investigations', 'Suggest investigations'], ['Draft an OPD note', 'Draft an OPD note']];
  const welcome = `<div class="ai-welcome">
    <h2 class="ai-title">${isHi() ? 'जानकारी पाइए' : 'Find information'}</h2>
    ${[isHi() ? 'इस मरीज़ का सारांश बनाइए' : 'Summarise this patient in detail', isHi() ? 'DocBot डॉक्टर कंसोल में क्या कर सकता है' : 'What can DocBot do here', isHi() ? 'इस केस की जाँचें सुझाइए' : 'List action items for this case']
      .map(s => `<button class="ai-suggest" data-act="aiAsk" data-q="${esc(s)}"><span>↳</span>${esc(s)}</button>`).join('')}
  </div>`;
  return `<aside class="ai-panel ${A.open ? 'open' : ''}" aria-label="DocBot">
    <div class="ai-head">
      <span class="ai-brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 3Z" fill="url(#aiGradHead)"/><defs><linearGradient id="aiGradHead" x1="4" y1="3" x2="20" y2="18"><stop stop-color="#4E86F7"/><stop offset="1" stop-color="#9B72F2"/></linearGradient></defs></svg>
        <b>DocBot</b>
      </span>
      <div class="ai-head-acts">
        ${sourcePill}
        <button class="ai-iconbtn" data-act="aiSpeak" title="सुनो / Repeat" aria-label="${isHi() ? 'सुनो / Repeat' : 'Repeat'}">${icon('volume', 15)}</button>
        <button class="ai-iconbtn ${A.muted ? 'muted' : ''}" data-act="aiMute" title="${A.muted ? 'अनम्यूट / Unmute' : 'म्यूट / Mute'}" aria-pressed="${A.muted ? 'true' : 'false'}" aria-label="${A.muted ? (isHi() ? 'अनम्यूट / Unmute' : 'Unmute') : (isHi() ? 'म्यूट / Mute' : 'Mute')}">${icon('mute', 15)}</button>
        ${A.messages.length ? `<button class="ai-iconbtn" data-act="aiClear" title="${isHi() ? 'चैट साफ़ करें' : 'Clear chat'}">${icon('back', 15)}</button>` : ''}
        <button class="ai-iconbtn" data-act="toggleAi" title="${isHi() ? 'बंद करें' : 'Close'}" aria-label="${isHi() ? 'DocBot बंद करें' : 'Close DocBot'}">✕</button>
      </div>
    </div>
    <div class="ai-thread" id="aiThread">
      ${A.messages.length ? A.messages.map(aiBubble).join('') : welcome}
      ${A.sending ? `<div class="ai-msg bot"><div class="ai-avatar">…</div><div class="ai-bubble ai ai-typing"><i></i><i></i><i></i></div></div>` : ''}
    </div>
    ${A.error ? `<div class="ai-error">${icon('alert', 13)} ${esc(A.error)}</div>` : ''}
    <div class="ai-inputbar">
      <div class="ai-inputrow">
        <input class="ai-input" data-field="aiInput" value="${esc(A.input || '')}" placeholder="${isHi() ? 'DocBot से पूछें' : 'Ask DocBot'}" aria-label="${isHi() ? 'DocBot से पूछें' : 'Ask DocBot'}" />
        <button class="ai-send ${A.sending || !(A.input || '').trim() ? 'dis' : ''}" data-act="aiSend" ${A.sending ? 'disabled' : ''} aria-label="${isHi() ? 'भेजें' : 'Send'}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>
        </button>
      </div>
      <div class="ai-chips">${chips.map(([q]) => `<button class="ai-chip" data-act="aiAsk" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <small class="ai-disclaimer">${icon('shield', 12)} ${isHi()
        ? 'AI आउटपुट केवल सहायक है — निदान और पर्चा डॉक्टर ही तय करेंगे।'
        : 'AI output assists only — diagnosis and prescription remain with the physician.'}</small>
    </div>
  </aside>`;
}

/* ============ doctor console ============ */
function viewDoctor() {
  if (STATE.openToken) return viewDoctorDetail();
  const rows = queueRows().filter(r => !STATE.search || (r.name + r.complaint + r.token).toLowerCase().includes(STATE.search.toLowerCase()));
  const em = queueRows().filter(r => r.triage === 'emergency').length;
  const inner = `<main class="dash">
    <div class="dash-head">
      <div><h1>OPD queue · Kayachikitsa block</h1><p>Structured histories are ready before the patient walks in. Wednesday, 9 September · 10:12</p></div>
      <div style="display:flex;gap:8px"><button class="btn secondary sm" data-act="print">${icon('print', 15)} Print list</button>
      <button class="btn primary sm" data-act="openFirst">Open next patient ${icon('arrow', 15)}</button></div>
    </div>
    ${voiceBlock()}
    <div class="stats">
      <div class="stat"><div class="n">${queueRows().length}</div><p>Patients waiting</p><div class="trend flat">Avg wait 24 min</div></div>
      <div class="stat"><div class="n" style="color:var(--red)">${em}</div><p>Red-flag alerts</p><div class="trend down">Escalated to triage</div></div>
      <div class="stat"><div class="n">7.4 min</div><p>Saved per consultation</p><div class="trend up">+18% history depth</div></div>
      <div class="stat"><div class="n">92%</div><p>Median completeness</p><div class="trend up">Target 85%</div></div>
    </div>
    <div class="table-wrap">
      <div class="table-tools">
        <span class="search">${icon('search', 16)}<input data-field="search" value="${esc(STATE.search || '')}" placeholder="Search name, token or complaint" /></span>
        <span class="pill em">${icon('alert', 13)} Emergency first</span>
        <span class="pill routine">Sorted by triage priority</span>
      </div>
      <div class="scroll-x">
      <table class="grid">
        <thead><tr><th>Token</th><th>Patient</th><th>Chief complaint</th><th>Department</th><th>Vitals</th><th>Triage</th><th>History</th><th>Wait</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr class="${r.triage === 'emergency' ? 'flagged' : ''}" data-act="openPatient" data-token="${esc(r.token)}">
            <td><b>${esc(r.token)}</b></td>
            <td><div class="person"><span class="avatar">${initials(r.name)}</span><span><b>${esc(r.name)}</b><small>${r.age} · ${esc(r.gender)} · ${esc(r.lang)}</small></span></div></td>
            <td>${esc(r.complaint)}</td>
            <td>${esc(r.dept)}</td>
            <td><small>${esc(r.bp)} · ${r.pulse}/min · SpO₂ ${r.spo2}%</small></td>
            <td><span class="pill ${r.triage === 'emergency' ? 'em' : r.triage}">${r.triage === 'emergency' ? 'Emergency' : r.triage === 'urgent' ? 'Urgent' : 'Routine'}</span></td>
            <td><div class="meter"><span class="bar"><i style="width:${r.complete}%"></i></span><small>${r.complete}%</small></div></td>
            <td>${esc(r.wait)}</td>
          </tr>`).join('') || `<tr><td colspan="8"><div class="empty">No patients match that search.</div></td></tr>`}
        </tbody>
      </table></div>
    </div>
    <p class="foot-note">${icon('shield', 14)} MediKiosk never diagnoses or prescribes. Every summary stays a draft until the physician confirms it.</p>
  </main>`;
  return inner;
}

function viewDoctorDetail() {
  const p = queueRows().find(r => r.token === STATE.openToken) || queueRows()[0];
  const isLive = p.token === STATE.token;
  const sections = isLive ? buildSummary() : demoSummary(p);
  const flags = isLive ? STATE.redFlags : (p.triage === 'urgent' ? [{ level: 'urgent', label: 'Chronic cough beyond 3 weeks', evidence: 'Cough > 6 weeks with weight loss — consider TB workup' }] : []);
  const v = isLive ? liveVitals() : { sys: p.bp.split('/')[0], dia: p.bp.split('/')[1], pulse: p.pulse, spo2: p.spo2, temp: p.temp, height: 168, weight: 72 };
  const bmi = calcBmi(v);
  const dem = isLive ? STATE.patient : { name: p.name, age: p.age, gender: p.gender.toLowerCase(), blood: p.blood, phone: '98XXXXXX21', address: p.village, abha: p.abha, occupation: 'service', marital: 'married', emgName: 'Family member', emgPhone: '98XXXXXX45' };

  const inner = `<main class="dash">
    <div class="dash-head">
      <div>
        <button class="tiny" data-act="closePatient">${icon('back', 14)} Back to queue</button>
        <h1 style="margin-top:6px">${esc(dem.name || 'Patient')} · Token ${esc(p.token)}</h1>
        <p>Draft structured history · generated ${isLive ? 'just now' : '12 min ago'} · source-tagged and editable</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn secondary sm" data-act="print">${icon('print', 15)} Print</button>
        <button class="btn secondary sm" data-act="setView" data-view="admin">View FHIR bundle</button>
        <button class="btn primary sm" data-act="confirmSummary">${icon('check', 15)} ${STATE.confirmed ? 'Confirmed' : 'Confirm & save to EMR'}</button>
      </div>
    </div>
    ${voiceBlock()}
    ${flags.length ? `<div class="banner">${icon('alert', 22)}<div><b>${flags.length} priority signal${flags.length > 1 ? 's' : ''} detected · rule-based, not a diagnosis</b>
      <small>${flags.map(f => `${esc(f.label)} — ${esc(f.evidence)}`).join(' · ')}</small></div></div>` : ''}
    <div class="detail">
      <div>
        <div class="card">
          <div class="patient-head">
            <span class="avatar">${initials(dem.name)}</span>
            <div style="flex:1;min-width:180px">
              <h2 style="margin:0;font-size:19px">${esc(dem.name || 'Unnamed patient')}</h2>
              <p class="quiet" style="margin:2px 0 0">${esc(dem.age || '—')} yrs · ${esc(genderLabelEn(dem.gender) || '—')} · ${esc(p.lang)} · ${esc(p.dept)}</p>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span class="pill ${p.triage === 'emergency' ? 'em' : p.triage}">${p.triage}</span>
              <span class="pill info">${p.complete}% complete</span>
              <span class="pill ${STATE.confirmed && isLive ? 'ok' : 'routine'}">${STATE.confirmed && isLive ? 'Confirmed' : 'Draft'}</span>
            </div>
          </div>
          <div class="demo-grid">
            <div><span>ABHA</span><b>${esc(dem.abha || 'Not linked')}</b></div>
            <div><span>Blood group</span><b>${esc(dem.blood || '—')}</b></div>
            <div><span>Phone</span><b>${esc(dem.phone || '—')}</b></div>
            <div><span>Occupation</span><b>${esc(labelOf(OCCUPATIONS, dem.occupation) || '—')}</b></div>
            <div><span>Marital status</span><b>${esc(labelOf(MARITAL, dem.marital) || '—')}</b></div>
            <div><span>Address</span><b>${esc([dem.address, dem.city, dem.state].filter(Boolean).join(', ') || '—')}</b></div>
            <div><span>Emergency contact</span><b>${esc([dem.emgName, dem.emgPhone].filter(Boolean).join(' · ') || '—')}</b></div>
            <div><span>Visit</span><b>${esc(dem.visitType === 'follow' ? 'Follow-up' : 'First visit')}</b></div>
          </div>
          <div class="vitals-row">
            <div class="vital ${Number(v.sys) >= 140 || Number(v.sys) < 90 ? 'bad' : ''}"><b>${esc(v.sys || '—')}/${esc(v.dia || '—')}</b><span>BP mmHg</span></div>
            <div class="vital"><b>${esc(v.pulse || '—')}</b><span>Pulse</span></div>
            <div class="vital ${Number(v.spo2) && Number(v.spo2) < 94 ? 'bad' : ''}"><b>${esc(v.spo2 || '—')}%</b><span>SpO₂</span></div>
            <div class="vital ${Number(v.temp) >= 100.4 ? 'bad' : ''}"><b>${esc(v.temp || '—')}</b><span>Temp °F</span></div>
            <div class="vital"><b>${bmi ? bmi.value : '—'}</b><span>BMI</span></div>
          </div>
        </div>

        ${sections.map(s => `<div class="section ${s.red ? 'red' : ''}">
          <div class="section-head">
            <h3>${esc(s.title)}</h3>
            <div class="section-acts">
              <button data-act="sectionAct" data-id="${s.id}" data-do="accept" class="${STATE.sections[s.id] === 'accept' ? 'ok' : ''}">${STATE.sections[s.id] === 'accept' ? '✓ Accepted' : 'Accept'}</button>
              <button data-act="sectionAct" data-id="${s.id}" data-do="edit">Edit</button>
              <button data-act="sectionAct" data-id="${s.id}" data-do="reject">Reject</button>
            </div>
          </div>
          <div class="section-body">
            ${s.facts.map(f => `<div class="fact"><span class="src ${f.src}">${f.src}</span><p>${esc(f.text)}</p>${f.conf ? `<span class="conf ${f.conf >= 0.9 ? 'good' : f.conf >= 0.75 ? 'warn' : 'bad'}">${Math.round(f.conf * 100)}%</span>` : ''}</div>`).join('')}
          </div>
        </div>`).join('')}
      </div>

      <aside>
        <div class="card">
          <div class="section-head"><h3>Attached documents</h3><span class="pill info">${(isLive ? STATE.docs.length : 2)} items</span></div>
          <div style="padding:12px">
            <div class="paper">
              <b>Lab report · Pathology</b><small>Uploaded by patient · 20 Aug 2026</small>
              <div class="ln" style="width:80%"></div><div class="ln" style="width:60%"></div><div class="ln" style="width:88%"></div><div class="ln" style="width:52%"></div>
              <div class="bbox" style="left:14px;top:62px;width:150px;height:20px"></div>
              <div class="bbox warn" style="left:14px;top:100px;width:118px;height:20px"></div>
            </div>
          </div>
          ${(isLive && STATE.docs.length ? STATE.docs : [
            { label: 'Haemoglobin', value: '8.2 g/dL (ref 12–15)', date: '20 Aug 2026', conf: 0.96 },
            { label: 'Amlodipine 5 mg', value: 'Once daily, ongoing', date: '02 Aug 2026', conf: 0.81 }
          ]).map(d => `<div class="extract"><div><b>${esc(d.label)}</b><small>${esc(d.value)} · ${esc(d.date)}</small></div>
            <span class="conf ${d.conf >= 0.9 ? 'good' : d.conf >= 0.75 ? 'warn' : 'bad'}">${Math.round(d.conf * 100)}%</span></div>`).join('')}
        </div>

        <div class="card" style="margin-top:16px">
          <div class="section-head"><h3>Visit timeline</h3></div>
          <div class="timeline">
            ${[['10:02', 'Kiosk session started', 'Language: ' + (isLive ? langName() : p.lang), ''],
               ['10:04', 'Consent captured', 'C1 C2 C3 C4 accepted · C5 declined', ''],
               ['10:06', 'History interview completed', questionList().length + ' questions · voice + touch', ''],
               ['10:07', 'Red flag raised', flags.length ? flags[0].label : 'None', flags.length ? 'bad' : ''],
               ['10:08', 'Documents digitised', (isLive ? STATE.docs.length : 2) + ' extractions, 1 low confidence', 'warn'],
               ['10:09', 'Draft summary delivered', 'Awaiting physician confirmation', '']]
              .map(([time, title, sub, tone]) => `<div class="tl-item"><span class="tl-dot ${tone}"></span><div><b>${esc(title)}</b><small>${esc(time)} · ${esc(sub)}</small></div></div>`).join('')}
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="section-head"><h3>Physician note</h3></div>
          <div style="padding:12px">
            <textarea class="input" data-field="docNote" placeholder="Add your examination findings and plan…">${esc(STATE.docNote || '')}</textarea>
            <p class="quiet" style="margin:8px 0 0">Saved to the encounter, never auto-generated by AI.</p>
          </div>
        </div>
      </aside>
    </div>
  </main>`;
  return inner;
}

/* ============ triage ============ */
/* (triage and admin render inside the dash; the AI panel is attached to the
   doctor console in render()) */
function maskPhone(p) {
  const s = String(p || '').replace(/\D/g, '');
  if (!s) return '—';
  if (s.length <= 2) return s;
  return 'X'.repeat(Math.max(0, s.length - 2)) + s.slice(-2);
}

function emStatusLabel(st) {
  if (st === 'accepted') return isHi() ? '🟠 स्वीकार किया' : '🟠 Accepted';
  if (st === 'open') return isHi() ? '🟢 केस खुला' : '🟢 Case open';
  return isHi() ? '🔴 ट्रायज की प्रतीक्षा' : '🔴 Awaiting Triage';
}

function viewTriage() {
  const cases = STATE.emCases || [];
  const waiting = cases.filter(c => c.status === 'awaiting').length;
  const alerts = queueRows().filter(r => r.triage !== 'routine');
  return `<main class="dash">
    <div class="dash-head"><div><h1>${isHi() ? 'ट्रायज डेस्क' : 'Triage desk'}</h1>
      <p>${isHi() ? 'आपात केस यहीं आते हैं — डॉक्टर की OPD कतार में नहीं। स्वीकार करने के बाद रास्ता तय करें।' : 'Emergency intake lands here — not in the doctor OPD queue. Accept the case, then choose the clinical pathway.'}</p></div>
      <span class="pill em">${waiting} ${isHi() ? 'आपात प्रतीक्षा' : 'awaiting triage'}</span></div>
    <div class="stats">
      <div class="stat"><div class="n">${cases.length}</div><p>${isHi() ? 'आपात केस' : 'Emergency cases'}</p></div>
      <div class="stat"><div class="n">${waiting}</div><p>${isHi() ? 'प्रतीक्षा' : 'Awaiting'}</p></div>
      <div class="stat"><div class="n">${cases.filter(c => c.status === 'accepted' || c.status === 'open').length}</div><p>${isHi() ? 'स्वीकार / खुले' : 'Accepted / open'}</p></div>
      <div class="stat"><div class="n">${alerts.length}</div><p>${isHi() ? 'कियोस्क रेड-फ़्लैग' : 'Kiosk red-flags'}</p></div>
    </div>
    ${cases.map(c => {
      const rel = c.attendant
        ? `${esc(labelOf(RELATIONS, c.relRelation) || c.relRelation || (isHi() ? 'रिश्तेदार' : 'Relative'))} — ${esc(maskPhone(c.relPhone))}`
        : (isHi() ? 'आवश्यक नहीं' : 'Not required');
      return `<article class="em-case-card">
        <header class="em-case-head">
          <h3>🚨 ${isHi() ? 'आपात केस' : 'EMERGENCY CASE'} #${esc(c.caseNo)}</h3>
          <span class="pill em">${esc(emStatusLabel(c.status))}</span>
        </header>
        <dl class="em-case-dl">
          <div><dt>${isHi() ? 'मरीज़' : 'PATIENT'}</dt><dd>${esc(c.name)}</dd></div>
          <div><dt>${isHi() ? 'समस्या' : 'PROBLEM'}</dt><dd>${esc(c.problem)}</dd></div>
          <div><dt>${isHi() ? 'साथ वाला' : 'ATTENDANT'}</dt><dd>${c.attendant ? (isHi() ? 'आवश्यक' : 'Required') + ' · ' + rel : rel}</dd></div>
          <div><dt>STATUS</dt><dd>${esc(emStatusLabel(c.status))}</dd></div>
        </dl>
        <div class="em-case-acts">
          <button class="btn primary sm" data-act="emAccept" data-id="${esc(c.id)}">${isHi() ? 'स्वीकार करें' : 'ACCEPT'}</button>
          <button class="btn secondary sm" data-act="emCall" data-id="${esc(c.id)}">${isHi() ? 'मरीज़ को कॉल' : 'CALL PATIENT'}</button>
          <button class="btn ghost sm" data-act="emOpenCase" data-id="${esc(c.id)}">${isHi() ? 'केस खोलें' : 'OPEN CASE'}</button>
        </div>
      </article>`;
    }).join('') || `<div class="card"><div class="empty">${isHi() ? 'कोई आपात केस नहीं। कियोस्क से START दबाने पर यहाँ आएगा।' : 'No emergency cases. Patient START on the kiosk sends cases here.'}</div></div>`}
    ${alerts.length ? `<h2 class="em-subhead">${isHi() ? 'कियोस्क रेड-फ़्लैग अलर्ट' : 'Kiosk red-flag alerts'}</h2>` : ''}
    ${alerts.map(a => `<div class="section ${a.triage === 'emergency' ? 'red' : ''}">
      <div class="section-head">
        <h3>${esc(a.token)} · ${esc(a.name)} · ${a.age}/${esc(a.gender)}</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="pill ${a.triage === 'emergency' ? 'em' : 'urgent'}">${a.triage}</span>
          <button class="btn ${STATE.triageAck ? 'secondary' : 'primary'} sm" data-act="ackTriage">${STATE.triageAck ? 'Acknowledged' : 'Acknowledge'}</button>
        </div>
      </div>
      <div class="section-body">
        <div class="fact"><span class="src patient">patient</span><p>${esc(a.complaint)}</p></div>
        <div class="fact"><span class="src nurse">vitals</span><p>BP ${esc(a.bp)} · Pulse ${a.pulse} · SpO₂ ${a.spo2}% · Temp ${a.temp} °F</p></div>
        <div class="fact"><span class="src derived">rule</span><p>${esc(a.reason || 'Escalated by red-flag rule engine')}</p></div>
      </div>
    </div>`).join('')}
    <p class="foot-note">${icon('shield', 14)} ${isHi() ? 'आपात मॉड्यूल डॉक्टर की व्यक्तिगत कतार में केस नहीं डालता।' : 'Emergency module never enqueues into a doctor’s personal OPD list.'}</p>
  </main>`;
}

/* ============ admin ============ */
function viewAdmin() {
  const ax = STATE.analytics || CLIENT_ANALYTICS_FALLBACK;
  const maxOpc = Math.max(...ax.dailyOpc.map(d => d.count));
  const maxComp = Math.max(...ax.topComplaints.map(c => c.count));
  const consentRows = CONSENTS.map(c => `<div class="list-row"><div><b>${esc(c.en)}</b><small>${esc(c.detail)}</small></div>
    <span class="pill ${STATE.consents[c.id] ? 'ok' : 'routine'}">${STATE.consents[c.id] ? 'Granted' : 'Declined'}</span></div>`).join('');
  const usage = [['Hindi', 61], ['Marathi', 14], ['Bengali', 9], ['Tamil', 8], ['English', 8]];
  return `<main class="dash">
    <div class="dash-head"><div><h1>Admin, privacy & interoperability</h1><p>Consent ledger, audit trail, ABDM FHIR export and kiosk analytics.</p></div>
      <div style="display:flex;gap:8px"><button class="btn secondary sm" data-act="copyFhir">Copy FHIR bundle</button>
      <button class="btn primary sm" data-act="pushAbdm">Push to ABDM sandbox</button></div></div>
    <div class="stats">
      <div class="stat"><div class="n">${ax.sessionsToday}</div><p>Sessions today</p><div class="trend up">+22% vs last week</div></div>
      <div class="stat"><div class="n">${Number(ax.avgKioskMinutes).toFixed(1)} min</div><p>Median kiosk time</p><div class="trend up">Under 8 min target</div></div>
      <div class="stat"><div class="n">${ax.consentCompletion}%</div><p>Consent completion</p></div>
      <div class="stat"><div class="n">0</div><p>PII leaks detected</p><div class="trend up">DPDP compliant</div></div>
    </div>
    <div class="two-col" style="margin-top:16px">
      <div class="card"><div class="section-head"><h3>Daily OPD load</h3><span class="pill routine">Last 7 days</span></div>
        <div class="chart-bars">${ax.dailyOpc.map(d => `<div class="bar-col"><i style="height:${Math.max(8, Math.round((d.count / maxOpc) * 100))}%"></i><b>${d.count}</b><span>${esc(d.day)}</span></div>`).join('')}</div></div>
      <div class="card"><div class="section-head"><h3>Top complaints</h3><span class="pill routine">This week</span></div>
        ${ax.topComplaints.map(c => `<div class="list-row"><b>${esc(c.complaint)}</b><div class="meter"><span class="bar" style="width:150px"><i style="width:${Math.round((c.count / maxComp) * 100)}%"></i></span><small>${c.count}</small></div></div>`).join('')}</div>
    </div>
    <div class="two-col" style="margin-top:16px">
      <div class="card"><div class="section-head"><h3>Consent ledger · token ${esc(STATE.token)}</h3><span class="pill info">Revocable</span></div>${consentRows}</div>
      <div class="card"><div class="section-head"><h3>Audit trail</h3><span class="pill routine">Append only</span></div>
        ${AUDIT_SEED.concat(STATE.audit).map(a => `<div class="list-row"><div><b>${esc(a.action)}</b><small>${esc(a.actor)} · ref ${esc(a.ref)}</small></div><span class="quiet">${esc(a.time)}</span></div>`).join('')}</div>
      <div class="card"><div class="section-head"><h3>Language mix</h3><span class="pill routine">Last 7 days</span></div>
        ${usage.map(([l, n]) => `<div class="list-row"><b>${l}</b><div class="meter"><span class="bar" style="width:150px"><i style="width:${n}%"></i></span><small>${n}%</small></div></div>`).join('')}</div>
      <div class="card"><div class="section-head"><h3>Data retention & safety</h3></div>
        ${[['Raw audio', 'Deleted from kiosk after submission'], ['Session cache', 'Wiped after 90 s idle'], ['Transport', 'TLS 1.3, at-rest AES-256'], ['Model outputs', 'Draft only until physician confirms'], ['Diagnosis or prescription', 'Never generated by the system']]
          .map(([k, v]) => `<div class="list-row"><b>${k}</b><span class="quiet" style="text-align:right">${v}</span></div>`).join('')}</div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="section-head"><h3>ABDM FHIR R4 bundle · preview</h3><span class="pill info">NRCeS IG v6.5.0</span></div>
      <div style="padding:12px"><pre class="code">${esc(JSON.stringify(fhirBundle(), null, 2))}</pre></div>
    </div>
  </main>`;
}

/* ============ Ayurveda AI (AyurVaani · NirogaVerse) ============ */
function mdLite(s) {
  return esc(s)
    .replace(/^#{1,4}\s*(.*)$/gm, '<b>$1</b>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/^[-•]\s+/gm, '• ')
    .replace(/\n/g, '<br/>');
}

function ayurBubble(m) {
  const me = m.role === 'USER';
  return `<div class="ayur-msg ${me ? 'user' : 'bot'}">
    ${me ? '' : `<div class="ayur-avatar" aria-hidden="true">${icon('leaf', 16)}</div>`}
    <div class="ayur-bubble ${me ? 'me' : 'ai'}">${me ? esc(m.content) : mdLite(m.content)}
      ${(!me && m.content.includes('AyurVedic Consultant Report')) ? `<div class="ayur-pdf-card">
        <b>${icon('file', 14)} ${isHi() ? 'आपकी विस्तृत रिपोर्ट तैयार है' : 'Your comprehensive report is ready'}</b>
        <button class="btn primary sm" data-act="ayurPdf">${icon('print', 14)} ${isHi() ? 'पर्चा PDF डाउनलोड करें' : 'Download Prescription PDF'}</button>
      </div>` : ''}
    </div>
  </div>`;
}

function viewAyur() {
  /* AyurVaani connection:
     · mode 'embed'  → iframe to the real NirogaVerse React app (full original UI).
     · mode 'native' → built-in chat (vanilla port over the same NirogaVerse API:
       sessions sidebar, profile wizard, auto-TTS, prescription PDF). */
  const embedUrl = window.AYUR_EMBED_URL || '/niro/modules/ayurvaani';
  const mode = 'embed';

  if (mode === 'embed') {
    return `<main class="ayur-embed" aria-label="AyurVaani module">
      <div class="ayur-embed-bar">
        <span class="pill info">${icon('leaf', 12)} AyurVaani · NirogaVerse</span>
      </div>
      <iframe class="ayur-embed-frame" id="ayurFrame" src="${esc(embedUrl)}" title="AyurVaani consultation" allow="microphone; autoplay; clipboard-write"></iframe>
    </main>`;
  }

  const A = STATE.ayur;
  const p = STATE.patient;
  const hasIntake = !!STATE.answers.complaint;
  const statusPill = A.sending
    ? '<span class="pill urgent">Thinking…</span>'
    : A.source === 'NirogaVerse AI'
      ? '<span class="pill ok">NirogaVerse AI live</span>'
      : (A.source === 'local-rules' || A.error === 'offline')
        ? '<span class="pill urgent">Offline guidance</span>'
        : '<span class="pill info">Ready</span>';
  const vitalsBits = [STATE.vitals.sys && STATE.vitals.dia ? `BP ${STATE.vitals.sys}/${STATE.vitals.dia}` : '', STATE.vitals.pulse ? `Pulse ${STATE.vitals.pulse}` : '', STATE.vitals.spo2 ? `SpO₂ ${STATE.vitals.spo2}%` : ''].filter(Boolean).join(' · ');
  const prakriti = STATE.ayush.prakriti ? labelOf((ayushDef('prakriti') || { options: [] }).options, STATE.ayush.prakriti) : '';
  const prof = A.profileData || {};

  const sessionRows = (A.sessions || []).map(s => `
    <div class="ayur-sess ${A.session === s.id ? 'active' : ''}" data-act="ayurOpenSession" data-id="${esc(s.id)}">
      <div class="ayur-sess-info"><b>${esc((s.title || 'Consultation').slice(0, 34))}</b><small>${esc(String(s.createdAt || '').slice(0, 16).replace('T', ' '))}</small></div>
      <button class="ayur-sess-del" data-act="ayurDelSession" data-id="${esc(s.id)}" aria-label="Delete session">×</button>
    </div>`).join('');

  const sidebar = `<aside class="ayur-sidebar ${A.sidebar ? '' : 'closed'}">
    <button class="btn primary sm ayur-new" data-act="ayurNew">${isHi() ? '+ नया सेशन' : '+ New session'}</button>
    <div class="ayur-sess-list">${A.sessions.length ? sessionRows : `<small class="quiet" style="padding:10px">${isHi() ? 'अभी कोई सेशन नहीं' : 'No sessions yet'}</small>`}</div>
  </aside>`;

  const welcome = `<div class="ayur-welcome">
    <div class="ayur-big-avatar">${icon('leaf', 26)}</div>
    <h2>${isHi() ? 'अभिवादन — मैं आयुर्वेदिक सहायक हूँ' : 'Namaste — I am the Ayurvedic assistant'}</h2>
    <p>${isHi()
      ? 'अपनी तकलीफ़ बताइए — मैं चरक संहिता पर आधारित घरेलू उपचार, आहार और दिनचर्या सुझाऊँगा। यह निदान नहीं है।'
      : 'Describe your complaint — I suggest Charaka-Samhita-grounded home remedies, diet (pathya) and daily routine. This is not a diagnosis.'}</p>
    ${hasIntake ? `<button class="btn primary" data-act="ayurHandoff" ${A.sending ? 'disabled' : ''}>${icon('heartpulse', 16)} ${isHi() ? 'कियोस्क इनटेक AI को भेजें' : 'Send kiosk intake to the AI'} ${icon('arrow', 16)}</button>
      <small class="quiet" style="display:block;margin-top:8px">${isHi() ? 'साथ में जाएगा:' : 'Will be attached:'} ${esc(narrative() || complaintName())}${vitalsBits ? ' · ' + esc(vitalsBits) : ''}${prakriti ? ' · Prakriti: ' + esc(prakriti) : ''}</small>`
      : `<small class="quiet">${isHi() ? 'टिप: कियोस्क में शिकायत भरने के बाद यह अपने आप जुड़ जाएगी।' : 'Tip: complete the kiosk complaint step and it will attach automatically.'}</small>`}
    <div class="ayur-chips">
      ${[['सुबह उठकर सिर भारी लगता है', 'Heavy head on waking'], ['अक्सर अपच और गैस बनती है', 'Frequent indigestion and gas'], ['रात में नींद नहीं आती', 'Cannot sleep at night']]
        .map(([hi, en]) => `<button class="ayur-chip" data-act="ayurAsk" data-q="${esc(isHi() ? hi : en)}">${esc(isHi() ? hi : en)}</button>`).join('')}
    </div>
  </div>`;

  return `<main class="dash"><section class="card ayur-card">
    <div class="section-head">
      <h3>${icon('leaf', 18)} AyurVaani · ${isHi() ? 'आयुर्वेदिक AI सलाह' : 'Ayurvedic AI consult'}</h3>
      <div style="display:flex;gap:8px;align-items:center">
        ${statusPill}
        <button class="btn ghost sm ${A.autoSpeak ? 'tts-on' : ''}" data-act="ayurTts" title="${isHi() ? 'उत्तर अपने आप सुनाई दें' : 'Auto read answers aloud'}">${icon('volume', 16)} ${A.autoSpeak ? (isHi() ? 'हिंदी' : 'Auto') : (isHi() ? 'बंद' : 'Muted')}</button>
        ${toggle}
        ${A.messages.length ? `<button class="btn ghost sm" data-act="ayurSpeak" title="${isHi() ? 'उत्तर सुनें' : 'Read answer aloud'}">${icon('volume', 16)}</button>` : ''}
      </div>
    </div>
    <div class="ayur-workspace">
      ${sidebar}
      <div class="ayur-main">
        ${hasIntake && A.messages.length ? `<div class="ayur-ctx">${icon('user', 14)} <b>${esc(prof.name || p.name || 'Patient')}</b> · ${esc(String(prof.age || p.age || '–'))} yrs · ${esc(narrative() || complaintName())}${vitalsBits ? ' · ' + esc(vitalsBits) : ''}${prakriti ? ' · Prakriti: ' + esc(prakriti) : ''}</div>` : ''}
        <div class="ayur-thread" id="ayurThread">
          ${A.messages.length ? A.messages.map(ayurBubble).join('') : welcome}
          ${A.sending ? `<div class="ayur-msg bot"><div class="ayur-avatar">${icon('leaf', 16)}</div><div class="ayur-bubble ai ayur-typing"><i></i><i></i><i></i></div></div>` : ''}
        </div>
        ${A.error && A.error !== 'offline' ? `<div class="ayur-error">${icon('alert', 14)} ${esc(A.error)}</div>` : ''}
        <div class="ayur-inputbar">
          <button class="mic-btn sm ${ayurMicActive() ? 'listening' : ''}" data-act="ayurMic" title="${isHi() ? 'बोलकर पूछें' : 'Tap to speak'}" aria-label="${isHi() ? 'माइक' : 'Microphone'}">${icon('mic', 20)}</button>
          <textarea class="input" rows="1" data-field="ayurInput" placeholder="${ayurMicActive() ? (isHi() ? 'सुन रहा हूँ…' : 'Listening…') : (isHi() ? 'अपनी समस्या लिखिए या बोलिए…' : 'Type or speak your problem…')}" aria-label="${isHi() ? 'अपना संदेश' : 'Your message'}">${esc(A.input || '')}</textarea>
          <button class="btn primary" data-act="ayurSend" ${A.sending || !(A.input || '').trim() ? 'disabled' : ''} aria-label="${isHi() ? 'भेजें' : 'Send'}">${icon('send', 18)}</button>
        </div>
        <small class="quiet ayur-disclaimer">${icon('shield', 12)} ${isHi()
          ? 'AI सलाह केवल संरचित जानकारी है — दवा या निदान वैद्य/डॉक्टर ही तय करेंगे। संदेह हो तो तुरंत डॉक्टर से मिलें।'
          : 'AI output is structured guidance only — diagnosis and prescription remain with the Vaidya/physician. When in doubt, see a doctor immediately.'}</small>
      </div>
    </div>
  </section></main>`;
}

/* ============ root ============ */
function render(opts) {
  if (typeof afterScanNavigate === 'function') afterScanNavigate();
  let inner;
  /* staff OTP gate sits in front of every doctor-end screen */
  if (STATE.staffLogin && !staffVerified() && ['doctor', 'triage', 'admin'].includes(STATE.view)) inner = staffLoginCard();
  else if (STATE.view === 'landing') inner = viewLanding();
  else if (STATE.view === 'dashboard') inner = viewDashboard();
  else if (STATE.view === 'settings') inner = viewSettings();
  else if (STATE.view === 'doctor') inner = viewDoctor() + aiAssistantPanel();
  else if (STATE.view === 'triage') inner = viewTriage();
  else if (STATE.view === 'admin') inner = viewAdmin();
  else if (STATE.view === 'ayur') inner = viewAyur();
  else if (STATE.em && STATE.em.phase) inner = viewEmModule();
  else if (STATE.step === 'emergency') inner = viewEmergency();
  else if (STATE.step === 'welcome') inner = viewWelcome();
  else if (STATE.step === 'identity') inner = viewIdentity();
  else if (STATE.step === 'demographics') inner = viewDemographics();
  else if (STATE.step === 'consent') inner = viewConsent();
  else if (STATE.step === 'department') inner = viewDepartment();
  else if (STATE.step === 'vitals') inner = viewVitals();
  else if (STATE.step === 'complaint') inner = viewComplaint();
  else if (STATE.step === 'interview') inner = viewInterview();
  else if (STATE.step === 'ayush') inner = viewAyush();
  else if (STATE.step === 'scan') inner = viewScan();
  else if (STATE.step === 'review') inner = viewReview();
  else inner = viewDone();
  const root = document.getElementById('app');
  if (root) root.innerHTML = viewShell(inner);
  if (typeof afterRender === 'function') afterRender();
  if (STATE.view === 'ayur') pauseKioskLiveDock();
  if (!(opts && opts.quiet)) maybeAutoSpeak();
}
