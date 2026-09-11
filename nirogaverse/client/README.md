# Enginuity ML Tutor — Frontend

A modern React-based web interface for an AI-powered Machine Learning tutoring platform. Students can chat with an AI tutor, take adaptive quizzes, and track their learning progress through interactive dashboards.

---

## What This App Does

- **AI Tutor Chat** — Ask ML questions and get answers from an AI tutor powered by book-level RAG (Retrieval-Augmented Generation). Supports Markdown, LaTeX math rendering, and inline images.
- **Adaptive Quizzes** — Take topic-wise MCQ quizzes aligned with Bloom's Taxonomy levels (Remember → Create).
- **Performance Dashboard** — View your scores with bar charts, pie charts, and topic-level breakdowns.
- **Authentication** — Register, login, forgot password with OTP verification.
- **Admin Panel** — Admin users can view platform-wide analytics and manage content.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Fast dev server & build tool |
| **React Router v6** | Page navigation |
| **Zustand** | Lightweight state management (auth, chat, quiz) |
| **React Query** | Server state & API caching |
| **Axios** | HTTP requests to backend API |
| **Recharts** | Charts for dashboard (bar, pie) |
| **KaTeX** | Math equation rendering |
| **React Markdown** | Markdown rendering in chat |
| **Lucide React** | Icons |

---

## Project Structure

```
client/
├── index.html                  # HTML entry point
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Vite setup (dev server on port 5173)
├── tsconfig.json               # TypeScript config
│
├── public/
│   └── book_images/            # Generated textbook page images (PNG)
│
└── src/
    ├── main.tsx                # React entry — renders <App />
    ├── App.tsx                 # All routes & protected route logic
    ├── index.css               # Global styles, theming, all component CSS
    │
    ├── pages/                  # Each page = one route
    │   ├── Home.tsx            # Landing page (hero, features, recent sessions)
    │   ├── Login.tsx           # Login form
    │   ├── Register.tsx        # Registration form
    │   ├── ForgotPassword.tsx  # Password reset with OTP
    │   ├── TutorChat.tsx       # AI tutor conversation interface
    │   ├── Quiz.tsx            # Quiz interface (topic & level selection, MCQ)
    │   ├── Dashboard.tsx       # Performance charts & topic analysis
    │   └── AdminDashboard.tsx  # Admin panel
    │
    ├── components/             # Reusable UI components
    │   ├── Layout.tsx          # App shell (navbar + footer wrapper)
    │   ├── Footer.tsx          # Footer with modals
    │   ├── FeedbackModal.tsx   # Feedback form
    │   └── Dropdown.tsx        # Reusable dropdown
    │
    ├── services/
    │   └── api.ts              # All API calls (auth, quiz, chat, dashboard, admin)
    │
    └── store/                  # Zustand state stores
        ├── authStore.ts        # User authentication state
        ├── chatStore.ts        # Chat messages & sessions
        └── quizStore.ts        # Quiz state & answers
```

---

## Prerequisites

Make sure you have these installed on your computer:

- **Node.js** (v18 or higher) — [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

To check if they're installed, open a terminal and run:

```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
```

---

## Getting Started

### Step 1: Install dependencies

```bash
cd client
npm install
```

### Step 2: Start the development server

```bash
npm run dev
```

The app will start at **http://localhost:5173**

> The dev server automatically proxies all `/api` requests to `http://localhost:3000` (the backend). Make sure the backend is running too!

### Step 3: Build for production (optional)

```bash
npm run build
```

This creates an optimized `dist/` folder ready for deployment.

---

## How It Connects to the Backend

The frontend communicates with the backend through REST API calls:

```
Frontend (localhost:5173)  ──/api/auth/*──►  Backend (localhost:3000)
                           ──/api/quiz/*──►
                           ──/api/chat/*──►
                           ──/api/dashboard/*──►
                           ──/api/admin/*──►
```

All API calls are defined in `src/services/api.ts`. The Vite dev server proxies `/api` requests to the backend automatically (configured in `vite.config.ts`).

---

## Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |

---

## Key Pages Explained

| Page | Route | What it does |
|---|---|---|
| Home | `/` | Landing page with features overview and recent activity |
| Login | `/login` | Email + password login |
| Register | `/register` | Create a new account |
| Forgot Password | `/forgot-password` | Reset password via OTP email |
| Tutor Chat | `/chat` | Chat with AI tutor — ask ML questions, get book-referenced answers |
| Quiz | `/quiz` | Select a topic & Bloom level, answer 5 MCQs, get graded |
| Dashboard | `/dashboard` | View your quiz performance with charts |
| Admin | `/admin` | Admin-only analytics panel |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `npm run dev` fails | Run `npm install` first |
| API calls return errors | Make sure the backend server is running on port 3000 |
| Blank page after login | Check browser console for errors; ensure backend DB is seeded |
| Styles look broken | Clear browser cache and restart dev server |

---

## License

This project is part of a university major project (2026).
