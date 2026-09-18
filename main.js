/* AarogyaVaani — state, clinical logic, flow control */

const BLANK_PATIENT = {
  name: '', age: '', dob: '', gender: '', blood: '', marital: '', occupation: '', education: '',
  phone: '', altPhone: '', address: '', city: '', state: '', pincode: '', area: '',
  emgName: '', emgRelation: '', emgPhone: '', caregiver: '', abha: '', aadhaar: '', uhid: '', visitType: 'new'
};
const VITAL_KEYS = ['sys', 'dia', 'pulse', 'spo2', 'temp', 'rr', 'height', 'weight'];

const DEMO_PATIENT = {
  name: 'Ramesh Kumar', age: '58', dob: '1968-04-12', gender: 'male', blood: 'B+', marital: 'married',
  occupation: 'farmer', education: 'primary', phone: '9876543221', altPhone: '9812004455',
  address: 'House 14, Gandhi Nagar', city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201009', area: 'rural',
  emgName: 'Sunita Kumari', emgRelation: 'spouse', emgPhone: '9876500112', caregiver: 'son',
  abha: '91-2345-6789-0123', uhid: 'AIIA/2026/00918', visitType: 'follow'
};
const DEMO_VITALS = { sys: '148', dia: '92', pulse: '104', spo2: '95', temp: '98.8', rr: '20', height: '168', weight: '72' };
const DEMO_ANSWERS = {
  complaint: 'chest', site: 'central', onset: 'sudden', character: 'pressure', radiation: 'left_arm',
  associated: ['dyspnoea', 'sweating'], severity: 8, exertion: 'yes',
  pmh: ['htn'], surgery: 'no', meds: 'yes_bp', allergy: 'penicillin', family: ['heart'],
  tobacco: 'chew', alcohol: 'never', sleep: 'broken'
};
const DEMO_AYUSH = { prakriti: 'pitta', vikriti: ['heat', 'sleep'], sara: 'avg', samhanana: 'moderate', satmya: 'spicy', sattva: 'madhyama', ahara_shakti: 'mid', vyayama_shakti: 'low', agni: 'vishama', koshtha: 'krura', nidana: ['food', 'stress'] };
/* Documents carry structured clinical data per the SIH26047 spec:
   type: lab | med | diagnosis | vitals | other
   labs:    { value: numeric string, unit, lo, hi } → out-of-range = value outside [lo, hi]
   meds:    { dose: '5 mg', freq: 'OD|BD|TDS|HS|SOS', raw }                    
   dateISO: 'YYYY-MM-DD' for the chronological timeline                          */
const DEMO_DOCS = [
  { label: 'Haemoglobin', value: '8.2 g/dL', numeric: 8.2, unit: 'g/dL', lo: 12, hi: 15, out: true, dateISO: '2026-08-20', date: '20 Aug 2026', conf: 0.96, type: 'lab' },
  { label: 'Amlodipine', value: '5 mg · OD (once daily)', dose: '5 mg', freq: 'OD', dateISO: '2026-08-02', date: '02 Aug 2026', conf: 0.81, type: 'med' },
  { label: 'ECG report', value: 'Sinus tachycardia, rate 104', dateISO: '2026-08-20', date: '20 Aug 2026', conf: 0.72, type: 'diagnosis' },
  { label: 'HbA1c', value: '7.8 %', numeric: 7.8, unit: '%', lo: 4, hi: 5.6, out: true, dateISO: '2026-05-11', date: '11 May 2026', conf: 0.93, type: 'lab' },
  { label: 'Serum creatinine', value: '1.1 mg/dL', numeric: 1.1, unit: 'mg/dL', lo: 0.6, hi: 1.3, out: false, dateISO: '2026-05-11', date: '11 May 2026', conf: 0.9, type: 'lab' },
  { label: 'TSH', value: '3.2 uIU/mL', numeric: 3.2, unit: 'uIU/mL', lo: 0.4, hi: 4.0, out: false, dateISO: '2026-01-18', date: '18 Jan 2026', conf: 0.88, type: 'lab' }
];

const STATE = {
  view: 'landing', step: 'welcome', lang: 'hi',
  patient: { ...BLANK_PATIENT },
  vitals: { sys: '', dia: '', pulse: '', spo2: '', temp: '', rr: '', height: '', weight: '' },
  answers: {}, ayush: {}, consents: { c1: true, c2: true, c3: false, c4: false, c5: false },
  dept: '', qIndex: 0, ayushIndex: 0, docs: [], redFlags: [], errors: {},
  token: 'A-18', listening: false, emergencyShown: false, confirmed: false,
  openToken: null, sections: {}, search: '', docNote: '', triageAck: false, audit: [],
  otp: { sent: false, value: '', verified: false },
  /* patient identity login: abha | aadhaar | phone | new */
  login: { mode: '', value: '', otpSent: false, verified: false, history: null, loading: false, error: '' },
  /* staff (doctor console) login — same OTP verification concept as the patient ABHA step */
  staff: { name: '', id: '', otpSent: false, otp: '', verified: false, busy: false, error: '' },
  ocr: { status: 'idle', pct: 0, mode: '', name: '' },
  scan: { mode: 'idle', stream: null, facing: 'environment', error: '', bt: { status: 'idle', name: '' }, shot: '', loading: false, pair: { open: false } },
  asrText: '', sessionId: null, analytics: null,
  /* Ayurveda AI (NirogaVerse bridge) */
  ayur: { session: null, token: null, messages: [], input: '', sending: false, source: '', seeded: false, error: '', sessions: [], profileData: null, autoSpeak: true, sidebar: true, mode: 'native' },
  /* doctor-end AI assistant (NVIDIA NIM) + staff login screen flag */
  staffLogin: false,
  ai: { open: false, messages: [], input: '', sending: false, error: '', source: '', muted: false },
  /* AI department suggestion, filled after the complaint is picked */
  deptSuggestion: { dept: '', reason: '', source: '', loading: false },
  /* voice AI command assistant state */
  voice: { listening: false, busy: false, last: '', reply: '', error: '', source: '', live: true, liveUserOff: false, muted: false, log: [] },
  api: { ok: null, nvidia: false, openai: false, openrouter: false },
  ui: { sidebarCollapsed: false, notifyOpen: false, dashQuery: '', stats: { status: 'idle', error: '', health: null, analytics: null, dashboard: null } },
  em: { phase: '', name: '', problem: '', attendant: '', relName: '', relPhone: '', relRelation: '', errors: {}, caseId: '', caseNo: '' },
  emCases: []
};

function save(opts) {
  try {
    const payload = Object.assign({}, STATE);
    payload.scan = Object.assign({}, STATE.scan || {}, { stream: null, loading: false });
    if (payload.scan.shot && payload.scan.shot.length > 180000) payload.scan.shot = '';
    if (payload.scan.pair && payload.scan.pair.received) {
      payload.scan.pair.received = payload.scan.pair.received.map(d => ({ id: d.id, filename: d.filename }));
    }
    payload.docs = (STATE.docs || []).map(d => {
      const copy = Object.assign({}, d);
      if (copy.preview && copy.preview.length > 80000) copy.preview = '';
      return copy;
    });
    localStorage.setItem('aarogyavaani', JSON.stringify(payload));
  } catch (e) {}
  if (!(opts && opts.localOnly)) schedulePersistIntake(!!(opts && opts.flush));
}
function restore() {
  try {
    const raw = localStorage.getItem('aarogyavaani');
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(STATE, saved);
      /* keep fields added in newer versions when older state is restored */
      STATE.ayur = Object.assign({ session: null, token: null, messages: [], input: '', sending: false, source: '', seeded: false, error: '', sessions: [], profileData: null, autoSpeak: true, sidebar: true, mode: 'native' }, saved.ayur || {});
      STATE.staff = Object.assign({ name: '', id: '', otpSent: false, otp: '', verified: false, busy: false, error: '' }, saved.staff || {});
      STATE.login = Object.assign({ mode: '', value: '', otpSent: false, verified: false, history: null, loading: false, error: '' }, saved.login || {});
      STATE.ai = Object.assign({ open: false, messages: [], input: '', sending: false, error: '', source: '', muted: false }, saved.ai || {});
      STATE.deptSuggestion = Object.assign({ dept: '', reason: '', source: '', loading: false }, saved.deptSuggestion || {});
      STATE.voice = Object.assign({ listening: false, busy: false, last: '', reply: '', error: '', source: '', live: true, liveUserOff: false, muted: false, log: [] }, saved.voice || {});
      STATE.voice.listening = false; STATE.voice.busy = false;
      STATE.voice.liveUserOff = !!STATE.voice.liveUserOff;
      /* LIVE is on for the kiosk session unless the user explicitly turned it off */
      STATE.voice.live = !STATE.voice.liveUserOff;
      /* never restore muted:true — stale localStorage left the kiosk silent */
      STATE.voice.muted = false;
      STATE.api = { ok: null, nvidia: false, openai: false, openrouter: false };
      STATE.ui = Object.assign({ sidebarCollapsed: false, notifyOpen: false, dashQuery: '', stats: { status: 'idle', error: '', health: null, analytics: null, dashboard: null } }, saved.ui || {});
      STATE.ui.notifyOpen = false;
      STATE.ui.stats = { status: 'idle', error: '', health: null, analytics: null, dashboard: null };
      STATE.em = Object.assign({ phase: '', name: '', problem: '', attendant: '', relName: '', relPhone: '', relRelation: '', errors: {}, caseId: '', caseNo: '' }, saved.em || {});
      STATE.emCases = Array.isArray(saved.emCases) ? saved.emCases : [];
      STATE.scan = Object.assign({ mode: 'idle', stream: null, facing: 'environment', error: '', bt: { status: 'idle', name: '' }, shot: '', loading: false, pair: { open: false } }, saved.scan || {});
      STATE.scan.stream = null;
      STATE.scan.loading = false;
      if (STATE.scan.mode === 'live' || STATE.scan.mode === 'qr') { STATE.scan.mode = 'idle'; }
      STATE.deptSuggestion.loading = false; /* a reload kills the in-flight AI callback — never stay stuck on "Analysing…" */
      STATE.staffLogin = false; /* always re-present the login gate after reload if unverified */
      if (!window.AYUR_EMBED_PORT) STATE.ayur.mode = 'native';
      lockRequiredConsents();
    }
  } catch (e) {}
}

function lockRequiredConsents() {
  if (!STATE.consents) STATE.consents = { c1: true, c2: true, c3: false, c4: false, c5: false };
  CONSENTS.forEach(c => { if (c.required) STATE.consents[c.id] = true; });
}

/* ---------- derived helpers ---------- */
function labelOf(list, id) { const f = list.find(x => x.id === id); return f ? L(f) : ''; }
function genderLabel(id) {
  if (!id) return '';
  const g = GENDERS.find(x => x.id === String(id).toLowerCase());
  return g ? L(g) : String(id);
}
function genderLabelEn(id) {
  if (!id) return '';
  const g = GENDERS.find(x => x.id === String(id).toLowerCase());
  return g ? (g.en || g.english || L(g)) : String(id);
}
function langName() { const l = LANGS.find(x => x.id === STATE.lang); return l ? l.english : 'Hindi'; }
function complaintName() {
  const c = COMPLAINTS.find(x => x.id === STATE.answers.complaint);
  return c ? L(c) : (isHi() ? 'शिकायत' : 'Complaint');
}
function sectionName(s) {
  const map = { past: ['पुरानी बीमारी', 'Past history'], meds: ['दवा और एलर्जी', 'Medicines & allergy'], family: ['पारिवारिक', 'Family history'], personal: ['जीवनशैली', 'Personal history'] };
  const v = map[s]; return v ? (isHi() ? v[0] : v[1]) : s;
}
function currentDept() { return DEPARTMENTS.find(d => d.id === STATE.dept) || DEPARTMENTS[0]; }
function questionList() { return (ROUTERS[STATE.answers.complaint] || []).concat(COMMON_QUESTIONS); }
function ayushList() { return DASHAVIDHA.filter(d => !d.derived).concat(AYUSH_EXTRA); }
function ayushDef(key) { return ayushList().find(x => x.key === key) || { options: [] }; }
function calcBmi(v) {
  const h = Number(v.height), w = Number(v.weight);
  if (!h || !w) return null;
  const r = Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
  const label = r < 18.5 ? 'Underweight' : r < 25 ? 'Normal' : r < 30 ? 'Overweight' : 'Obese';
  return { value: r.toFixed(1), label };
}
function liveVitals() { return STATE.vitals; }
function completeness() {
  const demoKeys = ['name', 'age', 'gender', 'phone', 'address', 'city', 'emgName', 'emgPhone', 'blood', 'occupation', 'abha', 'marital'];
  const total = questionList().length + ayushList().length + demoKeys.length;
  let done = questionList().filter(q => { const v = STATE.answers[q.key]; return v !== undefined && v !== '' && !(Array.isArray(v) && !v.length); }).length;
  done += Object.keys(STATE.ayush).length;
  done += demoKeys.filter(k => STATE.patient[k]).length;
  return Math.min(100, Math.round((done / total) * 100));
}
function computeRedFlags() {
  STATE.redFlags = RED_FLAG_RULES
    .filter(r => { try { return r.test(STATE.answers, STATE.vitals); } catch (e) { return false; } })
    .map(r => ({ id: r.id, level: r.level, label: r.label, evidence: r.evidence }));
  return STATE.redFlags;
}
function optLabel(q, id) { const o = ((q && q.options) || []).find(x => x.id === id); return o ? L(o) : ''; }
function findLabel(key, id) { return optLabel(questionList().find(x => x.key === key), id); }
function narrative() {
  const a = STATE.answers;
  if (!a.complaint) return '';
  const bits = [];
  const dur = a.duration ? optLabel(BLOCK.duration, a.duration) : '';
  bits.push(isHi() ? `${complaintName()}${dur ? ' — ' + dur : ''}` : `${complaintName()}${dur ? ' for ' + dur.toLowerCase() : ''}`);
  ['site', 'character', 'radiation', 'pattern'].forEach(k => {
    if (a[k] && a[k] !== 'no') { const lab = findLabel(k, a[k]); if (lab) bits.push(lab); }
  });
  if (Array.isArray(a.associated) && a.associated.length && !a.associated.includes('none')) {
    bits.push((isHi() ? 'साथ में: ' : 'with ') + a.associated.map(x => findLabel('associated', x)).filter(Boolean).join(', '));
  }
  if (a.severity !== undefined && a.severity !== '') bits.push((isHi() ? 'तीव्रता ' : 'severity ') + a.severity + '/10');
  if (a.freetext) bits.push(a.freetext);
  return bits.filter(Boolean).join(' · ');
}

/* ---------- structured summary ---------- */
function buildSummary() {
  const a = STATE.answers, p = STATE.patient, v = STATE.vitals, S = [];
  S.push({ id: 'cc', title: 'Chief complaint', facts: [{ src: 'patient', text: narrative() || 'Session in progress — no complaint captured yet' }] });

  const hpi = [];
  [['onset', 'Onset'], ['timing', 'Timing'], ['exertion', 'Relation to exertion'], ['food_relation', 'Relation to food'],
   ['stiffness', 'Morning stiffness'], ['orthopnoea', 'Worse lying flat'], ['chills', 'Chills and rigors'], ['travel', 'Recent travel']]
    .forEach(([k, lab]) => { if (a[k]) { const val = findLabel(k, a[k]); if (val) hpi.push({ src: 'patient', text: `${lab}: ${val}` }); } });
  if (!hpi.length) hpi.push({ src: 'derived', text: 'No additional history modifiers captured.' });
  S.push({ id: 'hpi', title: 'History of presenting illness (SOCRATES)', facts: hpi });

  const past = [];
  if (Array.isArray(a.pmh) && a.pmh.length && !a.pmh.includes('none')) past.push({ src: 'patient', text: a.pmh.map(x => findLabel('pmh', x)).join(', ') });
  if (a.surgery === 'yes') past.push({ src: 'patient', text: 'Reports previous surgery' });
  if (!past.length) past.push({ src: 'patient', text: 'No chronic illness reported' });
  S.push({ id: 'past', title: 'Past medical history', facts: past });

  const meds = [];
  if (a.meds && a.meds !== 'no') meds.push({ src: 'patient', text: findLabel('meds', a.meds) });
  STATE.docs.filter(d => d.type === 'med').forEach(d => meds.push({ src: 'document', text: `${d.label} — ${d.value}`, conf: d.conf }));
  if (!meds.length) meds.push({ src: 'patient', text: 'No current medication reported' });
  S.push({ id: 'meds', title: 'Medications', facts: meds });

  S.push({ id: 'allergy', title: 'Allergies', red: !!(a.allergy && ['penicillin', 'sulfa', 'food'].includes(a.allergy)),
    facts: [{ src: 'patient', text: a.allergy ? findLabel('allergy', a.allergy) : 'Not captured' }] });

  S.push({ id: 'family', title: 'Family history', facts: (Array.isArray(a.family) && a.family.length && !a.family.includes('none'))
    ? [{ src: 'patient', text: a.family.map(x => findLabel('family', x)).join(', ') }]
    : [{ src: 'patient', text: 'No significant family history reported' }] });

  const pers = [];
  [['tobacco', 'Tobacco'], ['alcohol', 'Alcohol'], ['sleep', 'Sleep']].forEach(([k, lab]) => {
    if (a[k]) { const val = findLabel(k, a[k]); if (val) pers.push({ src: 'patient', text: `${lab}: ${val}` }); }
  });
  if (p.occupation) pers.push({ src: 'patient', text: 'Occupation: ' + labelOf(OCCUPATIONS, p.occupation) });
  if (p.area) pers.push({ src: 'patient', text: 'Residence: ' + p.area });
  if (!pers.length) pers.push({ src: 'derived', text: 'Lifestyle history not captured' });
  S.push({ id: 'personal', title: 'Personal & lifestyle history', facts: pers });

  const vit = [];
  if (v.sys && v.dia) vit.push({ src: 'nurse', text: `BP ${v.sys}/${v.dia} mmHg` });
  if (v.pulse) vit.push({ src: 'nurse', text: `Pulse ${v.pulse}/min` });
  if (v.spo2) vit.push({ src: 'nurse', text: `SpO₂ ${v.spo2}%` });
  if (v.temp) vit.push({ src: 'nurse', text: `Temperature ${v.temp} °F` });
  if (v.rr) vit.push({ src: 'nurse', text: `Respiratory rate ${v.rr}/min` });
  const bmi = calcBmi(v);
  if (bmi) vit.push({ src: 'derived', text: `BMI ${bmi.value} · ${bmi.label}` });
  if (vit.length) S.push({ id: 'vitals', title: 'Vitals & measurements', facts: vit });

  const ayKeys = Object.keys(STATE.ayush);
  if (ayKeys.length) {
    S.push({ id: 'ayush', title: 'Dashavidha Pariksha · Ayurvedic assessment', facts: ayKeys.map(k => {
      const q = ayushList().find(x => x.key === k) || {};
      const val = STATE.ayush[k];
      const text = Array.isArray(val) ? val.map(x => optLabel(q, x)).filter(Boolean).join(', ') : optLabel(q, val);
      return { src: 'patient', text: `${q.sanskrit || k} (${q.label || k}): ${text}` };
    }) });
  }
  if (STATE.docs.length) {
    S.push({ id: 'docs', title: 'Digitised documents', facts: STATE.docs.map(d => ({ src: 'document', text: `${d.label} — ${d.value} (${d.date})`, conf: d.conf })) });
  }
  if (STATE.redFlags.length) {
    S.push({ id: 'flags', title: 'Red-flag signals · rule based, not a diagnosis', red: true,
      facts: STATE.redFlags.map(f => ({ src: 'derived', text: `${f.label} — ${f.evidence}` })) });
  }
  return S;
}

function demoSummary(p) {
  return [
    { id: 'cc', title: 'Chief complaint', facts: [{ src: 'patient', text: p.complaint }] },
    { id: 'hpi', title: 'History of presenting illness', facts: [
      { src: 'patient', text: 'Gradual onset, progressive over the stated duration' },
      { src: 'patient', text: 'Worse in the early morning, partial relief with rest' }] },
    { id: 'past', title: 'Past medical history', facts: [{ src: 'patient', text: 'Hypertension on treatment for 4 years' }] },
    { id: 'meds', title: 'Medications', facts: [{ src: 'document', text: 'Amlodipine 5 mg once daily', conf: 0.81 }] },
    { id: 'allergy', title: 'Allergies', facts: [{ src: 'patient', text: 'No known allergy' }] },
    { id: 'personal', title: 'Personal & lifestyle history', facts: [{ src: 'patient', text: 'Non-smoker, vegetarian diet, sleeps 6 hours' }] }
  ];
}

/* ---------- queue ---------- */
function queueRows() {
  const p = STATE.patient, v = STATE.vitals, flags = STATE.redFlags;
  const live = {
    token: STATE.token,
    name: p.name || 'Live kiosk session',
    age: p.age || '—',
    gender: genderLabelEn(p.gender) || '—',
    lang: langName(),
    abha: p.abha || 'Not linked',
    complaint: narrative() || 'Session in progress',
    dept: currentDept().en,
    triage: flags.some(f => f.level === 'emergency') ? 'emergency' : flags.length ? 'urgent' : 'routine',
    flags: flags.length,
    complete: completeness(),
    wait: '00:02',
    bp: v.sys && v.dia ? `${v.sys}/${v.dia}` : '—',
    pulse: v.pulse || '—', spo2: v.spo2 || '—', temp: v.temp || '—',
    blood: p.blood || '—', village: [p.city, p.state].filter(Boolean).join(', '),
    reason: flags.length ? `${flags[0].label} — ${flags[0].evidence}` : ''
  };
  const seeds = SEED_PATIENTS.map(s => ({ ...s, reason: s.triage === 'urgent' ? 'Cough beyond 3 weeks — TB screening protocol' : '' }));
  const order = { emergency: 0, urgent: 1, routine: 2 };
  /* Emergency intake is triage-desk only — never prepend this kiosk session to the OPD queue. */
  if (STATE.em && STATE.em.phase) return seeds.slice().sort((a, b) => order[a.triage] - order[b.triage]);
  return [live].concat(seeds).sort((a, b) => order[a.triage] - order[b.triage]);
}

/* ---------- FHIR ---------- */
function fhirBundle() {
  const p = STATE.patient, v = STATE.vitals, obs = [];
  if (v.sys && v.dia) obs.push({ resourceType: 'Observation', code: { text: 'Blood pressure panel' }, valueString: `${v.sys}/${v.dia} mmHg` });
  if (v.pulse) obs.push({ resourceType: 'Observation', code: { text: 'Heart rate' }, valueQuantity: { value: Number(v.pulse), unit: '/min' } });
  if (v.spo2) obs.push({ resourceType: 'Observation', code: { text: 'Oxygen saturation' }, valueQuantity: { value: Number(v.spo2), unit: '%' } });
  const bmi = calcBmi(v);
  if (bmi) obs.push({ resourceType: 'Observation', code: { text: 'Body mass index' }, valueQuantity: { value: Number(bmi.value), unit: 'kg/m2' } });
  return {
    resourceType: 'Bundle', type: 'document', id: 'medikiosk-' + STATE.token.toLowerCase(),
    timestamp: new Date().toISOString(),
    entry: [
      { resource: { resourceType: 'Patient', id: 'pat-1', name: [{ text: p.name || 'Unnamed' }],
          gender: p.gender || 'unknown', birthDate: p.dob || undefined,
          telecom: p.phone ? [{ system: 'phone', value: p.phone }] : [],
          address: [{ line: [p.address].filter(Boolean), city: p.city, state: p.state, postalCode: p.pincode, country: 'IN' }],
          identifier: [{ system: 'https://healthid.abdm.gov.in', value: p.abha || 'not-linked' }],
          contact: p.emgName ? [{ relationship: [{ text: labelOf(RELATIONS, p.emgRelation) || 'Emergency contact' }], name: { text: p.emgName }, telecom: [{ system: 'phone', value: p.emgPhone }] }] : [] } },
      { resource: { resourceType: 'Encounter', id: 'enc-1', status: 'in-progress', class: { code: 'AMB', display: 'ambulatory' }, serviceType: { text: currentDept().en }, subject: { reference: 'Patient/pat-1' } } },
      { resource: { resourceType: 'Composition', status: STATE.confirmed ? 'final' : 'preliminary',
          title: 'AI-assisted case history (draft until physician confirms)',
          section: buildSummary().map(s => ({ title: s.title, text: s.facts.map(f => f.text).join(' | ') })) } },
      ...obs.map((o, i) => ({ resource: { ...o, id: 'obs-' + (i + 1), status: 'final', subject: { reference: 'Patient/pat-1' } } })),
      { resource: { resourceType: 'Consent', status: 'active', scope: { text: 'patient-privacy' },
          provision: { type: 'permit', purpose: CONSENTS.filter(c => STATE.consents[c.id]).map(c => ({ code: c.id, display: c.en })) } } },
      ...(STATE.redFlags.length ? [{ resource: { resourceType: 'Flag', status: 'active', category: { text: 'clinical-triage' }, code: { text: STATE.redFlags.map(f => f.label).join('; ') } } }] : [])
    ]
  };
}

/* ---------- flow ---------- */
function stepOrder() {
  /* department is now chosen AFTER the interview — the AI suggests it from the complaint history */
  const steps = ['welcome', 'identity', 'demographics', 'consent', 'vitals', 'complaint', 'interview', 'department'];
  if (currentDept().ayush) steps.push('ayush');
  return steps.concat(['scan', 'review', 'done']);
}
function validateStep() {
  STATE.errors = {};
  const p = STATE.patient;
  const req = (k, msg) => { if (!String(p[k] || '').trim()) STATE.errors[k] = msg; };
  if (STATE.step === 'identity') {
    if (!STATE.login.mode) STATE.errors.login = isHi() ? 'पहले लॉगिन का तरीका चुनिए' : 'Choose a login option first';
    else if (STATE.login.mode !== 'new' && !STATE.login.verified) STATE.errors.login = isHi() ? 'पहले OTP से पहचान सत्यापित करें' : 'Verify your identity with the OTP first';
  }
  if (STATE.step === 'demographics') {
    req('name', isHi() ? 'नाम ज़रूरी है' : 'Name is required');
    req('age', isHi() ? 'उम्र ज़रूरी है' : 'Age is required');
    if (p.age && (Number(p.age) < 0 || Number(p.age) > 120)) STATE.errors.age = isHi() ? '0 से 120 के बीच' : 'Enter 0–120';
    if (!p.gender) STATE.errors.gender = isHi() ? 'लिंग चुनिए' : 'Please choose one';
  }
  if (STATE.step === 'demographics') {
    /* phone now lives on this step (and comes pre-filled for phone-login / returning patients) */
    if (!/^\d{10}$/.test(String(p.phone || '').replace(/\D/g, ''))) STATE.errors.phone = isHi() ? 'मोबाइल नंबर ज़रूरी है (10 अंक)' : 'Mobile number is required (10 digits)';
  }
  if (STATE.step === 'consent') lockRequiredConsents();
  return Object.keys(STATE.errors).length === 0;
}

function goNext() {
  ensureKioskLive();
  const steps = stepOrder();
  if (!validateStep()) { toast(isHi() ? 'कुछ ज़रूरी जानकारी बाक़ी है' : 'Some required details are missing'); return render(); }
  if (STATE.step === 'interview') {
    const list = questionList();
    if (STATE.qIndex < list.length - 1) { STATE.qIndex++; afterAnswer(); return render(); }
    computeRedFlags();
    if (STATE.redFlags.some(f => f.level === 'emergency') && !STATE.emergencyShown) {
      STATE.emergencyShown = true; STATE.step = 'emergency'; logAudit('Red flag raised · ' + STATE.redFlags[0].id); save({ flush: true }); return render();
    }
  }
  if (STATE.step === 'ayush') {
    const list = ayushList();
    if (STATE.ayushIndex < list.length - 1) { STATE.ayushIndex++; save({ flush: true }); return render(); }
  }
  if (STATE.step === 'review') { submitCase(); return; }
  const i = steps.indexOf(STATE.step);
  STATE.step = steps[Math.min(i + 1, steps.length - 1)];
  /* arriving at the department step: pre-select the AI suggestion if the patient hasn't chosen */
  if (STATE.step === 'department' && !STATE.dept && STATE.deptSuggestion && STATE.deptSuggestion.dept) STATE.dept = STATE.deptSuggestion.dept;
  if (STATE.step === 'consent') lockRequiredConsents();
  if (STATE.step === 'scan' && !STATE.consents.c3) STATE.step = 'review';
  computeRedFlags(); save({ flush: true }); render();
}

function goBack() {
  ensureKioskLive();
  const steps = stepOrder();
  if (STATE.step === 'interview' && STATE.qIndex > 0) { STATE.qIndex--; save({ flush: true }); return render(); }
  if (STATE.step === 'ayush' && STATE.ayushIndex > 0) { STATE.ayushIndex--; save({ flush: true }); return render(); }
  const i = steps.indexOf(STATE.step);
  STATE.step = steps[Math.max(i - 1, 0)];
  if (STATE.step === 'consent') lockRequiredConsents();
  STATE.errors = {}; save(); render();
}

function afterAnswer() { computeRedFlags(); save({ flush: true }); syncTurn(); }

function registerVisit() {
  upsertPatientRecord(true);
}

function submitCase() {
  computeRedFlags();
  STATE.step = 'done';
  STATE.token = STATE.token || 'A-18';
  logAudit('Draft summary delivered to physician');
  registerVisit();
  syncSession();
  save({ flush: true }); render();
  toast(isHi() ? 'सारांश डॉक्टर को भेज दिया गया — डॉक्टर कंसोल खुल रहा है…' : 'Draft sent to doctor — opening Doctor Console…');

  /* Auto-navigate to doctor console so the physician sees the new case immediately */
  setTimeout(() => {
    STATE.openToken = STATE.token;
    STATE.view = 'doctor';
    /* Auto-verify staff so the doctor console opens directly without an OTP gate */
    STATE.staff = Object.assign(STATE.staff || {}, {
      verified: true,
      name: (STATE.staff && STATE.staff.name) || 'Dr. Anita Sharma',
      id:   (STATE.staff && STATE.staff.id)   || 'AIIA-DR-0117'
    });
    STATE.staffLogin = false;
    save(); render();
    window.location.hash = '/doctor/detail';
    toast(isHi() ? 'डॉक्टर कंसोल खोला गया — टोकन ' + STATE.token : 'Doctor console opened — Token ' + STATE.token);
  }, 1200);
}

function logAudit(action) {
  const now = new Date();
  STATE.audit.unshift({ time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, actor: 'Kiosk 04', action, ref: STATE.token });
  STATE.audit = STATE.audit.slice(0, 6);
}

/* ---------- patient identity login: ABHA / Aadhaar / Phone / New ---------- */
function loginIdField() { return { abha: 'abha', aadhaar: 'aadhaar', phone: 'phone' }[STATE.login.mode] || null; }

function loginPrefillPatient() {
  /* registry hit → prefill demographics + contact so returning patients skip retyping */
  const h = STATE.login.history;
  if (!h || !h.details) return;
  const d = h.details;
  STATE.patient = Object.assign({}, BLANK_PATIENT, {
    name: d.name || '', age: d.age || '', dob: d.dob || '', gender: d.gender || '', blood: d.blood || '',
    marital: d.marital || '', occupation: d.occupation || '', education: d.education || '',
    phone: d.phone || '', address: d.address || '', city: d.city || '', state: d.state || '',
    pincode: d.pincode || '', area: d.area || '', abha: d.abha || '', aadhaar: d.aadhaar || '',
    emgName: d.emgName || '', emgRelation: d.emgRelation || '', emgPhone: d.emgPhone || '',
    visitType: 'follow'
  });
}

function loginSendOtp() {
  const lg = STATE.login;
  const val = lg.value.trim();
  if (!val) { lg.error = isHi() ? 'पहले ' + loginLabel() + ' लिखिए' : 'Enter your ' + loginLabel() + ' first'; return render(); }
  const okShape = lg.mode === 'phone' ? /^\d{10}$/.test(val.replace(/\D/g, '')) : val.replace(/\D/g, '').length >= 10;
  if (!okShape) { lg.error = isHi() ? lg.mode === 'phone' ? '10 अंकों का नंबर लिखिए' : 'पूरा नंबर लिखिए (कम से कम 10 अंक)' : lg.mode === 'phone' ? 'Enter a 10-digit number' : 'Enter the full number (at least 10 digits)'; return render(); }
  lg.loading = true; lg.error = ''; render();
  const body = { otp: 'sent' };
  body[loginIdField()] = val;
  api('/api/auth/login', { method: 'POST', body }).then(() => {
    lg.loading = false; lg.otpSent = true; lg.error = '';
    save(); render();
    toast(isHi() ? 'OTP भेजा गया — डेमो OTP 1234' : 'OTP sent — demo OTP is 1234');
  });
}

function loginVerifyOtp() {
  const lg = STATE.login;
  const val = lg.value.trim();
  if ((STATE.otp.value || '') !== DEMO_OTP) { toast(t('otpWrong')); return; }
  lg.loading = true; lg.error = ''; render();
  const body = { otp: STATE.otp.value };
  body[loginIdField()] = val;
  api('/api/auth/login', { method: 'POST', body }).then(r => {
    lg.loading = false;
    if (r && r.ok) {
      lg.verified = true; lg.otpSent = false;
      lg.history = r.history || null; /* { name, age, gender, visits[] } | null */
      if (lg.history) {
        STATE.patient.abha = lg.mode === 'abha' ? val : STATE.patient.abha;
        STATE.patient.aadhaar = lg.mode === 'aadhaar' ? val : STATE.patient.aadhaar;
        STATE.patient.phone = lg.mode === 'phone' ? val : STATE.patient.phone;
        STATE.patient.visitType = 'follow';
      }
      logAudit((lg.mode || 'id') + ' login verified via OTP' + (lg.history ? ' · returning patient' : ' · new patient'));
      api('/api/patients/lookup', { method: 'POST', body: body.otp === 'sent' ? {} : { [loginIdField()]: val } }).then(detail => {
        if (detail && detail.found) { lg.history = Object.assign({}, lg.history || {}, { details: detail }); loginPrefillPatient(); }
        save(); render();
      });
      save(); render();
      toast(lg.history ? (isHi() ? 'स्वागत है, ' + lg.history.name + ' — पुराना रिकॉर्ड मिल गया' : 'Welcome back, ' + lg.history.name + ' — past records found') : (t('otpVerified')));
    } else {
      lg.error = (r && r.error) || t('otpWrong');
      save(); render();
    }
  });
}

function loginLabel() {
  return { abha: isHi() ? 'ABHA नंबर' : 'ABHA number', aadhaar: isHi() ? 'आधार नंबर' : 'Aadhaar number', phone: isHi() ? 'मोबाइल नंबर' : 'mobile number' }[STATE.login.mode] || 'ID';
}

function loginHistoryCard() {
  const h = STATE.login.history;
  if (!h) return '';
  const visits = h.visits || [];
  return `<div class="history-card">
    <div class="history-head">
      <span class="avatar">${initials(h.name)}</span>
      <div class="h-who"><b>${esc(h.name)}</b><small>${esc(String(h.age || '—'))} yrs · ${esc(h.gender || '—')} · ${visits.length} ${isHi() ? 'पिछली विज़िट' : 'past visit(s)'}</small></div>
      <span class="pill ok">${isHi() ? 'पुराना रिकॉर्ड मिला' : 'Returning patient'}</span>
    </div>
    ${visits.length ? `<div class="history-visits">${visits.slice(0, 4).map(v => `
      <div class="h-visit"><span class="h-date">${esc(v.date)}</span>
        <div class="h-body"><b>${esc(v.complaint)}</b><small>${esc(v.dept)} · ${esc(v.doctor)}${v.bp ? ' · BP ' + esc(v.bp) : ''}${v.pulse ? ' · Pulse ' + esc(v.pulse) : ''}</small>
        ${v.advice ? `<small class="h-advice">${esc(v.advice)}</small>` : ''}</div>
      </div>`).join('')}</div>` : ''}
    <small class="quiet" style="display:flex;gap:6px;align-items:center;margin-top:10px">${icon('shield', 13)} ${isHi() ? 'पुरानी जानकारी नीचे पहले से भरी है — जाँच लीजिए और आगे बढ़ें।' : 'Your saved details are prefilled below — review them and continue.'}</small>
  </div>`;
}

/* ---------- AI department suggestion ---------- */
function ruleDeptSuggestion() {
  /* deterministic mapping so the kiosk always has an answer even offline */
  const c = STATE.answers.complaint;
  const a = STATE.answers;
  const map = {
    chest: 'general', breath: 'general', fever: 'general',
    abdomen: 'kaya', headache: 'kaya', digestion: 'panchakarma',
    joint: 'kaya', skin: 'shalya'
  };
  let id = map[c] || 'kaya';
  if (Number(a.severity) >= 8 && (c === 'chest' || c === 'breath')) id = 'general';
  if (Number(STATE.patient.age) <= 12) id = 'kaumar';
  if (STATE.patient.gender === 'female' && (c === 'abdomen' || a.pelvic === 'yes')) id = 'prasuti';
  return id;
}

function aiSuggestDept() {
  /* ask the doctor-end AI to reason about the department; falls back to rules */
  const suggested = ruleDeptSuggestion();
  STATE.deptSuggestion = { dept: suggested, reason: '', source: 'rules', loading: false };
  const ctx = aiPatientContext();
  const q = isHi()
    ? 'इस मरीज़ के लिए सबसे उपयुक्त OPD विभाग बताइए। विकल्प: Kayachikitsa, Panchakarma, General Medicine, Shalya (surgery), Prasuti & Gynaecology, Kaumarbhritya (paediatrics). सिर्फ़ विभाग का नाम और एक पंक्ति में कारण लिखिए।'
    : 'Which OPD department fits this patient best? Options: Kayachikitsa (Ayurveda internal medicine), Panchakarma, General Medicine, Shalya (surgery), Prasuti & Gynaecology, Kaumarbhritya (paediatrics). Reply with only the department name and a one-line reason.';
  STATE.deptSuggestion.loading = true; render();
  const settle = (src, reason) => {
    if (!STATE.deptSuggestion.loading) return; /* already resolved or superseded */
    STATE.deptSuggestion.loading = false;
    STATE.deptSuggestion.source = src;
    STATE.deptSuggestion.reason = reason || '';
    save(); render();
  };
  const stuckTimer = setTimeout(() => settle('rules', ''), 22000); /* never leave the patient on "Analysing…" */
  api('/api/ai/chat', {
    method: 'POST',
    body: { messages: [{ role: 'system', content: 'CURRENT PATIENT CONTEXT:\n' + ctx }, { role: 'user', content: q }] }
  }).then(r => {
    clearTimeout(stuckTimer);
    if (r && r.ok && r.reply && r.source === 'nvidia-nim') settle('ai', String(r.reply).slice(0, 220));
    else settle('rules', '');
  });
}

function afterComplaintPicked() {
  computeRedFlags();
  syncTurn();
  aiSuggestDept(); /* fires while the patient answers the interview questions */
}

/* ---------- staff (doctor console) login — OTP verification gate ---------- */
function staffVerified() { return !!(STATE.staff && STATE.staff.verified); }

function staffSendOtp() {
  const s = STATE.staff;
  if (!s.name.trim() || !s.id.trim()) { s.error = isHi() ? 'नाम और स्टाफ़ आईडी दोनों भरें' : 'Enter both your name and staff ID'; render(); return; }
  s.busy = true; s.error = ''; render();
  api('/api/auth/login', { method: 'POST', body: { abha: 'dr-' + s.id.trim(), otp: 'sent' } }).then(() => {
    s.busy = false; s.otpSent = true;
    save(); render();
    toast(isHi() ? 'OTP भेजा गया — डेमो OTP 1234 है' : 'OTP sent to your registered device — demo OTP is 1234');
  });
}

function staffVerifyOtp() {
  const s = STATE.staff;
  if (!s.otpSent) return;
  if (s.otp.length !== 4) { s.error = isHi() ? 'चार अंकों का OTP डालें' : 'Enter the four-digit OTP'; render(); return; }
  s.busy = true; s.error = ''; render();
  api('/api/auth/login', { method: 'POST', body: { abha: 'dr-' + s.id.trim(), otp: s.otp } }).then(r => {
    s.busy = false;
    if (r && r.ok && r.token) {
      s.verified = true; s.otpSent = false; s.otp = '';
      STATE.staffLogin = false;
      logAudit('Staff login verified · ' + s.name);
      save(); render();
      if (STATE.view === 'triage') fetchEmergencies();
      const nm = s.name.trim();
      toast((isHi() ? 'स्वागत है, ' : 'Welcome, ') + (/^dr/i.test(nm) ? nm : 'Dr. ' + nm));
    } else {
      s.error = isHi() ? 'OTP गलत है — डेमो OTP 1234 है' : 'Wrong OTP — the demo OTP is 1234';
      save(); render();
    }
  });
}

function staffLogout() {
  STATE.staff = { name: STATE.staff.name, id: STATE.staff.id, otpSent: false, otp: '', verified: false, busy: false, error: '' };
  STATE.staffLogin = false;
  STATE.view = 'landing';
  logAudit('Staff logout');
  save(); render();
}

function isMidKiosk() {
  if (STATE.view !== 'kiosk') return false;
  if (STATE.step && STATE.step !== 'welcome') return true;
  if (STATE.patient && STATE.patient.name) return true;
  if (STATE.login && (STATE.login.verified || STATE.login.otpSent || STATE.login.mode)) return true;
  return false;
}

function ensureUi() {
  if (!STATE.ui) STATE.ui = { sidebarCollapsed: false, notifyOpen: false, dashQuery: '', stats: { status: 'idle', error: '', health: null, analytics: null, dashboard: null } };
  if (!STATE.ui.stats) STATE.ui.stats = { status: 'idle', error: '', health: null, analytics: null, dashboard: null };
}

/* ---------- Voice AI command assistant (OpenAI → NVIDIA → offline rules) ----------
   Speech → /api/ai/command → whitelisted command array → state actions + TTS.
   The LLM only maps text to commands; it never touches state directly. */
function kioskScreenSnapshot() {
  const screen = {
    view: STATE.view,
    step: STATE.view === 'kiosk' ? STATE.step : STATE.view,
    lang: STATE.lang,
    loginMode: STATE.login.mode || '',
    otpSent: !!(STATE.login && STATE.login.otpSent),
    verified: !!(STATE.login && STATE.login.verified),
    patientName: STATE.patient.name || '',
    missing: []
  };
  if (STATE.step === 'welcome') {
    screen.languages = LANGS.map(l => ({ id: l.id, label: l.english, hi: l.native, en: l.english }));
  }
  if (STATE.step === 'complaint') {
    screen.complaints = COMPLAINTS.map(c => ({ id: c.id, hi: c.hi, en: c.en, label: L(c) }));
  }
  if (STATE.step === 'department') {
    screen.departments = DEPARTMENTS.map(d => ({ id: d.id, hi: d.hi, en: d.en, label: L(d) }));
  }
  if (STATE.step === 'interview') {
    const q = questionList()[STATE.qIndex];
    if (q) screen.question = { key: q.key, text: L(q), multi: !!q.multi, scale: !!q.scale, free: !!q.free, options: (q.options || []).map(o => ({ id: o.id, hi: o.hi, en: o.en, label: L(o) })) };
  }
  if (STATE.step === 'ayush') {
    const q = ayushList()[STATE.ayushIndex];
    if (q) screen.question = { key: q.key, text: L(q), multi: !!q.multi, options: (q.options || []).map(o => ({ id: o.id, hi: o.hi, en: o.en, label: L(o) })) };
  }
  if (STATE.step === 'identity' && STATE.login.mode === 'new') {
    ['name', 'age', 'gender', 'phone'].forEach(k => { if (!STATE.patient[k]) screen.missing.push(k); });
  }
  if (STATE.step === 'demographics') {
    ['name', 'age', 'gender', 'phone'].forEach(k => { if (!STATE.patient[k]) screen.missing.push(k); });
  }
  return screen;
}

function kioskContextForCommand() {
  return {
    currentView: STATE.view === 'kiosk' ? 'kiosk' : STATE.view,
    currentStep: STATE.view === 'kiosk' ? STATE.step : '',
    patientName: STATE.patient.name || '',
    screen: kioskScreenSnapshot()
  };
}

let lastVoiceNextAt = 0;
function collapseRepeatWords(s) {
  return String(s || '').replace(/\b(\S+)(\s+\1){1,}/gi, '$1').replace(/\s+/g, ' ').trim();
}
function isAdvanceFiller(text) {
  const t = collapseRepeatWords(text).toLowerCase().replace(/[.,!?।]/g, '').trim();
  return /^(continue|next|ok|okay|done|aage|आगे|ठीक है|हो गया)(\s+(continue|next|ok|okay|done|aage|आगे))*$/.test(t);
}

function executeAICommands(commands) {
  const results = [];
  const list = (commands || []).slice(0, 8);
  const hasNext = list.some(c => c.action === 'next');
  list.forEach(c => {
    try {
      switch (c.action) {
        case 'setView':
          if (['kiosk', 'doctor', 'triage', 'ayur', 'admin', 'landing', 'dashboard', 'settings'].includes(c.value)) {
            STATE.view = c.value; STATE.openToken = null;
            if (['doctor', 'triage', 'admin'].includes(c.value) && !staffVerified()) STATE.staffLogin = true;
            else STATE.staffLogin = false;
            results.push('view ' + c.value);
          }
          break;
        case 'goStep':
          if (STATE.view === 'kiosk' && KIOSK_STEPS.includes(c.value)) {
            STATE.step = c.value;
            if (c.value === 'consent') lockRequiredConsents();
            results.push('step ' + c.value);
          }
          break;
        case 'setLang':
          if (LANGS.some(l => l.id === c.value)) { STATE.lang = c.value; results.push('lang ' + c.value); }
          break;
        case 'setLoginMode':
          if (['abha', 'aadhaar', 'phone', 'new'].includes(c.value)) {
            STATE.login = { mode: c.value, value: '', otpSent: false, verified: c.value === 'new', history: null, loading: false, error: '' };
            results.push('login ' + c.value);
          }
          break;
        case 'setLoginValue':
          STATE.login.value = String(c.value || '').slice(0, 20);
          results.push('id value');
          break;
        case 'sendOtp':
          loginSendOtp(); results.push('otp sent'); break;
        case 'verifyOtp':
          STATE.otp.value = String(c.value || '1234').replace(/\D/g, '').slice(0, 4);
          loginVerifyOtp(); results.push('otp verify'); break;
        case 'updatePatient':
          if (c.field in STATE.patient && c.value != null) { STATE.patient[c.field] = String(c.value).slice(0, 60); results.push(c.field); }
          break;
        case 'updateVital':
          if (VITAL_KEYS.includes(c.field) && /^\d+(\.\d+)?$/.test(String(c.value))) { STATE.vitals[c.field] = String(c.value); results.push(c.field); }
          break;
        case 'grantConsents':
          lockRequiredConsents();
          STATE.consents.c3 = true; STATE.consents.c4 = true;
          results.push('consent'); break;
        case 'setConsent':
          if (/^c[1-5]$/.test(c.field)) {
            const meta = CONSENTS.find(x => x.id === c.field);
            if (meta && meta.required) { STATE.consents[c.field] = true; }
            else { STATE.consents[c.field] = c.value !== 'false' && c.value !== false; }
            results.push(c.field);
          }
          break;
        case 'pickComplaint':
          if (COMPLAINTS.some(x => x.id === c.value)) {
            STATE.answers = { complaint: c.value }; STATE.qIndex = 0; afterComplaintPicked(); results.push('complaint');
          }
          break;
        case 'answer': {
          const key = c.key, val = c.value;
          const q = questionList()[STATE.qIndex];
          if (q && (!key || q.key === key)) {
            if (q.multi || c.multi) {
              const cur = Array.isArray(STATE.answers[q.key]) ? STATE.answers[q.key].slice() : [];
              if (val === 'none') STATE.answers[q.key] = ['none'];
              else { if (!cur.includes(val)) cur.push(val); STATE.answers[q.key] = cur.filter(x => x !== 'none'); }
              afterAnswer();
            } else {
              STATE.answers[q.key] = q.scale ? Number(val) : val;
              afterAnswer();
              if (!hasNext) {
                if (STATE.voice && STATE.voice.live) goNext();
                else setTimeout(goNext, 160);
              }
            }
            results.push('answer');
          } else if (key) { STATE.answers[key] = val; results.push('answer'); }
          break;
        }
        case 'ayushAnswer': {
          const q = ayushList()[STATE.ayushIndex];
          const key = c.key || (q && q.key);
          if (key) {
            if ((q && q.multi) || c.multi) {
              const cur = Array.isArray(STATE.ayush[key]) ? STATE.ayush[key].slice() : [];
              if (!cur.includes(c.value)) cur.push(c.value);
              STATE.ayush[key] = cur;
            } else {
              STATE.ayush[key] = c.value;
              if (!hasNext) {
                if (STATE.voice && STATE.voice.live) goNext();
                else setTimeout(goNext, 160);
              }
            }
            results.push('ayush');
          }
          break;
        }
        case 'setDept':
          if (DEPARTMENTS.some(d => d.id === c.value)) { STATE.dept = c.value; results.push('dept'); }
          break;
        case 'autoVitals':
          STATE.vitals = { ...DEMO_VITALS }; results.push('vitals'); break;
        case 'next':
          if (STATE.step === 'scan') break;
          if (Date.now() - lastVoiceNextAt < 2600) break;
          lastVoiceNextAt = Date.now();
          goNext(); results.push('next'); break;
        case 'back':
          if (STATE.step === 'scan') break;
          goBack(); results.push('back'); break;
        case 'skip':
          if (STATE.step === 'scan') break;
          handleAction('skip', document.createElement('button')); results.push('skip'); break;
        case 'print': setTimeout(() => window.print(), 400); results.push('print'); break;
        case 'restart': resetSession(); results.push('restart'); break;
        case 'confirm': if (STATE.step === 'review') submitCase(); else goNext(); results.push('confirm'); break;
        case 'openAi': STATE.ai.open = true; results.push('DocBot open'); break;
        case 'closeAi': STATE.ai.open = false; results.push('DocBot closed'); break;
        case 'liveOn':
          STATE.voice.liveUserOff = false;
          STATE.voice.live = true;
          results.push('live on');
          break;
        case 'liveOff':
          if (!explicitLiveOffText(STATE.voice && STATE.voice.last)) break;
          STATE.voice.live = false;
          STATE.voice.liveUserOff = true;
          STATE.voice.listening = false;
          stopVoiceRecognition();
          results.push('live off');
          break;
        case 'speakPrompt': speak(currentPrompt(), scheduleLiveListen, true); results.push('speak'); break;
        case 'staffHelp': toast(isHi() ? 'स्टाफ़ को बुला लिया गया है' : 'A staff member has been called'); results.push('staff called'); break;
        default: break;
      }
    } catch (e) { /* one bad command never breaks the rest */ }
  });
  computeRedFlags(); save(); render();
  return results;
}

let liveListenTimer = null;
let vcRec = null;
let micPermissionPromise = null;
let ttsActive = false;
let ttsSpeakTimer = null;
let micDenied = false;
let lastSrAttempt = 0;
let srAbortIgnore = false;
function explicitLiveOffText(text) {
  const t = String(text || '').toLowerCase();
  return /live\s*off|stop listening|stop live|turn off live|don't listen|do not listen|band karo listening|chup ho\b|\bchup\b|सुनना बंद|चुप|रुक जाओ/.test(t);
}
function ensureKioskLive() {
  if (!STATE.voice || STATE.voice.liveUserOff) return;
  if (STATE.view !== 'kiosk') return;
  STATE.voice.live = true;
}
function isTtsPlaying() {
  if (ttsActive) return true;
  try { return !!(typeof speechSynthesis !== 'undefined' && (speechSynthesis.speaking || speechSynthesis.pending)); }
  catch (e) { return false; }
}
function requestMicOnce() {
  if (!STATE.voice) return Promise.resolve(false);
  if (STATE.voice.micReady) return Promise.resolve(true);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    STATE.voice.micReady = true;
    return Promise.resolve(true);
  }
  if (micPermissionPromise) return micPermissionPromise;
  micPermissionPromise = navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    try { (stream.getTracks() || []).forEach(t => t.stop()); } catch (e) {}
    STATE.voice.micReady = true;
    micDenied = false;
    return true;
  }).catch(() => {
    micPermissionPromise = null;
    return false;
  });
  return micPermissionPromise;
}
function onKioskUserGesture() {
  if (STATE.view !== 'kiosk' || !STATE.voice || STATE.voice.liveUserOff) return;
  STATE.voice.live = true;
  micDenied = false;
  requestMicOnce();
}
function stopVoiceRecognition() {
  const rec = vcRec;
  vcRec = null;
  if (STATE.voice) STATE.voice.listening = false;
  if (!rec) return;
  srAbortIgnore = true;
  try { rec.onend = null; rec.onerror = null; rec.onresult = null; } catch (e) {}
  try { rec.abort(); } catch (e) { try { rec.stop(); } catch (e2) {} }
}
function pauseKioskLiveDock() {
  try { clearTimeout(liveListenTimer); } catch (e) {}
  stopVoiceRecognition();
}
function scheduleLiveListen() {
  if (!STATE.voice || STATE.voice.liveUserOff || STATE.voice.busy || micDenied) return;
  if (STATE.view !== 'kiosk') return;
  STATE.voice.live = true;
  if (isTtsPlaying()) return;
  if (STATE.voice.listening && vcRec) return;
  clearTimeout(liveListenTimer);
  liveListenTimer = setTimeout(() => {
    if (!STATE.voice || STATE.voice.liveUserOff || STATE.voice.busy || micDenied) return;
    if (isTtsPlaying()) return;
    if (STATE.voice.listening && vcRec) return;
    voiceCommandStart(true);
  }, 750);
}

function aiCommand(text) {
  text = collapseRepeatWords(text);
  if (!String(text || '').trim()) { scheduleLiveListen(); return; }
  if (STATE.view === 'kiosk' && STATE.step === 'scan' && isAdvanceFiller(text)) {
    STATE.voice.last = '';
    STATE.voice.reply = '';
    STATE.voice.busy = false;
    scheduleLiveListen();
    return;
  }
  stopVoiceRecognition();
  const keepLive = !STATE.voice.liveUserOff;
  const log = STATE.voice.log || [];
  STATE.voice.listening = false;
  STATE.voice.busy = true;
  STATE.voice.last = text;
  STATE.voice.reply = '';
  STATE.voice.error = '';
  STATE.voice.source = '';
  if (keepLive) STATE.voice.live = true;
  render({ quiet: true });
  api('/api/ai/command', { method: 'POST', body: { transcript: text, ...kioskContextForCommand() }, timeout: 8000 }).then(r => {
    if (r && r.ok && Array.isArray(r.commands)) {
      const wantOff = explicitLiveOffText(text);
      const cmds = wantOff ? r.commands : r.commands.filter(c => c.action !== 'liveOff');
      const done = executeAICommands(cmds);
      STATE.voice.busy = false;
      if (wantOff) {
        STATE.voice.live = false;
        STATE.voice.liveUserOff = true;
      } else if (!STATE.voice.liveUserOff) {
        STATE.voice.live = true;
      }
      let reply = r.voiceResponse || (done.length ? (isHi() ? 'हो गया' : 'Done') : '');
      if (STATE.step === 'scan' && isAdvanceFiller(reply)) reply = '';
      if (STATE.step === 'scan' && !done.length) reply = '';
      STATE.voice.reply = reply;
      STATE.voice.source = r.source || '';
      STATE.voice.log = [{ role: 'user', text: text }, { role: 'ai', text: STATE.voice.reply }].concat(log).slice(0, 8);
      logAudit('Voice command · ' + text.slice(0, 40) + (r.source ? ' · ' + r.source : ''));
      save(); render({ quiet: true });
      const follow = STATE.voice.live ? copilotFollowUp() : '';
      const spoken = [STATE.voice.reply, follow].filter(Boolean).join(' ');
      if (spoken) speak(spoken, scheduleLiveListen);
      else scheduleLiveListen();
      setTimeout(() => { if (STATE.voice && STATE.voice.reply) { STATE.voice.reply = ''; save(); render({ quiet: true }); } }, 7000);
    } else {
      STATE.voice.busy = false;
      if (keepLive) STATE.voice.live = true;
      STATE.voice.error = (r && r.error) || (isHi() ? 'समझ नहीं आया' : 'Could not process that');
      save(); render({ quiet: true });
      scheduleLiveListen();
    }
  });
}

function copilotFollowUp() {
  if (STATE.view !== 'kiosk') return '';
  if (STATE.step === 'welcome') return isHi() ? 'अपनी भाषा बोलिए।' : 'Please say your language.';
  if (STATE.step === 'identity' && !STATE.login.mode) return isHi() ? 'ABHA, आधार, मोबाइल या नया मरीज़ — क्या चुनें?' : 'ABHA, Aadhaar, phone, or new patient?';
  if (STATE.step === 'interview' || STATE.step === 'ayush' || STATE.step === 'complaint') return currentPrompt();
  if (STATE.step === 'consent') return isHi() ? 'सहमति के लिए हाँ बोलिए।' : 'Say yes to give consent.';
  if (STATE.step === 'vitals') return isHi() ? 'बीपी, नब्ज़ या डिवाइस से माप बोलिए।' : 'Say your BP, pulse, or ask me to read the device.';
  return '';
}

function voiceCommandStart(fromLive) {
  if (STATE.view === 'ayur') return;
  if (STATE.voice.busy) return;
  if (fromLive && STATE.voice.liveUserOff) return;
  if (fromLive && micDenied) return;
  if (isTtsPlaying()) return;
  if (fromLive && !STATE.voice.live) {
    if (STATE.voice.liveUserOff) return;
    STATE.voice.live = true;
  }
  if (STATE.voice.listening && vcRec) return;
  const now = Date.now();
  if (fromLive && now - lastSrAttempt < 1400) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (!fromLive) voiceBarShow(isHi() ? 'इस ब्राउज़र में आवाज़ नहीं है — नीचे टाइप करें' : 'Voice not available here — type below');
    return;
  }
  const begin = () => {
    if (STATE.voice.busy) return;
    if (fromLive && (STATE.voice.liveUserOff || micDenied)) return;
    if (STATE.voice.listening && vcRec) return;
    if (isTtsPlaying()) return;
    lastSrAttempt = Date.now();
    srAbortIgnore = false;
    stopVoiceRecognition();
    srAbortIgnore = false;
    try {
      STATE.voice.listening = true; STATE.voice.last = ''; STATE.voice.reply = ''; STATE.voice.error = '';
      const rec = new SR();
      vcRec = rec;
      rec.lang = VOICE_LANG[STATE.lang] || 'en-IN';
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) STATE.voice.last += e.results[i][0].transcript + ' ';
        }
        const input = document.querySelector('.voice-input');
        if (input) input.value = STATE.voice.last;
      };
      rec.onerror = e => {
        if (vcRec !== rec) return;
        STATE.voice.listening = false;
        const err = (e && e.error) || '';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          micDenied = true;
          vcRec = null;
          voiceBarShow(isHi() ? 'माइक की अनुमति दें — आवाज़ पढ़ना चालू रहेगा' : 'Allow the microphone — speaker still works');
          return;
        }
        if (err === 'aborted' || srAbortIgnore || isTtsPlaying()) return;
        if (err === 'no-speech' && STATE.voice.live) { scheduleLiveListen(); return; }
        if (STATE.voice.live) scheduleLiveListen();
      };
      rec.onend = () => {
        if (vcRec !== rec) return;
        vcRec = null;
        const wasListening = STATE.voice.listening;
        STATE.voice.listening = false;
        const txt = String(STATE.voice.last || '').trim();
        if (srAbortIgnore || isTtsPlaying()) return;
        save();
        if (wasListening && txt) aiCommand(txt);
        else if (STATE.voice.live) scheduleLiveListen();
        else render({ quiet: true });
      };
      rec.start();
      render({ quiet: true });
    } catch (e) {
      STATE.voice.listening = false;
      vcRec = null;
      if (!fromLive) voiceBarShow(isHi() ? 'माइक उपलब्ध नहीं — नीचे टाइप करें' : 'Microphone unavailable — type below');
    }
  };
  requestMicOnce().then(() => {
    if (isTtsPlaying()) return;
    begin();
  });
}

function voiceCommandToggle() {
  if (STATE.voice.listening) {
    stopVoiceRecognition();
    return render({ quiet: true });
  }
  micDenied = false;
  if (!STATE.voice.liveUserOff) STATE.voice.live = true;
  voiceCommandStart(false);
}

function voiceLiveToggle() {
  if (STATE.voice.live) {
    STATE.voice.live = false;
    STATE.voice.liveUserOff = true;
    stopVoiceRecognition();
    save();
    render();
    return;
  }
  STATE.voice.liveUserOff = false;
  STATE.voice.live = true;
  micDenied = false;
  save();
  render({ quiet: true });
  requestMicOnce().then(() => {
    speak(isHi() ? 'मैं सुन रही हूँ। स्क्रीन पर जो दिख रहा है, बोलकर भर दीजिए।' : 'I am listening. Speak to fill whatever is on the screen.', () => voiceCommandStart(true));
  });
}

function voiceMuteToggle() {
  if (!STATE.voice.muted) {
    STATE.voice.muted = true;
    ttsActive = false;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    save();
    render();
    return;
  }
  STATE.voice.muted = false;
  lastSpokenKey = '';
  save();
  render({ quiet: true });
  speak(currentPrompt(), scheduleLiveListen, true);
}

function voiceBarShow(msg) {
  STATE.voice.error = msg; STATE.voice.listening = false;
  save(); render({ quiet: true });
  setTimeout(() => { if (STATE.voice && STATE.voice.error === msg) { STATE.voice.error = ''; save(); render({ quiet: true }); } }, 5000);
}

/* ---------- doctor AI assistant (NVIDIA NIM via /api/ai/chat) ---------- */
function aiPatientContext() {
  /* compact structured summary of the patient currently open in the doctor console */
  const p = queueRows().find(r => r.token === (STATE.openToken || STATE.token)) || queueRows()[0];
  if (!p) return '';
  const v = liveVitals();
  const flags = (STATE.redFlags || []).map(f => f.label).join('; ') || 'none';
  const ayush = Object.entries(STATE.ayush).filter(([, val]) => val && (!Array.isArray(val) || val.length))
    .map(([k, val]) => k + ': ' + (Array.isArray(val) ? val.join('/') : val)).join('; ');
  return [
    `Patient: ${p.name}, ${p.age} yrs, ${p.gender}, token ${p.token}, department ${p.dept}, triage ${p.triage}.`,
    `Chief complaint: ${p.complaint}. Language: ${p.lang}.`,
    `Vitals: BP ${v.sys || '?'}/${v.dia || '?'}, pulse ${v.pulse || '?'}, SpO2 ${v.spo2 || '?'}%, temp ${v.temp || '?'}F.`,
    `Red flags: ${flags}.`,
    ayush ? `Ayurvedic assessment: ${ayush}.` : '',
    `History completeness: ${p.complete}%.`
  ].filter(Boolean).join('\n');
}

function lastDocBotText() {
  const msgs = (STATE.ai && STATE.ai.messages) || [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant' && msgs[i].content) {
      return String(msgs[i].content)
        .replace(/[#*_~`>|]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return '';
}

function speakDocBot(force) {
  if (!force && STATE.ai && STATE.ai.muted) return;
  const text = lastDocBotText();
  if (!text) return;
  speak(text, null, 'docbot');
}

function aiMuteToggle() {
  if (!STATE.ai) return;
  STATE.ai.muted = !STATE.ai.muted;
  if (STATE.ai.muted) {
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  }
  save();
  render();
}

function aiSend(text) {
  const A = STATE.ai;
  const q = String(text == null ? A.input : text).trim();
  if (!q || A.sending) return;
  A.input = q;
  A.messages.push({ role: 'user', content: q });
  A.input = ''; A.sending = true; A.error = '';
  save(); render();
  api('/api/ai/chat', {
    method: 'POST',
    body: { messages: [{ role: 'system', content: 'CURRENT PATIENT CONTEXT:\n' + aiPatientContext() }].concat(A.messages.slice(-12)) }
  }).then(r => {
    A.sending = false;
    if (r && r.ok && r.reply) {
      A.messages.push({ role: 'assistant', content: r.reply });
      A.source = r.source || '';
      save(); render();
      if (!A.muted) speakDocBot(false);
    } else {
      A.error = (r && r.error) || (isHi() ? 'DocBot उत्तर नहीं मिला — पुनः प्रयास करें' : 'Could not get a DocBot answer — please try again');
      save(); render();
    }
    const thread = document.getElementById('aiThread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  });
}

function resetSession() {
  STATE.patient = { ...BLANK_PATIENT };
  STATE.vitals = { sys: '', dia: '', pulse: '', spo2: '', temp: '', rr: '', height: '', weight: '' };
  STATE.answers = {}; STATE.ayush = {}; STATE.docs = []; STATE.redFlags = [];
  STATE.consents = { c1: true, c2: true, c3: false, c4: false, c5: false };
  STATE.dept = ''; STATE.qIndex = 0; STATE.ayushIndex = 0; STATE.errors = {};
  STATE.step = 'welcome'; STATE.view = 'kiosk'; STATE.emergencyShown = false; STATE.confirmed = false;
  STATE.sections = {}; STATE.docNote = ''; STATE.openToken = null;
  STATE.otp = { sent: false, value: '', verified: false };
  STATE.login = { mode: '', value: '', otpSent: false, verified: false, history: null, loading: false, error: '' };
  STATE.ocr = { status: 'idle', pct: 0, mode: '', name: '' };
  teardownScan();
  stopPairPoll();
  STATE.scan = { mode: 'idle', stream: null, facing: 'environment', error: '', bt: { status: 'idle', name: '' }, shot: '', loading: false, pair: { open: false } };
  STATE.em = { phase: '', name: '', problem: '', attendant: '', relName: '', relPhone: '', relRelation: '', errors: {}, caseId: '', caseNo: '' };
  STATE.asrText = ''; STATE.sessionId = null; pendingTurns = [];
  STATE.ayur = { session: null, token: null, messages: [], input: '', sending: false, source: '', seeded: false, error: '', sessions: [], profileData: null, autoSpeak: true, sidebar: true, mode: 'native' };
  const n = 18 + Math.floor(Math.random() * 40);
  STATE.token = 'A-' + n;
  save(); render();
}

function loadDemo() {
  STATE.patient = { ...DEMO_PATIENT };
  STATE.vitals = { ...DEMO_VITALS };
  STATE.answers = { ...DEMO_ANSWERS };
  STATE.ayush = { ...DEMO_AYUSH };
  STATE.docs = DEMO_DOCS.slice();
  STATE.consents = { c1: true, c2: true, c3: true, c4: true, c5: false };
  STATE.dept = 'kaya'; STATE.lang = 'hi'; STATE.token = 'A-18';
  computeRedFlags(); save();
}

/* ---------- backend API sync (same-origin REST layer, see server.mjs) ---------- */
let sessionSyncInFlight = false;
let pendingTurns = [];

function api(path, opts = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const ms = opts.timeout || 12000;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
  return fetch(API_BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: ctrl ? ctrl.signal : undefined
  }).then(r => r.json()).catch(() => ({ ok: false, offline: true })).finally(() => { if (timer) clearTimeout(timer); });
}

let persistTimer = null;
let persistInFlight = false;
let persistQueued = false;

function shouldPersistIntake() {
  if (STATE.view === 'kiosk') return true;
  if (STATE.em && STATE.em.phase) return true;
  return false;
}

function kioskIntakePayload() {
  return {
    token: STATE.token,
    lang: STATE.lang,
    step: STATE.step,
    qIndex: STATE.qIndex,
    ayushIndex: STATE.ayushIndex,
    dept: STATE.dept,
    status: STATE.step === 'done' ? 'completed' : 'in_progress',
    patient: Object.assign({}, STATE.patient),
    vitals: Object.assign({}, STATE.vitals),
    answers: Object.assign({}, STATE.answers),
    ayush: Object.assign({}, STATE.ayush),
    consents: Object.assign({}, STATE.consents),
    docs: (STATE.docs || []).map(d => ({
      label: d.label, value: d.value, type: d.type, dateISO: d.dateISO, date: d.date,
      conf: d.conf, numeric: d.numeric, unit: d.unit, lo: d.lo, hi: d.hi, out: d.out, edited: !!d.edited
    })),
    redFlags: (STATE.redFlags || []).map(f => ({ id: f.id, level: f.level, label: f.label, evidence: f.evidence })),
    login: { mode: STATE.login.mode, value: STATE.login.value, verified: !!(STATE.login && STATE.login.verified) },
    em: STATE.em && STATE.em.phase ? {
      phase: STATE.em.phase, name: STATE.em.name, problem: STATE.em.problem,
      attendant: STATE.em.attendant, relName: STATE.em.relName, relPhone: STATE.em.relPhone,
      relRelation: STATE.em.relRelation, caseId: STATE.em.caseId, caseNo: STATE.em.caseNo
    } : null
  };
}

function schedulePersistIntake(immediate) {
  if (!shouldPersistIntake()) return;
  clearTimeout(persistTimer);
  if (immediate) persistIntakeNow();
  else persistTimer = setTimeout(persistIntakeNow, 400);
}

function persistIntakeNow() {
  if (!shouldPersistIntake()) return;
  if (persistInFlight) { persistQueued = true; return; }
  persistInFlight = true;
  const body = kioskIntakePayload();
  waitForSession().then(sid => api('/api/session/' + encodeURIComponent(sid), { method: 'PATCH', body, timeout: 8000 })).then(r => {
    persistInFlight = false;
    if (r && r.ok) upsertPatientRecord(false);
    if (persistQueued) { persistQueued = false; persistIntakeNow(); }
  }).catch(() => { persistInFlight = false; });
}

function upsertPatientRecord(addVisit) {
  const p = STATE.patient || {};
  const id = String(p.abha || '').trim() || String(p.aadhaar || '').trim() || String(p.phone || '').replace(/\D/g, '');
  if (!id) return;
  const v = (typeof liveVitals === 'function') ? liveVitals() : STATE.vitals;
  api('/api/patients/upsert', {
    method: 'POST',
    body: {
      abha: p.abha || '', aadhaar: p.aadhaar || '', phone: p.phone || '',
      name: p.name, age: p.age, dob: p.dob, gender: p.gender, blood: p.blood, marital: p.marital,
      occupation: p.occupation, education: p.education, phoneContact: p.phone,
      address: p.address, city: p.city, state: p.state, pincode: p.pincode, area: p.area,
      emgName: p.emgName, emgRelation: p.emgRelation, emgPhone: p.emgPhone,
      dept: currentDept() ? L(currentDept()) : '', complaint: complaintName(),
      bp: v.sys && v.dia ? v.sys + '/' + v.dia : '', pulse: v.pulse || '',
      sessionId: STATE.sessionId || '',
      addVisit: !!addVisit
    }
  });
}

function pingApi() {
  api('/api/health', { timeout: 4000 }).then(r => {
    STATE.api = { ok: !!(r && r.ok), nvidia: !!(r && r.nvidia), openai: !!(r && r.openai), openrouter: !!(r && r.openrouter) };
    render({ quiet: true });
  });
}

function flushTurns() {
  while (pendingTurns.length) postTurn(pendingTurns.shift());
}

function startSession() {
  return api('/api/session/start', {
    method: 'POST',
    body: kioskIntakePayload()
  });
}

function ensureSession(turn) {
  if (turn) pendingTurns.push(turn);
  waitForSession().catch(() => {});
}

function waitForSession() {
  if (STATE.sessionId) { flushTurns(); return Promise.resolve(STATE.sessionId); }
  if (sessionSyncInFlight) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      const tick = () => {
        if (STATE.sessionId) { flushTurns(); resolve(STATE.sessionId); return; }
        if (!sessionSyncInFlight && !STATE.sessionId) { reject(new Error('session failed')); return; }
        if (Date.now() - t0 > 12000) { reject(new Error('session timeout')); return; }
        setTimeout(tick, 80);
      };
      tick();
    });
  }
  sessionSyncInFlight = true;
  return startSession().then(r => {
    sessionSyncInFlight = false;
    if (r.ok && r.sessionId) { STATE.sessionId = r.sessionId; save({ localOnly: true }); flushTurns(); return STATE.sessionId; }
    throw new Error((r && r.error) || 'session failed');
  }).catch(err => {
    sessionSyncInFlight = false;
    throw err;
  });
}

function postTurn(turn) {
  if (!STATE.sessionId) return;
  api('/api/conversation/turn', { method: 'POST', body: { sessionId: STATE.sessionId, question: turn.question, answer: turn.answer } });
}

function syncTurn() {
  if (STATE.step !== 'interview' && STATE.step !== 'complaint') return;
  if (STATE.step === 'complaint') {
    ensureSession({ question: 'Chief complaint', answer: complaintName() });
    return;
  }
  const q = questionList()[STATE.qIndex];
  const val = STATE.answers[q.key];
  if (q && val !== undefined && val !== '') ensureSession({ question: L(q), answer: String(val) });
}

function syncSession() {
  const pushSummary = sid => api('/api/summary/generate', {
    method: 'POST',
    body: { sessionId: sid, chiefComplaint: narrative(), sections: buildSummary() }
  }).then(s => {
    if (s.ok) api('/api/fhir/push', { method: 'POST', body: { sessionId: sid, bundle: fhirBundle() } });
  });
  if (STATE.sessionId) { pushSummary(STATE.sessionId); return; } /* session already created by ensureSession */
  startSession().then(r => {
    if (!r.ok) return;
    STATE.sessionId = r.sessionId; save();
    pushSummary(r.sessionId);
  });
}

function fetchAnalytics() {
  api('/api/admin/analytics').then(r => {
    if (r.ok && r.analytics) {
      STATE.analytics = r.analytics;
      if (STATE.view === 'admin') render({ quiet: true });
    }
  });
}

function fetchEmergencies() {
  api('/api/emergency').then(r => {
    if (r && r.ok && Array.isArray(r.cases)) {
      STATE.emCases = r.cases;
      save();
      if (STATE.view === 'triage') render({ quiet: true });
    }
  });
}

function ensureEm() {
  if (!STATE.em) STATE.em = { phase: '', name: '', problem: '', attendant: '', relName: '', relPhone: '', relRelation: '', errors: {}, caseId: '', caseNo: '' };
  return STATE.em;
}

function emOpen() {
  const E = ensureEm();
  E.phase = 'start';
  E.errors = {};
  if (!E.name) E.name = STATE.patient.name || '';
  STATE.view = 'kiosk';
  save(); render();
}

function emBegin() {
  const E = ensureEm();
  E.phase = 'form';
  E.errors = {};
  if (!E.name) E.name = STATE.patient.name || '';
  save(); render();
}

function emClose() {
  STATE.em = { phase: '', name: '', problem: '', attendant: '', relName: '', relPhone: '', relRelation: '', errors: {}, caseId: '', caseNo: '' };
  STATE.view = 'kiosk';
  save(); render();
}

function validateEm() {
  const E = ensureEm();
  const err = {};
  const need = (k, ok, msg) => { if (!ok) err[k] = msg; };
  need('emName', String(E.name || '').trim(), isHi() ? 'नाम ज़रूरी है' : 'Name is required');
  need('emProblem', String(E.problem || '').trim(), isHi() ? 'समस्या लिखिए' : 'Describe the problem');
  need('attendant', E.attendant === 'yes' || E.attendant === 'no', isHi() ? 'हाँ या नहीं चुनिए' : 'Choose yes or no');
  if (E.attendant === 'yes') {
    need('emRelName', String(E.relName || '').trim(), isHi() ? 'रिश्तेदार का नाम ज़रूरी है' : "Relative's name is required");
    need('emRelPhone', /^\d{10}$/.test(String(E.relPhone || '').replace(/\D/g, '')), isHi() ? '10 अंकों का नंबर लिखिए' : 'Enter a 10-digit contact number');
    need('emRelRelation', String(E.relRelation || '').trim(), isHi() ? 'रिश्ता चुनिए' : 'Select relationship');
  }
  E.errors = err;
  STATE.errors = err;
  return Object.keys(err).length === 0;
}

function emContinue() {
  if (!validateEm()) { save(); render(); toast(isHi() ? 'ज़रूरी जानकारी भरिए' : 'Please complete the required fields'); return; }
  STATE.em.phase = 'ready';
  save(); render();
}

function emSend() {
  if (!validateEm()) { STATE.em.phase = 'form'; save(); render(); return; }
  const E = STATE.em;
  const payload = {
    name: String(E.name).trim(),
    problem: String(E.problem).trim(),
    attendant: E.attendant,
    relName: E.attendant === 'yes' ? String(E.relName).trim() : '',
    relPhone: E.attendant === 'yes' ? String(E.relPhone).replace(/\D/g, '').slice(0, 10) : '',
    relRelation: E.attendant === 'yes' ? E.relRelation : '',
    phone: STATE.patient.phone || '',
    lang: STATE.lang,
    destination: 'triage'
  };
  api('/api/emergency', { method: 'POST', body: payload }).then(r => {
    let rec = r && r.case;
    if (!rec) {
      rec = Object.assign({ id: 'em-local-' + Date.now(), caseNo: 1042, status: 'awaiting', destination: 'triage', at: new Date().toISOString() }, payload, { attendant: payload.attendant === 'yes' });
    }
    STATE.emCases = [rec].concat((STATE.emCases || []).filter(c => c.id !== rec.id));
    E.phase = 'sent';
    E.caseId = rec.id;
    E.caseNo = rec.caseNo;
    logAudit('Emergency intake sent to triage desk · #' + rec.caseNo);
    save(); render();
    toast(isHi() ? 'ट्रायज डेस्क पर भेज दिया गया' : 'Sent to triage desk');
  });
}

function emPatchCase(id, status) {
  const rec = (STATE.emCases || []).find(c => c.id === id);
  if (!rec) return;
  rec.status = status;
  save(); render();
  api('/api/emergency/' + encodeURIComponent(id), { method: 'PATCH', body: { status } }).then(r => {
    if (r && r.ok && r.case) {
      STATE.emCases = (STATE.emCases || []).map(c => c.id === id ? r.case : c);
      save(); render({ quiet: true });
    }
  });
  toast(status === 'accepted' ? (isHi() ? 'केस स्वीकार' : 'Case accepted') : (isHi() ? 'केस खोला गया' : 'Case opened'));
}

function emCallPatient(id) {
  const rec = (STATE.emCases || []).find(c => c.id === id);
  const phone = rec && (rec.relPhone || rec.phone);
  logAudit('Triage called emergency case · ' + (rec && rec.caseNo || id));
  if (phone) {
    toast((isHi() ? 'कॉल: ' : 'Calling ') + phone);
    try { window.location.href = 'tel:' + String(phone).replace(/\D/g, ''); } catch (e) {}
  } else toast(isHi() ? 'नंबर उपलब्ध नहीं' : 'No phone number on this case');
}

function fetchLiveStats() {
  ensureUi();
  STATE.ui.stats.status = 'loading';
  STATE.ui.stats.error = '';
  if (STATE.view === 'landing' || STATE.view === 'dashboard' || STATE.view === 'settings') render({ quiet: true });
  Promise.all([
    api('/api/health', { timeout: 5000 }),
    api('/api/admin/analytics', { timeout: 8000 }),
    api('/api/dashboard', { timeout: 8000 })
  ]).then(([health, analytics, dash]) => {
    const healthOk = !!(health && health.ok);
    STATE.api = { ok: healthOk, nvidia: !!(health && health.nvidia), openai: !!(health && health.openai), openrouter: !!(health && health.openrouter) };
    if (analytics && analytics.ok && analytics.analytics) STATE.analytics = analytics.analytics;
    const live = (dash && dash.ok) ? dash : (analytics && analytics.live);
    if (!healthOk && !(dash && dash.ok)) {
      STATE.ui.stats = {
        status: 'error',
        error: isHi() ? 'लाइव आँकड़े नहीं मिले। सर्वर चलाएँ: npm run dev' : 'Live stats unavailable. Start the API with npm run dev.',
        health: null, analytics: null, dashboard: null
      };
    } else {
      STATE.ui.stats = {
        status: 'ok', error: '',
        health: health || null,
        analytics: (analytics && analytics.analytics) || null,
        dashboard: live || { patientsServed: health && health.sessions, sessions: health && health.sessions, sessionsToday: null }
      };
    }
    render({ quiet: true });
  });
}

/* ---------- Ayurveda AI — NirogaVerse bridge ----------
   Talks to the NirogaVerse Express API (auth → JWT → /api/niro sessions and
   messages) through the same-origin /api/niro proxy in server.mjs. When the
   NirogaVerse server is offline, the proxy answers with a deterministic
   local Ayurvedic assessment so the kiosk flow still works. */
const NIRO_CREDS = { email: 'kiosk@aiia.gov.in', password: 'Kiosk@123' }; /* kiosk service account — replace with device provisioning in production */
/* NirogaVerse language ids */

function niroUnreachable(r) { return r.status === 0 || r.status === 502; }

/* NirogaVerse language ids */
const LANG_TO_NIRO = { hi: 'HINDI', en: 'ENGLISH', mr: 'HINDI', bn: 'ENGLISH', ta: 'ENGLISH', te: 'ENGLISH' };

function niroApi(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (STATE.ayur.token) headers.Authorization = 'Bearer ' + STATE.ayur.token;
  return fetch(API_BASE + '/api/niro' + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
    .then(r => r.json().catch(() => ({})).then(d => ({ status: r.status, ok: r.ok, data: d })))
    .catch(() => ({ status: 0, ok: false, data: {} })); /* network-level failure → treated as offline */
}

function niroReset(msg) {
  STATE.ayur.session = null;
  STATE.ayur.token = null;
  STATE.ayur.messages = [];
  STATE.ayur.sending = false;
  STATE.ayur.seeded = false;
  STATE.ayur.error = msg || '';
  STATE.ayur.source = '';
}

function niroLogin() {
  const creds = NIRO_CREDS;
  return niroApi('/auth/login', { method: 'POST', body: creds }).then(r => {
    if (r.ok && r.data && (r.data.token || r.data.access_token)) {
      STATE.ayur.token = r.data.token || r.data.access_token;
      return true;
    }
    if (r.status === 401 || (r.data && /invalid email or password/i.test(r.data.error || ''))) {
      /* first run on a fresh NirogaVerse DB — self-register the kiosk account */
      return niroApi('/auth/register', { method: 'POST', body: creds }).then(rr => {
        if (rr.ok && rr.data && rr.data.token) { STATE.ayur.token = rr.data.token; return true; }
        STATE.ayur.error = isHi() ? 'NirogaVerse खाता नहीं बन सका — कृपया बाद में पुनः प्रयास करें' : 'Could not register the kiosk account on NirogaVerse — please try again later';
        return false;
      });
    }
    if (niroUnreachable(r)) { STATE.ayur.error = 'offline'; return false; }
    STATE.ayur.error = isHi() ? 'NirogaVerse लॉगिन विफल — कृपया बाद में पुनः प्रयास करें' : 'NirogaVerse login failed — please try again later';
    return false;
  });
}

function niroCreateSession() {
  return niroApi('/niro/sessions', {
    method: 'POST',
    body: { module: 'AYURVAANI', language: LANG_TO_NIRO[STATE.lang] || 'ENGLISH' }
  }).then(r => {
    if (r.ok && r.data && r.data.session && r.data.session.id) {
      STATE.ayur.session = r.data.session.id;
      STATE.ayur.messages = [];
      STATE.ayur.profileData = null;
      STATE.ayur.error = '';
      niroLoadSessions();
      return true;
    }
    if (niroUnreachable(r)) { STATE.ayur.error = 'offline'; return false; }
    STATE.ayur.error = isHi() ? 'NirogaVerse से कनेक्ट नहीं हो सका — कृपया बाद में पुनः प्रयास करें' : 'Could not reach NirogaVerse — please try again later';
    return false;
  });
}

/* session sidebar data (port of NirogaverseChat session list) */
function niroLoadSessions() {
  const grab = () => niroApi('/niro/sessions?module=AYURVAANI').then(r => {
    if (r.ok && r.data && Array.isArray(r.data.sessions)) {
      STATE.ayur.sessions = r.data.sessions;
      save();
      if (STATE.view === 'ayur') render();
    }
  });
  if (STATE.ayur.token) return grab();
  return niroLogin().then(ok => (ok ? grab() : undefined)); /* avoid 401 storms */
}

function niroLoadSession(id) {
  STATE.ayur.sending = true; render();
  return niroApi('/niro/sessions/' + id).then(r => {
    STATE.ayur.sending = false;
    if (r.ok && r.data && r.data.session) {
      STATE.ayur.session = id;
      STATE.ayur.messages = (r.data.session.messages || []).map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }));
      STATE.ayur.profileData = (r.data.session.context && r.data.session.context.profileData) || null;
      STATE.ayur.error = '';
      STATE.ayur.source = 'NirogaVerse AI';
    } else {
      STATE.ayur.error = isHi() ? 'सेशन लोड नहीं हुआ' : 'Failed to load session';
    }
    save(); render();
  });
}

function niroDeleteSession(id) {
  niroApi('/niro/sessions/' + id, { method: 'DELETE' }).then(() => {
    if (STATE.ayur.session === id) { STATE.ayur.session = null; STATE.ayur.messages = []; STATE.ayur.profileData = null; }
    niroLoadSessions();
    save(); render();
  });
}

function niroPush(text) {
  STATE.ayur.sending = true; render();
  return niroApi('/niro/message', { method: 'POST', body: { sessionId: STATE.ayur.session, message: text } }).then(r => {
    STATE.ayur.sending = false;
    if (r.ok && r.data && r.data.message && r.data.message.content) {
      const m = { role: 'ASSISTANT', content: r.data.message.content, id: r.data.message.id || ('a-' + Date.now()) };
      STATE.ayur.messages.push(m);
      STATE.ayur.source = 'NirogaVerse AI';
      STATE.ayur.error = '';
      logAudit('AyurVaani consultation (NirogaVerse AI)');
      if (STATE.ayur.autoSpeak) ayurSpeakText(m.content);
      /* profile wizard context (name/age/weight/…) lives in session.context */
      niroApi('/niro/sessions/' + STATE.ayur.session).then(rr => {
        if (rr.ok && rr.data && rr.data.session) {
          const ctx = rr.data.session.context || {};
          const prof = ctx.profileData || null;
          if (JSON.stringify(prof) !== JSON.stringify(STATE.ayur.profileData)) { STATE.ayur.profileData = prof; save(); if (STATE.view === 'ayur') render(); }
        }
      });
      niroLoadSessions();
    } else if (niroUnreachable(r)) {
      STATE.ayur.session = null;
      STATE.ayur.error = 'offline';
      niroLocalFallback();
      return;
    } else {
      STATE.ayur.error = r.data && r.data.error ? r.data.error : (isHi() ? 'उत्तर नहीं मिला — कृपया पुनः प्रयास करें' : 'No response — please try again');
    }
    save(); render();
  });
}

/* NirogaVerse unreachable → deterministic local Ayurvedic assessment via
   the /api/niro/bridge endpoint in server.mjs, so the kiosk never stalls. */
function ayurLocalMessage() {
  const p = STATE.patient, a = STATE.ayush, v = STATE.vitals;
  const prakriti = a.prakriti ? labelOf(ayushDef('prakriti').options, a.prakriti) : '';
  const agni = a.agni ? labelOf(ayushDef('agni').options, a.agni) : '';
  const koshtha = a.koshtha ? labelOf(ayushDef('koshtha').options, a.koshtha) : '';
  const DIET = {
    vata: 'Warm, moist, grounding meals at regular times; sesame-oil self-massage.',
    pitta: 'Cooling foods — cucumber, coconut water, ghee; avoid spicy, fermented and sour items.',
    kapha: 'Light, warm, dry food; honey with warm water; reduce dairy, sugar and fried items.',
    '': 'Fresh seasonal food, warm water through the day, eat to two-thirds capacity.'
  };
  const diet = DIET[String(prakriti).toLowerCase()] || DIET[''];
  const bits = [
    'AYURVEDIC ASSESSMENT (offline mode — NirogaVerse AI unreachable)',
    `Patient: ${p.name || 'Unknown'} · ${p.age || '?'} yrs · ${genderLabelEn(p.gender) || '-'} · ${complaintName()}`
  ];
  if (prakriti) bits.push(`Prakriti (constitution): ${prakriti}`);
  if (agni) bits.push(`Agni (digestion): ${agni}`);
  if (koshtha) bits.push(`Koshtha (bowel): ${koshtha}`);
  if (v.sys && v.dia) bits.push(`Vitals: BP ${v.sys}/${v.dia}${v.pulse ? `, pulse ${v.pulse}/min` : ''}`);
  bits.push(`Diet (pathya): ${diet}`);
  bits.push('Dinacharya: sleep by 10 pm, wake before sunrise, 30 min walk; avoid day-sleep.');
  bits.push('Note: structured guidance only — a Vaidya must confirm before any treatment.');
  return bits.map(b => '• ' + b).join('\n');
}

function niroLocalFallback() {
  STATE.ayur.sending = true; render();
  api('/api/niro/bridge', {
    method: 'POST',
    body: { patient: STATE.patient, ayush: STATE.ayush, vitals: STATE.vitals, niroSessionId: STATE.ayur.session }
  }).then(r => {
    STATE.ayur.sending = false;
    if (r.ok && r.message) {
      STATE.ayur.messages.push({ role: 'ASSISTANT', content: r.message, id: 'a-' + Date.now() });
      logAudit('AyurVaani offline guidance (server rules)');
    } else {
      STATE.ayur.messages.push({ role: 'ASSISTANT', content: ayurLocalMessage(), id: 'a-' + Date.now() });
      logAudit('AyurVaani offline guidance (client rules)');
    }
    STATE.ayur.source = 'local-rules';
    STATE.ayur.error = '';
    save(); render();
  });
}

function niroSend(text) {
  const msg = String(text || '').trim();
  if (!msg || STATE.ayur.sending) return;
  STATE.ayur.error = '';
  STATE.ayur.messages.push({ role: 'USER', content: msg, id: 'u-' + Date.now() });
  STATE.ayur.input = '';
  save();
  const chain = STATE.ayur.token
    ? (STATE.ayur.session ? Promise.resolve(true) : niroCreateSession())
    : niroLogin().then(ok => (ok ? niroCreateSession() : false));
  chain.then(ok => (ok ? niroPush(msg) : niroLocalFallback()));
}

/* TTS port from NirogaverseChat: speaks the Hindi section (after ---) of the
   reply, slowed for elderly patients. */
function ayurSpeakText(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const parts = String(text || '').split('---');
    const target = parts.length > 1 ? parts[parts.length - 1] : text;
    const clean = target.replace(/[#*_~`>|]/g, '').replace(/\[.*?\]/g, '').replace(/\n{2,}/g, '. ').replace(/\n/g, '. ').replace(/\s+/g, ' ').trim().slice(0, 1200);
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'hi-IN';
    const age = Number(STATE.ayur.profileData && STATE.ayur.profileData.age) || Number(STATE.patient.age) || 40;
    u.rate = age >= 60 ? 0.8 : 0.95;
    const voices = speechSynthesis.getVoices();
    const v = voices.find(x => x.lang.startsWith('hi') && x.lang.includes('IN')) || voices.find(x => x.lang.startsWith('hi'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}

/* iframe watcher: the NirogaVerse Vite app can take several seconds on a cold
   start — only fall back to the built-in chat if it truly never loads. */
function ayurWatchFrame() {
  const frame = document.getElementById('ayurFrame');
  if (!frame) return;
}

function niroSpeakLast() {
  const last = STATE.ayur.messages[STATE.ayur.messages.length - 1];
  if (last && last.role === 'ASSISTANT') ayurSpeakText(last.content);
  else speak(currentPrompt());
}

/* ---------- AyurVaani report → PDF (jsPDF, mirrors NirogaVerse layout) ---------- */
function ayurReportReady() {
  return STATE.ayur.messages.some(m => m.role === 'ASSISTANT' && m.content.includes('AyurVedic Consultant Report'));
}

function ayurDownloadPdf() {
  const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!JsPDF) { toast(isHi() ? 'PDF लाइब्रेरी लोड नहीं हुई' : 'PDF library not loaded'); return; }
  const msg = STATE.ayur.messages.find(m => m.role === 'ASSISTANT' && m.content.includes('AyurVedic Consultant Report'));
  if (!msg) return;
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 18;

  const checkPage = needed => { if (y + needed > ph - 20) { doc.addPage(); y = 18; } };

  /* grid table with text wrapping */
  const drawGrid = (headers, rows, colW, sx) => {
    const tw = colW.reduce((a, b) => a + b, 0);
    checkPage(12);
    doc.setFillColor(11, 107, 58); doc.rect(sx, y, tw, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    let cx = sx;
    headers.forEach((h, i) => { doc.text(h, cx + 2, y + 5.5); cx += colW[i]; });
    y += 8;
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const tableStartY = y - 8;
    rows.forEach((row, ri) => {
      let maxLines = 1;
      const cellLines = [];
      row.forEach((cell, ci) => {
        const lines = doc.splitTextToSize(String(cell || '-'), colW[ci] - 4);
        cellLines.push(lines);
        if (lines.length > maxLines) maxLines = lines.length;
      });
      const rh = Math.max(8, maxLines * 4 + 4);
      checkPage(rh + 2);
      if (ri % 2 === 0) { doc.setFillColor(245, 250, 247); doc.rect(sx, y, tw, rh, 'F'); }
      cx = sx;
      cellLines.forEach((lines, ci) => {
        let ly = y + 5.5;
        for (const line of lines) { doc.text(line, cx + 2, ly); ly += 4.5; }
        cx += colW[ci];
      });
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
      doc.line(sx, y + rh, sx + tw, y + rh);
      y += rh;
    });
    doc.setDrawColor(11, 107, 58); doc.setLineWidth(0.4);
    doc.rect(sx, tableStartY, tw, y - tableStartY);
    y += 5;
  };

  /* patient details 4-col grid */
  const drawPatientDetails = data => {
    const rh = 9;
    const cw = [30, (pw - 28 - 60) / 2, 30, (pw - 28 - 60) / 2];
    const sx = 14;
    data.forEach(row => {
      checkPage(rh + 2);
      let cx = sx;
      row.forEach((cell, ci) => {
        if (ci === 0 || ci === 2) {
          doc.setFillColor(237, 247, 240); doc.rect(cx, y, cw[ci], rh, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        } else { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); }
        doc.setTextColor(0, 0, 0);
        doc.text(String(cell || '-'), cx + 3, y + 6.5);
        cx += cw[ci];
      });
      doc.setDrawColor(37, 109, 133); doc.setLineWidth(0.25);
      cx = sx;
      for (let i = 0; i <= 4; i++) {
        const lx = i < 4 ? cx : sx + cw.reduce((a, b) => a + b, 0);
        doc.line(lx, y, lx, y + rh);
        if (i < 4) cx += cw[i];
      }
      const totalW = cw.reduce((a, b) => a + b, 0);
      doc.line(sx, y + rh, sx + totalW, y + rh);
      doc.line(sx, y, sx + totalW, y);
      y += rh;
    });
    y += 6;
  };

  /* ── header band ── */
  doc.setFillColor(11, 107, 58); doc.rect(0, 0, pw, 38, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('AyurVedic Consultant Report', pw / 2, 14, { align: 'center' });
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Generated by NirogaVerse · AarogyaVaani MediKiosk', pw / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Intelligent Ayurveda for Personalized Well-Being', pw / 2, 28, { align: 'center' });
  doc.setDrawColor(37, 109, 133); doc.setLineWidth(0.5); doc.line(14, 35, pw - 14, 35);
  y = 46; doc.setTextColor(0, 0, 0);

  /* ── patient details ── */
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 107, 58);
  doc.text('Patient Details', 14, y); y += 5;
  const p = STATE.patient;
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  drawPatientDetails([
    ['Name', p.name || '-', 'Age', String(p.age || '-')],
    ['Gender', genderLabelEn(p.gender) || '-', 'Weight', STATE.vitals.weight ? STATE.vitals.weight + ' kg' : '-'],
    ['Mobile', p.phone || '-', 'Date', now]
  ]);

  /* ── parse AI markdown sections ── */
  const text = msg.content;
  const parseSection = header => {
    const heading = l => l.replace(/^#+\s*/, '').trim().toLowerCase();
    const lines = text.split('\n');
    const start = lines.findIndex(l => heading(l).startsWith(header.toLowerCase()));
    if (start < 0) return '';
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) { if (/^###/.test(lines[i])) { end = i; break; } }
    return lines.slice(start + 1, end).join('\n').trim();
  };
  const cleanBullets = t => String(t || '').split('\n').map(l => l.replace(/^[-\u2022*]\s*/, '').trim()).filter(l => l.length > 0 && !l.startsWith('|'));
  const addTitle = title => {
    checkPage(18);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 109, 133);
    doc.text(title, 14, y); y += 7;
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  };
  const addPara = t => {
    if (!t) return;
    const clean = String(t).replace(/[#*_~`>|\u2014]/g, '').replace(/\[.*?\]/g, '').trim();
    if (!clean) return;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(clean, pw - 28);
    for (const line of lines) { checkPage(7); doc.text(line, 14, y); y += 6; }
    y += 3;
  };
  const addBullets = items => {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    items.forEach(item => {
      const lines = doc.splitTextToSize('\u2022 ' + item, pw - 34);
      for (const line of lines) { checkPage(6); doc.text(line, 18, y); y += 6; }
    });
    y += 3;
  };

  /* previous visit table */
  const prevSection = parseSection('Previous Visit (Most Recent)');
  const prevLines = prevSection.split('\n').filter(l => l.includes('|') && !l.includes('---'));
  if (prevLines.length > 1) {
    addTitle('Previous Visit (Most Recent)');
    drawGrid(['Problem', 'Date'], prevLines.slice(1).map(l => l.split('|').map(c => c.trim()).filter(c => c)), [pw - 28 - 40, 40], 14);
  }

  addTitle('Main Problem');
  addPara(parseSection('Main Problem') || p.problem || narrative() || '-');

  addTitle('Diagnosis (Ayurvedic View)');
  addPara(parseSection('Diagnosis (Ayurvedic View)'));

  addTitle('Gharelu Upchar (Home Remedies)');
  const gh = cleanBullets(parseSection('Gharelu Upchar (Home Remedies)'));
  addBullets(gh.length ? gh : cleanBullets(parseSection('Gharelu Upchar')));

  /* medications table */
  const medsLines = parseSection('Charaka Samhita').split('\n').filter(l => l.includes('|') && !l.includes('---'));
  if (medsLines.length > 1) {
    addTitle('Charaka Samhita\u2013Guided Medications');
    drawGrid(['Medicine', 'Dose', 'Frequency', 'Duration', 'Notes'],
      medsLines.slice(1).map(l => l.split('|').map(c => c.trim()).filter(c => c)),
      [45, 25, 30, 30, pw - 28 - 130], 14);
  }

  addTitle('Dietary Advice');
  addBullets(cleanBullets(parseSection('Dietary Advice')));

  addTitle('Lifestyle Advice');
  addBullets(cleanBullets(parseSection('Lifestyle Advice')));

  addTitle('Precautions / When to Seek Help');
  addBullets(cleanBullets(parseSection('Precautions')));

  addTitle('Follow-up');
  addPara(parseSection('Follow-up'));

  /* ── footer disclaimer ── */
  checkPage(20); y += 5;
  doc.setDrawColor(11, 107, 58); doc.setLineWidth(0.5); doc.line(14, y, pw - 14, y); y += 6;
  doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'italic');
  const disc = 'Disclaimer: This is AI-generated feedback, not a substitute for in-person medical care. If symptoms are severe or persist, consult a registered physician immediately.';
  for (const line of doc.splitTextToSize(disc, pw - 28)) { doc.text(line, 14, y); y += 5; }

  const safeName = String(p.name || 'patient').replace(/\s+/g, '_').toLowerCase();
  const ds = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save('prescription_' + safeName + '_' + ds + '.pdf');
  logAudit('AyurVaani prescription PDF downloaded');
  save(); render();
}

/* One-tap handoff: kiosk intake → AyurVaani consultation. Composes the full
   structured history (complaint, vitals, AYUSH exam, docs) as the opening
   message so the AI consult starts with complete context. */
function ayurSeedMessage() {
  const p = STATE.patient, v = STATE.vitals, a = STATE.ayush;
  const vitalsBits = [
    v.sys && v.dia ? `BP ${v.sys}/${v.dia} mmHg` : '',
    v.pulse ? `pulse ${v.pulse}/min` : '',
    v.spo2 ? `SpO2 ${v.spo2}%` : '',
    v.temp ? `temp ${v.temp}°F` : '',
    v.weight ? `weight ${v.weight} kg` : ''
  ].filter(Boolean).join(', ');
  const prakriti = a.prakriti ? labelOf(ayushDef('prakriti').options, a.prakriti) : '';
  const lines = [
    (isHi() ? 'मरीज़ का विवरण:' : 'Patient summary:'),
    `${isHi() ? 'नाम' : 'Name'}: ${p.name || '-'} · ${isHi() ? 'उम्र' : 'Age'}: ${p.age || '-'} · ${isHi() ? 'लिंग' : 'Gender'}: ${genderLabelEn(p.gender) || '-'}`,
    (isHi() ? `मुख्य शिकायत: ${narrative() || complaintName()}` : `Chief complaint: ${narrative() || complaintName()}`),
    vitalsBits ? `${isHi() ? 'वाइटल्स' : 'Vitals'}: ${vitalsBits}` : '',
    prakriti ? `Prakriti: ${prakriti}${a.agni ? ` · Agni: ${labelOf(ayushDef('agni').options, a.agni)}` : ''}${a.koshtha ? ` · Koshtha: ${labelOf(ayushDef('koshtha').options, a.koshtha)}` : ''}` : (a.agni || a.koshtha ? `Agni: ${a.agni || '-'} · Koshtha: ${a.koshtha || '-'}` : ''),
    (isHi() ? 'कृपया आयुर्वेदिक सलाह दें — घरेलू उपचार, आहार और दिनचर्या।' : 'Please give Ayurvedic guidance — home remedies, diet (pathya) and daily routine (dinacharya).')
  ];
  return lines.filter(Boolean).join('\n');
}

function ayurHandoff() {
  STATE.view = 'ayur';
  logAudit('AyurVaani consult started from kiosk intake');
  save(); render();
  if (!STATE.ayur.messages.length) {
    const seed = ayurSeedMessage();
    if (seed && STATE.answers.complaint) niroSend(seed);
  }
}

/* ---------- Ayurveda AI — voice input ---------- */
let ayurRecognition = null;
let ayurListening = false;
function ayurMicActive() { return ayurListening; }

function ayurMicToggle() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) { toast(isHi() ? 'इस ब्राउज़र में आवाज़ नहीं चलेगी — कृपया टाइप करें' : 'Voice not supported in this browser — please type'); return; }
  if (ayurListening) { try { ayurRecognition.stop(); } catch (e) {} return; }
  ayurRecognition = new Ctor();
  ayurRecognition.lang = STATE.lang === 'hi' ? 'hi-IN' : 'en-IN';
  ayurRecognition.interimResults = true;
  ayurRecognition.continuous = false;
  ayurRecognition.onresult = ev => {
    let finalTxt = '', interim = '';
    for (let i = 0; i < ev.results.length; i++) {
      const tr = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) finalTxt += tr; else interim += tr;
    }
    STATE.ayur.input = (finalTxt || interim).trim();
    const box = document.querySelector('[data-field="ayurInput"]');
    if (box) box.value = STATE.ayur.input;
  };
  ayurRecognition.onend = () => {
    ayurListening = false;
    const btn = document.querySelector('[data-act="ayurMic"]');
    if (btn) btn.classList.remove('listening');
    render();
  };
  ayurRecognition.onerror = () => { ayurListening = false; render(); };
  try { ayurRecognition.start(); ayurListening = true; const btn = document.querySelector('[data-act="ayurMic"]'); if (btn) btn.classList.add('listening'); } catch (e) { ayurListening = false; }
}

/* ---------- ui helpers ---------- */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
const VOICE_LANG = { hi: 'hi-IN', en: 'en-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN' };
let speakSeq = 0;
function ttsUtteranceLang() {
  return VOICE_LANG[STATE.lang] || 'en-IN';
}
function pickTtsVoice(lang) {
  try {
    const voices = speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const lower = String(lang || 'en-IN').toLowerCase();
    const prefix = lower.split('-')[0];
    return voices.find(v => (v.lang || '').toLowerCase() === lower)
      || voices.find(v => (v.lang || '').toLowerCase().startsWith(prefix) && /in/i.test(v.lang || ''))
      || voices.find(v => (v.lang || '').toLowerCase().startsWith(prefix))
      || null;
  } catch (e) { return null; }
}
function whenVoicesReady(cb) {
  if (!('speechSynthesis' in window)) { cb(); return; }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    try { speechSynthesis.removeEventListener('voiceschanged', go); } catch (e) {}
    cb();
  };
  try {
    if ((speechSynthesis.getVoices() || []).length) { go(); return; }
  } catch (e) {}
  try { speechSynthesis.addEventListener('voiceschanged', go); } catch (e) {
    try { speechSynthesis.onvoiceschanged = go; } catch (e2) {}
  }
  setTimeout(go, 700);
}
function unmuteVoice() {
  if (!STATE.voice || !STATE.voice.muted) return;
  STATE.voice.muted = false;
  save();
}
function speak(text, onend, force) {
  try {
    /* true = kiosk repeat (also unmutes kiosk). other truthy = speak despite kiosk mute, leave kiosk mute as-is */
    if (force === true) unmuteVoice();
    if (STATE.voice && STATE.voice.muted && !force) { if (onend) onend(); return; }
    if (!String(text || '').trim()) { if (onend) onend(); return; }
    clearTimeout(liveListenTimer);
    clearTimeout(ttsSpeakTimer);
    stopVoiceRecognition();
    if (!('speechSynthesis' in window)) { if (onend) onend(); return toast(isHi() ? 'आवाज़ उपलब्ध नहीं' : 'Voice not available'); }
    const seq = ++speakSeq;
    ttsActive = true;
    let called = false;
    const startedAt = Date.now();
    const ms = Math.min(22000, Math.max(2800, String(text).length * 85 + 1400));
    const finish = (fromEvent) => {
      if (seq !== speakSeq || called) return;
      const elapsed = Date.now() - startedAt;
      try {
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          ttsSpeakTimer = setTimeout(() => finish(false), 400);
          return;
        }
      } catch (e) {}
      if (!fromEvent && elapsed < Math.min(ms, 1800)) {
        ttsSpeakTimer = setTimeout(() => finish(false), 250);
        return;
      }
      called = true;
      ttsActive = false;
      if (onend) onend();
    };
    const startUtterance = () => {
      if (seq !== speakSeq) return;
      whenVoicesReady(() => {
        if (seq !== speakSeq) return;
        const lang = ttsUtteranceLang();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        const voice = pickTtsVoice(lang);
        if (voice) u.voice = voice;
        u.onend = () => finish(true);
        u.onerror = ev => {
          const err = ev && ev.error;
          if ((err === 'interrupted' || err === 'canceled') && Date.now() - startedAt < 500) return;
          ttsSpeakTimer = setTimeout(() => finish(true), 120);
        };
        try {
          speechSynthesis.speak(u);
          if (speechSynthesis.paused) speechSynthesis.resume();
        } catch (e) { finish(true); }
      });
    };
    let speakingNow = false;
    try { speakingNow = !!(speechSynthesis.speaking || speechSynthesis.pending); } catch (e) {}
    if (speakingNow) {
      try { speechSynthesis.cancel(); } catch (e) {}
      setTimeout(startUtterance, 180);
    } else {
      startUtterance();
    }
    ttsSpeakTimer = setTimeout(() => finish(false), ms);
  } catch (e) {
    ttsActive = false;
    if (onend) onend();
  }
}
let lastSpokenKey = '';
function promptSpeakKey() {
  return [STATE.view, STATE.step, (STATE.em && STATE.em.phase) || '', STATE.qIndex, STATE.ayushIndex, STATE.lang, STATE.openToken || ''].join('|');
}
function maybeAutoSpeak() {
  if (STATE.view === 'doctor') {
    if (STATE.staffLogin && !staffVerified()) return;
  } else if (STATE.view !== 'kiosk') return;
  if (STATE.view === 'kiosk') ensureKioskLive();
  if (STATE.voice && STATE.voice.busy) return;
  const key = promptSpeakKey();
  if (key === lastSpokenKey) {
    if (STATE.view === 'kiosk' && !isTtsPlaying()) scheduleLiveListen();
    return;
  }
  lastSpokenKey = key;
  const text = currentPrompt();
  if (!text) {
    if (STATE.view === 'kiosk') scheduleLiveListen();
    return;
  }
  speak(text, STATE.view === 'kiosk' ? scheduleLiveListen : undefined);
}
function triageSpeak(triage) {
  if (isHi()) return triage === 'emergency' ? 'आपात' : triage === 'urgent' ? 'तुरंत' : 'सामान्य';
  return triage === 'emergency' ? 'Emergency' : triage === 'urgent' ? 'Urgent' : 'Routine';
}
function doctorPrompt() {
  const rows = queueRows();
  if (STATE.openToken) {
    const p = rows.find(r => r.token === STATE.openToken) || rows[0];
    if (!p) return isHi() ? 'कोई मरीज़ खुला नहीं है।' : 'No patient is open.';
    const parts = isHi()
      ? [`मरीज़ ${p.name}, टोकन ${p.token}।`, `शिकायत: ${p.complaint}।`, `ट्रायज: ${triageSpeak(p.triage)}।`]
      : [`Patient ${p.name}, token ${p.token}.`, `Chief complaint: ${p.complaint}.`, `Triage: ${triageSpeak(p.triage)}.`];
    const sections = p.token === STATE.token ? buildSummary() : demoSummary(p);
    const facts = (sections || []).slice(0, 3).flatMap(s => (s.facts || []).map(f => f.text)).filter(Boolean).slice(0, 4);
    if (facts.length) parts.push((isHi() ? 'सारांश: ' : 'Summary: ') + facts.join('. '));
    return parts.join(' ');
  }
  if (!rows.length) return isHi() ? 'ओपीडी कतार खाली है।' : 'The OPD queue is empty.';
  const first = rows[0];
  if (isHi()) {
    return `ओपीडी कतार में ${rows.length} मरीज़ इंतज़ार में हैं। पहले मरीज़ ${first.name}, टोकन ${first.token}। शिकायत: ${first.complaint}। ट्रायज: ${triageSpeak(first.triage)}।`;
  }
  return `OPD queue. ${rows.length} patients waiting. First patient ${first.name}, token ${first.token}. Chief complaint: ${first.complaint}. Triage: ${triageSpeak(first.triage)}.`;
}
function currentPrompt() {
  if (STATE.view === 'doctor') return doctorPrompt();
  const ep = STATE.em && STATE.em.phase;
  if (ep === 'start') return isHi() ? 'तुरंत चिकित्सा मदद चाहिए? शुरू करें दबाइए। यह केस ट्रायज डेस्क पर जाएगा, डॉक्टर की कतार में नहीं।' : 'Need immediate medical help? Press start. This case goes to the triage desk, not the doctor queue.';
  if (ep === 'form') return isHi() ? 'आपात इन्टेक। अपना नाम, समस्या, और साथ में कोई है या नहीं लिखिए।' : 'Emergency intake. Enter your name, the problem, and whether someone is with you.';
  if (ep === 'ready') return isHi() ? 'जानकारी तैयार है। ट्रायज डेस्क पर भेजें।' : 'Information is ready. Send it to the triage desk.';
  if (ep === 'sent') return isHi() ? 'केस ट्रायज डेस्क को मिल गया। कतार में इंतज़ार नहीं करना।' : 'The triage desk has your case. You are not waiting in the regular queue.';
  if (STATE.step === 'interview') { const q = questionList()[STATE.qIndex]; return q ? L(q) : ''; }
  if (STATE.step === 'ayush') { const q = ayushList()[STATE.ayushIndex]; return q ? L(q) : ''; }
  if (STATE.step === 'complaint') return isHi() ? 'आज आपको सबसे ज़्यादा क्या परेशान कर रहा है?' : 'What is troubling you the most today?';
  if (STATE.step === 'consent') return CONSENTS.map(c => L(c) + '. ' + (isHi() && c.detailHi ? c.detailHi : c.detail)).join(' ');
  if (STATE.step === 'welcome') return t('welcomeTitle') + '. ' + t('welcomeSub');
  if (STATE.step === 'identity') return t('idTitle') + '. ' + t('idSub');
  if (STATE.step === 'demographics') return t('demoTitle') + '. ' + t('demoSub');
  if (STATE.step === 'vitals') return t('vitalsTitle') + '. ' + t('vitalsSub');
  if (STATE.step === 'department') return t('deptTitle') + '. ' + t('deptSub');
  if (STATE.step === 'scan') return t('scanTitle');
  if (STATE.step === 'review') return t('reviewTitle') + '. ' + t('reviewSub');
  if (STATE.step === 'done') return t('doneTitle');
  if (STATE.step === 'emergency') return isHi() ? 'यह आपात स्थिति हो सकती है। स्टाफ़ से तुरंत संपर्क करें।' : 'This may be an emergency. Please contact staff immediately.';
  return t('welcomeSub');
}

/* ---------- voice input (ASR) ----------
   Uses the browser's Web Speech API per the implementation document, and falls
   back to a deterministic simulation when the API is unavailable (offline kiosk). */
let asrRec = null;

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0900-\u097F ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchOptions(q, text) {
  const t = norm(text);
  if (!t) return [];
  const out = [];
  for (const o of q.options) {
    const n = norm(L(o));
    if (!n) continue;
    const words = n.split(' ');
    if (words.some(w => w.length > 3 && t.includes(w)) || t.includes(n)) out.push(o.id);
  }
  if (out.includes('none') && out.length > 1) return out.filter(x => x !== 'none');
  return out;
}

function matchComplaint(text) {
  const t = norm(text);
  const keys = {
    chest: ['chest', 'seene', 'sine', 'chhati', 'dil'],
    breath: ['breath', 'saans', 'sans', 'dyspnoea', 'phoolna'],
    fever: ['fever', 'bukhar', 'tap', 'jvar'],
    abdomen: ['abdom', 'pet', 'stomach', 'pait'],
    headache: ['headache', 'sir', 'sar', 'darda'],
    joint: ['joint', 'jod', 'knee', 'ghutna'],
    skin: ['skin', 'chamra', 'rash', 'khujli'],
    digestion: ['digest', 'kabz', 'constip', 'pachan', 'gas']
  };
  let best = null, bestN = 0;
  for (const [id, words] of Object.entries(keys)) {
    const n = words.filter(w => t.includes(w)).length;
    if (n > bestN) { best = id; bestN = n; }
  }
  return bestN ? best : null;
}

function handleTranscript(text) {
  if (!text) return;
  if (STATE.step === 'complaint') {
    const id = matchComplaint(text);
    if (id) { STATE.answers = { complaint: id }; computeRedFlags(); save(); syncTurn(); render(); toast(isHi() ? 'आपकी बात दर्ज कर ली गई' : 'Captured from your voice'); return; }
  }
  if (STATE.step === 'interview') {
    const q = questionList()[STATE.qIndex];
    if (q && q.scale) {
      const m = text.match(/\b(\d{1,2})\b/);
      if (m && Number(m[1]) <= 10) {
        STATE.answers[q.key] = Number(m[1]); afterAnswer(); setTimeout(goNext, 140); render();
        toast(isHi() ? 'आपकी बात दर्ज कर ली गई' : 'Captured from your voice'); return;
      }
    }
    if (q && q.free) {
      STATE.answers[q.key] = text; afterAnswer(); render();
      toast(isHi() ? 'आपकी बात दर्ज कर ली गई' : 'Captured from your voice'); return;
    }
    if (q) {
      const ids = matchOptions(q, text);
      if (ids.length) {
        if (q.multi) { STATE.answers[q.key] = ids; afterAnswer(); render(); }
        else { STATE.answers[q.key] = ids[0]; afterAnswer(); setTimeout(goNext, 140); render(); }
        toast(isHi() ? 'आपकी बात दर्ज कर ली गई' : 'Captured from your voice'); return;
      }
    }
  }
  toast(isHi() ? 'सुन नहीं पाए — ऊपर से चुनिए' : 'Didn’t catch that — please tap an option');
}

function stopASR() {
  STATE.listening = false;
  if (asrRec) { try { asrRec.stop(); } catch (e) {} asrRec = null; }
  render();
}

function micToggle() {
  if (STATE.listening) { stopASR(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { simulateVoice(); return; }
  try {
    STATE.listening = true; STATE.asrText = '';
    asrRec = new SR();
    asrRec.lang = VOICE_LANG[STATE.lang] || 'en-IN';
    asrRec.interimResults = true;
    asrRec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) STATE.asrText += e.results[i][0].transcript + ' ';
      }
      render();
    };
    asrRec.onerror = () => { stopASR(); simulateVoice(); }; /* offline/mic-blocked → demo fallback */
    asrRec.onend = () => {
      if (STATE.listening) {
        STATE.listening = false;
        const txt = STATE.asrText.trim();
        STATE.asrText = '';
        if (txt) handleTranscript(txt);
        render();
      }
    };
    asrRec.start();
    render();
  } catch (e) { simulateVoice(); }
}

/* simulated voice capture: picks the most likely option so the demo always works offline */
function simulateVoice() {
  STATE.listening = true;
  render();
  setTimeout(() => {
    STATE.listening = false;
    if (STATE.step === 'complaint' && !STATE.answers.complaint) STATE.answers.complaint = 'chest';
    else if (STATE.step === 'interview') {
      const q = questionList()[STATE.qIndex];
      if (q && q.options) {
        const val = q.options[0].id;
        if (q.multi) STATE.answers[q.key] = [val]; else STATE.answers[q.key] = val;
      } else if (q && q.scale) STATE.answers[q.key] = 7;
      else if (q && q.free) STATE.answers[q.key] = isHi() ? 'मरीज़ की आवाज़ से लिखा गया विवरण' : 'Description transcribed from the patient’s voice';
    }
    afterAnswer();
    toast(isHi() ? 'आपकी बात दर्ज कर ली गई' : 'Captured from your voice');
    render();
  }, 1600);
}

function addDemoDoc() {
  const next = DEMO_DOCS[STATE.docs.length % DEMO_DOCS.length];
  STATE.docs.push({ ...next, edited: false });
  return next;
}

function scanDocument() {
  const next = addDemoDoc();
  logAudit('Document digitised · ' + next.label);
  save(); render();
  toast(isHi() ? 'काग़ज़ पढ़ लिया गया' : 'Document digitised');
}

/* ---------- document upload + OCR ----------
   Real OCR via Tesseract.js loaded from CDN (in-browser, per the implementation
   document). Falls back to simulated extraction when the script cannot load,
   so an offline kiosk demo still works. */
function loadTesseract(timeoutMs = 8000) {
  return new Promise(resolve => {
    if (window.Tesseract) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
    setTimeout(() => resolve(!!window.Tesseract), timeoutMs);
  });
}

function pickDocFile() {
  const input = document.querySelector('[data-act-file]');
  if (input) input.click();
}

/* ---------- live document scanner (camera, capture, Bluetooth) ---------- */
let scanCaptureBlob = null;

function blankScan(extra) {
  return Object.assign({ mode: 'idle', stream: null, facing: 'environment', error: '', bt: { status: 'idle', name: '' }, shot: '', loading: false, pair: { open: false } }, extra || {});
}
function ensureScan() {
  if (!STATE.scan) STATE.scan = blankScan();
  if (!STATE.scan.bt) STATE.scan.bt = { status: 'idle', name: '' };
  return STATE.scan;
}
function teardownScan() {
  const s = STATE.scan;
  if (s && s.stream) {
    try { s.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    s.stream = null;
  }
}
function afterScanNavigate() {
  if (STATE.view === 'kiosk' && STATE.step === 'scan') return;
  teardownScan();
  stopPairPoll();
  if (STATE.scan) {
    STATE.scan.mode = 'idle';
    STATE.scan.error = '';
    STATE.scan.shot = '';
    STATE.scan.loading = false;
    if (STATE.scan.pair) STATE.scan.pair.open = false;
    scanCaptureBlob = null;
  }
}
function afterRender() {
  const s = STATE.scan;
  const video = document.getElementById('scanVideo');
  if (video && s && s.stream && s.mode === 'live') {
    video.srcObject = s.stream;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }
  paintPairQr();
  if (s && s.pair && s.pair.open && s.pair.sessionId) startPairPoll();
  bindReveal();
}

let revealIo = null;
function bindReveal() {
  if (revealIo && revealIo.disconnect) { revealIo.disconnect(); revealIo = null; }
  const nodes = document.querySelectorAll('[data-reveal]');
  if (!nodes.length) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    nodes.forEach(el => el.classList.add('in'));
    return;
  }
  if (typeof IntersectionObserver === 'undefined') {
    nodes.forEach(el => el.classList.add('in'));
    return;
  }
  revealIo = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        revealIo.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
  nodes.forEach(el => revealIo.observe(el));
}
function scanCamError(err) {
  const n = err && err.name;
  if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
    return isHi() ? 'कैमरा अनुमति नहीं मिली। ब्राउज़र सेटिंग में कैमरा अनुमति दें।' : 'Camera permission denied. Allow camera access in your browser settings.';
  }
  if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') {
    return isHi() ? 'कोई कैमरा नहीं मिला।' : 'No camera was found on this device.';
  }
  if (n === 'NotReadableError' || n === 'TrackStartError') {
    return isHi() ? 'कैमरा किसी और ऐप में इस्तेमाल हो रहा है।' : 'The camera is already in use by another application.';
  }
  if (typeof location !== 'undefined' && location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return isHi() ? 'कैमरा केवल सुरक्षित (HTTPS) पेज पर चलता है।' : 'Camera access requires a secure (HTTPS) page.';
  }
  return (err && err.message) || (isHi() ? 'कैमरा शुरू नहीं हो सका।' : 'Could not start the camera.');
}
async function openScanCamera(facing) {
  const s = ensureScan();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(isHi() ? 'इस ब्राउज़र में कैमरा उपलब्ध नहीं है।' : 'Camera is not available in this browser.');
  }
  teardownScan();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing || s.facing || 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
  });
  s.stream = stream;
  s.facing = facing || s.facing || 'environment';
  s.error = '';
  s.canSwitch = true;
  try {
    if (navigator.mediaDevices.enumerateDevices) {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter(d => d.kind === 'videoinput');
      s.canSwitch = cams.length !== 1;
    }
  } catch (e) { s.canSwitch = true; }
  return stream;
}
async function startScanner() {
  const s = ensureScan();
  s.loading = true; s.error = ''; s.shot = ''; s.mode = 'idle';
  scanCaptureBlob = null;
  render();
  try {
    await openScanCamera(s.facing || 'environment');
    s.mode = 'live'; s.loading = false;
    render();
  } catch (e) {
    s.mode = 'idle'; s.loading = false; s.error = scanCamError(e);
    teardownScan();
    render();
  }
}
async function switchScanCam() {
  const s = ensureScan();
  const next = s.facing === 'user' ? 'environment' : 'user';
  s.loading = true; s.error = '';
  render();
  try {
    await openScanCamera(next);
    s.mode = 'live';
    s.loading = false;
    render();
  } catch (e) {
    s.loading = false; s.error = scanCamError(e);
    try { await openScanCamera(s.facing === next ? (next === 'user' ? 'environment' : 'user') : s.facing); } catch (e2) {}
    render();
  }
}
function captureScan() {
  const video = document.getElementById('scanVideo');
  const s = ensureScan();
  if (!video || !video.videoWidth) {
    s.error = isHi() ? 'कैमरा अभी तैयार नहीं है — एक पल रुककर फिर कोशिश करें।' : 'Camera is not ready yet — wait a moment and try again.';
    render();
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    if (!blob) {
      s.error = isHi() ? 'फ़ोटो कैप्चर नहीं हो सकी।' : 'Could not capture the photo.';
      render();
      return;
    }
    scanCaptureBlob = blob;
    s.shot = canvas.toDataURL('image/jpeg', 0.92);
    s.mode = 'shot';
    s.error = '';
    teardownScan();
    render();
  }, 'image/jpeg', 0.92);
}
async function retakeScan() {
  scanCaptureBlob = null;
  const s = ensureScan();
  s.shot = '';
  await startScanner();
}
async function useScan() {
  const s = ensureScan();
  let blob = scanCaptureBlob;
  if (!blob && s.shot) {
    try {
      blob = await (await fetch(s.shot)).blob();
    } catch (e) { blob = null; }
  }
  if (!blob) {
    s.error = isHi() ? 'स्कैन उपलब्ध नहीं है — फिर से कैप्चर करें।' : 'No scan to use — capture again.';
    render();
    return;
  }
  const file = new File([blob], 'scan.jpg', { type: blob.type || 'image/jpeg' });
  s.mode = 'idle';
  s.shot = '';
  s.error = '';
  scanCaptureBlob = null;
  teardownScan();
  await startOcr(file);
}
async function connectBluetooth() {
  const s = ensureScan();
  if (!navigator.bluetooth) {
    s.bt = { status: 'unsupported', name: '' };
    render();
    return;
  }
  s.bt = { status: 'connecting', name: '' };
  render();
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service', 'device_information']
    });
    s.bt = { status: 'connected', name: device.name || device.id || (isHi() ? 'अज्ञात डिवाइस' : 'Unknown device') };
    render();
  } catch (e) {
    s.bt = { status: 'failed', name: '' };
    render();
  }
}
function loadQrLib() {
  return Promise.resolve(!!(window.kioskQr && typeof window.kioskQr.toSvg === 'function'));
}

let pairPollTimer = 0;
let pairPollBusy = false;
function startPairPoll() {
  if (pairPollTimer) return;
  pairPollTimer = setInterval(pollPairDocs, 2000);
  pollPairDocs();
}
function stopPairPoll() {
  if (pairPollTimer) { clearInterval(pairPollTimer); pairPollTimer = 0; }
  pairPollBusy = false;
}
function paintPairQr() {
  const el = document.getElementById('pairQr');
  const pair = STATE.scan && STATE.scan.pair;
  if (!el || !pair || !pair.open || !pair.url) return;
  if (el.getAttribute('data-url') === pair.url && el.querySelector('svg')) return;
  el.innerHTML = '';
  el.setAttribute('data-url', pair.url);
  try {
    if (window.kioskQr && typeof window.kioskQr.toSvg === 'function') {
      el.innerHTML = window.kioskQr.toSvg(pair.url, { cell: 6, margin: 3, dark: '#0D3D38', light: '#FFFFFF' });
      return;
    }
  } catch (e) {}
  el.innerHTML = '<p class="quiet">' + esc(pair.url) + '</p>';
}
async function generatePairQr() {
  const s = ensureScan();
  stopPairPoll();
  const host = (typeof location !== 'undefined' && location.hostname) || '';
  const lanWarn = host === 'localhost' || host === '127.0.0.1';
  s.pair = { open: true, loading: true, error: '', url: '', code: '', token: '', sessionId: '', received: [], seen: {}, lanWarn, createdAt: Date.now() };
  render();
  try {
    await loadQrLib();
    const sessionId = await waitForSession();
    const r = await api('/api/scan-link', { method: 'POST', body: { sessionId } });
    if (!r.ok || !r.token) throw new Error(r.error || 'pair failed');
    const origin = window.location.origin;
    const url = origin + '/scan-link.html?session=' + encodeURIComponent(sessionId)
      + '&token=' + encodeURIComponent(r.token)
      + '&code=' + encodeURIComponent(r.code)
      + '&lang=' + encodeURIComponent(STATE.lang || 'en');
    s.pair = {
      open: true, loading: false, error: '', url, code: r.code, token: r.token,
      sessionId, received: [], seen: {}, lanWarn, createdAt: Date.now()
    };
    save();
    render();
    startPairPoll();
  } catch (e) {
    s.pair.loading = false;
    s.pair.error = isHi()
      ? 'QR नहीं बन सका — API चालू है? कियोस्क को Wi‑Fi IP से खोलें।'
      : 'Could not generate QR — is the API running? Open the kiosk via its Wi‑Fi IP.';
    render();
  }
}
function closePairQr() {
  stopPairPoll();
  const s = ensureScan();
  if (s.pair) s.pair.open = false;
  save();
  render();
}
async function pollPairDocs() {
  const pair = STATE.scan && STATE.scan.pair;
  if (!pair || !pair.open || !pair.sessionId || pairPollBusy) return;
  pairPollBusy = true;
  try {
    const r = await api('/api/documents?sessionId=' + encodeURIComponent(pair.sessionId) + '&token=' + encodeURIComponent(pair.token || ''));
    if (!r.ok || !Array.isArray(r.documents)) return;
    pair.seen = pair.seen || {};
    let added = 0;
    for (let i = 0; i < r.documents.length; i++) {
      const d = r.documents[i];
      if (!d || !d.id || pair.seen[d.id]) continue;
      if (pair.createdAt && d.uploadedAt && new Date(d.uploadedAt).getTime() < pair.createdAt - 4000) continue;
      pair.seen[d.id] = true;
      let preview = '';
      const full = await api('/api/documents/' + encodeURIComponent(d.id) + '?token=' + encodeURIComponent(pair.token || ''));
      if (full.ok && full.document && full.document.dataBase64) {
        preview = 'data:' + (full.document.mime || 'image/jpeg') + ';base64,' + full.document.dataBase64;
      }
      const item = { id: d.id, filename: d.filename || 'document.jpg', preview };
      pair.received = (pair.received || []).concat(item);
      STATE.docs.push({
        label: item.filename,
        value: isHi() ? 'फ़ोन से प्राप्त' : 'Received from phone',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        dateISO: new Date().toISOString().slice(0, 10),
        conf: 1, type: 'other', preview, remoteId: d.id, edited: false
      });
      added++;
    }
    if (added) {
      logAudit('Phone document received ×' + added);
      save();
      render();
      toast(isHi() ? 'दस्तावेज़ प्राप्त हुआ' : 'Document received');
    }
  } finally {
    pairPollBusy = false;
  }
}

async function startOcr(file) {
  const name = file.name || 'photo';
  STATE.ocr = { status: 'reading', pct: 3, mode: 'tesseract', name };
  render();
  const have = await loadTesseract();
  if (!have) { fallbackOcr(name); return; }
  try {
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: m => { if (m.status === 'recognizing text') { STATE.ocr.pct = Math.round(m.progress * 100); render(); } }
    });
    const fields = extractFields(data.text);
    STATE.ocr.status = 'done'; STATE.ocr.pct = 100; STATE.ocr.mode = 'tesseract'; STATE.ocr.name = name;
    fields.forEach(f => STATE.docs.push({ ...f, edited: false }));
    logAudit('OCR read ' + name + ' · ' + fields.length + ' fields');
    save(); render();
    toast(fields.length ? (isHi() ? name + ' से ' + fields.length + ' आँकड़े पढ़े गए' : 'Read ' + fields.length + ' fields from ' + name) : (isHi() ? 'साफ़ लिखाई नहीं मिली — और साफ़ फ़ोटो लीजिए' : 'No clear text found — try a clearer photo'));
  } catch (e) { fallbackOcr(name); }
}

function extractFields(text) {
  const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
  const fields = [];
  const unitRe = /(\d+(?:\.\d+)?)\s*(g\/dl|mg\/dl|mg\/l|mg|gm|g|u\/l|iu\/l|uiu\/ml|mmol\/l|mmhg|meq\/l|ng\/ml|pg\/ml|%)/i;
  const rangeRe = /(?:ref(?:erence)?\.?|nr|normal(?:\s*range)?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/i;
  const bareRangeRe = /(\d+(?:\.\d+)?)\s*(?:-|–)\s*(\d+(?:\.\d+)?)\s*(?=$|[^\d.\-–])/;
  const medLineRe = /\b(tab\.?|tablet|caps?\.?|capsule|syp\.?|syrup|inj\.?|injection|ointment|drops?|b\.d|bd|o\.d|od|t\.d\.s|tds|q\.i\.d|q\.i\.d|h\.s|hs|sos|stat)\b/i;
  const freqRe = /\b(o\.d|od|b\.d|bd|t\.d\.s|tds|q\.i\.d|qid|h\.s|hs|sos|stat|once daily|twice daily|thrice daily|four times daily|at bedtime|as needed)\b/i;
  const dxRe = /\b(dx|diagnosis|impression|finding|finding[s]?|condition|provisional)\b\s*[:\-]?\s*(.+)/i;
  const dateISORe = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  const dateRe = /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/;

  const toISO = m => {
    if (!m) return '';
    if (m.y) return `${m.y}-${m.m}-${m.d}`;
    let y = Number(m.y2); if (y < 100) y += 2000;
    return `${y}-${String(m.m2).padStart(2, '0')}-${String(m.d2).padStart(2, '0')}`;
  };

  for (const ln of lines) {
    if (ln.length < 3 || ln.length > 120) continue;
    const iso = ln.match(dateISORe);
    const dmy = ln.match(dateRe);
    const dateISO = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : (dmy ? toISO({ d2: dmy[1], m2: dmy[2], y2: dmy[3] }) : '');
    const date = iso ? dateISO : (dmy ? dmy[0] : '');

    /* 1) diagnoses / impression lines */
    const dx = ln.match(dxRe);
    if (dx && dx[2] && dx[2].trim().length > 2) {
      fields.push({ label: 'Diagnosis', value: dx[2].trim().slice(0, 90), dateISO, date, conf: 0.75, type: 'diagnosis' });
      if (fields.length >= 10) break;
      continue;
    }

    /* 2) medication lines: prefix (Tab/Cap/Syp) or a dose+frequency pattern */
    const med = ln.match(medLineRe);
    if (med) {
      const freq = ln.match(freqRe);
      const dose = ln.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|gm|g|ml|iu)\b/i);
      const namePart = ln.split(/\s+/).filter(w => !/^(tab\.?|tablet|caps?\.?|capsule|syp\.?|syrup|inj\.?|injection)$/i.test(w)).slice(0, 3).join(' ');
      fields.push({
        label: (namePart || 'Medication').slice(0, 40),
        value: ln.slice(0, 90),
        dose: dose ? dose[1] + ' ' + dose[2] : '',
        freq: freq ? freq[1].toUpperCase().replace(/\./g, '') : '',
        dateISO, date, conf: 0.7, type: 'med'
      });
      if (fields.length >= 10) break;
      continue;
    }

    /* 3) lab values with units → parse value, unit and reference range */
    const num = ln.match(unitRe);
    if (num) {
      const rng = ln.match(rangeRe) || (ln.includes('(') ? ln.match(bareRangeRe) : null);
      const value = num[1], unit = num[2];
      let lo = '', hi = '';
      if (rng) { lo = rng[1]; hi = rng[2]; }
      const known = KNOWN_ANALYTES.find(a => a.names.some(n => ln.toLowerCase().includes(n)));
      if (known && !rng) { lo = String(known.lo); hi = String(known.hi); }
      const label = known ? known.label : (ln.replace(unitRe, '').replace(rangeRe, '').replace(/[:;]?\s*$/, '').trim() || 'Lab value').slice(0, 40);
      const numeric = Number(value);
      const out = lo !== '' && hi !== '' ? (numeric < Number(lo) || numeric > Number(hi)) : false;
      fields.push({ label, value: `${value} ${unit}`, numeric, unit, lo, hi, out, dateISO, date, conf: 0.9, type: 'lab' });
      if (fields.length >= 10) break;
    }
  }
  if (!fields.length && text.trim()) fields.push({ label: 'Extracted text', value: text.trim().slice(0, 100), dateISO: '', date: '', conf: 0.6, type: 'other' });
  return fields;
}

/* common analytes with standard adult reference ranges (illustrative demo values) */
const KNOWN_ANALYTES = [
  { label: 'Haemoglobin', names: ['haemoglobin', 'hemoglobin', 'hb'], lo: 12, hi: 15, unit: 'g/dL' },
  { label: 'WBC count', names: ['wbc', 'total leucocyte', 'tlc'], lo: 4000, hi: 11000, unit: '/uL' },
  { label: 'Platelets', names: ['platelet'], lo: 150000, hi: 410000, unit: '/uL' },
  { label: 'Fasting glucose', names: ['fasting glucose', 'fbs', 'fasting blood sugar'], lo: 70, hi: 100, unit: 'mg/dL' },
  { label: 'HbA1c', names: ['hba1c', 'glycated'], lo: 4, hi: 5.6, unit: '%' },
  { label: 'Serum creatinine', names: ['creatinine'], lo: 0.6, hi: 1.3, unit: 'mg/dL' },
  { label: 'Blood urea', names: ['urea'], lo: 15, hi: 40, unit: 'mg/dL' },
  { label: 'TSH', names: ['tsh'], lo: 0.4, hi: 4.0, unit: 'uIU/mL' },
  { label: 'Total cholesterol', names: ['cholesterol'], lo: 0, hi: 200, unit: 'mg/dL' },
  { label: 'LDL', names: ['ldl'], lo: 0, hi: 100, unit: 'mg/dL' },
  { label: 'HDL', names: ['hdl'], lo: 40, hi: 90, unit: 'mg/dL' },
  { label: 'Triglycerides', names: ['triglyceride'], lo: 0, hi: 150, unit: 'mg/dL' },
  { label: 'Serum bilirubin', names: ['bilirubin'], lo: 0.2, hi: 1.2, unit: 'mg/dL' },
  { label: 'SGPT (ALT)', names: ['sgpt', 'alt'], lo: 0, hi: 45, unit: 'U/L' },
  { label: 'SGOT (AST)', names: ['sgot', 'ast'], lo: 0, hi: 40, unit: 'U/L' },
  { label: 'Vitamin D', names: ['vitamin d', 'vit d'], lo: 30, hi: 100, unit: 'ng/mL' },
  { label: 'Vitamin B12', names: ['b12'], lo: 200, hi: 900, unit: 'pg/mL' }
];

/* ---- timeline helpers (spec: chronological order of documents/results) ---- */
function docDateKey(d) { return d.dateISO || ''; }
function docsTimeline() {
  return STATE.docs.slice().sort((a, b) => (docDateKey(b) || '9999').localeCompare(docDateKey(a) || '9999')); /* newest first */
}
function outOfRangeDocs() { return STATE.docs.filter(d => d.type === 'lab' && d.out === true); }
function docDiagnoses() { return STATE.docs.filter(d => d.type === 'diagnosis'); }

function fallbackOcr(name) {
  STATE.ocr = { status: 'reading', pct: 0, mode: 'sim', name };
  render();
  const t0 = Date.now();
  const iv = setInterval(() => {
    if (STATE.step !== 'scan' && STATE.view !== 'kiosk') { clearInterval(iv); return; }
    STATE.ocr.pct = Math.min(100, Math.round(((Date.now() - t0) / 2200) * 100));
    if (STATE.ocr.pct >= 100) {
      clearInterval(iv);
      STATE.ocr.status = 'done';
      const next = addDemoDoc();
      logAudit('Document digitised (simulated) · ' + next.label);
      save(); render();
      toast(isHi() ? 'OCR ऑफ़लाइन — अनुमानित पढ़ाई इस्तेमाल हुई' : 'OCR offline — simulated extraction used');
    } else render();
  }, 120);
}

/* ---------- events ---------- */
function onFieldInput(el) {
  const name = el.getAttribute('data-field');
  const val = el.value;
  if (name === 'search') { STATE.search = val; return; }
  if (name === 'dashQuery') { ensureUi(); STATE.ui.dashQuery = val; render({ quiet: true }); return; }
  if (name === 'otp') { STATE.otp.value = val.replace(/\D/g, '').slice(0, 4); return; }
  const dm = name.match(/^docl_(\d+)$/);
  if (dm) { const i = Number(dm[1]); if (STATE.docs[i]) { STATE.docs[i].label = val; STATE.docs[i].conf = 1; STATE.docs[i].edited = true; save(); } return; }
  const dv = name.match(/^docv_(\d+)$/);
  if (dv) { const i = Number(dv[1]); if (STATE.docs[i]) { STATE.docs[i].value = val; STATE.docs[i].conf = 1; STATE.docs[i].edited = true; save(); } return; }
  if (name === 'docNote') { STATE.docNote = val; save(); return; }
  if (name === 'ayurInput') { STATE.ayur.input = val; return; } /* not saved: chat draft is ephemeral */
  if (name === 'aiInput') {
    STATE.ai.input = val; save(); render(); /* re-render keeps the send button state honest */
    const el = document.querySelector('[data-field="aiInput"]');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    return;
  }
  if (name === 'staffOtp') { STATE.staff.otp = val.replace(/\D/g, '').slice(0, 4); return; }
  if (name === 'loginValue') { STATE.login.value = val; save(); return; }
  if (name === 'voiceText') { STATE.voice.last = val; return; } /* ephemeral command draft */
  if (name === 'loginOtp') { STATE.otp.value = val.replace(/\D/g, '').slice(0, 4); return; }
  if (name === 'staffName') { STATE.staff.name = val; return; }
  if (name === 'staffId') { STATE.staff.id = val; return; }
  if (name === 'emName') { STATE.em.name = val; save(); return; }
  if (name === 'emProblem') { STATE.em.problem = val; save(); return; }
  if (name === 'emRelName') { STATE.em.relName = val; save(); return; }
  if (name === 'emRelPhone') { STATE.em.relPhone = val.replace(/\D/g, '').slice(0, 10); save(); return; }
  if (name === 'emRelRelation') { STATE.em.relRelation = val; save(); return; }
  if (name.indexOf('free_') === 0) { STATE.answers[name.slice(5)] = val; save(); return; }
  if (VITAL_KEYS.indexOf(name) >= 0) { STATE.vitals[name] = val; save(); return; }
  if (name in STATE.patient) { STATE.patient[name] = val; save(); }
}

function handleAction(act, el) {
  const d = k => el.getAttribute('data-' + k);
  switch (act) {
    case 'setView': {
      const target = d('view');
      ensureUi();
      STATE.ui.notifyOpen = false;
      if (target === 'ayur') {
        STATE.view = 'ayur';
        STATE.ayur.mode = 'embed';
        save(); render(); ayurWatchFrame();
        break;
      }
      /* doctor-end screens are gated behind staff OTP verification */
      if (['doctor', 'triage', 'admin'].includes(target) && !staffVerified()) {
        STATE.view = target; STATE.openToken = null; STATE.staffLogin = true;
        save(); render();
        break;
      }
      STATE.staffLogin = false;
      STATE.view = target; STATE.openToken = null;
      if (target === 'kiosk' && !STATE.step) STATE.step = 'welcome';
      save(); render();
      if (STATE.view === 'admin') fetchAnalytics();
      if (STATE.view === 'triage') fetchEmergencies();
      if (STATE.view === 'landing' || STATE.view === 'dashboard') fetchLiveStats();
      break;
    }
    case 'startConsult':
      ensureUi();
      STATE.ui.notifyOpen = false;
      STATE.view = 'kiosk';
      STATE.step = 'welcome';
      STATE.staffLogin = false;
      save(); render();
      break;
    case 'enterApp':
      ensureUi();
      STATE.ui.notifyOpen = false;
      STATE.staffLogin = false;
      STATE.view = 'dashboard';
      save(); render();
      fetchLiveStats();
      break;
    case 'appLogout':
      staffLogout();
      break;
    case 'toggleSidebar':
      ensureUi();
      STATE.ui.sidebarCollapsed = !STATE.ui.sidebarCollapsed;
      save(); render({ quiet: true });
      break;
    case 'toggleNotify':
      ensureUi();
      STATE.ui.notifyOpen = !STATE.ui.notifyOpen;
      render({ quiet: true });
      break;
    case 'retryStats':
      fetchLiveStats();
      pingApi();
      break;
    case 'ayurSend':
      niroSend(STATE.ayur.input); break;
    case 'ayurAsk':
      niroSend(d('q')); break;
    case 'ayurHandoff':
      ayurHandoff(); break;
    case 'ayurMic': ayurMicToggle(); break;
    case 'ayurSpeak':
      if ('speechSynthesis' in window && speechSynthesis.speaking) speechSynthesis.cancel();
      niroSpeakLast(); break;
    case 'ayurPdf': ayurDownloadPdf(); break;
    case 'ayurTts':
      STATE.ayur.autoSpeak = !STATE.ayur.autoSpeak;
      if (!STATE.ayur.autoSpeak && 'speechSynthesis' in window) speechSynthesis.cancel();
      save(); render(); break;
    case 'ayurSidebar':
      STATE.ayur.sidebar = !STATE.ayur.sidebar; save(); render(); break;
    case 'ayurMode': {
      const next = (STATE.ayur.mode || 'native') === 'native' ? 'embed' : 'native';
      STATE.ayur.mode = next; save(); render();
      if (next === 'embed') ayurWatchFrame();
      else niroLoadSessions();
      break;
    }
    case 'ayurOpenSession':
      niroLoadSession(d('id')); break;
    case 'ayurDelSession':
      niroDeleteSession(d('id')); break;
    case 'ayurNew':
      niroReset('');
      save(); render();
      toast(isHi() ? 'नई सलाह शुरू' : 'New consultation started');
      break;
    case 'setLoginMode':
      STATE.login = { mode: d('mode'), value: STATE.login.mode === d('mode') ? STATE.login.value : '', otpSent: false, verified: false, history: null, loading: false, error: '' };
      STATE.otp.value = '';
      save(); render();
      break;
    case 'loginSendOtp': loginSendOtp(); break;
    case 'loginVerifyOtp': loginVerifyOtp(); break;
    case 'sendOtp':
      if (!String(STATE.patient.abha || '').trim()) { toast(isHi() ? 'पहले ABHA नंबर लिखिए' : 'Enter an ABHA number first'); break; }
      STATE.otp.sent = true; STATE.otp.value = '';
      logAudit('OTP requested for ABHA login'); save(); render();
      toast(isHi() ? 'OTP भेज दिया गया (डेमो: 1234)' : 'OTP sent (demo: 1234)');
      break;
    case 'verifyOtp':
      if (STATE.otp.value === DEMO_OTP) {
        STATE.otp.verified = true;
        logAudit('ABHA login verified via OTP');
        api('/api/auth/login', { method: 'POST', body: { abha: STATE.patient.abha, otp: STATE.otp.value } });
        save(); render();
        toast(isHi() ? 'पहचान सत्यापित ✓' : 'Identity verified ✓');
      } else toast(t('otpWrong'));
      break;
    case 'uploadDoc': pickDocFile(); break;
    case 'startScanner': startScanner(); break;
    case 'captureScan': captureScan(); break;
    case 'switchScanCam': switchScanCam(); break;
    case 'retakeScan': retakeScan(); break;
    case 'useScan': useScan(); break;
    case 'connectBt': connectBluetooth(); break;
    case 'generatePairQr': generatePairQr(); break;
    case 'closePairQr': closePairQr(); break;
    case 'setLang':
      STATE.lang = d('lang'); save(); render(); break;
    case 'next': onKioskUserGesture(); goNext(); break;
    case 'back': onKioskUserGesture(); goBack(); break;
    case 'skip':
      onKioskUserGesture();
      if (STATE.step === 'interview') { const l = questionList(); if (STATE.qIndex < l.length - 1) { STATE.qIndex++; render(); break; } }
      if (STATE.step === 'ayush') { const l = ayushList(); if (STATE.ayushIndex < l.length - 1) { STATE.ayushIndex++; render(); break; } }
      goNext(); break;
    case 'goStep': STATE.step = d('step'); if (STATE.step === 'consent') lockRequiredConsents(); save(); render(); break;
    case 'setSeg': {
      const f = d('field');
      if (VITAL_KEYS.indexOf(f) >= 0) STATE.vitals[f] = d('val'); else STATE.patient[f] = d('val');
      save(); render(); break;
    }
    case 'toggleConsent': {
      const id = d('id');
      const meta = CONSENTS.find(c => c.id === id);
      if (!meta || meta.required) break;
      STATE.consents[id] = !STATE.consents[id];
      logAudit('Consent ' + id + (STATE.consents[id] ? ' granted' : ' declined'));
      api('/api/consent', { method: 'POST', body: { sessionId: STATE.sessionId, consents: STATE.consents } });
      save(); render(); break;
    }
    case 'setDept': STATE.dept = d('id'); save(); render(); break;
    case 'pickComplaint':
      onKioskUserGesture();
      STATE.answers = { complaint: d('id') }; STATE.qIndex = 0; afterComplaintPicked(); save(); render(); break;
    case 'answer': {
      onKioskUserGesture();
      const key = d('key'), val = d('val'), multi = d('multi');
      if (multi) {
        const cur = Array.isArray(STATE.answers[key]) ? STATE.answers[key].slice() : [];
        const i = cur.indexOf(val);
        if (val === 'none') { STATE.answers[key] = i >= 0 ? [] : ['none']; }
        else {
          if (i >= 0) cur.splice(i, 1); else cur.push(val);
          STATE.answers[key] = cur.filter(x => x !== 'none');
        }
        afterAnswer(); render();
      } else {
        STATE.answers[key] = isNaN(Number(val)) ? val : (d('key') === 'severity' ? Number(val) : val);
        afterAnswer(); setTimeout(goNext, 140); render();
      }
      break;
    }
    case 'ayushAnswer': {
      onKioskUserGesture();
      const key = d('key'), val = d('val'), multi = d('multi');
      if (multi) {
        const cur = Array.isArray(STATE.ayush[key]) ? STATE.ayush[key].slice() : [];
        const i = cur.indexOf(val);
        if (i >= 0) cur.splice(i, 1); else cur.push(val);
        STATE.ayush[key] = cur; save(); render();
      } else { STATE.ayush[key] = val; save(); setTimeout(goNext, 140); render(); }
      break;
    }
    case 'autoVitals': STATE.vitals = { ...DEMO_VITALS }; computeRedFlags(); save(); render(); toast(isHi() ? 'डिवाइस से माप लिया गया' : 'Readings pulled from devices'); break;
    case 'scanDoc': scanDocument(); break;
    case 'removeDoc': STATE.docs.splice(Number(d('i')), 1); save(); render(); break;
    case 'mic': micToggle(); break;
    case 'speak':
      unmuteVoice();
      lastSpokenKey = promptSpeakKey();
      save();
      render({ quiet: true });
      speak(currentPrompt(), scheduleLiveListen, true);
      break;
    case 'staff': toast(isHi() ? 'स्टाफ़ को बुला लिया गया है' : 'A staff member has been called'); break;
    case 'ackEmergency':
      STATE.step = 'department';
      if (!STATE.dept && STATE.deptSuggestion && STATE.deptSuggestion.dept) STATE.dept = STATE.deptSuggestion.dept;
      save(); render();
      break;
    case 'restart': resetSession(); break;
    case 'openDoctorConsole':
      STATE.openToken = STATE.token;
      STATE.view = 'doctor';
      STATE.staff = Object.assign(STATE.staff || {}, { verified: true, name: (STATE.staff && STATE.staff.name) || 'Dr. Anita Sharma', id: (STATE.staff && STATE.staff.id) || 'AIIA-DR-0117' });
      STATE.staffLogin = false;
      save(); render();
      toast(isHi() ? 'डॉक्टर कंसोल खोला गया — टोकन ' + STATE.token : 'Doctor console opened for Token ' + STATE.token);
      break;
    case 'openPatient': STATE.openToken = d('token'); STATE.view = 'doctor'; save(); render(); break;
    case 'openFirst': STATE.openToken = queueRows()[0].token; save(); render(); break;
    case 'closePatient': STATE.openToken = null; save(); render(); break;
    case 'confirmSummary':
      STATE.confirmed = true; logAudit('Physician confirmed summary');
      if (STATE.sessionId) {
        api('/api/summary/' + STATE.sessionId, { method: 'PATCH', body: { status: 'confirmed', physicianNote: STATE.docNote } });
        api('/api/fhir/push', { method: 'POST', body: { sessionId: STATE.sessionId, bundle: fhirBundle() } });
      }
      save(); render(); toast('Summary confirmed and saved to the encounter'); break;
    case 'sectionAct': {
      const id = d('id'), action = d('do');
      STATE.sections[id] = action;
      save(); render();
      toast(action === 'accept' ? 'Section accepted' : action === 'edit' ? 'Section marked for editing' : 'Section rejected');
      break;
    }
    case 'ackTriage': STATE.triageAck = true; logAudit('Triage alert acknowledged'); save(); render(); toast('Alert acknowledged, duty doctor notified'); break;
    case 'emOpen': emOpen(); break;
    case 'emBegin': emBegin(); break;
    case 'emContinue': emContinue(); break;
    case 'emSend': emSend(); break;
    case 'emClose': emClose(); break;
    case 'emAttendant':
      STATE.em.attendant = d('val');
      if (STATE.em.attendant !== 'yes') { STATE.em.relName = ''; STATE.em.relPhone = ''; STATE.em.relRelation = ''; }
      save(); render(); break;
    case 'emAccept': emPatchCase(d('id'), 'accepted'); break;
    case 'emOpenCase': emPatchCase(d('id'), 'open'); break;
    case 'emCall': emCallPatient(d('id')); break;
    /* ---- staff login gate ---- */
    case 'staffSendOtp': staffSendOtp(); break;
    case 'staffVerifyOtp': staffVerifyOtp(); break;
    case 'staffLogout': staffLogout(); break;
    case 'staffBack': STATE.staffLogin = false; STATE.view = 'dashboard'; save(); render(); break;
    /* ---- doctor AI assistant ---- */
    case 'toggleAi': STATE.ai.open = !STATE.ai.open; save(); render(); if (STATE.ai.open) { const inp = document.querySelector('[data-field="aiInput"]'); if (inp) inp.focus(); } break;
    case 'aiSend': aiSend(); break;
    case 'aiClear': STATE.ai.messages = []; STATE.ai.error = ''; save(); render(); break;
    case 'aiAsk': aiSend(d('q')); break;
    case 'aiSpeak': speakDocBot(true); break;
    case 'aiMute': aiMuteToggle(); break;
    /* ---- voice AI command assistant ---- */
    case 'voiceOrb': voiceCommandToggle(); break;
    case 'voiceSend': onKioskUserGesture(); aiCommand(STATE.voice.last); break;
    case 'voiceDismiss': STATE.voice.reply = ''; STATE.voice.error = ''; save(); render(); break;
    case 'voiceLive': voiceLiveToggle(); break;
    case 'voiceMute': voiceMuteToggle(); break;
    case 'copyFhir':
      try { navigator.clipboard.writeText(JSON.stringify(fhirBundle(), null, 2)); toast('FHIR bundle copied'); }
      catch (e) { toast('Copy not available in this browser'); }
      break;
    case 'pushAbdm':
      logAudit('Bundle pushed to ABDM sandbox');
      api('/api/fhir/push', { method: 'POST', body: { sessionId: STATE.sessionId, bundle: fhirBundle() } });
      save(); render(); toast('Pushed to ABDM sandbox (simulated)'); break;
    default: break;
  }
}

function bind() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistIntakeNow();
  });
  window.addEventListener('pagehide', () => persistIntakeNow());
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    e.preventDefault();
    handleAction(el.getAttribute('data-act'), el);
  });
  document.addEventListener('keydown', e => {
    const el = e.target.closest('[data-field="ayurInput"]');
    if (el && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); niroSend(STATE.ayur.input); }
    const ai = e.target.closest('[data-field="aiInput"]');
    if (ai && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); }
    const so = e.target.closest('[data-field="staffOtp"]');
    if (so && e.key === 'Enter') { e.preventDefault(); staffVerifyOtp(); }
    const sn = e.target.closest('[data-field="staffName"], [data-field="staffId"]');
    if (sn && e.key === 'Enter') { e.preventDefault(); STATE.staff.otpSent ? staffVerifyOtp() : staffSendOtp(); }
    const lo = e.target.closest('[data-field="loginOtp"]');
    if (lo && e.key === 'Enter') { e.preventDefault(); loginVerifyOtp(); }
    const lv = e.target.closest('[data-field="loginValue"]');
    if (lv && e.key === 'Enter') { e.preventDefault(); loginSendOtp(); }
    const vb = e.target.closest('[data-field="voiceText"]');
    if (vb && e.key === 'Enter') { e.preventDefault(); aiCommand(STATE.voice.last); }
  });
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-field]');
    if (el) onFieldInput(el);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('select[data-field]');
    if (el) { onFieldInput(el); render(); }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-act-file]');
    if (el && el.files && el.files[0]) startOcr(el.files[0]);
  });
  window.addEventListener('hashchange', applyHash);
}

/* deep links: #/doctor, #/triage, #/admin, #/kiosk/vitals ; ?demo=1 preloads a patient */
function applyHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  if (!h) return;
  const [a, b] = h.split('/');
  if (['doctor', 'triage', 'admin', 'ayur', 'kiosk', 'landing', 'dashboard', 'settings'].includes(a)) {
    STATE.view = a === 'kiosk' ? 'kiosk' : a;
    /* staff OTP gate also applies to deep links into doctor-end screens */
    if (['doctor', 'triage', 'admin'].includes(a) && !staffVerified()) STATE.staffLogin = true;
    if (a === 'doctor' && b === 'detail') STATE.openToken = STATE.token;
    if (a === 'kiosk' && b) STATE.step = b;
    if (a === 'ayur') { if ((STATE.ayur.mode || 'native') === 'embed') ayurWatchFrame(); else niroLoadSessions(); }
  }
  render();
}

function init() {
  const params = new URLSearchParams(location.search);
  const qa = window.__QA || null;
  if (!qa && params.get('fresh') !== '1') restore();
  if (params.get('fresh') === '1') {
    STATE.view = 'landing';
    STATE.step = 'welcome';
  } else if (!qa && STATE.view === 'kiosk' && !isMidKiosk()) {
    STATE.view = 'landing';
  }
  if (params.get('demo') === '1' || (qa && qa.demo)) {
    loadDemo();
    if (params.get('fresh') !== '1' && !(location.hash || '').replace(/^#\/?/, '')) {
      STATE.view = 'kiosk';
      if (!STATE.step) STATE.step = 'welcome';
    }
  }
  if (qa) {
    if (qa.view) STATE.view = qa.view;
    if (qa.step) STATE.step = qa.step;
    if (qa.openToken) STATE.openToken = qa.openToken;
    if (qa.qIndex != null) STATE.qIndex = qa.qIndex;
    if (qa.ayushIndex != null) STATE.ayushIndex = qa.ayushIndex;
    if (qa.lang) STATE.lang = qa.lang;
  }
  computeRedFlags();
  bind();
  window.addEventListener('pagehide', teardownScan);
  applyHash();
  if ('speechSynthesis' in window) {
    try { speechSynthesis.getVoices(); } catch (e) {}
    try { speechSynthesis.addEventListener('voiceschanged', () => { try { speechSynthesis.getVoices(); } catch (e2) {} }); } catch (e) {}
  }
  render();
  fetchLiveStats();
  if (STATE.view === 'admin') fetchAnalytics();
}

document.addEventListener('DOMContentLoaded', init);
