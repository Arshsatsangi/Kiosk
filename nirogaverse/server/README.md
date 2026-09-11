# Enginuity ML Tutor — Backend

The server-side API for an AI-powered Machine Learning tutoring platform. Handles user authentication, quiz management, AI-powered chat (with book RAG), performance tracking, and database operations.

---

## What This Server Does

- **Authentication** — User registration, login, JWT-based sessions, OTP password reset.
- **AI Tutor Chat** — Retrieves relevant textbook content (RAG) and generates responses using Google Gemini / OpenAI.
- **Quiz Engine** — Serves MCQ questions by topic and Bloom's Taxonomy level, grades answers with AI-assisted evaluation.
- **Dashboard API** — Returns performance summaries, topic-wise scores, and chart-ready data.
- **Admin API** — Platform-wide analytics and user management.
- **Data Pipeline** — Scripts to ingest a PDF textbook, extract topics, and generate quiz questions.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Express.js** | Web server framework |
| **TypeScript** | Type-safe JavaScript |
| **Prisma** | Database ORM (schema, migrations, queries) |
| **PostgreSQL** | Relational database |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Google Generative AI** | Gemini API for chat & question generation |
| **Zod** | Input validation |
| **Helmet** | Security headers |
| **Morgan** | Request logging |
| **Docker** | Containerized deployment |

---

## Project Structure

```
server/
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript config
├── Dockerfile                  # Docker image for production
├── .env.example                # Environment variable template
│
├── prisma/
│   ├── schema.prisma           # Database schema (all tables)
│   ├── seed.ts                 # Seeds Bloom levels & ML topics
│   └── migrations/             # Migration history (auto-generated)
│
├── data/
│   └── ml_book.pdf             # ML textbook (not in repo — see Setup)
│
├── scripts/                    # One-time data pipeline scripts
│   ├── ingest_book.js          # PDF → BookChunk records + page images
│   ├── extract_topics.js       # BookChunks → Topic records (via Gemini)
│   ├── generate_questions.js   # Topics → MCQ Questions (via Gemini)
│   └── test_chat_db.js         # Test chat DB operations
│
└── src/
    ├── app.ts                  # Express app entry point
    │
    ├── config/
    │   ├── env.ts              # Environment variables config
    │   └── db.ts               # Prisma client singleton
    │
    ├── routes/                 # Route definitions
    │   ├── auth.routes.ts      # /api/auth/* (login, register, reset)
    │   ├── quiz.routes.ts      # /api/quiz/* (start, submit, history)
    │   ├── chat.routes.ts      # /api/chat/* (send message, sessions)
    │   ├── dashboard.routes.ts # /api/dashboard/* (performance data)
    │   └── admin.routes.ts     # /api/admin/* (analytics)
    │
    ├── controllers/            # Business logic
    │   ├── auth.controller.ts  # Auth logic (JWT, bcrypt, OTP)
    │   ├── quiz.controller.ts  # Quiz logic (grading, scoring)
    │   ├── chat.controller.ts  # Chat logic (RAG, AI responses)
    │   └── dashboard.controller.ts  # Dashboard data aggregation
    │
    └── middleware/
        ├── auth.middleware.ts  # JWT verification middleware
        └── error.middleware.ts # Global error handler
```

---

## Database Schema (Key Tables)

```
User ──────┬── QuizAttempt ── QuestionAnswer
           ├── PerformanceSummary
           ├── ChatSession ── ChatMessage
           └── UserQuestionSet

Topic ─────┬── Question (by BloomLevel)
           ├── BookChunk (textbook content for RAG)
           └── QuizAttempt

BloomLevel ── Question, QuizAttempt, PerformanceSummary
```

**6 Bloom Levels:** Remember → Understand → Apply → Analyze → Evaluate → Create

**24 ML Topics:** Linear Regression, Neural Networks, Decision Trees, SVM, Clustering, and more.

---

## Prerequisites

Make sure you have these installed:

- **Node.js** (v18 or higher) — [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v15 or higher) — Either install locally OR use Docker
- **Docker** (optional, recommended) — [Download here](https://www.docker.com/)

---

## Getting Started

### Step 1: Set up the database

**Option A — Using Docker (recommended):**

```bash
# From the project root (where docker-compose.yml is)
docker compose up -d postgres
```

This starts PostgreSQL on port 5432 with:
- User: `ml_admin`
- Password: `mltutor123`
- Database: `ml_tutor`

**Option B — Using local PostgreSQL:**

Create a database named `ml_tutor` and note your connection URL.

---

### Step 2: Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit the `.env` file:

```env
# Database
DATABASE_URL="postgresql://ml_admin:mltutor123@localhost:5432/ml_tutor?schema=public"

# Authentication
JWT_SECRET="your-super-secret-key-change-this"

# AI APIs (get keys from respective platforms)
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"        # Optional

# Google Custom Search (for image search in chat)
GOOGLE_CSE_API_KEY="your-google-cse-key"    # Optional
GOOGLE_CSE_ID="your-search-engine-id"       # Optional

# Server
PORT=3000
CLIENT_URL="http://localhost:5173"
```

### Step 3: Install dependencies

```bash
npm install
```

### Step 4: Set up the database schema

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev

# Seed initial data (Bloom levels + 24 ML topics)
npx prisma db seed
```

### Step 5: Start the server

```bash
npm run dev
```

The server will start at **http://localhost:3000**

---

## Data Pipeline (One-Time Setup)

These scripts populate the database with textbook content and quiz questions:

### 1. Place the ML textbook

Put your ML textbook PDF at `server/data/ml_book.pdf`

### 2. Ingest the book

```bash
node scripts/ingest_book.js
```

This reads the PDF, extracts text page-by-page, and saves it to the `BookChunk` table. It also generates page images in `client/public/book_images/`.

### 3. Extract topics

```bash
node scripts/extract_topics.js
```

Uses Gemini AI to identify ML topics from the book content and saves them to the `Topic` table.

### 4. Generate quiz questions

```bash
node scripts/generate_questions.js
```

Uses Gemini AI to generate MCQ questions for each topic at each Bloom's Taxonomy level.

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login & get JWT token |
| POST | `/api/auth/forgot-password` | Request OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| GET | `/api/auth/me` | Get current user profile |

### Quiz (`/api/quiz`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/quiz/topics` | List all topics |
| POST | `/api/quiz/start` | Start a quiz (topic + Bloom level) |
| POST | `/api/quiz/submit` | Submit answers & get graded |
| GET | `/api/quiz/history` | Get past quiz attempts |

### Chat (`/api/chat`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/message` | Send a message to AI tutor |
| GET | `/api/chat/sessions` | List chat sessions |
| GET | `/api/chat/sessions/:id` | Get a specific session's messages |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Overall performance summary |
| GET | `/api/dashboard/topics` | Topic-wise performance |
| GET | `/api/dashboard/recent` | Recent activity |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform-wide statistics |

---

## Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with hot reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled server (production) |
| `npx prisma studio` | Open visual database browser |
| `npx prisma migrate dev` | Run pending migrations |
| `npx prisma db seed` | Seed the database |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `DATABASE_URL` error | Make sure PostgreSQL is running and `.env` has correct URL |
| `npx prisma migrate dev` fails | Check if the database exists and credentials are correct |
| `GEMINI_API_KEY` error | Get a free key from [Google AI Studio](https://aistudio.google.com/) |
| Port 3000 already in use | Change `PORT` in `.env` or kill the other process |
| `Cannot find module` errors | Run `npm install` and `npx prisma generate` |

---

## License

This project is part of a university major project (2026).
