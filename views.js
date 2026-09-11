/* AarogyaVaani — view layer (pure render functions, no state mutation) */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function L(o) { return isHi() ? (o.hi || o.en) : (o.en || o.hi); }
function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

const KIOSK_STEPS = ['welcome', 'identity', 'demographics', 'contact', 'consent', 'department', 'vitals', 'complaint', 'interview', 'ayush', 'scan', 'review', 'done'];

/* ============ shell ============ */
function viewShell(inner) {
  const tabs = [['kiosk', 'Patient kiosk'], ['doctor', 'Doctor console'], ['triage', 'Triage desk'], ['ayur', 'AyurVaani'], ['admin', 'Admin & audit']];
  return `<div class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">${icon('cross', 20)}</div>
        <div class="brand-text"><b>AarogyaVaani · MediKiosk</b><small>SIH26047 · MINISTRY OF AYUSH</small></div>
      </div>
      <nav class="mode-switch">
        ${tabs.map(([id, label]) => `<button data-act="setView" data-view="${id}" class="${STATE.view === id ? 'active' : ''}">${label}</button>`).join('')}
      </nav>
      <div class="top-right">
        <span class="chip-live"><i></i>ABDM sandbox</span>
        <span class="quiet">AIIA · Kiosk 04</span>
      </div>
    </header>
    ${inner}
  </div>`;
}

function kioskFrame(body, opts = {}) {
  const idx = KIOSK_STEPS.indexOf(STATE.step);
  const visible = KIOSK_STEPS.filter(s => s !== 'done');
  const dots = visible.map((s, i) => `<i class="${i < idx ? 'done' : i === idx ? 'now' : ''}"></i>`).join('');
  return `<main class="kiosk-stage"><section class="kiosk-card">
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
  const err = STATE.errors[o.name];
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

function viewIdentity() {
  const p = STATE.patient;
  const body = `<span class="eyebrow">${isHi() ? 'चरण 1 · पहचान' : 'Step 1 · Identity'}</span>
    <h1 class="display">${t('idTitle')}</h1>
    <p class="subtitle">${t('idSub')}</p>
    <div class="form-grid">
      ${field({ name: 'abha', label: isHi() ? 'ABHA नंबर या पता' : 'ABHA number or address', value: p.abha, ph: '91-2345-6789-0123', full: true, hint: isHi() ? 'नहीं है तो छोड़ दीजिए — आगे बढ़ सकते हैं' : 'No ABHA? Leave blank and continue.' })}
      ${field({ name: 'uhid', label: isHi() ? 'अस्पताल UHID (यदि हो)' : 'Hospital UHID (if any)', value: p.uhid, ph: 'AIIA/2026/00918' })}
      ${field({ name: 'visitType', label: isHi() ? 'यह आपकी कौन सी मुलाक़ात है?' : 'Type of visit', type: 'seg', value: p.visitType, options: [{ v: 'new', l: isHi() ? 'पहली बार' : 'First visit' }, { v: 'follow', l: isHi() ? 'फ़ॉलो-अप' : 'Follow-up' }] })}
    </div>
    ${STATE.otp.verified ? `<div class="otp-ok">${icon('check', 15)} ${t('otpVerified')} · ${esc(p.abha || '')}</div>` : `
    <div class="otp-box card">
      <div class="otp-head">${icon('lock', 16)} <b>${isHi() ? 'ABHA OTP लॉगिन' : 'ABHA OTP login'}</b></div>
      ${STATE.otp.sent ? `
      <div class="otp-row">
        <input class="input otp-input" data-field="otp" value="${esc(STATE.otp.value)}" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="OTP" />
        <button class="btn primary" data-act="verifyOtp">${t('verifyOtp')}</button>
      </div>
      <span class="hint">${t('loginOtpHint')}</span>` : `
      <button class="btn secondary sm" data-act="sendOtp">${icon('send', 14)} ${t('sendOtp')}</button>`}
      <span class="hint" style="margin-top:8px">${t('loginExplain')}</span>
    </div>`}
    <div class="voice" style="border-style:solid;background:var(--blue-soft);border-color:#BFDDF7">
      ${icon('shield', 22)}
      <div class="vtext"><b>${isHi() ? 'आपकी पहचान गोपनीय रहती है' : 'Your identity stays private'}</b>
      <span>${isHi() ? 'ABHA से सिर्फ़ पुराने रिकॉर्ड जुड़ते हैं, आपकी मर्ज़ी के बिना कुछ साझा नहीं होता।' : 'ABHA only links your past records. Nothing is shared without your consent.'}</span></div>
    </div>`;
  return kioskFrame(body, { skip: true });
}

function viewDemographics() {
  const p = STATE.patient;
  const body = `<span class="eyebrow">${isHi() ? 'चरण 2 · बुनियादी जानकारी' : 'Step 2 · Demographics'}</span>
    <h1 class="display">${t('demoTitle')}</h1>
    <p class="subtitle">${t('demoSub')}</p>
    <div class="form-grid">
      ${field({ name: 'name', label: isHi() ? 'पूरा नाम' : 'Full name', value: p.name, required: true, ph: isHi() ? 'रमेश कुमार' : 'Ramesh Kumar', full: true })}
      ${field({ name: 'age', label: isHi() ? 'उम्र (साल)' : 'Age (years)', value: p.age, required: true, type: 'number', inputmode: 'numeric', ph: '58' })}
      ${field({ name: 'dob', label: isHi() ? 'जन्म तिथि (यदि याद हो)' : 'Date of birth (if known)', value: p.dob, type: 'date' })}
      ${field({ name: 'gender', label: isHi() ? 'लिंग' : 'Gender', type: 'seg', value: p.gender, required: true, compact: true, options: GENDERS.map(g => ({ v: g.id, l: L(g) })) , full: true })}
      ${field({ name: 'blood', label: isHi() ? 'ब्लड ग्रुप' : 'Blood group', type: 'select', value: p.blood, options: BLOOD_GROUPS.map(b => ({ v: b, l: b })) })}
      ${field({ name: 'marital', label: isHi() ? 'वैवाहिक स्थिति' : 'Marital status', type: 'select', value: p.marital, options: MARITAL.map(m => ({ v: m.id, l: L(m) })) })}
      ${field({ name: 'occupation', label: isHi() ? 'काम / पेशा' : 'Occupation', type: 'select', value: p.occupation, options: OCCUPATIONS.map(o => ({ v: o.id, l: L(o) })) })}
      ${field({ name: 'education', label: isHi() ? 'पढ़ाई' : 'Education', type: 'select', value: p.education, options: [{ v: 'none', l: isHi() ? 'स्कूल नहीं' : 'No formal schooling' }, { v: 'primary', l: isHi() ? 'प्राथमिक' : 'Primary' }, { v: 'secondary', l: isHi() ? 'माध्यमिक' : 'Secondary' }, { v: 'graduate', l: isHi() ? 'स्नातक+' : 'Graduate or above' }] })}
    </div>`;
  return kioskFrame(body);
}

function viewContact() {
  const p = STATE.patient;
  const body = `<span class="eyebrow">${isHi() ? 'चरण 3 · संपर्क' : 'Step 3 · Contact'}</span>
    <h1 class="display">${t('contactTitle')}</h1>
    <p class="subtitle">${t('contactSub')}</p>
    <div class="form-grid">
      ${field({ name: 'phone', label: isHi() ? 'मोबाइल नंबर' : 'Mobile number', value: p.phone, required: true, inputmode: 'numeric', maxlength: 10, ph: '98XXXXXX21' })}
      ${field({ name: 'altPhone', label: isHi() ? 'दूसरा नंबर' : 'Alternate number', value: p.altPhone, inputmode: 'numeric', maxlength: 10 })}
      ${field({ name: 'address', label: isHi() ? 'पता (मकान, गाँव / मोहल्ला)' : 'Address (house, village or locality)', value: p.address, type: 'textarea', full: true, required: true, ph: isHi() ? 'मकान सं. 14, गांधी नगर' : 'House 14, Gandhi Nagar' })}
      ${field({ name: 'city', label: isHi() ? 'शहर / ज़िला' : 'City or district', value: p.city, required: true })}
      ${field({ name: 'state', label: isHi() ? 'राज्य' : 'State', type: 'select', value: p.state, options: STATES_IN.map(s => ({ v: s, l: s })) })}
      ${field({ name: 'pincode', label: 'PIN code', value: p.pincode, inputmode: 'numeric', maxlength: 6, ph: '110076' })}
      ${field({ name: 'area', label: isHi() ? 'क्षेत्र' : 'Area type', type: 'seg', value: p.area, compact: true, options: [{ v: 'urban', l: isHi() ? 'शहरी' : 'Urban' }, { v: 'rural', l: isHi() ? 'ग्रामीण' : 'Rural' }, { v: 'tribal', l: isHi() ? 'आदिवासी' : 'Tribal' }] })}
    </div>
    <div class="review-card card" style="margin-top:20px">
      <h3>${isHi() ? 'आपातकालीन संपर्क' : 'Emergency contact'}</h3>
      <div class="form-grid" style="margin-top:0">
        ${field({ name: 'emgName', label: isHi() ? 'नाम' : 'Name', value: p.emgName, required: true })}
        ${field({ name: 'emgRelation', label: isHi() ? 'रिश्ता' : 'Relationship', type: 'select', value: p.emgRelation, options: RELATIONS.map(r => ({ v: r.id, l: L(r) })) })}
        ${field({ name: 'emgPhone', label: isHi() ? 'नंबर' : 'Phone', value: p.emgPhone, inputmode: 'numeric', maxlength: 10, required: true })}
        ${field({ name: 'caregiver', label: isHi() ? 'आज साथ में कौन आया है?' : 'Who is with you today?', type: 'select', value: p.caregiver, options: [{ v: 'alone', l: isHi() ? 'अकेले आए हैं' : 'Came alone' }, ...RELATIONS.map(r => ({ v: r.id, l: L(r) }))] })}
      </div>
    </div>`;
  return kioskFrame(body);
}

function viewConsent() {
  const body = `<span class="eyebrow">${icon('shield', 14)} ${isHi() ? 'चरण 4 · सहमति' : 'Step 4 · Consent'}</span>
    <h1 class="display">${t('consentTitle')}</h1>
    <p class="subtitle">${isHi() ? 'हर बात अलग से चुनिए। आप कभी भी मना कर सकते हैं, इलाज फिर भी मिलेगा।' : 'Choose each item separately. You can refuse any of them and still receive care.'}
      <button class="btn secondary sm" style="margin-top:10px" data-act="speak">${icon('volume', 15)} ${isHi() ? 'सब सुनें' : 'Listen to all'}</button></p>
    <div class="consent-list">
      ${CONSENTS.map(c => {
        const on = !!STATE.consents[c.id];
        return `<div class="consent-item ${on ? 'on' : ''}">
          <div class="c-body">
            <b>${esc(L(c))} ${c.required ? `<span class="badge-req">${isHi() ? 'आवश्यक' : 'Required'}</span>` : ''}</b>
            <small>${esc(c.detail)}</small>
          </div>
          <button class="toggle ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${esc(L(c))}" data-act="toggleConsent" data-id="${c.id}"><i></i></button>
        </div>`;
      }).join('')}
    </div>
    <p class="quiet" style="margin-top:14px">${icon('lock', 13)} ${isHi() ? 'DPDP अधिनियम 2023 के तहत हर सहमति समय के साथ दर्ज होती है।' : 'Every consent is timestamped and logged under the DPDP Act 2023.'}</p>`;
  const ok = CONSENTS.filter(c => c.required).every(c => STATE.consents[c.id]);
  return kioskFrame(body, { nextDisabled: !ok, nextLabel: isHi() ? 'सहमति देकर आगे' : 'Agree and continue' });
}

function viewDepartment() {
  const body = `<span class="eyebrow">${isHi() ? 'चरण 5 · विभाग' : 'Step 5 · Department'}</span>
    <h1 class="display">${t('deptTitle')}</h1>
    <p class="subtitle">${t('deptSub')}</p>
    <div class="choices two">
      ${DEPARTMENTS.map(d => `<button class="choice ${STATE.dept === d.id ? 'on' : ''}" data-act="setDept" data-id="${d.id}">
        <span class="tick">${icon('check', 15)}</span>
        <span class="txt"><b>${esc(L(d))}</b><small>${esc(d.note)}</small></span>
      </button>`).join('')}
    </div>`;
  return kioskFrame(body, { nextDisabled: !STATE.dept });
}

function viewVitals() {
  const v = STATE.vitals;
  const bmi = calcBmi(v);
  const body = `<span class="eyebrow">${icon('pulse', 14)} ${isHi() ? 'चरण 6 · जाँच' : 'Step 6 · Vitals'}</span>
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
  const body = `<span class="eyebrow">${isHi() ? 'चरण 7 · मुख्य शिकायत' : 'Step 7 · Chief complaint'}</span>
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
  const on = STATE.listening;
  return `<div class="voice">
    <button class="mic-btn ${on ? 'listening' : ''}" data-act="mic">${icon('mic', 24)}</button>
    <div class="vtext">
      <b>${on ? (isHi() ? 'सुन रहे हैं… बोलिए' : 'Listening… please speak') : t('voiceHint')}</b>
      <span>${isHi() ? 'बोलना न चाहें तो ऊपर से छूकर चुन लीजिए।' : 'Prefer not to speak? Just tap an option above.'}</span>
      <div class="wave ${on ? 'on' : ''}">${Array.from({ length: 22 }).map(() => '<b></b>').join('')}</div>
    </div>
    <button class="btn secondary sm" data-act="speak">${icon('volume', 15)} ${isHi() ? 'दोबारा सुनें' : 'Repeat'}</button>
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
    <div class="rail">${list.map((_, i) => `<i class="${i <= STATE.ayushIndex ? 'done' : ''}"></i>`).join('')}</div>`;
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
  const body = `<span class="eyebrow">${icon('scan', 14)} ${isHi() ? 'दस्तावेज़' : 'Documents'}</span>
    <h1 class="display">${t('scanTitle')}</h1>
    <p class="subtitle">${isHi() ? 'पर्ची, जाँच रिपोर्ट या दवा की पर्ची कैमरे के नीचे रखिए। न हो तो छोड़ दीजिए।' : 'Place a prescription, lab report or medicine strip under the camera. Skip if you have none.'}</p>
    <div class="two-col" style="margin-top:20px">
      <div class="doc-scan">
        <div class="paper">
          <b>${isHi() ? 'कैमरा प्रीव्यू' : 'Camera preview'}</b><small>${isHi() ? 'काग़ज़ सीधा रखें' : 'Keep the paper flat'}</small>
          <div class="ln" style="width:70%"></div><div class="ln" style="width:92%"></div><div class="ln" style="width:54%"></div><div class="ln" style="width:84%"></div><div class="ln" style="width:44%"></div>
          ${STATE.docs.length ? '<div class="bbox" style="left:14px;top:58px;width:150px;height:22px"></div><div class="bbox warn" style="left:14px;top:96px;width:112px;height:22px"></div>' : ''}
        </div>
        <input type="file" data-act-file accept="image/*" capture="environment" style="display:none" />
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn primary sm" style="flex:1;min-width:150px" data-act="uploadDoc">${icon('scan', 15)} ${isHi() ? 'फ़ोटो अपलोड करें' : 'Upload photo & read'}</button>
          <button class="btn secondary sm" data-act="scanDoc">${isHi() ? 'तुरंत डेमो स्कैन' : 'Instant demo scan'}</button>
          <button class="btn secondary sm" data-act="skip">${isHi() ? 'काग़ज़ नहीं है' : 'No papers'}</button>
        </div>
        ${STATE.ocr.status !== 'idle' ? ocrProgressBlock() : ''}
      </div>
      <div class="card">
        ${STATE.docs.length === 0 ? `<div class="empty">${isHi() ? 'अभी कोई काग़ज़ नहीं जोड़ा गया' : 'No documents added yet'}</div>`
          : STATE.docs.map((d, i) => `<div class="extract">
              <div style="flex:1;min-width:0">
                <input class="input sm" data-field="docl_${i}" value="${esc(d.label)}" aria-label="Field name" />
                <input class="input sm" data-field="docv_${i}" value="${esc(d.value)}" aria-label="Extracted value" />
                ${d.date ? `<small>${esc(d.date)}</small>` : ''}
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span class="conf ${d.conf >= 0.9 ? 'good' : d.conf >= 0.75 ? 'warn' : 'bad'}">${Math.round(d.conf * 100)}%</span>
                ${d.edited ? `<span class="pill ok">${isHi() ? 'बदला' : 'edited'}</span>` : ''}
                <button class="tiny" data-act="removeDoc" data-i="${i}">${isHi() ? 'हटाएँ' : 'Remove'}</button>
              </div>
            </div>`).join('')}
      </div>
    </div>
    <p class="quiet" style="margin-top:14px">${icon('alert', 13)} ${isHi() ? '85% से कम भरोसे वाली हर पंक्ति डॉक्टर को जाँच के लिए दिखाई जाती है। बदलने पर भरोसा 100% माना जाता है।' : 'Anything read below 85% confidence is flagged for the doctor to verify. Editing a field marks it 100%.'}</p>`;
  return kioskFrame(body, { nextLabel: isHi() ? 'सारांश देखें' : 'Review summary' });
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
      <button class="btn primary" data-act="setView" data-view="doctor">${isHi() ? 'डॉक्टर व्यू देखें' : 'Open doctor view'} ${icon('arrow', 16)}</button>
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
function viewTriage() {
  const alerts = queueRows().filter(r => r.triage !== 'routine');
  return `<main class="dash">
    <div class="dash-head"><div><h1>Triage desk</h1><p>Rule-based alerts from kiosk sessions. Acknowledge to notify the duty doctor.</p></div>
      <span class="pill ${STATE.triageAck ? 'ok' : 'em'}">${STATE.triageAck ? 'All alerts acknowledged' : alerts.length + ' open alert(s)'}</span></div>
    <div class="stats">
      <div class="stat"><div class="n">${alerts.length}</div><p>Active alerts</p></div>
      <div class="stat"><div class="n">38 s</div><p>Median alert-to-ack</p><div class="trend up">Target under 60 s</div></div>
      <div class="stat"><div class="n">6</div><p>Escalations today</p></div>
      <div class="stat"><div class="n">0</div><p>Missed alerts</p><div class="trend up">Audit clean</div></div>
    </div>
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
    </div>`).join('') || `<div class="card"><div class="empty">No active alerts. Kiosk sessions are running normally.</div></div>`}
    <p class="foot-note">${icon('shield', 14)} Alerts are deterministic rules reviewed by the AIIA clinical committee — no model output reaches this screen.</p>
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
function render() {
  let inner;
  if (STATE.view === 'doctor') inner = viewDoctor();
  else if (STATE.view === 'triage') inner = viewTriage();
  else if (STATE.view === 'admin') inner = viewAdmin();
  else if (STATE.view === 'ayur') inner = viewAyur();
  else if (STATE.step === 'emergency') inner = viewEmergency();
  else if (STATE.step === 'welcome') inner = viewWelcome();
  else if (STATE.step === 'identity') inner = viewIdentity();
  else if (STATE.step === 'demographics') inner = viewDemographics();
  else if (STATE.step === 'contact') inner = viewContact();
  else if (STATE.step === 'consent') inner = viewConsent();
  else if (STATE.step === 'department') inner = viewDepartment();
  else if (STATE.step === 'vitals') inner = viewVitals();
  else if (STATE.step === 'complaint') inner = viewComplaint();
  else if (STATE.step === 'interview') inner = viewInterview();
  else if (STATE.step === 'ayush') inner = viewAyush();
  else if (STATE.step === 'scan') inner = viewScan();
  else if (STATE.step === 'review') inner = viewReview();
  else inner = viewDone();
  document.getElementById('app').innerHTML = viewShell(inner);
}
