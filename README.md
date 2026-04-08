# PatientCheck AI 🧬⚖️

**PatientCheck** is an open-source, high-fidelity AI assistant designed for patent professionals, litigation analysts, and legal tech innovators. By bridging the gap between raw legal documents and defensible claim mappings, it transforms the traditionally manual patent audit process into a streamlined, AI-optimized workflow.

> [!IMPORTANT]
> **API Requirement:** This project requires a **Google Gemini API Key** (standardized on `gemini-2.5-flash`). You can provide this in the Mission Control sidebar or via environment variables.

---

## 🚀 The Product Vision
Built from the perspective of a **Product Manager & AI Builder**, PatientCheck is centered around **Legal Defensibility**. 

Unlike generic AI tools that simply summarize text, PatientCheck acts as a "Senior Attorney" judge. It identifies hedging language (e.g., "suggests", "appears to"), verifies specific § section citations, and generates a **Legal Defensibility Score (LDS)** to ensure every mapping is courtroom-ready.

## ✨ Key Features
- **📊 AI Quality Scorecard:** Quantitative LDS metrics (0-100%) to instantly identify weak mappings.
- **🔍 AI Audit Judge:** Automated auditing for citation accuracy, technical precision, and legally weak language.
- **📄 Robust Document Parsing:** Instant extraction of structured claim elements from complex PDF and DOCX files.
- **💬 Interactive Refinement:** A collaborative AI chat interface with "Suggestion Chips" to iterate on evidence and reasoning.
- **🔄 Batch Auditing:** High-performance throughput to audit entire claim charts in a single pass.
- **📂 Professional Export:** One-click generation of refined claim charts into industry-standard DOCX format.

## 🛠️ The Specs (AI Builder Stack)
- **AI Infrastructure:** Google Gemini 2.5 Flash (utilizing v1beta for advanced reasoning and speed).
- **Frontend:** React 19 + Vite + Tailwind CSS (featuring a premium glassmorphic/dark-mode UI).
- **Backend:** Node.js + Express + TypeScript.
- **UX/Onboarding:** Integrated guided tours via `react-joyride` and real-time interactive diff views.

## 🚦 Getting Started

### Prerequisites
- Node.js (v20+)
- npm / yarn / pnpm
- Google Gemini API Key ([Get one here](https://aistudio.google.com/))

### Quick Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/sauraodalvi/PatientCheck.git
   cd PatientCheck
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   # Create .env with GEMINI_API_KEY=your_key
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

## 🤝 Open Source & Community
PatientCheck is **100% Free and Open Source**. It was built to advance the intersection of AI and Intellectual Property. Pull requests, issues, and strategic feedback from patent pros and devs are always welcome.

---
*Built with a PM's focus on user value and an AI Builder's focus on technical robustness.*
