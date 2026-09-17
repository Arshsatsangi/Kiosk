/* AarogyaVaani · MediKiosk — zero-dependency static server + REST API (SIH26047)
   API mirrors the implementation document:
     POST /api/auth/login            ABHA/Aadhaar + mock OTP (1234) → session token
     POST /api/consent               Record granular patient consent
     POST /api/session/start         Create intake session, set language
     PATCH /api/session/:sessionId   Persist live kiosk intake (patient, vitals, answers…)
     GET  /api/session/:sessionId    Fetch a saved intake session
     POST /api/conversation/turn     Store one Q&A turn of the interview
     POST /api/scan-link             Create kiosk↔phone pairing (QR payload)
     POST /api/documents/upload      Upload image for OCR (base64 JSON)
     GET  /api/documents             List documents for a session (phone→kiosk poll)
     GET  /api/documents/:id         Fetch one document (incl. image)
     GET  /api/documents/:id/status  Poll OCR/extraction status
     POST /api/summary/generate      Generate structured summary
     GET  /api/summary/:sessionId    Fetch structured summary
     PATCH /api/summary/:sessionId   Physician edits/confirms the summary
     POST /api/fhir/push             Push confirmed record to HIS/ABDM (mocked, logged)
     GET  /api/admin/analytics       OPD load, avg kiosk time, complaints, language mix
     GET  /api/dashboard             Live store aggregates for landing/dashboard (no seed)
   Persistence: a single JSON file (data/api-store.json) stands in for
   PostgreSQL + MongoDB in this no-dependency prototype. */

import { createReadStream, existsSync, statSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import dns from 'node:dns';
import { extname, join, normalize } from 'node:path';

/* Prefer IPv4 — Node's default IPv6-first lookup often yields `fetch failed`
   / timeouts against NVIDIA NIM on networks without working AAAA routing. */
dns.setDefaultResultOrder('ipv4first');

/* Load .env (simple KEY=VALUE lines) — keeps the NVIDIA key out of the repo. */
try {
  for (const line of readFileSync(join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
} catch { /* no .env — fine */ }

const root = process.cwd();
const PORT = Number(process.env.PORT) || 4173;
const STORE_FILE = join(root, 'data', 'api-store.json');
const MAX_BODY = 8 * 1024 * 1024; // 8 MB — kiosk / phone photos are base64
/* NirogaVerse bridge — same-origin proxy target (Express + Prisma + OpenAI).
   Set NIRO_BASE=http://localhost:3000 when the NirogaVerse server is running. */
const NIRO_BASE = (process.env.NIRO_BASE || 'http://localhost:3000').replace(/\/$/, '');

const types = {
  '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'
};

/* ---------------- JSON-file store (stands in for Postgres + Mongo) ---------------- */
function defaultStore() {
  return { sessions: [], consents: [], turns: [], documents: [], summaries: [], fhirPushes: [], scanLinks: [], emergencies: [], seq: 1 };
}
function loadStore() {
  try { return JSON.parse(readFileSync(STORE_FILE, 'utf8')); } catch { return defaultStore(); }
}
function saveStore(s) {
  try { mkdirSync(join(root, 'data'), { recursive: true }); writeFileSync(STORE_FILE, JSON.stringify(s, null, 2)); } catch (e) { console.error('store write failed', e.message); }
}
const store = loadStore();
if (!Array.isArray(store.emergencies)) store.emergencies = [];
if (!Array.isArray(store.scanLinks)) store.scanLinks = [];
const nextId = prefix => { const n = store.seq++; return `${prefix}-${String(n).padStart(4, '0')}`; };

function parseQuery(req) {
  try { return new URL(req.url || '/', 'http://localhost').searchParams; } catch { return new URLSearchParams(); }
}
function scanLinks() {
  if (!Array.isArray(store.scanLinks)) store.scanLinks = [];
  return store.scanLinks;
}
function randCode(len, alphabet) {
  const a = alphabet || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
function findScanLink(sessionId, token) {
  if (!sessionId || !token) return null;
  return scanLinks().find(l => l.sessionId === sessionId && l.token === token) || null;
}

/* ---------------- seed analytics baseline (so charts look alive before first session) ---------------- */
const ANALYTICS_SEED = {
  dailyOpc: [
    { day: 'Wed', count: 198 }, { day: 'Thu', count: 221 }, { day: 'Fri', count: 205 },
    { day: 'Sat', count: 164 }, { day: 'Sun', count: 96 }, { day: 'Mon', count: 232 }, { day: 'Tue', count: 247 }
  ],
  topComplaints: [
    { complaint: 'Joint pain', count: 58 }, { complaint: 'Fever', count: 47 },
    { complaint: 'Digestion / constipation', count: 39 }, { complaint: 'Chest pain', count: 24 },
    { complaint: 'Headache', count: 19 }
  ],
  avgKioskMinutes: 6.9, sessionsToday: 248, consentCompletion: 94
};

function computeAnalytics() {
  const a = JSON.parse(JSON.stringify(ANALYTICS_SEED));
  const today = new Date().toISOString().slice(0, 10);
  const todays = store.sessions.filter(s => (s.startedAt || '').slice(0, 10) === today);
  const last = a.dailyOpc[a.dailyOpc.length - 1];
  a.sessionsToday = a.sessionsToday + todays.length;         // seed baseline + real sessions
  last.count = last.count + todays.length;
  a.dailyOpc[a.dailyOpc.length - 1] = last;
  const langCount = {};
  store.sessions.forEach(s => { langCount[s.lang || 'en'] = (langCount[s.lang || 'en'] || 0) + 1; });
  const LANG_NAME = { hi: 'hindi', en: 'english', mr: 'marathi', bn: 'bengali', ta: 'tamil', te: 'telugu' };
  a.languageSplit = [
    { lang: 'Hindi', pct: 61 }, { lang: 'Marathi', pct: 14 }, { lang: 'Bengali', pct: 9 },
    { lang: 'Tamil', pct: 8 }, { lang: 'English', pct: 8 }
  ];
  Object.entries(langCount).forEach(([lang, n]) => {
    const name = LANG_NAME[lang] || lang;
    const row = a.languageSplit.find(r => r.lang.toLowerCase() === name);
    if (row) row.pct = Math.min(99, row.pct + n);
  });
  return a;
}

function monthKey(iso) {
  return String(iso || '').slice(0, 7);
}

function computeDashboard() {
  const sessions = store.sessions || [];
  const consents = store.consents || [];
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const patients = new Set();
  let thisMonthN = 0;
  let lastMonthN = 0;
  let durations = 0;
  let durationN = 0;
  sessions.forEach(s => {
    const p = s.patient || {};
    const key = String(p.abha || p.phone || p.aadhaar || p.name || s.id || '').trim().toLowerCase();
    if (key) patients.add(key);
    const started = s.startedAt || '';
    const mk = monthKey(started);
    if (mk === thisMonth) thisMonthN += 1;
    if (mk === prev) lastMonthN += 1;
    if (s.startedAt && s.completedAt) {
      const ms = Date.parse(s.completedAt) - Date.parse(s.startedAt);
      if (Number.isFinite(ms) && ms > 0 && ms < 4 * 60 * 60 * 1000) {
        durations += ms;
        durationN += 1;
      }
    }
  });
  const sessionsToday = sessions.filter(s => (s.startedAt || '').slice(0, 10) === today).length;
  const granted = consents.filter(c => {
    const x = c.consents || {};
    return !!(x.c1 && x.c2);
  }).length;
  let monthlyGrowthPct = null;
  if (lastMonthN > 0) monthlyGrowthPct = Math.round(((thisMonthN - lastMonthN) / lastMonthN) * 100);
  return {
    patientsServed: patients.size,
    sessions: sessions.length,
    sessionsToday,
    consents: consents.length,
    consentCompletion: consents.length ? Math.round((granted / consents.length) * 100) : null,
    avgKioskMinutes: durationN ? Math.round((durations / durationN / 60000) * 10) / 10 : null,
    monthlyGrowthPct,
    thisMonthSessions: thisMonthN,
    lastMonthSessions: lastMonthN
  };
}

/* ---------------- patient registry (demo EHR index for returning patients) ----------------
   Keyed by ABHA / Aadhaar / phone. Auto-seeded from completed sessions and a
   small demo roster so returning-patient history works out of the box. */
const PATIENTS_FILE = join(root, 'data', 'patients.json');
function defaultPatients() {
  return [
    {
      abha: '91-2345-6789-0123', aadhaar: '4321-8765-1234', phone: '9876543221',
      name: 'Ramesh Kumar', age: '58', dob: '1968-04-12', gender: 'male', blood: 'B+',
      marital: 'married', occupation: 'farmer', education: 'primary',
      phoneContact: '9876543221', address: 'House 14, Gandhi Nagar', city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201009', area: 'rural',
      emgName: 'Sunita Kumari', emgRelation: 'spouse', emgPhone: '9876500112',
      visits: [
        { date: '2026-08-20', dept: 'Kayachikitsa · Ayurveda OPD', complaint: 'Chest pain, pressure-like', bp: '148/92', pulse: '104', doctor: 'Dr. A. Menon', advice: 'ECG done — referred to cardiology; amlodipine 5 mg OD' },
        { date: '2026-05-11', dept: 'Kayachikitsa · Ayurveda OPD', complaint: 'Acidity, bloating', bp: '140/88', pulse: '88', doctor: 'Dr. R. Iyer', advice: 'Avipattikar churna, diet counselling' },
        { date: '2025-11-02', dept: 'Shalakya OPD', complaint: 'Blurred vision, headache', bp: '138/86', pulse: '80', doctor: 'Dr. S. Devi', advice: 'Referred for refraction; goggles prescribed' }
      ]
    },
    {
      abha: '12-3456-7890-1234', aadhaar: '5678-1234-4321', phone: '9812004455',
      name: 'Kamla Devi', age: '64', dob: '1962-01-25', gender: 'female', blood: 'O+',
      marital: 'widowed', occupation: 'homemaker', education: 'none',
      phoneContact: '9812004455', address: 'Ward 7, Nehru Colony', city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201009', area: 'urban',
      emgName: 'Rakesh Yadav', emgRelation: 'son', emgPhone: '9871122334',
      visits: [
        { date: '2026-07-02', dept: 'Kayachikitsa OPD', complaint: 'Both knee pain, 2 years', bp: '134/84', pulse: '76', doctor: 'Dr. R. Iyer', advice: 'Janu basti 7 sittings; yoga referral' },
        { date: '2026-01-18', dept: 'Prasuti Tantra OPD', complaint: 'Routine check-up', bp: '128/80', pulse: '74', doctor: 'Dr. S. Devi', advice: 'Calcium + vitamin D started' }
      ]
    }
  ];
}
function loadPatients() {
  try {
    const p = JSON.parse(readFileSync(PATIENTS_FILE, 'utf8'));
    return Array.isArray(p) && p.length ? p : defaultPatients();
  } catch { return defaultPatients(); }
}
const patients = loadPatients();
function savePatients() {
  try { mkdirSync(join(root, 'data'), { recursive: true }); writeFileSync(PATIENTS_FILE, JSON.stringify(patients, null, 2)); } catch (e) { console.error('patients write failed', e.message); }
}
function findPatient({ abha, aadhaar, phone }) {
  const norm = s => String(s || '').replace(/[\s-]/g, '');
  return patients.find(p =>
    (abha && norm(p.abha) === norm(abha)) ||
    (aadhaar && norm(p.aadhaar) === norm(aadhaar)) ||
    (phone && norm(p.phoneContact || p.phone) === norm(phone))
  ) || null;
}

/* ---------------- request helpers ---------------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = []; let done = false;
    req.on('data', c => {
      if (done) return; /* past the limit: keep draining but stop accumulating */
      size += c.length;
      if (size > MAX_BODY) { done = true; reject(Object.assign(new Error('Payload too large'), { status: 413 })); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(Object.assign(new Error('Invalid JSON body'), { status: 400 })); } } });
    req.on('error', reject);
  });
}
function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(body);
}

/* ---------------- API handlers ---------------- */
/* ---------------- NVIDIA NIM (doctor AI assistant) ---------------- */
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'mistralai/mistral-nemotron';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

function doctorSystemPrompt() {
  return [
    'You are DocBot, an AI copilot for physicians using the MediKiosk OPD console at a government AYUSH hospital (AIIA).',
    'The physician already has the patient\'s structured kiosk history on screen (demographics, vitals, SOCRATES history, Dashavidha Pariksha, red flags).',
    'Help the physician: draft clinical notes, summarise the case, suggest differentials as a ranked list with brief reasoning, propose investigations and AYUSH-compatible management considerations.',
    'Rules you must never break:',
    '1. You support a licensed physician — never issue a final diagnosis or prescription; always frame as considerations for the physician to confirm.',
    '2. Be concise and structured: short headings, tight bullets. The physician is between patients.',
    '3. If the question is unrelated to this patient or clinical work, answer briefly and steer back to the case.',
    '4. Answer in the language of the physician\'s last message (English, Hindi or Hinglish).',
    '5. Red-flag vitals (SpO2 < 92, systolic < 90, temp >= 103F, chest pain with autonomic features) always go to emergency assessment, not watchful waiting.'
  ].join('\n');
}

function nvidiaFailDetail(status, d) {
  const err = d && d.error;
  const msg = (d && (d.detail || d.title))
    || (err && (typeof err === 'string' ? err : (err.message || err.code)))
    || ('NVIDIA NIM returned ' + status);
  return String(msg).slice(0, 240);
}

function isNetworkFail(detail) {
  const s = String(detail || '').toLowerCase();
  return /fetch failed|abort|timeout|unreachable|econn|enotfound|etimedout|eai_again|certificate|socket/.test(s);
}

function callNvidiaOnce(messages, model, timeoutMs, injectDoctor) {
  const msgs = injectDoctor ? [{ role: 'system', content: doctorSystemPrompt() }, ...messages] : messages;
  const payload = JSON.stringify({
    model,
    messages: msgs,
    temperature: injectDoctor ? 0.3 : 0,
    top_p: 0.9,
    max_tokens: injectDoctor ? 1024 : 500
  });
  return fetch(NVIDIA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + NVIDIA_KEY
    },
    body: payload,
    signal: AbortSignal.timeout(timeoutMs)
  })
    .then(r => r.json().catch(() => ({})).then(d => ({ status: r.status, d })))
    .then(({ status, d }) => {
      const content = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (status === 200 && content) {
        return { ok: true, content, model: d.model || model, tokens: d.usage && d.usage.total_tokens };
      }
      return { ok: false, detail: nvidiaFailDetail(status, d) };
    })
    .catch(e => ({ ok: false, detail: 'NVIDIA NIM unreachable: ' + (e && e.name === 'TimeoutError' ? 'timeout' : (e && e.message || e)) }));
}

const NVIDIA_MODEL_ALT = process.env.NVIDIA_MODEL_ALT || 'nvidia/nemotron-3-super-120b-a12b';

function callNvidia(messages, timeoutMs = 12000) {
  if (!NVIDIA_KEY) return Promise.resolve({ ok: false, detail: 'NVIDIA_API_KEY not configured (.env)' });
  /* One primary attempt with a useful timeout. Only try the alt model if the
     first reply is a real HTTP/API error — not a blocked/failed TCP fetch. */
  return callNvidiaOnce(messages, NVIDIA_MODEL, timeoutMs, true).then(r => {
    if (r.ok) return r;
    if (isNetworkFail(r.detail)) return r;
    return callNvidiaOnce(messages, NVIDIA_MODEL_ALT, Math.min(8000, timeoutMs), true).then(r2 => (r2.ok ? r2 : r));
  });
}

/* ---------------- OpenAI (voice command mapper — used first when key has credits) ---------------- */
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/* ---------------- OpenRouter (doctor chat — preferred live provider) ---------------- */
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function extractChatContent(d) {
  const c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  if (typeof c === 'string' && c.trim()) return c;
  if (Array.isArray(c)) {
    const t = c.map(p => (p && (p.text || p.content)) || '').join('').trim();
    if (t) return t;
  }
  return '';
}

function safeProviderErr(s) {
  return String(s || '').replace(/sk-[a-zA-Z0-9-_]{8,}|nvapi-[a-zA-Z0-9-_]+/gi, '[redacted]').slice(0, 240);
}

function callOpenRouter(messages, timeoutMs = 20000) {
  if (!OPENROUTER_KEY) return Promise.resolve({ ok: false, detail: 'OPENROUTER_API_KEY not configured (.env)' });
  const msgs = [{ role: 'system', content: doctorSystemPrompt() }, ...messages];
  return fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + OPENROUTER_KEY,
      'HTTP-Referer': 'http://localhost:4173',
      'X-Title': 'AarogyaVaani MediKiosk'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: msgs,
      temperature: 0.3,
      max_tokens: 1024
    }),
    signal: AbortSignal.timeout(timeoutMs)
  })
    .then(r => r.json().catch(() => ({})).then(d => ({ status: r.status, d })))
    .then(({ status, d }) => {
      const content = extractChatContent(d);
      if (status === 200 && content) {
        return { ok: true, content, model: d.model || OPENROUTER_MODEL, tokens: d.usage && d.usage.total_tokens };
      }
      const err = d && d.error;
      const detail = (err && (typeof err === 'string' ? err : (err.message || err.code))) || ('OpenRouter returned ' + status);
      return { ok: false, detail: safeProviderErr(detail) };
    })
    .catch(e => ({ ok: false, detail: 'OpenRouter unreachable: ' + (e && e.name === 'TimeoutError' ? 'timeout' : safeProviderErr(e && e.message || e)) }));
}

function callDoctorChat(messages) {
  const textOpts = { jsonMode: false, injectDoctor: true, temperature: 0.3, maxTokens: 1024 };
  return callOpenRouter(messages, 20000).then(or => {
    if (or.ok) return { source: 'openrouter', ...or };
    console.error('[ai/chat] OpenRouter error:', or.detail);
    return callNvidia(messages, 20000).then(nv => {
      if (nv.ok) return { source: 'nvidia-nim', ...nv };
      console.error('[ai/chat] NVIDIA error:', nv.detail);
      return callOpenAI(messages, 20000, textOpts).then(oa => {
        if (oa.ok) return { source: 'openai', ...oa };
        console.error('[ai/chat] OpenAI error:', oa.detail);
        return { ok: false, detail: oa.detail };
      });
    });
  });
}

function callOpenAI(messages, timeoutMs = 15000, opts = {}) {
  if (!OPENAI_KEY) return Promise.resolve({ ok: false, detail: 'OPENAI_API_KEY not configured (.env)' });
  const jsonMode = !!opts.jsonMode;
  const injectDoctor = !!opts.injectDoctor;
  const msgs = injectDoctor ? [{ role: 'system', content: doctorSystemPrompt() }, ...messages] : messages;
  const body = {
    model: OPENAI_MODEL,
    messages: msgs,
    temperature: jsonMode ? 0 : (opts.temperature != null ? opts.temperature : 0.3),
    max_tokens: opts.maxTokens || (jsonMode ? 400 : 1024)
  };
  /* JSON mode is for the kiosk command mapper only. Doctor chat needs prose. */
  if (jsonMode) body.response_format = { type: 'json_object' };
  return fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + OPENAI_KEY
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  })
    .then(r => r.json().catch(() => ({})).then(d => ({ status: r.status, d })))
    .then(({ status, d }) => {
      const content = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (status === 200 && content) {
        return { ok: true, content, model: d.model || OPENAI_MODEL, tokens: d.usage && d.usage.total_tokens };
      }
      const err = d && d.error;
      const detail = (err && (err.code || err.message)) || ('OpenAI returned ' + status);
      return { ok: false, detail: String(detail).slice(0, 240) };
    })
    .catch(e => ({ ok: false, detail: 'OpenAI unreachable: ' + (e && e.name === 'TimeoutError' ? 'timeout' : (e && e.message || e)) }));
}

/* ---------------- Voice command mapper (POST /api/ai/command) ----------------
   Provider chain: OpenAI (when the key has credits) → NVIDIA NIM → offline rules.
   The LLM maps a natural-language utterance to a small JSON command array; the
   browser executes only whitelisted actions, so the model never touches state
   directly. */
const ALLOWED_ACTIONS = new Set([
  'setView', 'goStep', 'updatePatient', 'updateVital', 'next', 'back', 'skip', 'print',
  'restart', 'openAi', 'closeAi', 'staffHelp', 'setLang', 'setLoginMode', 'setLoginValue',
  'sendOtp', 'verifyOtp', 'grantConsents', 'setConsent', 'pickComplaint', 'answer',
  'ayushAnswer', 'setDept', 'autoVitals', 'confirm', 'liveOn', 'liveOff', 'speakPrompt'
]);
const PATIENT_FIELDS = new Set(['name', 'age', 'dob', 'gender', 'blood', 'marital', 'occupation', 'education', 'phone', 'address', 'city', 'state', 'pincode', 'abha', 'aadhaar', 'emgName', 'emgRelation', 'emgPhone']);
const VITAL_FIELDS = new Set(['sys', 'dia', 'pulse', 'spo2', 'temp', 'rr', 'height', 'weight']);

function commandSystemPrompt(ctx) {
  const screen = ctx.screen || {};
  return [
    'You are the live kiosk copilot for AarogyaVaani MediKiosk, a government AYUSH OPD intake screen.',
    'The patient or staff is speaking. Map the utterance (Hindi, English or Hinglish) into screen actions.',
    'Reply ONLY with JSON: {"commands":[...],"voiceResponse":"<one short sentence in the user language>","listen":true}.',
    'Keep listen:true after every answer. Never emit liveOff unless the user clearly said to stop listening (e.g. "stop listening", "live off").',
    'Allowed actions:',
    '{"action":"setView","value":"kiosk|doctor|triage|ayur|admin"}',
    '{"action":"goStep","value":"welcome|identity|demographics|consent|vitals|complaint|interview|department|ayush|scan|review|done"}',
    '{"action":"setLang","value":"hi|en|mr|bn|ta|te"}',
    '{"action":"setLoginMode","value":"abha|aadhaar|phone|new"}',
    '{"action":"setLoginValue","value":"..."} {"action":"sendOtp"} {"action":"verifyOtp","value":"1234"}',
    '{"action":"updatePatient","field":"<patient field>","value":"..."}',
    '{"action":"updateVital","field":"sys|dia|pulse|spo2|temp|rr|height|weight","value":"123"}',
    '{"action":"grantConsents"} {"action":"setConsent","field":"c3|c4|c5","value":true|false} — c1 and c2 recording/hospital-record consents are always on; never turn them off',
    '{"action":"pickComplaint","value":"chest|breath|fever|abdomen|headache|joint|skin|digestion|other"}',
    '{"action":"answer","key":"<current question key>","value":"<option id or number>","multi":false}',
    '{"action":"ayushAnswer","key":"<dashavidha key>","value":"<option id>","multi":false}',
    '{"action":"setDept","value":"kaya|panchakarma|general|shalya|prasuti|kaumar"}',
    '{"action":"autoVitals"} {"action":"next"} {"action":"back"} {"action":"skip"} {"action":"print"} {"action":"restart"}',
    '{"action":"confirm"} {"action":"liveOn"} {"action":"liveOff"} {"action":"staffHelp"} {"action":"openAi"} {"action":"closeAi"}',
    'Prefer filling the CURRENT screen, then add "next" if the utterance clearly wants to continue.',
    'On the scan step: never emit next, skip, or continue — even if the user says "continue", "okay", or "next". They are scanning documents. voiceResponse must not be the word continue/next.',
    'For interview/ayush questions, pick option ids from the snapshot — never invent ids.',
    'Demo OTP is always 1234. Gender ids: male, female, transgender, undisclosed.',
    'If nothing actionable, commands=[] and ask a short clarifying question.',
    'Current screen snapshot: ' + JSON.stringify(screen).slice(0, 2800)
  ].join('\n');
}

function nrm(s) {
  return String(s || '').toLowerCase().replace(/[.,!?|\\]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function has(t, ...ws) { return ws.some(w => w && t.includes(String(w).toLowerCase())); }
function extractName(raw) {
  const m = String(raw || '').match(/(?:naam|name|नाम)\s*(?:hai|is|:)?\s*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F ]{0,40})/i);
  if (!m) return '';
  return m[1].replace(/\s+(hai|is|ji|umar|age|saal|phone|mobile|पुरुष|महिला|उम्र|साल|फ़ोन|फोन|मोबाइल).*/i, '').trim();
}
function numNear(t, keys) {
  for (const k of keys) {
    const m = t.match(new RegExp(k + '\\s*(\\d+(?:\\.\\d+)?)', 'i')) || t.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + k, 'i'));
    if (m) return m[1];
  }
  return null;
}
function matchLabeled(t, items) {
  let best = null, score = 0;
  (items || []).forEach(it => {
    const id = it.id || it.value;
    const labs = [id, it.label, it.hi, it.en].concat(it.synonyms || []).filter(Boolean).map(nrm);
    labs.forEach(lab => {
      if (!lab) return;
      if (t === lab || t.includes(lab) || (lab.length >= 4 && t.includes(lab.slice(0, 6)))) {
        if (lab.length >= score) { score = lab.length; best = id; }
      }
    });
  });
  return best;
}

function offlineCommandMap(transcript, ctx) {
  const t = nrm(transcript);
  const commands = [];
  const screen = ctx.screen || {};
  const step = screen.step || ctx.step || '';
  const hi = /[\u0900-\u097F]/.test(String(transcript || ''));
  const say = (h, e) => (hi ? h : e);
  const num = (t.match(/\d+(?:\.\d+)?/) || [])[0];
  const push = c => { if (c && !commands.some(x => x.action === c.action && x.field === c.field && x.value === c.value && x.key === c.key)) commands.push(c); };

  if (has(t, 'live off', 'stop listening', 'chup', 'चुप', 'रुक जाओ', 'band karo listening')) push({ action: 'liveOff' });
  else if (has(t, 'live on', 'keep listening', 'baat karte raho', 'सुनते रहो', 'बात करते रहो')) push({ action: 'liveOn' });

  if (has(t, 'doctor', 'डॉक्टर', 'डाक्टर') && (has(t, 'console', 'view', 'खोल', 'कंसोल', 'panel') || t === 'doctor' || t === 'डॉक्टर')) push({ action: 'setView', value: 'doctor' });
  else if (has(t, 'triage', 'ट्रायज', 'emergency list', 'इमरजेंसी लिस्ट')) push({ action: 'setView', value: 'triage' });
  else if (has(t, 'ayurvaani', 'ayurved', 'आयुर्वेद', 'आयुर्वाणी')) push({ action: 'setView', value: 'ayur' });
  else if (has(t, 'admin', 'एडमिन', 'audit')) push({ action: 'setView', value: 'admin' });
  else if (has(t, 'kiosk', 'patient view', 'कियोस्क', 'मरीज स्क्रीन', 'patient kiosk')) push({ action: 'setView', value: 'kiosk' });

  if (step === 'welcome' && screen.languages) {
    const lang = matchLabeled(t, screen.languages);
    if (lang) { push({ action: 'setLang', value: lang }); push({ action: 'next' }); }
    else if (has(t, 'hindi', 'हिन्दी', 'हिंदी')) { push({ action: 'setLang', value: 'hi' }); push({ action: 'next' }); }
    else if (has(t, 'english', 'अंग्रेजी', 'angrezi')) { push({ action: 'setLang', value: 'en' }); push({ action: 'next' }); }
  }

  if (step === 'identity') {
    if (has(t, 'new patient', 'naya mariz', 'naya mareez', 'नया मरीज', 'नया मरीज़', 'नये मरीज', 'नया मरीज हैं')) push({ action: 'setLoginMode', value: 'new' });
    else if (has(t, 'abha', 'आभा')) push({ action: 'setLoginMode', value: 'abha' });
    else if (has(t, 'aadhaar', 'adhaar', 'आधार')) push({ action: 'setLoginMode', value: 'aadhaar' });
    else if (has(t, 'phone', 'mobile', 'मोबाइल', 'फ़ोन', 'फोन') && !has(t, 'मेरा नाम', 'my name')) push({ action: 'setLoginMode', value: 'phone' });
    const named = extractName(transcript);
    if (named) push({ action: 'updatePatient', field: 'name', value: named });
    if ((has(t, 'age', 'umar', 'उम्र', 'आयु', 'saal', 'साल') || step === 'identity') && num && Number(num) <= 120 && !/\d{10}/.test(t)) {
      if (has(t, 'age', 'umar', 'उम्र', 'आयु', 'saal', 'साल')) push({ action: 'updatePatient', field: 'age', value: String(parseInt(num, 10)) });
    }
    if (has(t, 'male', 'purush', 'पुरुष', 'aadmi', 'आदमी')) push({ action: 'updatePatient', field: 'gender', value: 'male' });
    if (has(t, 'female', 'mahila', 'महिला', 'aurat', 'औरत')) push({ action: 'updatePatient', field: 'gender', value: 'female' });
    const phone = t.match(/\b(\d{10})\b/);
    if (phone) {
      if (screen.loginMode === 'phone' || screen.loginMode === 'abha' || screen.loginMode === 'aadhaar') push({ action: 'setLoginValue', value: phone[1] });
      else push({ action: 'updatePatient', field: 'phone', value: phone[1] });
    }
    if (has(t, 'otp') && has(t, 'send', 'bhej', 'भेज')) push({ action: 'sendOtp' });
    if (/\b1234\b/.test(t) || (has(t, 'verify', 'सत्यापित', 'sahi otp') && (screen.otpSent || has(t, '1234')))) push({ action: 'verifyOtp', value: '1234' });
  }

  if (step === 'demographics') {
    const named = extractName(transcript);
    if (named) push({ action: 'updatePatient', field: 'name', value: named });
    if (has(t, 'age', 'umar', 'उम्र') && num) push({ action: 'updatePatient', field: 'age', value: String(parseInt(num, 10)) });
    if (has(t, 'male', 'पुरुष')) push({ action: 'updatePatient', field: 'gender', value: 'male' });
    if (has(t, 'female', 'महिला')) push({ action: 'updatePatient', field: 'gender', value: 'female' });
    const phone = t.match(/\b(\d{10})\b/);
    if (phone) push({ action: 'updatePatient', field: 'phone', value: phone[1] });
    if (has(t, 'delhi')) push({ action: 'updatePatient', field: 'city', value: 'Delhi' });
  }

  if (step === 'consent' && (has(t, 'haan', 'yes', 'ok', 'maan', 'sahanmati', 'सहमति', 'allow', 'हाँ', 'all consent', 'maan liya', 'agree'))) {
    push({ action: 'grantConsents' });
    push({ action: 'next' });
  }

  const raw = String(transcript || '');
  if (step === 'vitals' || has(t, 'bp', 'blood pressure', 'ब्लड प्रेशर')) {
    const bp = raw.match(/(\d{2,3})\s*[\/]\s*(\d{2,3})/) || t.match(/(\d{2,3})\s+(?:over|upon|pe|पे)\s+(\d{2,3})/);
    if (bp) {
      push({ action: 'updateVital', field: 'sys', value: bp[1] });
      push({ action: 'updateVital', field: 'dia', value: bp[2] });
    }
    const w = numNear(t, ['weight', 'vajan', 'वजन', 'kg']);
    const h = numNear(t, ['height', 'lambai', 'लंबाई', 'लम्बाई', 'cm']);
    const pulse = numNear(t, ['pulse', 'nadi', 'नाड़ी']);
    const spo2 = numNear(t, ['spo2', 'oxygen', 'ऑक्सीजन']);
    const temp = numNear(t, ['temp', 'temperature', 'तापमान', 'bukhar']);
    if (w) push({ action: 'updateVital', field: 'weight', value: String(parseInt(w, 10)) });
    if (h) push({ action: 'updateVital', field: 'height', value: String(parseInt(h, 10)) });
    if (pulse) push({ action: 'updateVital', field: 'pulse', value: String(parseInt(pulse, 10)) });
    if (spo2) push({ action: 'updateVital', field: 'spo2', value: String(parseInt(spo2, 10)) });
    if (temp) push({ action: 'updateVital', field: 'temp', value: temp });
    if (has(t, 'device', 'machine', 'auto', 'डिवाइस', 'मशीन', 'read from')) push({ action: 'autoVitals' });
  }

  if ((step === 'complaint' || !step) && screen.complaints) {
    const id = matchLabeled(t, screen.complaints);
    if (id) { push({ action: 'pickComplaint', value: id }); push({ action: 'next' }); }
  }
  if (step === 'complaint' && !commands.some(c => c.action === 'pickComplaint')) {
    const map = [
      ['chest', ['chest', 'seene', 'sine', 'chhati', 'सीने', 'दिल दर्द']],
      ['breath', ['breath', 'saans', 'sans', 'साँस', 'दम']],
      ['fever', ['fever', 'bukhar', 'बुखार']],
      ['abdomen', ['pet', 'abdomen', 'stomach', 'पेट']],
      ['headache', ['headache', 'sir dard', 'सिर दर्द', 'sar dard']],
      ['joint', ['joint', 'ghutna', 'jod', 'जोड़', 'घुटने']],
      ['skin', ['skin', 'twacha', 'खुजली', 'त्वचा']],
      ['digestion', ['kabz', 'pachan', 'constip', 'कब्ज़', 'पाचन']]
    ];
    for (const [id, words] of map) { if (has(t, ...words)) { push({ action: 'pickComplaint', value: id }); push({ action: 'next' }); break; } }
  }

  if (step === 'interview' && screen.question) {
    const q = screen.question;
    if (q.scale && num && Number(num) <= 10) push({ action: 'answer', key: q.key, value: String(parseInt(num, 10)) });
    else if (q.free) push({ action: 'answer', key: q.key, value: String(transcript).trim() });
    else if (q.options) {
      let id = matchLabeled(t, q.options);
      if (!id && has(t, 'haan', 'yes', 'हाँ', 'ha')) id = (q.options.find(o => o.id === 'yes') || {}).id;
      if (!id && has(t, 'nahi', 'no', 'नहीं', 'nahin')) id = (q.options.find(o => o.id === 'no' || o.id === 'never' || o.id === 'none') || {}).id;
      if (id) push({ action: 'answer', key: q.key, value: id, multi: !!q.multi });
    }
  }

  if (step === 'ayush' && screen.question) {
    const q = screen.question;
    const id = matchLabeled(t, q.options || []);
    if (id) push({ action: 'ayushAnswer', key: q.key, value: id, multi: !!q.multi });
  }

  if (step === 'department' && screen.departments) {
    const id = matchLabeled(t, screen.departments);
    if (id) { push({ action: 'setDept', value: id }); push({ action: 'next' }); }
  }

  if (step === 'review' && has(t, 'submit', 'bhej', 'confirm', 'doctor ko', 'भेज', 'पुष्टि')) push({ action: 'confirm' });
  if (has(t, 'print', 'print karo', 'छाप', 'प्रिंट')) push({ action: 'print' });
  if (has(t, 'restart', 'naya session', 'शुरू से', 'reset')) push({ action: 'restart' });
  if (has(t, 'staff', 'nurse', 'मदद', 'help')) push({ action: 'staffHelp' });

  if (step !== 'scan' && has(t, 'next', 'aage', 'आगे', 'continue', 'आगे बढ़ो', 'done', 'ok next') && !commands.some(c => c.action === 'next')) push({ action: 'next' });
  else if (step !== 'scan' && has(t, 'back', 'peeche', 'पीछे', 'वापस', 'previous') && !commands.some(c => c.action === 'next')) push({ action: 'back' });
  else if (step !== 'scan' && has(t, 'skip', 'chhod', 'छोड़', 'skip karo') && !commands.some(c => c.action === 'next')) push({ action: 'skip' });

  const voiceResponse = commands.length
    ? say('ठीक है।', 'Okay.')
    : say('समझ नहीं आया — फिर से बताइए।', 'I did not catch that — please say it again.');
  return { commands: commands.slice(0, 8), voiceResponse, source: 'offline-rules', listen: true };
}

function sanitizeCommands(cmds, step) {
  return (Array.isArray(cmds) ? cmds : []).filter(c => c && ALLOWED_ACTIONS.has(c.action)).map(c => {
    const out = { action: c.action };
    if (c.field != null) out.field = String(c.field).slice(0, 40);
    if (c.value != null) out.value = String(c.value).slice(0, 120);
    if (c.key != null) out.key = String(c.key).slice(0, 40);
    if (c.multi) out.multi = true;
    if (step === 'scan' && (out.action === 'next' || out.action === 'skip')) return null;
    if (c.action === 'updatePatient' && out.field && !PATIENT_FIELDS.has(out.field)) return null;
    if (c.action === 'updateVital' && out.field && !VITAL_FIELDS.has(out.field)) return null;
    return out;
  }).filter(Boolean).slice(0, 8);
}

function mapCommandWithLLM(transcript, ctx) {
  const messages = [{ role: 'system', content: commandSystemPrompt(ctx) }, { role: 'user', content: transcript }];
  const jobs = [callOpenAI(messages, 5500, { jsonMode: true })];
  if (NVIDIA_KEY) jobs.push(callNvidiaOnce(messages, NVIDIA_MODEL, 5500, false));
  return Promise.all(jobs).then(results => {
    for (const r of results) {
      if (!r || !r.ok) continue;
      const parsed = parseCommandJSON(r.content);
      if (!parsed) continue;
      parsed.source = r === results[0] && r.ok ? 'openai' : 'nvidia-nim';
      if (results[0] && results[0].ok && r === results[0]) parsed.source = 'openai';
      return parsed;
    }
    return null;
  }).catch(() => null);
}

function parseCommandJSON(text) {
  try {
    const m = String(text || '').match(/\{[\s\S]*\}/);
    const obj = JSON.parse(m ? m[0] : text);
    if (!obj || !Array.isArray(obj.commands)) return null;
    return obj;
  } catch { return null; }
}

/* Deterministic offline brief so the doctor console degrades gracefully. */
function localDoctorFallback(messages) {
  const last = [...messages].reverse().find(m => m.role === 'user');
  const q = (last && last.content || '').slice(0, 140);
  return [
    '**DocBot offline — structured checklist**',
    '',
    '• Re-confirm the chief complaint timeline and severity score from the kiosk history.',
    '• Review the red-flag strip: vitals outside normal ranges prioritise the case automatically.',
    '• Correlate Dashavidha Pariksha findings (Prakriti, Agni, Koshtha) with the presenting complaint.',
    '• Consider baseline investigations: CBC, blood sugar, and ECG if the complaint is chest-related.',
    '• Document your examination findings in the physician note before confirming the encounter.',
    '',
    `Your question was noted: "${q.replace(/["\\]/g, '')}" — reconnect to get the full AI answer.`
  ].join('\n');
}

function applyIntake(session, body) {
  if (!session || !body || typeof body !== 'object') return session;
  if (body.token != null) session.token = body.token;
  if (body.lang) session.lang = body.lang;
  if (body.dept != null) session.dept = body.dept;
  if (body.step) session.step = body.step;
  if (body.status) session.status = body.status;
  if (body.qIndex != null) session.qIndex = body.qIndex;
  if (body.ayushIndex != null) session.ayushIndex = body.ayushIndex;
  if (body.patient && typeof body.patient === 'object') session.patient = Object.assign({}, session.patient || {}, body.patient);
  if (body.vitals && typeof body.vitals === 'object') session.vitals = Object.assign({}, session.vitals || {}, body.vitals);
  if (body.answers && typeof body.answers === 'object') session.answers = Object.assign({}, session.answers || {}, body.answers);
  if (body.ayush && typeof body.ayush === 'object') session.ayush = Object.assign({}, session.ayush || {}, body.ayush);
  if (body.consents && typeof body.consents === 'object') session.consents = Object.assign({}, session.consents || {}, body.consents);
  if (Array.isArray(body.docs)) session.docs = body.docs;
  if (Array.isArray(body.redFlags)) session.redFlags = body.redFlags;
  if (body.login && typeof body.login === 'object') session.login = Object.assign({}, session.login || {}, body.login);
  if (body.em !== undefined) session.em = body.em;
  session.updatedAt = new Date().toISOString();
  return session;
}

const API = {
  'POST /api/auth/login'(req, res, body) {
    const { abha, aadhaar, phone, otp } = body;
    const id = abha || aadhaar || phone || 'guest';
    if (otp !== 'sent' && otp !== '1234') return json(res, 401, { ok: false, error: 'Invalid OTP. Demo OTP is 1234.' });
    const rec = findPatient({ abha, aadhaar, phone });
    json(res, 200, {
      ok: true, token: nextId('tok'), id, demoOtp: '1234',
      returning: !!rec,
      history: rec ? { name: rec.name, age: rec.age, gender: rec.gender, visits: rec.visits || [] } : null
    });
  },

  'POST /api/patients/lookup'(req, res, body) {
    const rec = findPatient(body);
    if (!rec) return json(res, 200, { ok: true, found: false });
    json(res, 200, {
      ok: true, found: true,
      name: rec.name, age: rec.age, dob: rec.dob, gender: rec.gender, blood: rec.blood,
      marital: rec.marital, occupation: rec.occupation || '', education: rec.education || '',
      phone: rec.phoneContact || rec.phone || '', address: rec.address, city: rec.city, state: rec.state,
      pincode: rec.pincode, area: rec.area, abha: rec.abha, aadhaar: rec.aadhaar,
      emgName: rec.emgName, emgRelation: rec.emgRelation, emgPhone: rec.emgPhone,
      visits: rec.visits || []
    });
  },

  'POST /api/patients/upsert'(req, res, body) {
    const rec = findPatient({ abha: body.abha, aadhaar: body.aadhaar, phone: body.phone || body.phoneContact });
    const fields = {
      abha: body.abha || '', aadhaar: body.aadhaar || '', phone: body.phone || '',
      name: body.name || '', age: body.age || '', dob: body.dob || '', gender: body.gender || '',
      blood: body.blood || '', marital: body.marital || '', occupation: body.occupation || '',
      education: body.education || '', phoneContact: body.phoneContact || body.phone || '',
      address: body.address || '', city: body.city || '', state: body.state || '',
      pincode: body.pincode || '', area: body.area || '',
      emgName: body.emgName || '', emgRelation: body.emgRelation || '', emgPhone: body.emgPhone || '',
      sessionId: body.sessionId || ''
    };
    const visit = {
      date: (body.visitDate || new Date().toISOString()).slice(0, 10),
      dept: body.dept || '', complaint: body.complaint || 'First visit',
      bp: body.bp || '', pulse: body.pulse || '', doctor: 'Pending', advice: 'Visit in progress'
    };
    if (rec) {
      Object.assign(rec, fields);
      if (body.addVisit) rec.visits = [visit].concat(rec.visits || []).slice(0, 12);
      rec.updatedAt = new Date().toISOString();
      savePatients();
      return json(res, 200, { ok: true, returning: true, visits: (rec.visits || []).length });
    }
    const row = Object.assign({}, fields, {
      visits: body.addVisit ? [visit] : [],
      updatedAt: new Date().toISOString()
    });
    patients.unshift(row);
    savePatients();
    json(res, 201, { ok: true, returning: false, visits: row.visits.length });
  },

  'POST /api/consent'(req, res, body) {
    const sessionId = body.sessionId || 'pending';
    store.consents.unshift({ id: nextId('cons'), sessionId, consents: body.consents || {}, at: new Date().toISOString() });
    store.consents = store.consents.slice(0, 100);
    saveStore(store);
    json(res, 201, { ok: true, consentId: store.consents[0].id });
  },

  'POST /api/session/start'(req, res, body) {
    const session = {
      id: nextId('ses'), token: body.token || null, lang: body.lang || 'en',
      patient: {}, vitals: {}, answers: {}, ayush: {}, consents: {}, docs: [], redFlags: [],
      login: {}, em: null, step: '', qIndex: 0, ayushIndex: 0, dept: '',
      status: 'in_progress', startedAt: new Date().toISOString(), completedAt: null, updatedAt: new Date().toISOString()
    };
    applyIntake(session, body);
    store.sessions.unshift(session);
    store.sessions = store.sessions.slice(0, 200);
    saveStore(store);
    json(res, 201, { ok: true, sessionId: session.id, session });
  },

  'GET /api/session/:sessionId'(req, res, m) {
    const session = (store.sessions || []).find(s => s.id === m.id);
    if (!session) return json(res, 404, { ok: false, error: 'session not found' });
    json(res, 200, { ok: true, sessionId: session.id, session });
  },

  'PATCH /api/session/:sessionId'(req, res, m, body) {
    const session = (store.sessions || []).find(s => s.id === m.id);
    if (!session) return json(res, 404, { ok: false, error: 'session not found' });
    applyIntake(session, body || {});
    if (session.status === 'completed' && !session.completedAt) session.completedAt = new Date().toISOString();
    saveStore(store);
    json(res, 200, { ok: true, sessionId: session.id, session });
  },

  'POST /api/conversation/turn'(req, res, body) {
    if (!body.sessionId) return json(res, 400, { ok: false, error: 'sessionId required' });
    const turn = { id: nextId('turn'), sessionId: body.sessionId, question: body.question, answer: body.answer, at: new Date().toISOString() };
    store.turns.unshift(turn);
    store.turns = store.turns.slice(0, 500);
    saveStore(store);
    json(res, 201, { ok: true, turnId: turn.id, next: body.next || null });
  },

  'POST /api/scan-link'(req, res, body) {
    const sessionId = body.sessionId;
    if (!sessionId) return json(res, 400, { ok: false, error: 'sessionId required' });
    const session = store.sessions.find(s => s.id === sessionId);
    if (!session) return json(res, 404, { ok: false, error: 'session not found' });
    const link = {
      id: nextId('pair'), sessionId,
      code: randCode(6), token: randCode(16),
      createdAt: new Date().toISOString()
    };
    scanLinks().unshift(link);
    store.scanLinks = scanLinks().slice(0, 200);
    saveStore(store);
    json(res, 201, { ok: true, code: link.code, token: link.token, sessionId });
  },

  'POST /api/documents/upload'(req, res, body) {
    const sessionId = body.sessionId || 'pending';
    if (body.token) {
      if (!findScanLink(sessionId, body.token)) {
        return json(res, 403, { ok: false, error: 'invalid pairing token' });
      }
    }
    const doc = {
      id: nextId('doc'), sessionId,
      filename: body.filename || 'upload.jpg', dataBase64: body.dataBase64 || '',
      mime: body.mime || 'image/jpeg',
      docType: body.docType || 'unknown', status: 'queued',
      uploadedAt: new Date().toISOString(), fields: []
    };
    store.documents.unshift(doc);
    saveStore(store);
    json(res, 201, { ok: true, documentId: doc.id, status: 'queued' });
  },

  'GET /api/documents'(req, res) {
    const q = parseQuery(req);
    const sessionId = q.get('sessionId');
    const token = q.get('token');
    if (!sessionId) return json(res, 400, { ok: false, error: 'sessionId required' });
    if (token && !findScanLink(sessionId, token)) {
      return json(res, 403, { ok: false, error: 'invalid pairing token' });
    }
    const documents = store.documents
      .filter(d => d.sessionId === sessionId)
      .map(d => ({
        id: d.id, sessionId: d.sessionId, filename: d.filename, mime: d.mime || 'image/jpeg',
        docType: d.docType, status: d.status, uploadedAt: d.uploadedAt,
        hasImage: !!(d.dataBase64)
      }));
    json(res, 200, { ok: true, documents });
  },

  'GET /api/documents/:id'(req, res, m) {
    const doc = store.documents.find(d => d.id === m.id);
    if (!doc) return json(res, 404, { ok: false, error: 'document not found' });
    const q = parseQuery(req);
    const token = q.get('token');
    if (token && !findScanLink(doc.sessionId, token)) {
      return json(res, 403, { ok: false, error: 'invalid pairing token' });
    }
    json(res, 200, {
      ok: true,
      document: {
        id: doc.id, sessionId: doc.sessionId, filename: doc.filename,
        mime: doc.mime || 'image/jpeg', docType: doc.docType, status: doc.status,
        uploadedAt: doc.uploadedAt, dataBase64: doc.dataBase64 || '', fields: doc.fields || []
      }
    });
  },

  'GET /api/documents/:id/status'(req, res, m) {
    const doc = store.documents.find(d => d.id === m.id);
    if (!doc) return json(res, 404, { ok: false, error: 'document not found' });
    json(res, 200, { ok: true, documentId: doc.id, status: doc.status, fields: doc.fields });
  },

  'POST /api/summary/generate'(req, res, body) {
    const sessionId = body.sessionId || 'pending';
    const summary = {
      id: nextId('sum'), sessionId, status: 'draft',
      chiefComplaint: body.chiefComplaint || '',
      sections: body.sections || [],
      generatedAt: new Date().toISOString()
    };
    store.summaries.unshift(summary);
    saveStore(store);
    json(res, 201, { ok: true, summaryId: summary.id, summary });
  },

  'GET /api/summary/:sessionId'(req, res, m) {
    const s = store.summaries.find(x => x.sessionId === m.id) || null;
    if (!s) return json(res, 404, { ok: false, error: 'no summary for this session yet' });
    json(res, 200, { ok: true, summary: s });
  },

  'PATCH /api/summary/:sessionId'(req, res, m, body) {
    const s = store.summaries.find(x => x.sessionId === m.id);
    if (!s) return json(res, 404, { ok: false, error: 'no summary for this session yet' });
    if (body.status) s.status = body.status;
    if (body.sections) s.sections = body.sections;
    if (body.physicianNote !== undefined) s.physicianNote = body.physicianNote;
    saveStore(store);
    json(res, 200, { ok: true, summary: s });
  },

  'POST /api/fhir/push'(req, res, body) {
    const push = {
      id: nextId('fhir'), sessionId: body.sessionId || 'pending',
      bundleId: (body.bundle && body.bundle.id) || null,
      resourceCount: (body.bundle && body.bundle.entry ? body.bundle.entry.length : 0),
      accepted: true, at: new Date().toISOString(),
      note: 'Mocked ABDM/HIS endpoint — payload logged, no real push performed'
    };
    store.fhirPushes.unshift(push);
    saveStore(store);
    json(res, 200, { ok: true, logId: push.id, accepted: true, note: push.note });
  },

  'POST /api/emergency'(req, res, body) {
    const name = String(body.name || '').trim();
    const problem = String(body.problem || '').trim();
    if (!name || !problem) return json(res, 400, { ok: false, error: 'name and problem required' });
    const attendant = body.attendant === 'yes';
    if (attendant && (!String(body.relName || '').trim() || !String(body.relPhone || '').trim())) {
      return json(res, 400, { ok: false, error: 'relative name and contact required' });
    }
    const id = nextId('em');
    const rec = {
      id,
      caseNo: 1000 + Number(String(id).split('-')[1] || store.seq),
      destination: 'triage',
      status: 'awaiting',
      name, problem,
      attendant,
      relName: attendant ? String(body.relName || '').trim() : '',
      relPhone: attendant ? String(body.relPhone || '').trim() : '',
      relRelation: attendant ? String(body.relRelation || '').trim() : '',
      phone: String(body.phone || '').trim(),
      lang: body.lang || 'en',
      at: new Date().toISOString()
    };
    store.emergencies.unshift(rec);
    store.emergencies = store.emergencies.slice(0, 80);
    saveStore(store);
    json(res, 201, { ok: true, case: rec });
  },

  'GET /api/emergency'(req, res) {
    json(res, 200, { ok: true, cases: store.emergencies || [] });
  },

  'GET /api/admin/analytics'(req, res) {
    json(res, 200, { ok: true, at: new Date().toISOString(), analytics: computeAnalytics(), live: computeDashboard() });
  },

  'GET /api/dashboard'(req, res) {
    json(res, 200, {
      ok: true, at: new Date().toISOString(),
      nvidia: !!NVIDIA_KEY, openai: !!OPENAI_KEY, openrouter: !!OPENROUTER_KEY,
      ...computeDashboard()
    });
  },

  'GET /api/health'(req, res) {
    json(res, 200, {
      ok: true, service: 'aarogyavaani',
      at: new Date().toISOString(),
      nvidia: !!NVIDIA_KEY, openai: !!OPENAI_KEY, openrouter: !!OPENROUTER_KEY,
      sessions: (store.sessions || []).length
    });
  },

  /* ------------ Doctor AI assistant (OpenRouter → NVIDIA → OpenAI → local) ------------
     Same-origin proxy so API keys never reach the browser.
     OpenRouter first (prose); then NVIDIA NIM; then OpenAI gpt-4o-mini without JSON mode;
     local checklist only if all live providers fail. */
  'POST /api/ai/chat'(req, res, body) {
    const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    if (!messages.length) return json(res, 400, { ok: false, error: 'messages[] required' });
    if (res.headersSent) return;
    const finish = payload => { if (!res.headersSent) json(res, 200, payload); };
    const timer = setTimeout(() => finish({
      ok: true, source: 'local-fallback', reply: localDoctorFallback(messages), error: 'timeout'
    }), 65000);
    callDoctorChat(messages).then(r => {
      clearTimeout(timer);
      if (res.headersSent) return;
      if (r && r.ok && r.content) {
        return finish({ ok: true, source: r.source, model: r.model, reply: r.content, tokens: r.tokens });
      }
      finish({ ok: true, source: 'local-fallback', reply: localDoctorFallback(messages), error: r && r.detail });
    }).catch(e => {
      clearTimeout(timer);
      finish({ ok: true, source: 'local-fallback', reply: localDoctorFallback(messages), error: String(e && e.message || e) });
    });
  },

  /* ------------ Voice command mapper (OpenAI → NVIDIA → offline rules) ------------ */
  'POST /api/ai/command'(req, res, body) {
    const transcript = String(body.transcript || '').slice(0, 400);
    const ctx = {
      view: body.currentView || 'kiosk',
      step: body.currentStep || 'welcome',
      patientName: body.patientName || '',
      screen: body.screen && typeof body.screen === 'object' ? body.screen : {}
    };
    if (!transcript.trim()) return json(res, 400, { ok: false, error: 'transcript required' });
    if (res.headersSent) return;
    const offline = offlineCommandMap(transcript, ctx);
    const done = result => json(res, 200, {
      ok: true,
      commands: sanitizeCommands(result.commands, ctx.screen && ctx.screen.step || ctx.step),
      voiceResponse: String(result.voiceResponse || '').replace(/\b(continue|next)(\s+\1)+\b/gi, '$1').slice(0, 240),
      source: result.source || 'offline-rules',
      listen: result.listen !== false
    });
    const timer = setTimeout(() => { if (!res.headersSent) done(offline); }, 6500);
    mapCommandWithLLM(transcript, ctx).then(llm => {
      if (res.headersSent) return;
      clearTimeout(timer);
      if (llm && Array.isArray(llm.commands) && llm.commands.length) return done(llm);
      if (offline.commands.length) return done(offline);
      if (llm) return done(llm);
      done(offline);
    }).catch(() => { if (!res.headersSent) { clearTimeout(timer); done(offline); } });
  },

  /* ------------ Ayurveda AI (NirogaVerse) proxy ------------
     Same-origin /api/niro/* requests are forwarded to the NirogaVerse Express
     server (auth + Prisma + OpenAI). Falls back to a deterministic local
     Ayurvedic assessment when NIRO_BASE is unreachable, so the kiosk demo
     never breaks. */
  'POST /api/niro/bridge'(req, res, body) {
    const p = body.patient || {};
    const a = body.ayush || {};
    const v = body.vitals || {};
    const lines = [
      'AYURVEDIC ASSESSMENT (local rules — NirogaVerse AI offline)',
      `Patient: ${p.name || 'Unknown'} · ${p.age || '?'} yrs · ${p.gender || '?'}`
    ];
    const prakriti = String(a.prakriti || 'not assessed');
    lines.push(`Prakriti (constitution): ${prakriti}`);
    if (a.agni) lines.push(`Agni (digestive fire): ${a.agni}`);
    if (a.koshtha) lines.push(`Koshtha (bowel): ${a.koshtha}`);
    if (Array.isArray(a.nidana) && a.nidana.length) lines.push(`Nidana (likely causes): ${a.nidana.join(', ')}`);
    if (v.sys && v.dia) lines.push(`Vitals: BP ${v.sys}/${v.dia}${v.pulse ? `, pulse ${v.pulse}` : ''}`);
    const DIET = {
      vata: 'Warm, moist, grounding food; regular meal times; sesame oil massage.',
      pitta: 'Cooling food — cucumber, coconut, ghee; avoid spicy, fermented, sour items.',
      kapha: 'Light, warm, dry food; honey water; reduce dairy, sugar and fried items.',
      'not assessed': 'General advice: fresh seasonal food, warm water, eat to two-thirds capacity.'
    };
    const key = ['vata', 'pitta', 'kapha'].includes(prakriti) ? prakriti : 'not assessed';
    lines.push(`Diet: ${DIET[key]}`);
    lines.push('Routine: sleep by 10 pm, wake before sunrise; 30 min walk; avoid day-sleep.');
    lines.push('Note: structured guidance only — a Vaidya must confirm before any treatment.');
    json(res, 200, {
      ok: true, source: 'local-rules',
      message: lines.map(l => '• ' + l).join('\n'),
      sessionId: body.niroSessionId || null
    });
  }
};

async function proxyNiro(req, res, body) {
  /* Map kiosk paths to NirogaVerse Express routes:
     /api/niro/auth/X     → /api/auth/X
     /api/niro/niro/X     → /api/niro/X
     /api/niro/<other>    → /api/<other> */
  const rest = (req.url || '').replace(/^\/api\/niro/, '');
  const target = NIRO_BASE + '/api' + rest;
  let payload;
  try {
    payload = JSON.stringify(body);
  } catch { payload = '{}'; }
  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : payload,
      signal: AbortSignal.timeout(130000)
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(text);
  } catch (e) {
    json(res, 502, { ok: false, error: 'NirogaVerse server unreachable at ' + NIRO_BASE, detail: String(e && e.message || e) });
  }
}

/* ---------------- static file serving (unchanged behaviour) ---------------- */
function serveStatic(req, res, urlPath) {
  const raw = (urlPath || '/').split('?')[0];
  const url = raw === '/' ? '/index.html' : raw;
  const file = normalize(join(root, url));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`,
    'Cache-Control': 'no-cache'
  });
  createReadStream(file).pipe(res);
}

function serveNiroStatic(req, res, urlPath) {
  const raw = (urlPath || '/').split('?')[0];
  const relative = raw.replace(/^\/niro\/?/, '');
  const candidate = relative && !relative.endsWith('/') ? relative : 'index.html';
  const distRoot = join(root, 'nirogaverse', 'client', 'dist');
  let file = normalize(join(distRoot, candidate));
  if (!file.startsWith(distRoot) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(distRoot, 'index.html');
  }
  if (!existsSync(file)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('NirogaVerse client is not built');
    return;
  }
  res.writeHead(200, {
    'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`,
    'Cache-Control': 'no-cache'
  });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // route /api/* requests
  if (urlPath.startsWith('/api/')) {
    try {
      const body = req.method === 'POST' || req.method === 'PATCH' ? await readBody(req) : {};
      // NirogaVerse (Ayurveda AI) — transparent same-origin proxy.
      // /api/niro/bridge stays local: it is the offline fallback assessment.
      if (urlPath.startsWith('/api/niro/') && urlPath !== '/api/niro/bridge') return await proxyNiro(req, res, body);
      // exact routes first
      const exact = API[`${req.method} ${urlPath}`];
      if (exact) return exact(req, res, body);
      // parameterised routes
      const mDoc = urlPath.match(/^\/api\/documents\/([\w-]+)\/status$/);
      if (mDoc && req.method === 'GET') return API['GET /api/documents/:id/status'](req, res, { id: mDoc[1] });
      const mDocOne = urlPath.match(/^\/api\/documents\/([\w-]+)$/);
      if (mDocOne && req.method === 'GET') return API['GET /api/documents/:id'](req, res, { id: mDocOne[1] });
      const mSum = urlPath.match(/^\/api\/summary\/([\w-]+)$/);
      if (mSum && req.method === 'GET') return API['GET /api/summary/:sessionId'](req, res, { id: mSum[1] });
      if (mSum && req.method === 'PATCH') return API['PATCH /api/summary/:sessionId'](req, res, { id: mSum[1] }, body);
      const mSes = urlPath.match(/^\/api\/session\/([\w-]+)$/);
      if (mSes && req.method === 'GET') return API['GET /api/session/:sessionId'](req, res, { id: mSes[1] });
      if (mSes && req.method === 'PATCH') return API['PATCH /api/session/:sessionId'](req, res, { id: mSes[1] }, body);
      const mEm = urlPath.match(/^\/api\/emergency\/([\w-]+)$/);
      if (mEm && req.method === 'PATCH') {
        const rec = (store.emergencies || []).find(x => x.id === mEm[1]);
        if (!rec) return json(res, 404, { ok: false, error: 'emergency case not found' });
        if (body.status) rec.status = body.status;
        saveStore(store);
        return json(res, 200, { ok: true, case: rec });
      }
      return json(res, 404, { ok: false, error: `No route for ${req.method} ${urlPath}` });
    } catch (e) {
      return json(res, e.status || 500, { ok: false, error: e.message || 'Server error' });
    }
  }

  if (urlPath === '/niro' || urlPath.startsWith('/niro/')) return serveNiroStatic(req, res, urlPath);

  serveStatic(req, res, urlPath);
}).listen(PORT, '0.0.0.0', () => {
  const bound = server.address().port;
  console.log(`AarogyaVaani · MediKiosk ready at http://localhost:${bound} (API + static)`);
});