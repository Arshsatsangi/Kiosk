# 🌿 NirogaVerse

> **AI-Powered Ayurvedic Wellness Ecosystem for Modern Living**  
> *Holistic Health • Ancient Wisdom • Modern Intelligence*

NirogaVerse is an end-to-end intelligent platform bridging the millennia-old wisdom of Ayurveda (specifically the *Charaka Samhita*) with cutting-edge Generative AI and Voice-to-Text technologies. Designed for both patients and practitioners, the ecosystem personalizes holistic healing, analyzes dosha profiles, and actively teaches clinical reasoning.

---

## 🚀 Key Modules

### 1. 🎙️ AyurVaani Consultation
A next-generation, **voice-enabled bilingual AI assistant** (Hindi & English).
* **Smart Intake:** Dynamically asks 5 personalized clinical questions based on patient complaints.
* **LLM Gatekeeping:** Strictly filters out non-medical/nonsense inputs to ensure focused consultations.
* **Auto-Translation:** Seamlessly standardizes Devanagari/Hindi names to English for database uniformity while keeping chat interactive.
* **Robust PDF Prescriptions:** Automatically generates beautifully formatted PDF reports including Ayurvedic Diagnosis, *Gharelu Upchar* (Home Remedies), Diet, Lifestyle, and classically grounded medication charts.

### 2. 🪞 Prakriti Pratibimbha
An intelligent Dosha Analysis engine.
* Extracts characteristics from user text or questionnaires to calculate precise neuro-biological constitution (*Vata*, *Pitta*, *Kapha*).
* Returns dynamic wellness reports highlighting natural strengths and tailored lifestyle interventions.

### 3. 🧠 Vaidya Viveka
A clinical AI tutor designed for Ayurvedic practitioners and students.
* **Adaptive Simulation:** Generates infinite, randomized patient case vignettes across three difficulty levels.
* **Structured Evaluation:** Evaluates user-submitted diagnoses (Dosha, Herb, Panchakarma) and scores them beautifully (`Score: X/3`).
* **AI Tutor:** Need help understanding why you were wrong? The *"Explain My Mistake"* feature triggers an AI breakdown bridging the gap between student reasoning and *Charaka Samhita* gold standards!

---

## 🛠️ Technology Stack

### Frontend (Client)
* **Framework:** React.js + Vite + TypeScript
* **State Management:** Zustand
* **Routing:** React Router v6
* **Styling:** Custom Vanilla CSS (Glassmorphism, Dark Gradients, Smooth Animations)
* **Voice & UI:** Native Browser `SpeechRecognition` API, `jspdf` (for report generation), `lucide-react` (iconography), `react-markdown` (for rendering AI results).

### Backend (Server)
* **Framework:** Node.js Express Server + TypeScript
* **Database & ORM:** PostgreSQL alongside Prisma ORM
* **Authentication:** Built-in Auth/Session Middleware
* **Intelligence:** OpenAI SDK (`gpt-4o-mini`) + RAG Implementation over Charaka Samhita texts.

---

## 📂 Project Architecture

```bash
Nirogaverse/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable layout and card components
│   │   ├── pages/          # All major route entry points (Home, Chat, Prakriti, Vaidya)
│   │   ├── services/       # Axios API integrations
│   │   ├── store/          # Zustand states and Image Assets
│   │   └── index.css       # Full custom design system
│   └── vite.config.ts
├── server/                 # Express Backend
│   ├── src/
│   │   ├── controllers/    # Contains niro.controller.ts (The AI logic core)
│   │   ├── middleware/     # Custom Auth and Validation layers
│   │   ├── routes/         # Express unified routing
│   │   └── services/       # Charaka RAG architecture and LLM pipelines
│   └── prisma/             # Database Schema Models (User, ChatSession, Encounter)
└── old/                    # Python/Gradio Legacy reference (Deprecated)
```

---

## ⚡ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v16.14+)
- [PostgreSQL](https://www.postgresql.org/)
- OpenAI API Key

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/nirogaverse.git
   cd Nirogaverse
   ```

2. **Setup the Backend**
   ```bash
   cd server
   npm install
   # Configure your .env with DATABASE_URL and OPENAI_API_KEY
   npx prisma db push
   npm run dev
   ```

3. **Setup the Frontend**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

4. **Experience the Magic**
   Navigate to `http://localhost:5173` and launch into your personalized Ayurvedic journey!

---

## 🛡️ Important Logic Highlights
* **Context Preservation:** Chat memory strictly utilizes API-delivered Session IDs ensuring that new queries refer to exact historical chats for proper AI clinical continuity.
* **Encounter Records:** All final AI reports bypass volatile caching to natively write strict medical objects back into the `Encounter` database logs ensuring zero patient history loss.

> *Disclaimer: NirogaVerse incorporates advanced LLMs strictly for educational and self-guidance augmentation. It is not currently certified as a primary medical diagnostic replacement.*
