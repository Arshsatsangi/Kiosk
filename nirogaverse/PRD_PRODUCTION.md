# NirogaVerse PRD: Publication and Production

## 1. Vision
Build a production-grade Ayurvedic intelligence platform with multi-agent orchestration, Charaka-grounded reasoning, age-adaptive voice guidance, and auditable clinical safety.

## 2. Product Scope
- AyurVaani: patient consultation assistant.
- Prakriti module: constitution analysis.
- VaidyaViveka module: clinical reasoning training.
- Practitioner and admin monitoring dashboards.

## 3. Core Technology Stack
- Frontend: Next.js 15 + TypeScript.
- Backend: FastAPI multi-agent orchestration service.
- Database: PostgreSQL 16.
- Retrieval: pgvector-backed Charaka semantic search (phase 2).
- LLM Provider: OpenAI API (OPENAI_API_KEY).
- Queue and cache: Redis + worker process.
- Storage: S3-compatible object store for PDF/audio artifacts.

## 4. Multi-Agent Orchestration Requirements
Agents must run in explicit order with logging of agent input, output, confidence, and latency.

1. Intake Agent
- Normalize complaint and extract structured symptom context.

2. Age Persona Agent
- Derive age band and communication style profile.
- Age bands: child (<16), young adult (16-30), adult (31-59), elder (60+).

3. Charaka Knowledge Agent
- Retrieve top relevant Charaka references from indexed corpus.
- Return citations and confidence score.

4. Clinical Reasoning Agent
- Produce diagnosis, home remedies, diet, lifestyle, precautions, and follow-up in structured JSON.

5. Safety Guardrail Agent
- Check red flags and contraindications.
- If high risk, enforce escalation guidance and suppress risky instructions.

6. Translation Agent
- Render clear bilingual response with medical consistency.

7. Voice Rendering Agent
- Select voice profile by age band and language.
- Control pace, pitch, and clarity for user-friendly comprehension.

8. Report Agent
- Create report payload for PDF generation and async notification channels.

## 5. Age-Adaptive Voice Policy
- Child: warm, simple vocabulary, slower cadence, caregiver hints.
- Young adult: direct and concise.
- Adult: balanced depth and practical sequencing.
- Elder: calm and clear, slower pace, repetition for safety points.

## 6. Charaka Samhita Grounding Policy
- Recommendations must cite retrieved context from Charaka knowledge base.
- Low-confidence retrieval forces conservative advice and stronger caution messaging.
- Audit trace stores citations used in final answer.

## 7. Non-Functional Requirements
- Availability: 99.9% at launch, 99.95% in production phase.
- Performance target: P95 consultation response < 8s excluding long async tasks.
- Security: secret vault integration, encryption in transit/at rest, role-based access control.
- Compliance: consent records, immutable audit logs, data retention policy.

## 8. Publication Plan (Beta)
- Single region deployment.
- Core consultation and bilingual output.
- Basic monitoring and incident response runbook.

## 9. Production Plan
- Multi-service deployment with worker queues.
- Full observability: traces, metrics, alerts, and quality dashboards.
- Human review queue for low-confidence or high-risk outputs.
- Canary release with rollback automation.

## 10. Acceptance Criteria
- Consultation requests pass through all defined agents.
- Final output includes safety status, citations, and age-specific voice profile.
- OpenAI key-based model calls work reliably with retries.
- PostgreSQL stores users, encounters, and per-agent traces.
