# REVA AI — Agentic Complaint Portal

## Overview

A secure, multilingual, AI-agent-driven complaint intake system with:

- **Citizen Portal**: Voice-first complaint filing with AI agent guidance
- **Police Portal**: Multi-station dashboard with RBAC and data isolation
- **Backend**: Express + Prisma + PostgreSQL API gateway
- **AI Integration**: Direct Azure OpenAI + Azure Speech integration in frontend

---

## 📁 Project Structure

```
proto-ag/
├── frontend/          # React + Vite (Citizen & Police UI)
├── backend/           # Express.js API Gateway + Prisma ORM
│   ├── src/
│   │   ├── routes/    # auth, complaints, police, stations, analytics
│   │   ├── middleware/ # auth, audit, errorHandler
│   │   └── utils/     # prisma, logger
│   └── prisma/        # schema.prisma
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (or use Docker)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database and Azure credentials
npm install
npx prisma migrate dev
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable                | Description                  |
| ----------------------- | ---------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`     | Access token signing secret  |
| `JWT_REFRESH_SECRET`    | Refresh token signing secret |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint        |
| `AZURE_OPENAI_KEY`      | Azure AI services API key    |
| `AZURE_SPEECH_KEY`      | Azure Speech Services key    |
| `AI_SERVICE_URL`        | Python AI microservice URL   |

### AI Service (`ai-service/.env`)

| Variable                  | Description                  |
| ------------------------- | ---------------------------- |
| `AZURE_OPENAI_ENDPOINT`   | Azure OpenAI endpoint        |
| `AZURE_OPENAI_KEY`        | API key                      |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name (sih-vision) |
| `AZURE_SPEECH_KEY`        | Speech service key           |
| `AZURE_SPEECH_REGION`     | eastus2                      |

---

## 🏛️ Architecture

```
React (port 3000)
    ↓        ↘
Express API    Azure OpenAI +
Gateway        Azure Speech
(port 5000)
    ↓
PostgreSQL
(Prisma ORM)
```

---

## 🤖 AI Agent Stages

1. **Safety Check** — Is user safe?
2. **Open Narrative** — Free-form story collection
3. **Structured Extraction** — Field-by-field extraction
4. **Missing Data Loop** — Targeted follow-ups (max 5)
5. **Threat Detection** — Risk scoring 0-100
6. **Summary Generation** — FIR-style formal summary
7. **User Confirmation** — Final verification

---

## 👮 Police RBAC

| Role          | Capabilities                                      |
| ------------- | ------------------------------------------------- |
| SUPER_ADMIN   | All stations, audit, analytics, configure         |
| STATION_ADMIN | Manage officers, assign tasks, configure geofence |
| OFFICER       | View/update assigned complaints only              |

---

## 🔒 Security

- Row-level security via Prisma query scoping
- JWT access (15m) + refresh (7d) token rotation
- Refresh token reuse detection with revocation
- HTTP-only secure cookies
- Rate limiting (100 req/15min, 10 for OTP endpoints)
- IP logging + audit trail for all mutations
- Aadhaar masked before storage (XXXX-XXXX-XXXX)

---

## 📞 Emergency Contacts

The system automatically detects emergency keywords and displays:

- 📞 **112** — National Emergency
- 📞 **100** — Police
- 📞 **1091** — Women helpline
- 📞 **1098** — Child helpline

---

## 🌐 Supported Languages

Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati, Punjabi, Odia, Malayalam, English
