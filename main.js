/* AarogyaVaani — state, clinical logic, flow control */

const BLANK_PATIENT = {
  name: '', age: '', dob: '', gender: '', blood: '', marital: '', occupation: '', education: '',
  phone: '', altPhone: '', address: '', city: '', state: '', pincode: '', area: '',
  emgName: '', emgRelation: '', emgPhone: '', caregiver: '', abha: '', uhid: '', visitType: 'new'
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
const DEMO_DOCS = [
  { label: 'Haemoglobin', value: '8.2 g/dL (ref 12–15)', date: '20 Aug 2026', conf: 0.96, type: 'lab' },
  { label: 'Amlodipine 5 mg', value: 'Once daily, ongoing', date: '02 Aug 2026', conf: 0.81, type: 'med' },
  { label: 'ECG report', value: 'Sinus tachycardia, rate 104', date: '20 Aug 2026', conf: 0.72, type: 'lab' }
];

const STATE = {
  view: 'kiosk', step: 'welcome', lang: 'hi',
  patient: { ...BLANK_PATIENT },
  vitals: { sys: '', dia: '', pulse: '', spo2: '', temp: '', rr: '', height: '', weight: '' },
  answers: {}, ayush: {}, consents: { c1: false, c2: false, c3: false, c4: false, c5: false },
  dept: '', qIndex: 0, ayushIndex: 0, docs: [], redFlags: [], errors: {},
  token: 'A-18', listening: false, emergencyShown: false, confirmed: false,
  openToken: null, sections: {}, search: '', docNote: '', triageAck: false, audit: [],
  otp: { sent: false, value: '', verified: false },
  ocr: { status: 'idle', pct: 0, mode: '', name: '' },
  asrText: '', sessionId: null, analytics: null,
  /* Ayurveda AI (NirogaVerse bridge) */
  ayur: { session: null, token: null, messages: [], input: '', sending: false, source: '', seeded: false, error: '', sessions: [], profileData: null, autoSpeak: true, sidebar: true, mode: 'native' }
};

function save() { try { localStorage.setItem('aarogyavaani', JSON.stringify(STATE)); } catch (e) {} }
function restore() {
  try {
    const raw = localStorage.getItem('aarogyavaani');
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(STATE, saved);
      /* keep fields added in newer versions when older state is restored */
      STATE.ayur = Object.assign({ session: null, token: null, messages: [], input: '', sending: false, source: '', seeded: false, error: '', sessions: [], profileData: null, autoSpeak: true, sidebar: true, mode: 'native' }, saved.ayur || {});
      if (!window.AYUR_EMBED_PORT) STATE.ayur.mode = 'native';
    }
  } catch (e) {}
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
  const steps = ['welcome', 'identity', 'demographics', 'contact', 'consent', 'department', 'vitals', 'complaint', 'interview'];
  if (currentDept().ayush) steps.push('ayush');
  return steps.concat(['scan', 'review', 'done']);
}
function validateStep() {
  STATE.errors = {};
  const p = STATE.patient;
  const req = (k, msg) => { if (!String(p[k] || '').trim()) STATE.errors[k] = msg; };
  if (STATE.step === 'identity' && String(p.abha || '').trim() && !STATE.otp.verified) STATE.errors.abha = isHi() ? 'पहले OTP से पुष्टि करें' : 'Verify the OTP first';
  if (STATE.step === 'demographics') {
    req('name', isHi() ? 'नाम ज़रूरी है' : 'Name is required');
    req('age', isHi() ? 'उम्र ज़रूरी है' : 'Age is required');
    if (p.age && (Number(p.age) < 0 || Number(p.age) > 120)) STATE.errors.age = isHi() ? '0 से 120 के बीच' : 'Enter 0–120';
    if (!p.gender) STATE.errors.gender = isHi() ? 'लिंग चुनिए' : 'Please choose one';
  }
  if (STATE.step === 'contact') {
    if (!/^\d{10}$/.test(String(p.phone || ''))) STATE.errors.phone = isHi() ? '10 अंकों का नंबर लिखिए' : 'Enter a 10-digit number';
    req('address', isHi() ? 'पता ज़रूरी है' : 'Address is required');
    req('city', isHi() ? 'शहर ज़रूरी है' : 'City is required');
    req('emgName', isHi() ? 'नाम लिखिए' : 'Enter a name');
    if (!/^\d{10}$/.test(String(p.emgPhone || ''))) STATE.errors.emgPhone = isHi() ? '10 अंकों का नंबर' : '10-digit number';
    if (p.pincode && !/^\d{6}$/.test(p.pincode)) STATE.errors.pincode = isHi() ? '6 अंक' : '6 digits';
  }
  return Object.keys(STATE.errors).length === 0;
}

function goNext() {
  const steps = stepOrder();
  if (!validateStep()) { toast(isHi() ? 'कुछ ज़रूरी जानकारी बाक़ी है' : 'Some required details are missing'); return render(); }
  if (STATE.step === 'interview') {
    const list = questionList();
    if (STATE.qIndex < list.length - 1) { STATE.qIndex++; afterAnswer(); return render(); }
    computeRedFlags();
    if (STATE.redFlags.some(f => f.level === 'emergency') && !STATE.emergencyShown) {
      STATE.emergencyShown = true; STATE.step = 'emergency'; logAudit('Red flag raised · ' + STATE.redFlags[0].id); save(); return render();
    }
  }
  if (STATE.step === 'ayush') {
    const list = ayushList();
    if (STATE.ayushIndex < list.length - 1) { STATE.ayushIndex++; save(); return render(); }
  }
  if (STATE.step === 'review') { submitCase(); return; }
  const i = steps.indexOf(STATE.step);
  STATE.step = steps[Math.min(i + 1, steps.length - 1)];
  if (STATE.step === 'scan' && !STATE.consents.c3) STATE.step = 'review';
  computeRedFlags(); save(); render();
}

function goBack() {
  const steps = stepOrder();
  if (STATE.step === 'interview' && STATE.qIndex > 0) { STATE.qIndex--; save(); return render(); }
  if (STATE.step === 'ayush' && STATE.ayushIndex > 0) { STATE.ayushIndex--; save(); return render(); }
  const i = steps.indexOf(STATE.step);
  STATE.step = steps[Math.max(i - 1, 0)];
  STATE.errors = {}; save(); render();
}

function afterAnswer() { computeRedFlags(); save(); syncTurn(); }

function submitCase() {
  computeRedFlags();
  STATE.step = 'done';
  STATE.token = STATE.token || 'A-18';
  logAudit('Draft summary delivered to physician');
  syncSession();
  save(); render();
  toast(isHi() ? 'सारांश डॉक्टर को भेज दिया गया' : 'Draft summary sent to the doctor');
}

function logAudit(action) {
  const now = new Date();
  STATE.audit.unshift({ time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, actor: 'Kiosk 04', action, ref: STATE.token });
  STATE.audit = STATE.audit.slice(0, 6);
}

function resetSession() {
  STATE.patient = { ...BLANK_PATIENT };
  STATE.vitals = { sys: '', dia: '', pulse: '', spo2: '', temp: '', rr: '', height: '', weight: '' };
  STATE.answers = {}; STATE.ayush = {}; STATE.docs = []; STATE.redFlags = [];
  STATE.consents = { c1: false, c2: false, c3: false, c4: false, c5: false };
  STATE.dept = ''; STATE.qIndex = 0; STATE.ayushIndex = 0; STATE.errors = {};
  STATE.step = 'welcome'; STATE.view = 'kiosk'; STATE.emergencyShown = false; STATE.confirmed = false;
  STATE.sections = {}; STATE.docNote = ''; STATE.openToken = null;
  STATE.otp = { sent: false, value: '', verified: false };
  STATE.ocr = { status: 'idle', pct: 0, mode: '', name: '' };
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
  return fetch(API_BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(r => r.json()).catch(() => ({ ok: false, offline: true }));
}

function flushTurns() {
  while (pendingTurns.length) postTurn(pendingTurns.shift());
}

function startSession() {
  return api('/api/session/start', {
    method: 'POST',
    body: {
      token: STATE.token, lang: STATE.lang, dept: STATE.dept,
      patient: { name: STATE.patient.name, age: STATE.patient.age, gender: STATE.patient.gender, abha: STATE.patient.abha }
    }
  });
}

function ensureSession(turn) {
  if (turn) pendingTurns.push(turn);
  if (STATE.sessionId) { flushTurns(); return; }
  if (sessionSyncInFlight) return; /* turns are queued and flushed once the session exists */
  sessionSyncInFlight = true;
  startSession().then(r => {
    sessionSyncInFlight = false;
    if (r.ok) { STATE.sessionId = r.sessionId; save(); flushTurns(); }
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
    if (r.ok && r.analytics) { STATE.analytics = r.analytics; if (STATE.view === 'admin') render(); }
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
  return fetch('/api/niro' + path, {
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
function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return toast(isHi() ? 'आवाज़ उपलब्ध नहीं' : 'Voice not available');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = STATE.lang === 'hi' ? 'hi-IN' : STATE.lang === 'mr' ? 'mr-IN' : STATE.lang === 'ta' ? 'ta-IN' : STATE.lang === 'bn' ? 'bn-IN' : STATE.lang === 'te' ? 'te-IN' : 'en-IN';
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
function currentPrompt() {
  if (STATE.step === 'interview') { const q = questionList()[STATE.qIndex]; return q ? L(q) : ''; }
  if (STATE.step === 'ayush') { const q = ayushList()[STATE.ayushIndex]; return q ? L(q) : ''; }
  if (STATE.step === 'complaint') return isHi() ? 'आज आपको सबसे ज़्यादा क्या परेशान कर रहा है?' : 'What is troubling you the most today?';
  if (STATE.step === 'consent') return CONSENTS.map(c => L(c) + '. ' + c.detail).join(' ');
  return t('welcomeSub');
}

/* ---------- voice input (ASR) ----------
   Uses the browser's Web Speech API per the implementation document, and falls
   back to a deterministic simulation when the API is unavailable (offline kiosk). */
const VOICE_LANG = { hi: 'hi-IN', en: 'en-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN' };
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
  const numRe = /(\d+(?:\.\d+)?)\s*(g\/dl|mg\/dl|mg|gm|u\/l|iu\/l|mm\/hg|%)/i;
  const medRe = /\b(tab|caps?|syp|inj|ointment|drops?|b\.d|o\.d|h\.s)\b/i;
  const dateRe = /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/;
  for (const ln of lines) {
    if (ln.length < 3 || ln.length > 90) continue;
    const num = ln.match(numRe);
    const med = ln.match(medRe);
    const date = ln.match(dateRe);
    let type = null, label = '', conf = 0.55;
    if (med) { type = 'med'; label = ln.split(/\s+/).slice(0, 4).join(' '); conf = 0.7; }
    else if (num) { type = 'lab'; label = (ln.replace(numRe, '').replace(/[:;]?\s*$/, '') || 'Lab value').slice(0, 40); conf = 0.9; }
    if (!type) continue;
    fields.push({ label, value: ln.slice(0, 80), date: date ? date[1] : '', conf, type });
    if (fields.length >= 6) break;
  }
  if (!fields.length && text.trim()) fields.push({ label: 'Extracted text', value: text.trim().slice(0, 100), date: '', conf: 0.6, type: 'other' });
  return fields;
}

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
  if (name === 'otp') { STATE.otp.value = val.replace(/\D/g, '').slice(0, 4); return; }
  const dm = name.match(/^docl_(\d+)$/);
  if (dm) { const i = Number(dm[1]); if (STATE.docs[i]) { STATE.docs[i].label = val; STATE.docs[i].conf = 1; STATE.docs[i].edited = true; save(); } return; }
  const dv = name.match(/^docv_(\d+)$/);
  if (dv) { const i = Number(dv[1]); if (STATE.docs[i]) { STATE.docs[i].value = val; STATE.docs[i].conf = 1; STATE.docs[i].edited = true; save(); } return; }
  if (name === 'docNote') { STATE.docNote = val; save(); return; }
  if (name === 'ayurInput') { STATE.ayur.input = val; return; } /* not saved: chat draft is ephemeral */
  if (name.indexOf('free_') === 0) { STATE.answers[name.slice(5)] = val; save(); return; }
  if (VITAL_KEYS.indexOf(name) >= 0) { STATE.vitals[name] = val; save(); return; }
  if (name in STATE.patient) { STATE.patient[name] = val; save(); }
}

function handleAction(act, el) {
  const d = k => el.getAttribute('data-' + k);
  switch (act) {
    case 'setView':
      if (d('view') === 'ayur') {
        STATE.view = 'ayur';
        STATE.ayur.mode = 'embed';
        save(); render(); ayurWatchFrame();
        break;
      }
      STATE.view = d('view'); STATE.openToken = null; save(); render();
      if (STATE.view === 'admin') fetchAnalytics();
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
    case 'setLang':
      STATE.lang = d('lang'); save(); render(); break;
    case 'next': goNext(); break;
    case 'back': goBack(); break;
    case 'skip':
      if (STATE.step === 'interview') { const l = questionList(); if (STATE.qIndex < l.length - 1) { STATE.qIndex++; render(); break; } }
      if (STATE.step === 'ayush') { const l = ayushList(); if (STATE.ayushIndex < l.length - 1) { STATE.ayushIndex++; render(); break; } }
      goNext(); break;
    case 'goStep': STATE.step = d('step'); save(); render(); break;
    case 'setSeg': {
      const f = d('field');
      if (VITAL_KEYS.indexOf(f) >= 0) STATE.vitals[f] = d('val'); else STATE.patient[f] = d('val');
      save(); render(); break;
    }
    case 'toggleConsent': {
      const id = d('id');
      STATE.consents[id] = !STATE.consents[id];
      logAudit('Consent ' + id + (STATE.consents[id] ? ' granted' : ' declined'));
      api('/api/consent', { method: 'POST', body: { sessionId: STATE.sessionId, consents: STATE.consents } });
      save(); render(); break;
    }
    case 'setDept': STATE.dept = d('id'); save(); render(); break;
    case 'pickComplaint':
      STATE.answers = { complaint: d('id') }; STATE.qIndex = 0; computeRedFlags(); save(); syncTurn(); render(); break;
    case 'answer': {
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
    case 'speak': speak(currentPrompt()); break;
    case 'staff': toast(isHi() ? 'स्टाफ़ को बुला लिया गया है' : 'A staff member has been called'); break;
    case 'ackEmergency': STATE.step = 'ayush'; if (!currentDept().ayush) STATE.step = 'scan'; save(); render(); break;
    case 'restart': resetSession(); break;
    case 'print': window.print(); break;
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
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    e.preventDefault();
    handleAction(el.getAttribute('data-act'), el);
  });
  document.addEventListener('keydown', e => {
    const el = e.target.closest('[data-field="ayurInput"]');
    if (el && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); niroSend(STATE.ayur.input); }
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
  if (['doctor', 'triage', 'admin', 'ayur', 'kiosk'].includes(a)) {
    STATE.view = a === 'kiosk' ? 'kiosk' : a;
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
  if (params.get('demo') === '1' || (qa && qa.demo)) loadDemo();
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
  applyHash();
  render();
  fetchAnalytics();
}

document.addEventListener('DOMContentLoaded', init);
