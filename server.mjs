/* AarogyaVaani · MediKiosk — zero-dependency static server + REST API (SIH26047)
   API mirrors the implementation document:
     POST /api/auth/login            ABHA/Aadhaar + mock OTP (1234) → session token
     POST /api/consent               Record granular patient consent
     POST /api/session/start         Create intake session, set language
     POST /api/conversation/turn     Store one Q&A turn of the interview
     POST /api/documents/upload      Upload image for OCR (base64 JSON)
     GET  /api/documents/:id/status  Poll OCR/extraction status
     POST /api/summary/generate      Generate structured summary
     GET  /api/summary/:sessionId    Fetch structured summary
     PATCH /api/summary/:sessionId   Physician edits/confirms the summary
     POST /api/fhir/push             Push confirmed record to HIS/ABDM (mocked, logged)
     GET  /api/admin/analytics       OPD load, avg kiosk time, complaints, language mix
   Persistence: a single JSON file (data/api-store.json) stands in for
   PostgreSQL + MongoDB in this no-dependency prototype. */

import { createReadStream, existsSync, statSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const PORT = Number(process.env.PORT) || 4173;
const STORE_FILE = join(root, 'data', 'api-store.json');
const MAX_BODY = 4 * 1024 * 1024; // 4 MB — kiosk photos are base64
/* NirogaVerse bridge — same-origin proxy target (Express + Prisma + OpenAI).
   Set NIRO_BASE=http://localhost:3000 when the NirogaVerse server is running. */
const NIRO_BASE = (process.env.NIRO_BASE || 'http://localhost:3000').replace(/\/$/, '');

const types = {
  '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'
};

/* ---------------- JSON-file store (stands in for Postgres + Mongo) ---------------- */
function defaultStore() {
  return { sessions: [], consents: [], turns: [], documents: [], summaries: [], fhirPushes: [], seq: 1 };
}
function loadStore() {
  try { return JSON.parse(readFileSync(STORE_FILE, 'utf8')); } catch { return defaultStore(); }
}
function saveStore(s) {
  try { mkdirSync(join(root, 'data'), { recursive: true }); writeFileSync(STORE_FILE, JSON.stringify(s, null, 2)); } catch (e) { console.error('store write failed', e.message); }
}
const store = loadStore();
const nextId = prefix => { const n = store.seq++; return `${prefix}-${String(n).padStart(4, '0')}`; };

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
const API = {
  'POST /api/auth/login'(req, res, body) {
    const { abha, aadhaar, otp } = body;
    const id = abha || aadhaar || 'guest';
    if (otp !== '1234') return json(res, 401, { ok: false, error: 'Invalid OTP. Demo OTP is 1234.' });
    json(res, 200, { ok: true, token: nextId('tok'), id, demoOtp: '1234' });
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
      patient: body.patient || {}, dept: body.dept || '',
      status: 'in_progress', startedAt: new Date().toISOString(), completedAt: null
    };
    store.sessions.unshift(session);
    saveStore(store);
    json(res, 201, { ok: true, sessionId: session.id });
  },

  'POST /api/conversation/turn'(req, res, body) {
    if (!body.sessionId) return json(res, 400, { ok: false, error: 'sessionId required' });
    const turn = { id: nextId('turn'), sessionId: body.sessionId, question: body.question, answer: body.answer, at: new Date().toISOString() };
    store.turns.unshift(turn);
    store.turns = store.turns.slice(0, 500);
    saveStore(store);
    json(res, 201, { ok: true, turnId: turn.id, next: body.next || null });
  },

  'POST /api/documents/upload'(req, res, body) {
    const doc = {
      id: nextId('doc'), sessionId: body.sessionId || 'pending',
      filename: body.filename || 'upload.jpg', dataBase64: body.dataBase64 || '',
      docType: body.docType || 'unknown', status: 'queued',
      uploadedAt: new Date().toISOString(), fields: []
    };
    store.documents.unshift(doc);
    saveStore(store);
    json(res, 201, { ok: true, documentId: doc.id, status: 'queued' });
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

  'GET /api/admin/analytics'(req, res) {
    json(res, 200, { ok: true, at: new Date().toISOString(), analytics: computeAnalytics() });
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
      const mSum = urlPath.match(/^\/api\/summary\/([\w-]+)$/);
      if (mSum && req.method === 'GET') return API['GET /api/summary/:sessionId'](req, res, { id: mSum[1] });
      if (mSum && req.method === 'PATCH') return API['PATCH /api/summary/:sessionId'](req, res, { id: mSum[1] }, body);
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