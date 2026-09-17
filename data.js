/* AarogyaVaani — static content, clinical ontology, seed data */

/* Backend API lives on the same origin (see server.mjs). Set to a full URL when
   the kiosk UI and the API are hosted separately. */
const API_BASE = window.API_BASE || '';
const DEMO_OTP = '1234'; /* static demo OTP per the implementation document */

/* Client-side fallback analytics, used when the API is unreachable */
const CLIENT_ANALYTICS_FALLBACK = {
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

const ICONS = {
  cross: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"/>',
  volume: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z"/><path d="M15.5 9.5a4 4 0 0 1 0 5M18 7a8 8 0 0 1 0 10"/>',
  mute: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  alert: '<path d="M10.3 3.2 2.8 17a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 3.2a2 2 0 0 0-3.4 0Z"/><path d="M12 8.5v4.5M12 16.5h.01"/>',
  file: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z"/><path d="M14 2.5V8h5.5M8.5 13.5h7M8.5 17h5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
  back: '<path d="M19 12H5M10.5 6.5 5 12l5.5 5.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21v-1.5A5.5 5.5 0 0 1 10 14h4a5.5 5.5 0 0 1 5.5 5.5V21"/>',
  heart: '<path d="M12 20s-7.5-4.7-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10Z"/>',
  pulse: '<path d="M2.5 12h4l2-6 4 12 2.5-6h6.5"/>',
  scan: '<path d="M4 8.5V5.5a1.5 1.5 0 0 1 1.5-1.5H8.5M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3"/><path d="M7.5 9.5h9v5h-9z"/>',
  leaf: '<path d="M4 20c0-8 6-14 16-15 0 10-5.5 15-13 15H4Z"/><path d="M4 20c3-5 7-8 12-10"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  shield: '<path d="M12 3 5 6v6c0 4.3 3 7.7 7 9 4-1.3 7-4.7 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  print: '<path d="M7 9V3.5h10V9M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14h10v6.5H7z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m14.5 6.5 3 3"/>',
  send: '<path d="M4 12 20 4l-6 16-3.5-6.5L4 12Z"/><path d="M20 4 10.5 13.5"/>',
  heartpulse: '<path d="M12 20s-7.5-4.7-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10Z"/><path d="M8 11.5h2.5l1.5-2.5 2 4 1.5-1.5H16.5"/>',
  wind: '<path d="M3 8h8.5a3 3 0 1 0-2.9-3.7"/><path d="M3 12h11.5a3.5 3.5 0 1 1-3.4 4.4"/><path d="M3 16h5"/>',
  thermometer: '<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/><path d="M12 9v7"/>',
  stomach: '<path d="M5.5 9.5C5.5 5 9 3 12 3s6.5 2 6.5 6.5c0 2.6-1 5.7-2.9 7.6-1.2 1.2-2.6 2-3.6 2s-2.4-.8-3.6-2C7.5 15.2 5.5 12.1 5.5 9.5Z"/>',
  brain: '<path d="M9.5 4.5A2.5 2.5 0 0 1 12 7v10a2.5 2.5 0 1 1-4.5-1.4A3 3 0 0 1 5 13a3 3 0 0 1 1.8-2.8A3 3 0 0 1 5 7.5 3 3 0 0 1 9.5 4.5Z"/><path d="M14.5 4.5A2.5 2.5 0 0 0 12 7v10a2.5 2.5 0 1 0 4.5-1.4A3 3 0 0 0 19 13a3 3 0 0 0-1.8-2.8A3 3 0 0 0 19 7.5 3 3 0 0 0 14.5 4.5Z"/>',
  bone: '<path d="M17 10c.7-.7 1.7 0 2.5 0a2.5 2.5 0 1 0 0-5c-.8 0-1.7.7-2.5 0S16 2.5 15 2.5a2.5 2.5 0 1 0 0 5c.8 0 .7 1.7 0 2.5s-.7 2 0 2.5.7 1.7 0 2.5c-.7.8-2 0-2.5 0a2.5 2.5 0 1 0 0 5c.8 0 .7-1.7 1.5-2.5"/>',
  bandage: '<path d="m10 3 11 11-7 7L3 10l7-7Z"/><path d="m8 5 11 11"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  translate: '<path d="M4 6h9M8.5 4v2M11 6c0 4-3.2 7.5-7 8.5"/><path d="M6 10.5c1.4 2.4 3.6 4 6.5 4.6M13 20l4-9 4 9M14.6 17h4.8"/>',
  phone: '<path d="M8 3.5H5.5A1.5 1.5 0 0 0 4 5c0 8.3 6.7 15 15 15a1.5 1.5 0 0 0 1.5-1.5V16l-4-1.5-2 2A13 13 0 0 1 8 10l2-2L8 3.5Z"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  camera: '<path d="M4 8h3l1.8-2.2h6.4L17 8h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8Z"/><circle cx="12" cy="13.5" r="3.2"/>',
  bluetooth: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
  qr: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><path d="M13.5 13.5h3.2v3.2H13.5zM19 13.5v6h-6"/>',
  home: '<path d="M4 11.5 12 4l8 7.5V20h-5.5v-6h-5v6H4Z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.1M12 18.4v2.1M4.9 7.2l1.5 1.5M17.6 15.3l1.5 1.5M3.5 12h2.1M18.4 12h2.1M4.9 16.8l1.5-1.5M17.6 8.7l1.5-1.5"/>',
  bell: '<path d="M6 9.5a6 6 0 0 1 12 0c0 7 1.5 8 1.5 8H4.5S6 16.5 6 9.5Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>',
  logout: '<path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10M13 8l4 4-4 4M9 12h8"/>',
  steth: '<path d="M6 4v7a4 4 0 0 0 8 0V4"/><path d="M6 4H4.5M14 4h1.5"/><circle cx="18" cy="16" r="3"/><path d="M18 13v-1a6 6 0 0 1-6 6"/>'
};

function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.cross}</svg>`;
}

/* ---------------- languages ---------------- */
const LANGS = [
  { id: 'hi', native: 'हिन्दी', english: 'Hindi', speakers: '52 करोड़+' },
  { id: 'en', native: 'English', english: 'English', speakers: 'Default' },
  { id: 'mr', native: 'मराठी', english: 'Marathi', speakers: '8.3 कोटी' },
  { id: 'bn', native: 'বাংলা', english: 'Bengali', speakers: '9.7 কোটি' },
  { id: 'ta', native: 'தமிழ்', english: 'Tamil', speakers: '6.9 கோடி' },
  { id: 'te', native: 'తెలుగు', english: 'Telugu', speakers: '8.1 కోటి' }
];

/* i18n: only hi + en fully authored; other languages fall back to English copy
   with their own script header, which is the honest prototype behaviour. */
const T = {
  hi: {
    tagline: 'पहले अपनी बात, फिर डॉक्टर से मुलाक़ात',
    welcomeTitle: 'अपनी भाषा चुनिए',
    welcomeSub: 'आप जिस भाषा में सहज हैं उसी में अपनी तकलीफ़ बताइए। हर जवाब बोलकर या छूकर दिया जा सकता है।',
    next: 'आगे बढ़ें', back: 'वापस', skip: 'छोड़ें', staff: 'स्टाफ़ की मदद',
    yes: 'हाँ', no: 'नहीं', notSure: 'पता नहीं',
    idTitle: 'आइए, पहचान से शुरू करते हैं',
    idSub: 'ABHA से आपका पुराना रिकॉर्ड अपने आप जुड़ जाएगा।',
    loginOtpHint: 'डेमो OTP: 1234',
    sendOtp: 'OTP भेजें',
    verifyOtp: 'जाँच करें',
    otpVerified: 'पहचान सत्यापित ✓',
    otpWrong: 'OTP गलत है — डेमो OTP 1234 है',
    loginExplain: 'ABHA वाला OTP-लॉगिन डेमो के लिए स्थिर है। असली सिस्टम में ABDM OAuth2 से जुड़ेगा।',
    demoTitle: 'आपकी बुनियादी जानकारी',
    demoSub: 'यह जानकारी डॉक्टर की पर्ची और आपके अस्पताल रिकॉर्ड पर छपेगी।',
    contactTitle: 'संपर्क और पता',
    contactSub: 'आपात स्थिति में परिवार को सूचित करने के लिए ज़रूरी है।',
    consentTitle: 'आपकी अनुमति ज़रूरी है',
    deptTitle: 'आज आप किस विभाग में जा रहे हैं?',
    deptSub: 'इससे हम सही सवाल पूछ पाएँगे।',
    vitalsTitle: 'आपकी जाँच (वैकल्पिक)',
    vitalsSub: 'नर्स या कियोस्क उपकरण से लिया गया माप।',
    interviewOf: 'सवाल',
    voiceHint: 'पढ़ने के बजाय सुन सकते हैं',
    ayushTitle: 'आयुर्वेदिक आकलन',
    scanTitle: 'अपना दस्तावेज़ स्कैन करें',
    reviewTitle: 'एक बार देख लीजिए',
    reviewSub: 'कुछ ग़लत हो तो अभी बदल सकते हैं।',
    doneTitle: 'आपकी जानकारी डॉक्टर तक पहुँच गई है'
  },
  en: {
    tagline: 'Your story first, then the doctor',
    welcomeTitle: 'Choose your language',
    welcomeSub: 'Tell us about your health in the language you are most comfortable with. Every question can be answered by speaking or tapping.',
    next: 'Continue', back: 'Back', skip: 'Skip', staff: 'Staff help',
    yes: 'Yes', no: 'No', notSure: 'Not sure',
    idTitle: 'Let’s begin with your identity',
    idSub: 'ABHA links your existing records automatically.',
    loginOtpHint: 'Demo OTP: 1234',
    sendOtp: 'Send OTP',
    verifyOtp: 'Verify',
    otpVerified: 'Identity verified ✓',
    otpWrong: 'Wrong OTP — the demo OTP is 1234',
    loginExplain: 'ABHA OTP login is static for the demo. Production would use ABDM OAuth2.',
    demoTitle: 'Your basic details',
    demoSub: 'These details appear on your prescription and hospital record.',
    contactTitle: 'Contact and address',
    contactSub: 'Needed so we can reach your family in an emergency.',
    consentTitle: 'Your consent matters',
    deptTitle: 'Which department are you visiting today?',
    deptSub: 'This helps us ask the right questions.',
    vitalsTitle: 'Your measurements (optional)',
    vitalsSub: 'Captured by the nurse or the kiosk devices.',
    interviewOf: 'Question',
    voiceHint: 'Listen instead of reading',
    ayushTitle: 'Ayurvedic assessment',
    scanTitle: 'Scan your document',
    reviewTitle: 'Please check this once',
    reviewSub: 'You can correct anything before it reaches the doctor.',
    doneTitle: 'Your information has reached your doctor'
  }
};
function t(key) { return (T[STATE.lang] || T.en)[key] || T.en[key] || key; }
function isHi() { return STATE.lang === 'hi'; }
function L(o) {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  return isHi() ? (o.hi || o.en || o.label || '') : (o.en || o.hi || o.label || '');
}

/* ---------------- demographics schema ---------------- */
const GENDERS = [
  { id: 'male', hi: 'पुरुष', en: 'Male' },
  { id: 'female', hi: 'महिला', en: 'Female' },
  { id: 'transgender', hi: 'ट्रांसजेंडर', en: 'Transgender' },
  { id: 'undisclosed', hi: 'बताना नहीं चाहते', en: 'Prefer not to say' }
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const MARITAL = [
  { id: 'single', hi: 'अविवाहित', en: 'Single' },
  { id: 'married', hi: 'विवाहित', en: 'Married' },
  { id: 'widowed', hi: 'विधवा / विधुर', en: 'Widowed' },
  { id: 'separated', hi: 'अलग', en: 'Separated' }
];
const OCCUPATIONS = [
  { id: 'farmer', hi: 'किसान', en: 'Farmer' },
  { id: 'labour', hi: 'मज़दूरी', en: 'Daily wage / labour' },
  { id: 'service', hi: 'नौकरी', en: 'Salaried' },
  { id: 'business', hi: 'व्यापार', en: 'Business' },
  { id: 'homemaker', hi: 'गृहिणी', en: 'Homemaker' },
  { id: 'student', hi: 'छात्र', en: 'Student' },
  { id: 'retired', hi: 'सेवानिवृत्त', en: 'Retired' },
  { id: 'other', hi: 'अन्य', en: 'Other' }
];
const RELATIONS = [
  { id: 'spouse', hi: 'पति / पत्नी', en: 'Spouse' },
  { id: 'father', hi: 'पिता', en: 'Father' },
  { id: 'mother', hi: 'माता', en: 'Mother' },
  { id: 'son', hi: 'बेटा', en: 'Son' },
  { id: 'daughter', hi: 'बेटी', en: 'Daughter' },
  { id: 'parent', hi: 'माता / पिता', en: 'Parent' },
  { id: 'sibling', hi: 'भाई / बहन', en: 'Sibling' },
  { id: 'other', hi: 'अन्य', en: 'Other' }
];
const STATES_IN = ['Delhi', 'Uttar Pradesh', 'Maharashtra', 'Bihar', 'Rajasthan', 'Madhya Pradesh', 'West Bengal', 'Tamil Nadu', 'Karnataka', 'Gujarat', 'Kerala', 'Punjab', 'Haryana', 'Odisha', 'Assam', 'Other'];

const DEPARTMENTS = [
  { id: 'kaya', hi: 'कायचिकित्सा · आयुर्वेद OPD', en: 'Kayachikitsa · Ayurveda OPD', note: 'Dashavidha Pariksha enabled', ayush: true, icon: 'leaf' },
  { id: 'panchakarma', hi: 'पंचकर्म OPD', en: 'Panchakarma OPD', note: 'Dashavidha + therapy readiness', ayush: true, icon: 'leaf' },
  { id: 'general', hi: 'सामान्य चिकित्सा OPD', en: 'General Medicine OPD', note: 'Allopathic history path', ayush: false, icon: 'heart' },
  { id: 'shalya', hi: 'शल्य · सर्जरी OPD', en: 'Shalya · Surgery OPD', note: 'Adds surgical & anaesthesia history', ayush: true, icon: 'pulse' },
  { id: 'prasuti', hi: 'प्रसूति एवं स्त्री रोग', en: 'Obstetrics & Gynaecology', note: 'Adds obstetric history', ayush: true, icon: 'user' },
  { id: 'kaumar', hi: 'कौमारभृत्य · बाल रोग', en: 'Kaumarbhritya · Paediatrics', note: 'Guardian-assisted intake', ayush: true, icon: 'user' }
];

/* ---------------- consent ---------------- */
const CONSENTS = [
  { id: 'c1', required: true, hi: 'इस मुलाक़ात की बातचीत रिकॉर्ड की जाएगी।', en: 'Record this visit’s conversation.', detail: 'Audio is processed for history only and deleted from the kiosk after submission.' },
  { id: 'c2', required: true, hi: 'आपकी हिस्ट्री अस्पताल के रिकॉर्ड में सुरक्षित रखी जाएगी।', en: 'Store your history in the hospital record.', detail: 'Stored under DPDP Act 2023 purpose limitation.' },
  { id: 'c3', required: false, hi: 'आपके पुराने काग़ज़ स्कैन करके इस मुलाक़ात से जोड़े जाएँगे।', en: 'Scan and attach your medical papers.', detail: 'You can skip scanning entirely.' },
  { id: 'c4', required: false, hi: 'आपका रिकॉर्ड ABHA स्वास्थ्य खाते में भेजा जाएगा।', en: 'Share this visit with your ABHA health account.', detail: 'Turned off means hospital-only storage, no ABDM push.' },
  { id: 'c5', required: false, defaultOff: true, hi: 'बिना नाम के डेटा से कियोस्क बेहतर बनाया जाएगा।', en: 'Use de-identified data to improve the kiosk.', detail: 'Never includes name, ABHA or phone.', detailHi: 'नाम, ABHA या फ़ोन शामिल नहीं होता।' }
];

/* ---------------- interview ontology ---------------- */
const COMPLAINTS = [
  { id: 'chest', hi: 'सीने में दर्द', en: 'Chest pain', icon: 'heartpulse' },
  { id: 'breath', hi: 'साँस फूलना', en: 'Breathlessness', icon: 'wind' },
  { id: 'fever', hi: 'बुखार', en: 'Fever', icon: 'thermometer' },
  { id: 'abdomen', hi: 'पेट दर्द', en: 'Abdominal pain', icon: 'stomach' },
  { id: 'headache', hi: 'सिर दर्द', en: 'Headache', icon: 'brain' },
  { id: 'joint', hi: 'जोड़ों का दर्द', en: 'Joint pain', icon: 'bone' },
  { id: 'skin', hi: 'त्वचा की समस्या', en: 'Skin problem', icon: 'bandage' },
  { id: 'digestion', hi: 'पाचन / कब्ज़', en: 'Digestion / constipation', icon: 'utensils' },
  { id: 'other', hi: 'कुछ और', en: 'Something else', icon: 'chat' }
];

const opt = (id, hi, en) => ({ id, hi, en });

/* Common SOCRATES-style blocks reused by complaint routers */
const BLOCK = {
  onset: { key: 'onset', hi: 'यह तकलीफ़ कैसे शुरू हुई?', en: 'How did it begin?', options: [opt('sudden', 'अचानक', 'Suddenly'), opt('gradual', 'धीरे-धीरे', 'Gradually'), opt('after_effort', 'मेहनत के बाद', 'After exertion'), opt('unsure', 'पता नहीं', 'Not sure')] },
  duration: { key: 'duration', hi: 'कितने समय से है?', en: 'How long have you had this?', options: [opt('hours', 'कुछ घंटे', 'A few hours'), opt('days', 'कुछ दिन', 'A few days'), opt('weeks', 'कुछ हफ़्ते', 'A few weeks'), opt('months', 'महीनों से', 'Months or longer')] },
  severity: { key: 'severity', hi: '0 से 10 तक, तकलीफ़ कितनी तेज़ है?', en: 'On a scale of 0 to 10, how severe is it?', scale: true },
  timing: { key: 'timing', hi: 'दिन में कब ज़्यादा होती है?', en: 'When is it worse?', options: [opt('morning', 'सुबह', 'Morning'), opt('night', 'रात में', 'At night'), opt('after_food', 'खाने के बाद', 'After food'), opt('anytime', 'कभी भी', 'Anytime')] }
};

const ROUTERS = {
  chest: [
    { key: 'site', hi: 'दर्द कहाँ है? उँगली से दिखाइए।', en: 'Where is the pain? Please point to it.', options: [opt('central', 'सीने के बीच में', 'Centre of chest'), opt('left', 'बाईं तरफ़', 'Left side'), opt('upper_abdo', 'ऊपरी पेट', 'Upper abdomen'), opt('back', 'पीठ तक', 'Towards the back')] },
    BLOCK.onset,
    { key: 'character', hi: 'दर्द कैसा महसूस होता है?', en: 'What does it feel like?', options: [opt('pressure', 'दबाव जैसा', 'Pressure / heaviness'), opt('burning', 'जलन', 'Burning'), opt('sharp', 'चुभन', 'Sharp'), opt('tight', 'जकड़न', 'Tightness')] },
    { key: 'radiation', hi: 'दर्द कहीं और भी जाता है?', en: 'Does the pain travel anywhere?', options: [opt('left_arm', 'बाएँ हाथ में', 'Left arm'), opt('jaw', 'जबड़े तक', 'Jaw'), opt('back', 'पीठ में', 'Back'), opt('no', 'नहीं जाता', 'It stays in one place')] },
    { key: 'associated', hi: 'साथ में और क्या तकलीफ़ है?', en: 'What else do you feel with it?', multi: true, options: [opt('dyspnoea', 'साँस फूलना', 'Breathlessness'), opt('sweating', 'ठंडा पसीना', 'Cold sweating'), opt('nausea', 'मतली / उल्टी', 'Nausea or vomiting'), opt('giddiness', 'चक्कर', 'Giddiness'), opt('none', 'इनमें से कोई नहीं', 'None of these')] },
    BLOCK.severity,
    { key: 'exertion', hi: 'चलने या सीढ़ी चढ़ने पर बढ़ता है?', en: 'Does it worsen on walking or climbing stairs?', options: [opt('yes', 'हाँ, बढ़ता है', 'Yes, it worsens'), opt('no', 'नहीं', 'No'), opt('rest_also', 'आराम में भी होता है', 'Happens at rest too')] }
  ],
  breath: [
    BLOCK.onset, BLOCK.duration,
    { key: 'orthopnoea', hi: 'लेटने पर साँस और फूलती है?', en: 'Is it worse when lying flat?', options: [opt('yes', 'हाँ', 'Yes'), opt('no', 'नहीं', 'No'), opt('unsure', 'पता नहीं', 'Not sure')] },
    { key: 'wheeze', hi: 'सीने से सीटी जैसी आवाज़ आती है?', en: 'Any wheezing or whistling sound?', options: [opt('yes', 'हाँ', 'Yes'), opt('no', 'नहीं', 'No')] },
    { key: 'associated', hi: 'साथ में और क्या है?', en: 'What else do you feel?', multi: true, options: [opt('chest_pain', 'सीने में दर्द', 'Chest pain'), opt('fever', 'बुखार', 'Fever'), opt('cough', 'खाँसी', 'Cough'), opt('swelling', 'पैरों में सूजन', 'Leg swelling'), opt('none', 'कोई नहीं', 'None')] },
    BLOCK.severity
  ],
  fever: [
    BLOCK.duration,
    { key: 'pattern', hi: 'बुखार का तरीक़ा कैसा है?', en: 'What is the fever pattern?', options: [opt('continuous', 'लगातार', 'Continuous'), opt('evening', 'शाम को बढ़ता', 'Rises in the evening'), opt('alternate', 'एक दिन छोड़कर', 'Alternate days'), opt('unsure', 'पता नहीं', 'Not sure')] },
    { key: 'chills', hi: 'ठंड लगकर आता है?', en: 'With chills and rigors?', options: [opt('yes', 'हाँ', 'Yes'), opt('no', 'नहीं', 'No')] },
    { key: 'associated', hi: 'साथ में और क्या है?', en: 'What else do you have?', multi: true, options: [opt('rash', 'चकत्ते', 'Rash'), opt('cough', 'खाँसी', 'Cough'), opt('urine', 'पेशाब में जलन', 'Burning urine'), opt('neck', 'गर्दन में अकड़न', 'Neck stiffness'), opt('confusion', 'बेहोशी जैसा', 'Confusion'), opt('none', 'कोई नहीं', 'None')] },
    { key: 'travel', hi: 'हाल में कहीं बाहर गए थे?', en: 'Any recent travel?', options: [opt('yes', 'हाँ', 'Yes'), opt('no', 'नहीं', 'No')] }
  ],
  abdomen: [
    { key: 'site', hi: 'पेट में दर्द कहाँ है?', en: 'Where in the abdomen?', options: [opt('upper', 'ऊपर', 'Upper'), opt('around_navel', 'नाभि के आसपास', 'Around the navel'), opt('lower', 'नीचे', 'Lower'), opt('whole', 'पूरे पेट में', 'All over')] },
    BLOCK.onset, BLOCK.duration,
    { key: 'food_relation', hi: 'खाने से क्या फ़र्क़ पड़ता है?', en: 'How does food affect it?', options: [opt('worse', 'खाने के बाद बढ़ता', 'Worse after food'), opt('better', 'खाने से आराम', 'Better after food'), opt('none', 'कोई फ़र्क़ नहीं', 'No difference')] },
    { key: 'associated', hi: 'साथ में और क्या है?', en: 'What else?', multi: true, options: [opt('vomiting', 'उल्टी', 'Vomiting'), opt('black_stool', 'काला मल', 'Black stools'), opt('blood_vomit', 'खून की उल्टी', 'Vomiting blood'), opt('constipation', 'कब्ज़', 'Constipation'), opt('none', 'कोई नहीं', 'None')] },
    BLOCK.severity
  ],
  headache: [
    BLOCK.onset, BLOCK.duration,
    { key: 'thunderclap', hi: 'क्या यह अब तक का सबसे तेज़ सिर दर्द है?', en: 'Is this the worst headache of your life?', options: [opt('yes', 'हाँ, सबसे तेज़', 'Yes, the worst ever'), opt('no', 'नहीं', 'No')] },
    { key: 'associated', hi: 'साथ में और क्या है?', en: 'What else?', multi: true, options: [opt('vision', 'धुंधला दिखना', 'Blurred vision'), opt('vomiting', 'उल्टी', 'Vomiting'), opt('weakness', 'हाथ-पैर में कमज़ोरी', 'Limb weakness'), opt('speech', 'बोलने में दिक़्क़त', 'Slurred speech'), opt('none', 'कोई नहीं', 'None')] },
    BLOCK.severity
  ],
  joint: [
    { key: 'joints', hi: 'कौन से जोड़ों में दर्द है?', en: 'Which joints hurt?', multi: true, options: [opt('knee', 'घुटने', 'Knees'), opt('shoulder', 'कंधे', 'Shoulders'), opt('back', 'कमर', 'Lower back'), opt('small', 'हाथ की छोटी उँगलियाँ', 'Small joints of hand'), opt('all', 'पूरे शरीर में', 'All over')] },
    BLOCK.duration,
    { key: 'stiffness', hi: 'सुबह जकड़न कितनी देर रहती है?', en: 'How long does morning stiffness last?', options: [opt('lt30', '30 मिनट से कम', 'Less than 30 minutes'), opt('gt30', '30 मिनट से ज़्यादा', 'More than 30 minutes'), opt('none', 'जकड़न नहीं', 'No stiffness')] },
    { key: 'swelling', hi: 'सूजन भी आती है?', en: 'Any swelling?', options: [opt('yes', 'हाँ', 'Yes'), opt('no', 'नहीं', 'No')] },
    BLOCK.severity
  ],
  skin: [
    BLOCK.duration,
    { key: 'type', hi: 'त्वचा पर क्या दिख रहा है?', en: 'What do you see on the skin?', options: [opt('rash', 'चकत्ते', 'Rash'), opt('itch', 'खुजली', 'Itching'), opt('wound', 'घाव', 'Non-healing wound'), opt('discolour', 'रंग बदलना', 'Colour change')] },
    { key: 'spread', hi: 'कहाँ-कहाँ फैला है?', en: 'Where has it spread?', options: [opt('one', 'एक जगह', 'One area'), opt('few', 'कुछ जगह', 'A few areas'), opt('body', 'पूरे शरीर पर', 'All over the body')] },
    BLOCK.severity
  ],
  digestion: [
    { key: 'bowel', hi: 'मल त्याग कैसा है?', en: 'How are your bowels?', options: [opt('constipated', 'कब्ज़', 'Constipated'), opt('loose', 'ढीला', 'Loose'), opt('alternating', 'कभी कब्ज़ कभी ढीला', 'Alternating'), opt('normal', 'सामान्य', 'Normal')] },
    { key: 'appetite', hi: 'भूख कैसी है?', en: 'How is your appetite?', options: [opt('low', 'कम', 'Reduced'), opt('normal', 'ठीक', 'Normal'), opt('excess', 'ज़्यादा', 'Increased')] },
    BLOCK.duration, BLOCK.timing
  ],
  other: [
    { key: 'freetext', hi: 'अपनी तकलीफ़ अपने शब्दों में बताइए।', en: 'Describe your problem in your own words.', free: true },
    BLOCK.duration, BLOCK.severity
  ]
};

/* Shared history blocks asked for every patient */
const COMMON_QUESTIONS = [
  { key: 'pmh', section: 'past', hi: 'क्या आपको इनमें से कोई पुरानी बीमारी है?', en: 'Do you have any of these conditions?', multi: true, options: [opt('htn', 'उच्च रक्तचाप', 'High blood pressure'), opt('diabetes', 'मधुमेह', 'Diabetes'), opt('asthma', 'दमा', 'Asthma'), opt('thyroid', 'थायरॉइड', 'Thyroid'), opt('tb', 'टीबी', 'Tuberculosis'), opt('heart', 'दिल की बीमारी', 'Heart disease'), opt('none', 'कोई नहीं', 'None of these')] },
  { key: 'surgery', section: 'past', hi: 'कभी कोई ऑपरेशन हुआ है?', en: 'Have you had any surgery?', options: [opt('yes', 'हाँ', 'Yes'), opt('no', 'नहीं', 'No')] },
  { key: 'meds', section: 'meds', hi: 'अभी कोई दवा चल रही है?', en: 'Are you taking any medicines now?', options: [opt('yes_bp', 'हाँ, बीपी की', 'Yes, for blood pressure'), opt('yes_sugar', 'हाँ, शुगर की', 'Yes, for diabetes'), opt('yes_other', 'हाँ, कोई और', 'Yes, something else'), opt('no', 'कोई नहीं', 'None')] },
  { key: 'allergy', section: 'meds', hi: 'किसी दवा या चीज़ से एलर्जी है?', en: 'Any medicine or food allergy?', options: [opt('penicillin', 'पेनिसिलिन', 'Penicillin'), opt('sulfa', 'सल्फ़ा दवा', 'Sulfa drugs'), opt('food', 'किसी खाने से', 'A food item'), opt('none', 'कोई एलर्जी नहीं', 'No known allergy'), opt('unsure', 'पता नहीं', 'Not sure')] },
  { key: 'family', section: 'family', hi: 'परिवार में किसी को यह बीमारी है?', en: 'Does anyone in your family have these?', multi: true, options: [opt('diabetes', 'मधुमेह', 'Diabetes'), opt('htn', 'उच्च रक्तचाप', 'High blood pressure'), opt('heart', 'कम उम्र में दिल का दौरा', 'Early heart attack'), opt('cancer', 'कैंसर', 'Cancer'), opt('none', 'कोई नहीं', 'None')] },
  { key: 'tobacco', section: 'personal', hi: 'तंबाकू या धूम्रपान करते हैं?', en: 'Do you use tobacco or smoke?', options: [opt('smoke', 'बीड़ी / सिगरेट', 'Smoking'), opt('chew', 'खैनी / गुटखा', 'Chewing tobacco'), opt('both', 'दोनों', 'Both'), opt('never', 'कभी नहीं', 'Never'), opt('quit', 'छोड़ चुके हैं', 'Quit')] },
  { key: 'alcohol', section: 'personal', hi: 'शराब लेते हैं?', en: 'Do you drink alcohol?', options: [opt('daily', 'रोज़', 'Daily'), opt('occasional', 'कभी-कभी', 'Occasionally'), opt('never', 'नहीं', 'Never')] },
  { key: 'sleep', section: 'personal', hi: 'नींद कैसी आती है?', en: 'How is your sleep?', options: [opt('good', 'अच्छी', 'Good'), opt('broken', 'टूटी-टूटी', 'Broken'), opt('poor', 'बहुत कम', 'Very poor')] }
];

/* ---------------- AYUSH · Dashavidha Pariksha ---------------- */
const DASHAVIDHA = [
  { key: 'prakriti', sanskrit: 'प्रकृति', label: 'Prakriti', meaning: 'Constitution', hi: 'आपका शरीर आम तौर पर कैसा रहता है?', en: 'How is your body usually?', options: [opt('vata', 'पतला, सूखी त्वचा, ठंड लगती है', 'Lean, dry skin, feels cold'), opt('pitta', 'गर्म, तेज़ भूख, जल्दी गुस्सा', 'Warm, sharp appetite, quick temper'), opt('kapha', 'भारी, धीमा, सुस्ती', 'Heavy build, slow, sluggish'), opt('mixed', 'मिला-जुला', 'A mixture')] },
  { key: 'vikriti', sanskrit: 'विकृति', label: 'Vikriti', meaning: 'Current imbalance', hi: 'इस समय शरीर में क्या बदला है?', en: 'What has changed in your body recently?', multi: true, options: [opt('dryness', 'सूखापन / गैस', 'Dryness or gas'), opt('heat', 'जलन / गर्मी', 'Burning or heat'), opt('heaviness', 'भारीपन / कफ़', 'Heaviness or mucus'), opt('sleep', 'नींद बिगड़ी', 'Disturbed sleep'), opt('none', 'कुछ खास नहीं', 'Nothing specific')] },
  { key: 'sara', sanskrit: 'सार', label: 'Sara', meaning: 'Tissue quality', hi: 'त्वचा, बाल और ताक़त कैसी है?', en: 'How are your skin, hair and stamina?', options: [opt('high', 'चमकदार और मज़बूत', 'Glowing and strong'), opt('avg', 'ठीक-ठाक', 'Average'), opt('low', 'रूखी और कमज़ोर', 'Dull and weak')] },
  { key: 'samhanana', sanskrit: 'संहनन', label: 'Samhanana', meaning: 'Body compactness', hi: 'शरीर की बनावट कैसी है?', en: 'How is your build?', options: [opt('compact', 'गठीला', 'Compact and firm'), opt('moderate', 'सामान्य', 'Moderate'), opt('loose', 'ढीला', 'Loose')] },
  { key: 'pramana', sanskrit: 'प्रमाण', label: 'Pramana', meaning: 'Body measurements', hi: 'लंबाई और वज़न', en: 'Height and weight', derived: 'vitals' },
  { key: 'satmya', sanskrit: 'सात्म्य', label: 'Satmya', meaning: 'Habituation', hi: 'आपका रोज़ का खानपान कैसा है?', en: 'What is your habitual diet?', options: [opt('veg', 'शाकाहारी', 'Vegetarian'), opt('mixed', 'मिश्रित', 'Mixed'), opt('spicy', 'तीखा-मसालेदार', 'Spicy and rich'), opt('light', 'हल्का सादा', 'Light and simple')] },
  { key: 'sattva', sanskrit: 'सत्त्व', label: 'Sattva', meaning: 'Mental strength', hi: 'तनाव और चिंता कैसी रहती है?', en: 'How do you handle stress?', options: [opt('pravara', 'शांत रहता हूँ', 'I stay calm'), opt('madhyama', 'कभी-कभी घबराहट', 'Sometimes anxious'), opt('avara', 'जल्दी घबरा जाता हूँ', 'I worry easily')] },
  { key: 'ahara_shakti', sanskrit: 'आहार शक्ति', label: 'Ahara Shakti', meaning: 'Digestive capacity', hi: 'भूख और पाचन कैसा है?', en: 'How is your appetite and digestion?', options: [opt('high', 'अच्छी भूख, आसान पाचन', 'Good appetite, easy digestion'), opt('mid', 'सामान्य', 'Average'), opt('low', 'कम भूख, भारीपन', 'Low appetite, feels heavy')] },
  { key: 'vyayama_shakti', sanskrit: 'व्यायाम शक्ति', label: 'Vyayama Shakti', meaning: 'Exercise capacity', hi: 'कितना चलने पर थकान होती है?', en: 'How much activity tires you?', options: [opt('high', 'ज़्यादा चलने पर', 'Only after a lot'), opt('mid', 'थोड़ा चलने पर', 'After moderate activity'), opt('low', 'ज़रा-सा चलने पर', 'Very little tires me')] },
  { key: 'vaya', sanskrit: 'वय', label: 'Vaya', meaning: 'Age band', hi: 'आयु वर्ग', en: 'Age band', derived: 'age' }
];

const AYUSH_EXTRA = [
  { key: 'agni', sanskrit: 'अग्नि', label: 'Agni', hi: 'खाना पचने में कैसा लगता है?', en: 'How does food digest?', options: [opt('sama', 'ठीक से पचता है', 'Digests well'), opt('manda', 'देर से पचता है', 'Slow digestion'), opt('teekshna', 'जल्दी भूख लग जाती है', 'Very quick hunger'), opt('vishama', 'कभी ठीक कभी नहीं', 'Irregular')] },
  { key: 'koshtha', sanskrit: 'कोष्ठ', label: 'Koshtha', hi: 'पेट रोज़ साफ़ होता है?', en: 'How are your bowels?', options: [opt('mridu', 'आसानी से', 'Easily, soft'), opt('madhya', 'सामान्य', 'Normal'), opt('krura', 'कब्ज़ रहती है', 'Hard, constipated')] },
  { key: 'nidana', sanskrit: 'निदान', label: 'Nidana', hi: 'तकलीफ़ किस वजह से बढ़ती है?', en: 'What seems to trigger it?', multi: true, options: [opt('food', 'खानपान', 'Food'), opt('season', 'मौसम', 'Season'), opt('stress', 'तनाव', 'Stress'), opt('exertion', 'मेहनत', 'Exertion'), opt('unknown', 'पता नहीं', 'Not sure')] }
];

/* ---------------- red flag rules ---------------- */
const RED_FLAG_RULES = [
  { id: 'acs', level: 'emergency', label: 'Possible acute coronary syndrome',
    test: a => a.complaint === 'chest' && (has(a.associated, 'dyspnoea') || has(a.associated, 'sweating') || a.radiation === 'left_arm' || a.radiation === 'jaw' || Number(a.severity) >= 8),
    evidence: 'Chest pain with breathlessness, sweating, radiation or severity ≥ 8' },
  { id: 'stroke', level: 'emergency', label: 'Possible stroke (FAST positive)',
    test: a => a.complaint === 'headache' && (has(a.associated, 'weakness') || has(a.associated, 'speech')),
    evidence: 'Headache with limb weakness or slurred speech' },
  { id: 'sah', level: 'emergency', label: 'Possible subarachnoid haemorrhage',
    test: a => a.thunderclap === 'yes',
    evidence: 'Sudden worst-ever headache' },
  { id: 'meningitis', level: 'emergency', label: 'Possible meningitis',
    test: a => a.complaint === 'fever' && has(a.associated, 'neck') && has(a.associated, 'confusion'),
    evidence: 'Fever with neck stiffness and confusion' },
  { id: 'gi_bleed', level: 'urgent', label: 'Possible gastrointestinal bleed',
    test: a => has(a.associated, 'black_stool') || has(a.associated, 'blood_vomit'),
    evidence: 'Black stools or vomiting blood' },
  { id: 'rest_dyspnoea', level: 'urgent', label: 'Breathlessness at rest',
    test: a => a.complaint === 'breath' && a.orthopnoea === 'yes',
    evidence: 'Breathlessness worse lying flat' },
  { id: 'hypoxia', level: 'emergency', label: 'Low oxygen saturation', vitals: true,
    test: (a, v) => v.spo2 && Number(v.spo2) < 92,
    evidence: 'Recorded SpO₂ below 92%' },
  { id: 'hypotension', level: 'emergency', label: 'Low blood pressure', vitals: true,
    test: (a, v) => v.sys && Number(v.sys) < 90,
    evidence: 'Systolic BP below 90 mmHg' },
  { id: 'high_fever', level: 'urgent', label: 'High grade fever', vitals: true,
    test: (a, v) => v.temp && Number(v.temp) >= 103,
    evidence: 'Temperature 103 °F or above' }
];
function has(v, x) { return Array.isArray(v) && v.includes(x); }

/* ---------------- seed queue for doctor view ---------------- */
const SEED_PATIENTS = [
  { token: 'B-04', name: 'Shabnam Shaikh', age: 34, gender: 'Female', lang: 'Marathi', abha: '91-8873-4410-2201', complaint: 'Chronic cough, 6 weeks', dept: 'General Medicine OPD', triage: 'urgent', flags: 1, complete: 100, wait: '00:16', bp: '118/76', pulse: 88, spo2: 97, temp: 99.1, blood: 'B+', village: 'Kalyan, Maharashtra' },
  { token: 'C-11', name: 'Meera Nair', age: 67, gender: 'Female', lang: 'English', abha: '91-4432-9087-1145', complaint: 'Both knee pain, 2 years', dept: 'Kayachikitsa OPD', triage: 'routine', flags: 0, complete: 91, wait: '00:23', bp: '134/84', pulse: 76, spo2: 98, temp: 98.2, blood: 'O+', village: 'Palakkad, Kerala' },
  { token: 'C-14', name: 'Kabir Singh', age: 8, gender: 'Male', lang: 'Hindi', abha: '91-2290-6654-8890', complaint: 'Fever 3 days (guardian assisted)', dept: 'Kaumarbhritya OPD', triage: 'routine', flags: 0, complete: 86, wait: '00:31', bp: '96/62', pulse: 104, spo2: 99, temp: 101.4, blood: 'A+', village: 'Ghaziabad, Uttar Pradesh' },
  { token: 'C-19', name: 'Iqbal Ahmed', age: 45, gender: 'Male', lang: 'Hindi', abha: '91-7781-2245-6690', complaint: 'Acidity and constipation', dept: 'Panchakarma OPD', triage: 'routine', flags: 0, complete: 78, wait: '00:38', bp: '126/82', pulse: 72, spo2: 98, temp: 98.4, blood: 'AB+', village: 'Old Delhi' }
];

const AUDIT_SEED = [
  { time: '10:04', actor: 'Kiosk 04', action: 'Consent captured (C1, C2, C3, C4)', ref: 'A-18' },
  { time: '10:07', actor: 'Kiosk 04', action: 'Red flag raised · acs', ref: 'A-18' },
  { time: '10:07', actor: 'Triage nurse · S. Devi', action: 'Alert acknowledged', ref: 'A-18' },
  { time: '10:09', actor: 'Dr. A. Menon', action: 'Viewed structured history', ref: 'A-18' },
  { time: '09:52', actor: 'Kiosk 02', action: 'Session wiped after idle timeout', ref: 'B-02' },
  { time: '09:41', actor: 'Dr. R. Iyer', action: 'Summary confirmed and pushed to ABDM', ref: 'B-01' }
];
