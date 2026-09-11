import { create } from 'zustand';

export type NiroModule = 'AYURVAANI' | 'PRAKRITIPRATIBIMBA' | 'VAIDYAVIVEKA';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface ChatState {
  activeModule: NiroModule;
  selectedSession: string | null;
  message: string;
  messages: Message[];
  setActiveModule: (module: NiroModule) => void;
  setSelectedSession: (id: string | null) => void;
  setMessage: (msg: string) => void;
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeModule: 'AYURVAANI',
  selectedSession: null,
  message: '',
  messages: [],
  setActiveModule: (module) => set({ activeModule: module, selectedSession: null, messages: [] }),
  setSelectedSession: (id) => set({ selectedSession: id }),
  setMessage: (msg) => set({ message: msg }),
  setMessages: (msgs) => set((state) => ({ messages: typeof msgs === 'function' ? msgs(state.messages) : msgs })),
  clearChat: () => set({ selectedSession: null, message: '', messages: [] }),
}));

interface PrakritiState {
  answers: Record<string, number>;
  result: string | null;
  setAnswers: (answers: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setResult: (result: string | null) => void;
}

export const usePrakritiStore = create<PrakritiState>((set) => ({
  answers: {},
  result: null,
  setAnswers: (answers) => set((state) => ({ answers: typeof answers === 'function' ? answers(state.answers) : answers })),
  setResult: (result) => set({ result }),
}));

interface VaidyaState {
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
  loadedCase: null | { id: string, difficulty: string, caseText: string };
  selectedDosha: 'Vata' | 'Pitta' | 'Kapha' | 'Dual';
  selectedHerb: string;
  selectedPanchakarma: string;
  teachingNote: string | null;
  sessionId: string | null;
  setDifficulty: (dif: 'Basic' | 'Intermediate' | 'Advanced') => void;
  setLoadedCase: (caseObj: any) => void;
  setSelectedDosha: (dosha: 'Vata' | 'Pitta' | 'Kapha' | 'Dual') => void;
  setSelectedHerb: (herb: string) => void;
  setSelectedPanchakarma: (pan: string) => void;
  setTeachingNote: (note: string | null) => void;
  setSessionId: (id: string | null) => void;
}

export const useVaidyaStore = create<VaidyaState>((set) => ({
  difficulty: 'Basic',
  loadedCase: null,
  selectedDosha: 'Vata',
  selectedHerb: 'Ashwagandha',
  selectedPanchakarma: 'Basti (Enema)',
  teachingNote: null,
  sessionId: null,
  setDifficulty: (dif) => set({ difficulty: dif }),
  setLoadedCase: (c) => set({ loadedCase: c, teachingNote: null }),
  setSelectedDosha: (dosha) => set({ selectedDosha: dosha }),
  setSelectedHerb: (herb) => set({ selectedHerb: herb }),
  setSelectedPanchakarma: (pan) => set({ selectedPanchakarma: pan }),
  setTeachingNote: (note) => set({ teachingNote: note }),
  setSessionId: (id) => set({ sessionId: id }),
}));
