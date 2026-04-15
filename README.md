# PatientCheck AI 🧬⚖️

**PatientCheck** is an open-source, high-fidelity AI assistant designed for patent professionals, litigation analysts, and legal tech innovators. By bridging the gap between raw technical documents and defensible claim mappings, it transforms the traditionally manual patent audit process into a streamlined, AI-optimized, and **evidence-aware** workflow.

> [!IMPORTANT]
> **API Requirement:** This project is powered by **Google Gemini 2.0 Flash** for maximum technical precision. You can provide your API key in the Mission Control sidebar (Settings) or via server environment variables.

---

## 🚀 The Product Vision
Built from the perspective of a **Product Manager & AI Builder**, PatientCheck is centered around **Legal Defensibility and Technical Grounding**. 

Unlike generic AI tools that simply summarize text, PatientCheck acts as a "Senior Technical Specialist" and "Audit Judge." It eliminates hedging language (e.g., "suggests", "appears to"), enforces strict § section citations, and generates a **Legal Defensibility Score (LDS)** to ensure every mapping is courtroom-ready.

## ✨ Key Features
- **🛡️ Evidence Arbitration:** Intelligent resolution of conflicting technical specifications across multiple document versions.
- **📊 AI Quality Scorecard:** Quantitative LDS metrics (0-100%) to instantly identify ungrounded or weak mappings.
- **🔍 Grounded RAG Search:** High-performance vector indexing for instant evidence retrieval with strict "No Evidence Found" safety rails.
- **📄 Robust Document Parsing:** Instant extraction of structured claim elements from complex PDF and DOCX files.
- **💬 Collaborative Refinement:** An interactive AI chat interface for iterative evidence strengthening and reasoning cleanup.
- **🔄 Defensive Pipeline:** Automated auditing for citation accuracy, technical precision, and legally weak language.
- **📂 Professional Export:** One-click generation of refined claim charts into industry-standard, clean DOCX format.

## 🛠️ The Tech Stack (AI Builder Perspective)
- **AI Infrastructure:** Google Gemini 2.0 Flash (`gemini-2.0-flash`) for precise technical reasoning and ultra-fast throughput.
- **Embeddings:** `text-embedding-004` (optimized for document retrieval and cross-referencing).
- **Frontend:** React 19 + Vite + Tailwind CSS (featuring a premium glassmorphic/dark-mode "Mission Control" UI).
- **Backend:** Node.js + Express + TypeScript with memory-mapped vector search.
- **UX:** Full-state undo/redo history for each element and integrated guided tours via `react-joyride`.

## 🚦 Getting Started

### Prerequisites
- Node.js (v20+)
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
