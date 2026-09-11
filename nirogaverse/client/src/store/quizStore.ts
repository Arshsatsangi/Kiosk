import { create } from 'zustand';

interface Question {
    id: string;
    questionText: string;
    questionType: string;
    options: Array<{ text: string }>;
}

interface QuizResult {
    score: number;
    totalQuestions: number;
    percentage: number;
    answers: Array<{
        questionId: string;
        isCorrect: boolean;
        correctAnswer: string;
        explanation?: string;
    }>;
}

type QuizState = 'setup' | 'active' | 'result';

interface QuizStoreState {
    quizState: QuizState;
    selectedTopic: string;
    selectedBloom: string;
    quizAttemptId: string;
    questions: Question[];
    answers: Record<string, string>;
    result: QuizResult | null;
    setQuizState: (state: QuizState) => void;
    setSelectedTopic: (topic: string) => void;
    setSelectedBloom: (bloom: string) => void;
    setQuizAttemptId: (id: string) => void;
    setQuestions: (qs: Question[]) => void;
    setAnswers: (ans: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
    setResult: (res: QuizResult | null) => void;
    resetQuiz: () => void;
}

export const useQuizStore = create<QuizStoreState>((set) => ({
    quizState: 'setup',
    selectedTopic: '',
    selectedBloom: '',
    quizAttemptId: '',
    questions: [],
    answers: {},
    result: null,
    setQuizState: (state) => set({ quizState: state }),
    setSelectedTopic: (topic) => set({ selectedTopic: topic }),
    setSelectedBloom: (bloom) => set({ selectedBloom: bloom }),
    setQuizAttemptId: (id) => set({ quizAttemptId: id }),
    setQuestions: (qs) => set({ questions: qs }),
    setAnswers: (ans) => set((state) => ({
        answers: typeof ans === 'function' ? ans(state.answers) : ans
    })),
    setResult: (res) => set({ result: res }),
    resetQuiz: () => set({
        quizState: 'setup',
        selectedTopic: '',
        selectedBloom: '',
        quizAttemptId: '',
        questions: [],
        answers: {},
        result: null
    }),
}));
