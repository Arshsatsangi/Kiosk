import { Response } from 'express';
import { NiroModule, Prisma } from '@prisma/client';
import { z } from 'zod';
import OpenAI from 'openai';
import prisma from '../config/db';
import { config } from '../config/env';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  RankedChunk,
  findRelevantCharakaChunks,
  formatCharakaCitations,
  validateAgainstCharaka,
} from '../services/charaka.service';

const createSessionSchema = z.object({
  module: z.nativeEnum(NiroModule),
});

const sendMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
});

type AyurvedaPlan = {
  diagnosis: string;
  gharelu_upchar: string[];
  medications: Array<{ medicine: string; dose: string; frequency: string; duration: string; notes: string }>;
  diet: string[];
  lifestyle: string[];
  precautions: string[];
  follow_up: string;
};

type VaidyaCase = {
  id: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
  caseText: string;
  correctDosha: 'Vata' | 'Pitta' | 'Kapha' | 'Dual';
  correctHerb: string;
  correctPanchakarma: string;
  explanation: string;
};

type SessionContext = {
  moduleState?: string;
  profilePromptStep?: 'welcome' | 'intake' | 'name' | 'gender' | 'age' | 'weight' | 'problem' | 'doctor_questions' | 'mobile' | 'done';
  profileData?: {
    name?: string;
    age?: number;
    gender?: string;
    weightKg?: number;
    mobile?: string;
    problem?: string;
    mainProblem?: string;
    findings?: string;
    qaQuestions?: string[];
    qaAnswers?: string[];
    qaPointer?: number;
  };
  vaidyavivekaCase?: VaidyaCase;
  voiceProfile?: {
    tone: string;
    pace: string;
    language: string;
  };
};

const openaiClient = config.openai.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;

if (openaiClient) {
  console.log(`✅ OpenAI configured with model: ${config.openai.model}`);
} else {
  console.warn('⚠️ OPENAI_API_KEY not set. LLM calls will use fallback logic only.');
}

const VATA = ['dry', 'cold', 'anxious', 'constipation', 'insomnia', 'restless'];
const PITTA = ['heat', 'acidity', 'anger', 'burning', 'irritable', 'thirst'];
const KAPHA = ['heavy', 'mucus', 'lethargy', 'slow', 'sleepy', 'weight'];

const prakritiQuestionOptions: Record<string, string[]> = {
  'Body Build': ['Thin, hard to gain weight', 'Medium build', 'Broad, gains weight easily'],
  'Skin Texture': ['Dry/rough/cool', 'Warm/soft/redness', 'Oily/thick/smooth'],
  Eyes: ['Small/dry/active', 'Medium/sharp/intense', 'Large/calm/moist'],
  'Hair Type': ['Dry/frizzy/brittle', 'Fine/early grey', 'Thick/oily/wavy'],
  'Walking Style': ['Fast/restless', 'Purposeful', 'Slow/steady'],
  'Appetite Pattern': ['Irregular', 'Strong and sharp', 'Low hunger'],
  Digestion: ['Gas/bloating/constipation', 'Strong but acidic', 'Slow/heavy digestion'],
  'Body Temperature': ['Cold hands/feet', 'Feels warm', 'Neutral/cool'],
  Sweating: ['Minimal sweating', 'Sweats a lot', 'Moderate sweating'],
  'Sleep Pattern': ['Light/fragmented', 'Moderate', 'Long/heavy'],
  'Stress Response': ['Anxiety/overthinking', 'Anger/irritation', 'Withdrawal/lethargy'],
  'Decision Making': ['Quick but uncertain', 'Fast and confident', 'Slow but thorough'],
  Memory: ['Good short-term', 'Sharp and analytical', 'Slow but excellent long-term'],
  Communication: ['Fast and expressive', 'Direct and clear', 'Calm and gentle'],
  'Weather Preference': ['Warm and humid', 'Cool climate', 'Dry and warm'],
};

const fallbackCases: VaidyaCase[] = [
  {
    id: 'builtin-1',
    difficulty: 'Basic',
    caseText:
      'A 36-year-old woman reports dry skin, irregular bowel motions, anxiety, and light sleep. She dislikes cold winds and often feels chilly.',
    correctDosha: 'Vata',
    correctHerb: 'Ashwagandha',
    correctPanchakarma: 'Basti (Enema)',
    explanation:
      'Dryness, irregular digestion and sensitivity to cold point strongly to Vata aggravation. Grounding and oiling therapies with Basti and adaptogenic herbs are suitable.',
  },
  {
    id: 'builtin-2',
    difficulty: 'Basic',
    caseText:
      'A 29-year-old man has frequent heartburn, intense thirst, angry mood, and warm skin with loose stools after spicy meals.',
    correctDosha: 'Pitta',
    correctHerb: 'Amla',
    correctPanchakarma: 'Virechana (Purgation)',
    explanation:
      'Heat signs such as burning sensation, acidity, and irritability indicate Pitta aggravation. Cooling herbs and purgation are classical choices.',
  },
  {
    id: 'builtin-3',
    difficulty: 'Basic',
    caseText:
      'A 50-year-old man presents with lethargy, weight gain, heavy sleep, and excessive mucus with slow movement and sluggish digestion.',
    correctDosha: 'Kapha',
    correctHerb: 'Trikatu',
    correctPanchakarma: 'Vamana (Emesis)',
    explanation:
      'Heaviness, mucus and metabolic slowness are Kapha features; deepana-pachana herbs and cleansing approaches help restore balance.',
  },
];

const askOpenAI = async (systemPrompt: string, userPrompt: string) => {
  if (!openaiClient) return '';

  try {
    const response = await openaiClient.chat.completions.create({
      model: config.openai.model,
      temperature: 0.35,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.warn('OpenAI call failed, using fallback logic.', error);
    return '';
  }
};

const extractJsonObject = <T>(raw: string, fallback: T): T => {
  if (!raw) return fallback;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return fallback;

  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
};

const buildContextText = (chunks: RankedChunk[]) => chunks.map((c, i) => `[C${i + 1}] ${c.text}`).join('\n\n');

const scoreKeywords = (text: string, words: string[]) => {
  const lower = text.toLowerCase();
  return words.reduce((acc, word) => (lower.includes(word) ? acc + 1 : acc), 0);
};

const upsertProfile = async (userId: string, data: NonNullable<SessionContext['profileData']>) => {
  await prisma.patientProfile.upsert({
    where: { userId },
    update: {
      name: data.name,
      age: data.age,
      gender: data.gender,
      weightKg: data.weightKg,
      mobile: data.mobile,
    },
    create: {
      userId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      weightKg: data.weightKg,
      mobile: data.mobile,
    },
  });
};

const parseDiagnosisSubmission = (message: string) => {
  const doshaMatch = message.match(/Dosha:\s*([^\n]+)/i);
  const herbMatch = message.match(/Herb:\s*([^\n]+)/i);
  const panchaMatch = message.match(/Panchakarma:\s*([^\n]+)/i);

  if (!doshaMatch || !herbMatch || !panchaMatch) {
    return null;
  }

  return {
    dosha: doshaMatch[1].trim(),
    herb: herbMatch[1].trim(),
    panchakarma: panchaMatch[1].trim(),
  };
};

const parsePrakritiResponses = (message: string) => {
  if (!message.toLowerCase().includes('prakriti questionnaire responses')) {
    return null;
  }

  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(':'));

  let vata = 0;
  let pitta = 0;
  let kapha = 0;

  for (const line of lines) {
    const [labelRaw, valueRaw] = line.split(':');
    const label = labelRaw.trim();
    const value = valueRaw.trim();

    const options = prakritiQuestionOptions[label];
    if (!options) continue;

    const idx = options.findIndex((opt) => opt.toLowerCase() === value.toLowerCase());
    if (idx === 0) vata += 1;
    if (idx === 1) pitta += 1;
    if (idx === 2) kapha += 1;
  }

  if (vata + pitta + kapha === 0) {
    return null;
  }

  return { vata, pitta, kapha };
};

const getBalanceType = (vata: number, pitta: number, kapha: number) => {
  const sorted = [vata, pitta, kapha].sort((a, b) => b - a);

  if (sorted[0] - sorted[1] <= 2) return 'Dual-dosha constitution';
  if (Math.abs(vata - pitta) <= 2 && kapha < Math.min(vata, pitta)) return 'Vata-Pitta type';
  if (Math.abs(vata - kapha) <= 2 && pitta < Math.min(vata, kapha)) return 'Vata-Kapha type';
  if (Math.abs(pitta - kapha) <= 2 && vata < Math.min(pitta, kapha)) return 'Pitta-Kapha type';

  const dominant = vata >= pitta && vata >= kapha ? 'Vata' : pitta >= vata && pitta >= kapha ? 'Pitta' : 'Kapha';
  return `Dominantly ${dominant}`;
};

// ──────────────────────────────────────────
// AyurVaani — Improved follow-up question generation with Charaka context
// ──────────────────────────────────────────
const generateFollowupQuestions = async (problem: string, chunks: RankedChunk[]) => {
  const contextText = buildContextText(chunks);
  const output = await askOpenAI(
    `You are an experienced Ayurvedic clinician trained in the Charaka Samhita tradition.
Your task is to ask 5 short, focused, bilingual (English + Hindi Devanagari) history-taking questions.
Use the provided Charaka Samhita context to inform your questioning — ask about factors that are diagnostically important from both an Ayurvedic and modern perspective.`,
    `Problem: ${problem}

Charaka Samhita context:
${contextText}

Generate exactly 5 bilingual questions (English + Hindi in each line). Keep them crisp and clinically relevant.
Number them 1-5. Format: English text (Hindi Devanagari translation)`,
  );

  const parsed = output
    .split('\n')
    .map((line) => line.replace(/^\d+\.?\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  if (parsed.length >= 5) {
    return parsed;
  }

  return [
    'Onset and duration? (लक्षण कब से हैं और कितने समय से?)',
    'Severity and daily pattern? (कितनी तीव्रता है और कब अधिक/कम?)',
    'Aggravating or relieving factors? (क्या चीजें बढ़ाती/घटाती हैं?)',
    'Associated symptoms? (संबंधित लक्षण क्या हैं?)',
    'Any prior treatment or tests? (पहले कोई इलाज/जांच हुई?)',
  ];
};

// ──────────────────────────────────────────
// AyurVaani — Synthesize findings from Q&A
// ──────────────────────────────────────────
const synthesizeFindings = async (
  problem: string,
  questions: string[],
  answers: string[],
  chunks: RankedChunk[],
): Promise<{ mainProblem: string; findings: string }> => {
  const historyBlock = questions.map((q, idx) => `Q: ${q}\nA: ${answers[idx] || ''}`).join('\n\n');
  const contextText = buildContextText(chunks);

  const raw = await askOpenAI(
    `You are an Ayurvedic clinician summarizing patient history. Use the Charaka Samhita context provided to inform your clinical reasoning. Return strict JSON only.`,
    `Initial problem: ${problem}

Patient History (Q&A):
${historyBlock}

Charaka Samhita context:
${contextText}

Return JSON:
{"mainProblem": "Single precise clinical problem statement in English", "findings": "Concise 3-6 sentence summary of symptoms, history, and relevant observations for medical records"}`,
  );

  return extractJsonObject<{ mainProblem: string; findings: string }>(raw, {
    mainProblem: problem,
    findings: answers.join(' ').slice(0, 500),
  });
};

// ──────────────────────────────────────────
// AyurVaani — Build structured treatment plan using Charaka Samhita
// ──────────────────────────────────────────
const makeStructuredPlan = async (
  profile: NonNullable<SessionContext['profileData']>,
  chunks: RankedChunk[],
): Promise<AyurvedaPlan> => {
  const contextText = buildContextText(chunks);

  const raw = await askOpenAI(
    `You are an expert Ayurvedic clinician deeply trained in Charaka Samhita. You must provide treatment plans that are STRICTLY grounded in classical Ayurvedic principles from the provided Charaka Samhita excerpts. Return strict JSON only.`,
    `Patient Profile:
- Name: ${profile.name || 'Not provided'}
- Age: ${profile.age || 'Not provided'}
- Gender: ${profile.gender || 'Not provided'}
- Weight: ${profile.weightKg || 'Not provided'} kg
- Main Problem: ${profile.mainProblem || profile.problem || 'General complaint'}
- Clinical Findings: ${profile.findings || 'Not specified'}

Charaka Samhita Context (USE THIS AS PRIMARY REFERENCE):
${contextText}

IMPORTANT RULES:
1. Base ALL medication recommendations on the Charaka Samhita context provided above.
2. Adjust doses based on patient's age (${profile.age || 40}) and weight (${profile.weightKg || 65} kg).
3. Keep 'gharelu_upchar' as short practical bullets (≤12 words each), 3-6 items.
4. Include 3-5 medications with proper dose, frequency, duration, and notes.
5. Provide practical dietary and lifestyle advice specific to the condition.

Return JSON with exactly these keys:
{
  "diagnosis": "short paragraph explaining Ayurvedic diagnosis. DO NOT include the word diagnosis or any raw markdown headers here.",
  "gharelu_upchar": ["short actionable bullet <= 12 words", "..."],
  "medications": [{"medicine":"name", "dose":"amount", "frequency":"how often", "duration":"how long", "notes":"special instructions"}],
  "diet": ["dietary advice bullet", "..."],
  "lifestyle": ["lifestyle advice bullet", "..."],
  "precautions": ["precaution bullet", "..."],
  "follow_up": "follow-up instruction"
}`,
  );

  return extractJsonObject<AyurvedaPlan>(raw, {
    diagnosis: 'Ayurvedic assessment based on symptoms and dosha pattern.',
    gharelu_upchar: ['Warm water sips through day', 'Early light dinner', 'Avoid heavy and cold foods'],
    medications: [],
    diet: ['Prefer fresh warm meals', 'Reduce processed and very spicy foods'],
    lifestyle: ['Keep regular sleep schedule', 'Do gentle daily movement and breathing'],
    precautions: ['Seek urgent care for severe or persistent symptoms'],
    follow_up: 'Review symptoms after 5-7 days with a qualified physician if not improving.',
  });
};

// ──────────────────────────────────────────
// AyurVaani — Translate to Hindi
// ──────────────────────────────────────────
const translateToHindi = async (englishText: string) => {
  const output = await askOpenAI(
    'Translate the following medical report to accurate Devanagari Hindi. Maintain the exact formatting, including Markdown tables, bold text, headings, and bullet points. Do not lose any structure. Translate ALL content including headers.',
    englishText,
  );

  return output || '';
};

// ──────────────────────────────────────────
// AyurVaani — Format medications table
// ──────────────────────────────────────────
const formatTable = (meds: AyurvedaPlan['medications']) => {
  if (!meds || meds.length === 0) return '—';
  let table = '| Medicine | Dose | Frequency | Duration | Notes |\n|---|---|---|---|---|\n';
  meds.forEach(m => {
    table += `| ${m.medicine} | ${m.dose} | ${m.frequency} | ${m.duration} | ${m.notes} |\n`;
  });
  return table;
};

// ──────────────────────────────────────────
// AyurVaani — Build final bilingual report (matching old ayurvaani_app.py PDF format)
// ──────────────────────────────────────────
const buildAyurFinalReport = async (
  userId: string,
  profile: NonNullable<SessionContext['profileData']>,
  chunks: RankedChunk[],
): Promise<{ text: string; findings: string; voiceProfile: { tone: string; pace: string; language: string } }> => {
  const questions = profile.qaQuestions || [];
  const answers = profile.qaAnswers || [];
  const synthesis = await synthesizeFindings(profile.problem || 'General complaint', questions, answers, chunks);

  const mergedProfile = {
    ...profile,
    mainProblem: synthesis.mainProblem,
    findings: synthesis.findings,
  };

  const plan = await makeStructuredPlan(mergedProfile, chunks);
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  // Fetch previous visit for this specific patient (matching mobile)
  const pastSessions = await prisma.chatSession.findMany({
    where: { userId, module: 'AYURVAANI' },
    orderBy: { createdAt: 'desc' },
  });
  
  let previousVisit: any = null;
  // Look for the last completely generated report for the exact SAME user (by Name and Mobile)
  for (const sess of pastSessions) {
    const sessCtx = sess.context as any;
    if (sessCtx && sessCtx.profileData) {
      if (
        sessCtx.profileData.mobile === profile.mobile &&
        sessCtx.profileData.name === profile.name &&
        sessCtx.profileData.problem !== profile.problem &&
        sessCtx.profileData.findings // Means a report was generated
      ) {
         previousVisit = {
            problem: sessCtx.profileData.problem,
            createdAt: sess.createdAt,
         };
         break;
      }
    }
  }

  // Build English section — matching the prescription PDF format exactly
  const englishSection = [
    '# AyurVedic Consultant Report',
    '**Generated by NirogaVerse**  ',
    '*Intelligent Ayurveda for Personalized Well-Being*',
    '',
    '---',
    '',
    '### Patient Details',
    '| | | | |',
    '|---|---|---|---|',
    `| **Name** | ${profile.name || 'Not provided'} | **Age** | ${profile.age || 'Not provided'} |`,
    `| **Gender** | ${profile.gender || 'Not provided'} | **Weight** | ${profile.weightKg || 'Not provided'} kg |`,
    `| **Mobile** | ${profile.mobile || 'Not provided'} | **Date** | ${now} |`,
    '',
    previousVisit 
      ? `### Previous Visit (Most Recent)\n| Problem | Date |\n| --- | --- |\n| ${previousVisit.problem} | ${previousVisit.createdAt.toISOString().slice(0, 16).replace('T', ' ')} |\n` 
      : '',
    '### Main Problem',
    synthesis.mainProblem,
    '',
    '### Diagnosis (Ayurvedic View)',
    plan.diagnosis,
    '',
    '### Gharelu Upchar (Home Remedies)',
    plan.gharelu_upchar.map((x) => `- ${x}`).join('\n') || '—',
    '',
    '### Charaka Samhita–Guided Medications',
    formatTable(plan.medications),
    '',
    '### Dietary Advice',
    plan.diet.map((x) => `- ${x}`).join('\n') || '—',
    '',
    '### Lifestyle Advice',
    plan.lifestyle.map((x) => `- ${x}`).join('\n') || '—',
    '',
    '### Precautions / When to Seek Help',
    plan.precautions.map((x) => `- ${x}`).join('\n') || '—',
    '',
    '### Follow-up',
    plan.follow_up,
    '',
    '---',
    '*Disclaimer: This is AI-generated feedback, not a substitute for in-person medical care. If symptoms are severe or persist, consult a registered physician immediately.*'
  ].join('\n');

  // Translate to Hindi
  const hindiSection = await translateToHindi(englishSection);

  // Voice profile based on patient age
  const patientAge = profile.age || 40;
  const voiceProfile = {
    tone: 'reassuring',
    pace: patientAge > 60 ? 'slow' : 'normal',
    language: 'bilingual',
  };

  // Save the Encounter natively using symptoms field as a JSON dump to bypass schema modification
  await prisma.encounter.create({
     data: {
        userId,
        problem: synthesis.mainProblem,
        symptoms: JSON.stringify({
            name: profile.name,
            mobile: profile.mobile,
            age: profile.age,
            gender: profile.gender,
            actualSymptoms: synthesis.findings
        }),
        remedyPlan: plan.diagnosis + '\n' + plan.gharelu_upchar.join(','),
     }
  });

  return {
    text: `${englishSection}\n\n---\n\n## हिंदी रिपोर्ट (Hindi Report)\n\n${hindiSection || '(Hindi translation will be generated)'}`,
    findings: synthesis.findings,
    voiceProfile,
  };
};

// ──────────────────────────────────────────
// AyurVaani — Sequential intake flow (matching old/ayurvaani_app.py EXACTLY)
// Flow: intake(name) → gender → age → weight → problem → doctor_questions (5) → mobile → done
// ──────────────────────────────────────────
const nextAyurStep = async (
  ctx: SessionContext,
  message: string,
): Promise<{ ctx: SessionContext; reply: string; completed: boolean }> => {
  const current = ctx.profilePromptStep || 'welcome';
  const profile = ctx.profileData || {};

  // STEP 0: Welcome — user can say anything (hello, namaste, etc), bot greets back and then asks name
  if (current === 'welcome') {
    return {
      ctx: { ...ctx, profilePromptStep: 'intake', profileData: profile },
      reply: `🙏 Namaste! Welcome to AyurVaani — your AI Ayurvedic assistant.\nI will help you with personalized Ayurvedic guidance.\n\nPlease tell me your name to begin.\n(कृपया अपना नाम बताएं।)`,
      completed: false,
    };
  }

  // STEP 1: Name (intake)
  if (current === 'intake') {
    const rawName = message.trim();
    // Translate name strictly to English alphabet output
    const translatedName = await askOpenAI(
      'Translate/Transliterate the following name strictly into English alphabets. Only output the translated name, nothing else.',
      `Name: ${rawName}`
    );
    profile.name = translatedName ? translatedName.replace(/["']/g, '') : rawName;
    return {
      ctx: { ...ctx, profilePromptStep: 'gender', profileData: profile },
      reply: `Thank you, ${profile.name}! 🙏\nYour gender? (Male/Female) — आपका लिंग? (पुरुष/महिला)`,
      completed: false,
    };
  }

  // STEP 2: Gender
  if (current === 'gender') {
    const g = message.trim().toLowerCase();
    if (g.includes('female') || g.includes('महिला') || g === 'f') {
      profile.gender = 'Female';
    } else if (g.includes('male') || g.includes('पुरुष') || g === 'm') {
      profile.gender = 'Male';
    } else {
      profile.gender = message.trim();
    }
    return {
      ctx: { ...ctx, profilePromptStep: 'age', profileData: profile },
      reply: `Please tell your age. — कृपया अपनी आयु बताएं।`,
      completed: false,
    };
  }

  // STEP 3: Age
  if (current === 'age') {
    const ageVal = parseInt(message.replace(/\D/g, ''), 10);
    profile.age = isNaN(ageVal) ? undefined : ageVal;
    return {
      ctx: { ...ctx, profilePromptStep: 'weight', profileData: profile },
      reply: `Please tell your weight (kg). — कृपया अपना वज़न (किलो) बताएं।`,
      completed: false,
    };
  }

  // STEP 4: Weight
  if (current === 'weight') {
    const wVal = parseInt(message.replace(/\D/g, ''), 10);
    profile.weightKg = isNaN(wVal) ? undefined : wVal;
    return {
      ctx: { ...ctx, profilePromptStep: 'problem', profileData: profile },
      reply: `Now, describe your health problem. — अब अपनी समस्या बताइए।`,
      completed: false,
    };
  }

  // STEP 5: Problem → generate 5 follow-up questions
  if (current === 'problem') {
    const rawProblem = message.trim();

    // Normalize and validate the problem using LLM
    const normalizedProblem = await askOpenAI(
      'Evaluate the following input to determine if it describes a legitimate health problem or symptom. If it is nonsense, a random number, or completely unrelated to health like "kuch n" or "baisa222", return ONLY the exact word "INVALID". Otherwise, return ONLY a short, clean clinical English statement summarizing the health problem, with no extra text.',
      `Input: ${rawProblem}`
    );
    
    if (normalizedProblem?.trim() === 'INVALID') {
       return {
         ctx,
         reply: 'I could not understand your health concern. Please clearly describe what health problem or symptoms you are experiencing. — कृपया अपनी स्वास्थ्य समस्या का स्पष्ट रूप से वर्णन करें।',
         completed: false,
       };
    }

    profile.problem = normalizedProblem || rawProblem;

    // Get Charaka context and generate follow-up questions
    const chunks = await findRelevantCharakaChunks(profile.problem || 'General complaint', 4);
    const questions = await generateFollowupQuestions(profile.problem || '', chunks);

    profile.qaQuestions = questions;
    profile.qaAnswers = [];
    profile.qaPointer = 0;

    return {
      ctx: { ...ctx, profilePromptStep: 'doctor_questions', profileData: profile },
      reply: `Thank you for sharing your details. To help you better, let me ask a few questions.\n\n1) ${questions[0]}`,
      completed: false,
    };
  }

  // STEP 6: Doctor follow-up questions (5 questions, one at a time)
  if (current === 'doctor_questions') {
    const questions = profile.qaQuestions || [];
    const answers = profile.qaAnswers || [];
    const pointer = profile.qaPointer || 0;

    answers.push(message.trim());

    if (pointer + 1 < questions.length) {
      profile.qaPointer = pointer + 1;
      profile.qaAnswers = answers;
      return {
        ctx: { ...ctx, profilePromptStep: 'doctor_questions', profileData: profile },
        reply: `${pointer + 2}) ${questions[pointer + 1]}`,
        completed: false,
      };
    }

    // All 5 questions answered → ask for mobile number (matching old flow)
    profile.qaAnswers = answers;
    return {
      ctx: { ...ctx, profilePromptStep: 'mobile', profileData: profile },
      reply: `Your mobile number, please. — कृपया अपना मोबाइल नंबर बताइए।`,
      completed: false,
    };
  }

  // STEP 7: Mobile number → generate report
  if (current === 'mobile') {
    profile.mobile = message.trim();
    return {
      ctx: { ...ctx, profilePromptStep: 'done', profileData: profile },
      reply: 'Generating your personalized Ayurvedic prescription report. If you have another health issue, just type it after the report! — मैं आपकी रिपोर्ट तैयार कर रहा हूँ...',
      completed: true,
    };
  }

  // STEP 8: Loop back for new problem if in 'done' state
  if (current === 'done') {
    const rawProblem = message.trim();
    const normalizedProblem = await askOpenAI(
      'Evaluate the following input to determine if it describes a legitimate health problem or symptom. If it is nonsense, a random number, or completely unrelated to health like "kuch n" or "baisa222", return ONLY the exact word "INVALID". Otherwise, return ONLY a short, clean clinical English statement summarizing the health problem, with no extra text.',
      `Input: ${rawProblem}`
    );
    
    if (normalizedProblem?.trim() === 'INVALID') {
       return {
         ctx,
         reply: 'I could not understand your health concern. Please clearly describe what health problem or symptoms you are experiencing. — कृपया अपनी स्वास्थ्य समस्या का स्पष्ट रूप से वर्णन करें।',
         completed: false,
       };
    }

    profile.problem = normalizedProblem || rawProblem;

    const chunks = await findRelevantCharakaChunks(profile.problem || 'General complaint', 4);
    const questions = await generateFollowupQuestions(profile.problem || '', chunks);

    profile.qaQuestions = questions;
    profile.qaAnswers = [];
    profile.qaPointer = 0;

    return {
      ctx: { ...ctx, profilePromptStep: 'doctor_questions', profileData: profile },
      reply: `Thank you. Let me ask a few questions regarding this new issue.\n\n1) ${questions[0]}`,
      completed: false,
    };
  }

  return {
    ctx: { ...ctx, profilePromptStep: 'done', profileData: profile },
    reply: 'Your report is generated.',
    completed: true,
  };
};

// ──────────────────────────────────────────
// Prakriti — Build agent reply
// ──────────────────────────────────────────
const buildPrakritiAgentReply = async (
  message: string,
  v: number,
  p: number,
  k: number,
  balanceType: string
) => {
  const summary = `Tri-dosha score: Vata ${v}%, Pitta ${p}%, Kapha ${k}%. Constitution type: ${balanceType}.`;

  const interpretation = await askOpenAI(
    'You are a highly experienced Ayurvedic Vaidya.',
    `Analyse this patient's constitution based on scoring:

    Vata: ${v}%
    Pitta: ${p}%
    Kapha: ${k}%

    Constitution type: ${balanceType}

    Provide a detailed interpretation including:
    1. What this body type means
    2. Strengths and weaknesses
    3. Diet recommendations (do's and don'ts)
    4. Daily lifestyle guidance (dinacharya)
    5. Suitable yoga and pranayama
    6. Herbal recommendations
    Keep the tone warm, wise, and non-medical.`
  );

  const finalResponse = interpretation || "Could not generate analysis.";

  return `### 🧠 Tri-Dosha Constitution Analysis

- **Vata:** ${v}%
- **Pitta:** ${p}%
- **Kapha:** ${k}%

🌿 **Constitution Type:** ${balanceType}

---

## 📜 Personalized Ayurvedic Guidance
${finalResponse}`;
};

const handlePrakriti = async (userId: string, message: string) => {
  const parsedQuestionnaire = parsePrakritiResponses(message);

  let vataRaw = 0;
  let pittaRaw = 0;
  let kaphaRaw = 0;

  if (parsedQuestionnaire) {
    vataRaw = parsedQuestionnaire.vata;
    pittaRaw = parsedQuestionnaire.pitta;
    kaphaRaw = parsedQuestionnaire.kapha;
  } else {
    vataRaw = scoreKeywords(message, VATA);
    pittaRaw = scoreKeywords(message, PITTA);
    kaphaRaw = scoreKeywords(message, KAPHA);
  }

  const total = Math.max(vataRaw + pittaRaw + kaphaRaw, 1);
  const v = Math.round((vataRaw / total) * 1000) / 10;
  const p = Math.round((pittaRaw / total) * 1000) / 10;
  const k = Math.round((kaphaRaw / total) * 1000) / 10;

  const balanceType = getBalanceType(vataRaw, pittaRaw, kaphaRaw);
  const summary = `Tri-dosha score: Vata ${v}%, Pitta ${p}%, Kapha ${k}%. Constitution type: ${balanceType}.`;

  await prisma.doshaAssessment.create({
    data: {
      userId,
      vataScore: vataRaw,
      pittaScore: pittaRaw,
      kaphaScore: kaphaRaw,
      summary,
    },
  });

  const llmReply = await buildPrakritiAgentReply(message, v, p, k, balanceType);

  return llmReply;
};

// ──────────────────────────────────────────
// VaidyaViveka — Case generation and evaluation
// ──────────────────────────────────────────
const fallbackCaseByDifficulty = (difficulty: 'Basic' | 'Intermediate' | 'Advanced') => {
  const exact = fallbackCases.find((c) => c.difficulty === difficulty);
  return exact || fallbackCases[0];
};

const generateVaidyaCaseWithAgent = async (
  difficulty: 'Basic' | 'Intermediate' | 'Advanced',
  chunks: RankedChunk[],
): Promise<VaidyaCase> => {
  const contextText = buildContextText(chunks);
  const raw = await askOpenAI(
    'You are an Ayurvedic clinical case-generation agent. Return strict JSON only.',
    `Generate one ${difficulty} case. Return JSON with keys: id, difficulty, caseText, correctDosha, correctHerb, correctPanchakarma, explanation.\n\nUse this context:\n${contextText}`,
  );

  const fallback = fallbackCaseByDifficulty(difficulty);
  const parsed = extractJsonObject<VaidyaCase>(raw, fallback);

  if (!parsed.caseText || !parsed.correctDosha || !parsed.correctHerb || !parsed.correctPanchakarma) {
    return fallback;
  }

  return {
    id: parsed.id || `case-${Date.now()}`,
    difficulty,
    caseText: parsed.caseText,
    correctDosha: parsed.correctDosha,
    correctHerb: parsed.correctHerb,
    correctPanchakarma: parsed.correctPanchakarma,
    explanation: parsed.explanation || fallback.explanation,
  };
};

const evaluateVaidyaSelection = (
  caseObj: VaidyaCase,
  selected: { dosha: string; herb: string; panchakarma: string },
) => {
  const doshaOk = selected.dosha.toLowerCase() === caseObj.correctDosha.toLowerCase();
  const herbOk = selected.herb.toLowerCase() === caseObj.correctHerb.toLowerCase();
  const panOk = selected.panchakarma.toLowerCase() === caseObj.correctPanchakarma.toLowerCase();

  const score = [doshaOk, herbOk, panOk].filter(Boolean).length;
  
  let feedbackText = '💡 Needs review — focus on distinguishing key diagnostic clues.';
  if (score === 3) feedbackText = '✅ Excellent — your clinical reasoning perfectly matches the classical teaching!';
  else if (score === 2) feedbackText = '🌿 Good effort — one component can be refined to be completely accurate.';

  const md = `
### 📝 Clinical Evaluation Report
**Score: ${score}/3**  
*${feedbackText}*

#### 📋 Diagnosis Comparison
| Category | Your Selection | Expected Answer | Status |
| :--- | :--- | :--- | :---: |
| **Dosha** | ${selected.dosha || '—'} | ${caseObj.correctDosha} | ${doshaOk ? '✅' : '❌'} |
| **Herb** | ${selected.herb || '—'} | ${caseObj.correctHerb} | ${herbOk ? '✅' : '❌'} |
| **Panchakarma** | ${selected.panchakarma || '—'} | ${caseObj.correctPanchakarma} | ${panOk ? '✅' : '❌'} |

#### 📖 Gold-Standard Clinical Reasoning
> ${caseObj.explanation || 'No classical teaching note was provided for this case.'}

*(If you are unsure why your answer was wrong, click the **"Explain My Mistake"** button below for an AI-guided breakdown.)*
  `.trim();

  return {
    score,
    feedback: md,
  };
};

const explainVaidyaMistakeWithAgent = async (
  caseObj: VaidyaCase,
  selected: { dosha: string; herb: string; panchakarma: string },
) => {
  const raw = await askOpenAI(
    'You are an Ayurvedic clinical teacher. Return plain text only.',
    `You are an Ayurvedic clinical teacher. A student made these selections for this case:\n\nCASE:\n${caseObj.caseText}\n\nStudent selections:\n- Dosha: ${selected.dosha}\n- Herb: ${selected.herb}\n- Panchakarma: ${selected.panchakarma}\n\nGold standard:\n- Dosha: ${caseObj.correctDosha}\n- Herb: ${caseObj.correctHerb}\n- Panchakarma: ${caseObj.correctPanchakarma}\n\nTask:\nWrite a short, student-friendly explanation (3-5 sentences):\n- Why the gold-standard dosha is most appropriate.\n- Why the student's choice might be tempting but less suitable.\n- One quick practical tip to spot similar cases in future.`,
  );

  return raw || caseObj.explanation;
};

// ──────────────────────────────────────────
// API Handlers
// ──────────────────────────────────────────
export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const module = req.query.module as NiroModule | undefined;

    const where: Prisma.ChatSessionWhereInput = {
      userId,
      isActive: true,
      ...(module ? { module } : {}),
    };

    const sessions = await prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        module: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
};

export const createSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const { module } = validation.data;

    const session = await prisma.chatSession.create({
      data: {
        userId,
        module,
        title:
          module === 'AYURVAANI'
            ? 'AyurVaani Consultation'
            : module === 'PRAKRITIPRATIBIMBA'
              ? 'Prakriti Assessment'
              : 'VaidyaViveka Case',
        context: module === 'AYURVAANI' ? { profilePromptStep: 'welcome', profileData: {} } : undefined,
      },
    });

    const opener =
      module === 'AYURVAANI'
        ? '👋 Namaste! I am your Ayurvedic assistant — AyurVaani.\nI provide bilingual Ayurvedic consultation with home remedies, diet plans, and lifestyle guidance.\n\nSay anything to begin! (कुछ भी कहें शुरू करने के लिए!)'
        : module === 'PRAKRITIPRATIBIMBA'
          ? '🌿 Welcome to PrakritiPratibimba. Submit your questionnaire responses for tri-dosha analysis.'
          : '🧠 Welcome to VaidyaViveka. Say "new case difficulty: basic|intermediate|advanced" to begin.';

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: opener,
      },
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const getSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const { sessionId, message } = validation.data;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId, isActive: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: message,
      },
    });

    const ctx = (session.context || {}) as SessionContext;
    let assistantReply = 'Thanks for sharing.';
    let nextContext: SessionContext = ctx;

    if (session.module === 'AYURVAANI') {
      const result = await nextAyurStep(ctx, message);
      assistantReply = result.reply;
      nextContext = result.ctx;

      if (result.completed && result.ctx.profileData) {
        const profile = result.ctx.profileData;
        const query = `${profile.problem || ''} ${profile.qaAnswers?.join(' ') || ''}`.trim();
        const chunks = await findRelevantCharakaChunks(query || 'ayurveda consultation guidance', 5);

        const finalOutput = await buildAyurFinalReport(userId, profile, chunks);

        // Clean report — bilingual report
        assistantReply = finalOutput.text;

        nextContext = {
          ...result.ctx,
          voiceProfile: finalOutput.voiceProfile,
          profileData: {
            ...profile,
            mainProblem: profile.mainProblem || profile.problem,
            findings: finalOutput.findings,
          },
        };

        // SMS Mock: Console log the SMS notification as requested
        console.log(`\n\n[SMS NOTIFICATION SENT TO ${profile.mobile}]`);
        console.log(`Hello ${profile.name || 'User'}, your Ayurvedic consultation for "${profile.mainProblem || profile.problem}" is ready. Follow the suggested remedies in the app. Nirogaverse.\n\n`);

        await upsertProfile(userId, profile);
        await prisma.encounter.create({
          data: {
            userId,
            problem: profile.mainProblem || profile.problem || 'General consultation',
            symptoms: finalOutput.findings || 'Not specified',
            remedyPlan: assistantReply,
          },
        });
        
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { title: profile.mainProblem || profile.problem || 'AyurVaani Consultation' }
        });
      }
    } else if (session.module === 'PRAKRITIPRATIBIMBA') {
      assistantReply = await handlePrakriti(userId, message);
    } else {
      const wantsNewCase = /new case|start case|load case|next case/i.test(message);
      const explainRequest = /explain my mistake/i.test(message);
      const diagnosis = parseDiagnosisSubmission(message);
      const difficultyMatch = message.match(/difficulty[:=]?\s*(basic|intermediate|advanced)/i);
      const requestedDifficulty = (difficultyMatch?.[1]
        ? `${difficultyMatch[1][0].toUpperCase()}${difficultyMatch[1].slice(1).toLowerCase()}`
        : 'Basic') as 'Basic' | 'Intermediate' | 'Advanced';

      if (wantsNewCase || !ctx.vaidyavivekaCase) {
        const seed = fallbackCaseByDifficulty(requestedDifficulty);
        const caseChunks = await findRelevantCharakaChunks(`nidana chikitsa ${seed.caseText}`, 2);
        const generated = await generateVaidyaCaseWithAgent(requestedDifficulty, caseChunks);

        const caseText = caseChunks.length
          ? `${generated.caseText}\n\nReference excerpt: ${caseChunks[0].text.replace(/\s+/g, ' ').slice(0, 240)}...`
          : generated.caseText;

        nextContext = {
          ...ctx,
          vaidyavivekaCase: {
            ...generated,
            caseText,
          },
        };

        assistantReply = `Case (${requestedDifficulty}): ${caseText}`;
      } else if (explainRequest && diagnosis) {
        const explanation = await explainVaidyaMistakeWithAgent(ctx.vaidyavivekaCase, diagnosis);
        assistantReply = explanation;
      } else if (diagnosis) {
        const evaluation = evaluateVaidyaSelection(ctx.vaidyavivekaCase, diagnosis);
        assistantReply = evaluation.feedback;

        await prisma.caseAttempt.create({
          data: {
            userId,
            caseText: ctx.vaidyavivekaCase.caseText,
            answerText: message,
            feedback: evaluation.feedback,
            score: evaluation.score,
          },
        });
      } else {
        assistantReply = 'Use: "new case difficulty: basic|intermediate|advanced" or submit diagnosis with Dosha/Herb/Panchakarma lines.';
      }
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        context: nextContext,
        title: session.title === 'New Session' ? message.slice(0, 48) : session.title,
      },
    });

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: assistantReply,
      },
    });

    res.json({ message: assistantMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const deleteSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    await prisma.chatSession.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false },
    });

    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};
