# Customer Support Triage AI (PatientCheck)

An advanced, AI-powered platform for patent professionals to automate the extraction, analysis, and refinement of claim elements. 

## 🚀 Key Features

- **Automated Claim Extraction**: Instantly parse PDF and DOCX files to extract claim elements into a structured grid.
- **AI-Powered Refinement**: Refine evidence and reasoning with context-aware AI suggestions powered by Google Gemini.
- **NexaTherm Pro Demo**: A comprehensive, built-in demo (NexaTherm Pro NXT-2000) showcasing realistic infringement scenarios, including strong matches and evidence conflicts.
- **Context-Aware Suggestions**: Dynamic "Suggestion Chips" that guide users through common refinement tasks based on the matched status of each element.
- **Interactive Guided Tour**: A step-by-step walkthrough to help new users master the platform's features within minutes.
- **Robust DOCX Export**: One-click professional report generation with properly formatted tables and evidence citations.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, React Joyride.
- **Backend**: Node.js, Express, Axios.
- **AI**: Integrates with **Google Gemini AI** for intelligent document parsing and claim refinement.
- **Storage**: Local browser storage for charts and session persistence.

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sauraodalvi/PatientCheck.git
   cd PatientCheck
   ```

2. **Setup Server**:
   ```bash
   cd server
   npm install
   # Create a .env file with your API key (optional, can be entered in UI)
   # GEMINI_API_KEY=your_key_here
   npm run dev
   ```

3. **Setup Client**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

## 📝 Usage

1. **Enter API Key**: Provide your Gemini API key in the sidebar.
2. **Load a Chart**: Use the "New Chart" button or click "Demo" to explore with pre-loaded data.
3. **Refine Elements**: Select a claim element to view AI feedback and refinement chips in the chat pane.
4. **Export Results**: Download your refined claim chart as a professional DOCX document.

---

*Developed for high-efficiency patent analysis workflow.*
