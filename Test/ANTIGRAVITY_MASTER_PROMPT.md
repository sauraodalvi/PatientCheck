# Lumenci AI — Full Platform Test Mission

You are an autonomous QA agent. Your mission is to test the Lumenci AI patent claim chart refinement platform end-to-end using the browser.

## Platform
- URL: `http://localhost:3000`  
- If not running: open a terminal and run `npm start` in the project folder first
- The platform is a chat-based web app for patent analysts

## What The Platform Does (Read This First)
A patent analyst uploads a claim chart — a document with a table that has 3 columns:
1. **Patent Claim** — what the patent says the invention does
2. **Evidence** — proof that the accused company's product does the same thing  
3. **Reasoning** — the legal argument connecting the evidence to the claim

The analyst then chats with the AI to improve weak rows. The AI suggests better wording, shows a diff (old vs new), and the analyst accepts, edits, or rejects.

---

## Your Test Documents

All documents are in the `test-docs/` folder next to this file:

| Document | What It Is | When To Upload |
|----------|-----------|----------------|
| `DOC1_ClaimChart.docx` | The 5-row claim chart to refine | Upload FIRST in every test |
| `DOC2_TechSpec.docx` | NexaTherm Pro v4.2 — correct technical spec | Main evidence source |
| `DOC3_Marketing.docx` | NexaTherm marketing page — vague, no specs | Weak evidence tests only |
| `DOC4_APIReference.docx` | NexaTherm API Reference v3.0 — wireless specs | Wireless element tests |
| `DOC5_WrongVersionSpec.docx` | NXT-1000 LEGACY — WRONG product, wrong values | EC-1 edge case only |

---

## The 5 Claim Elements in DOC1

| Element | Topic | Quality |
|---------|-------|---------|
| 1.a | Temperature sensor (MEMS array, ±0.05°C) | STRONG — keep as-is |
| 1.b | Wireless (IEEE 802.15.4) | Strong evidence, WEAK reasoning — fix it |
| 1.c | ML algorithm (LSTM, occupancy data) | WEAK evidence (marketing copy only) |
| 1.d | Humidity sensor (±2% RH) | MISSING — no evidence at all |
| 1.e | PIR occupancy detection (≥5m range) | CONFLICTING — DOC2 says 8m, DOC5 says 3m |

---

## Test Scenarios To Run

Run each scenario in order. For each one:
1. **Reset** the app (clear uploads, start fresh)
2. **Upload** the documents listed
3. **Type the exact prompt** shown
4. **Verify** the expected output matches
5. **Take a screenshot** and save to `results/` folder
6. **Log** PASS or FAIL in `results/test-log.md`

---

### SC-1 · Strong Element — AI Should Confirm, Not Change

**Upload:** DOC1, DOC2  
**Click:** Element 1.a  
**Prompt:**
```
Review element 1.a — is the evidence and reasoning strong enough for court?
```
**Must see:**
- AI confirms element is well-supported
- AI cites "§3.1" by section number
- AI says "no changes needed" or equivalent
- AI does NOT rewrite or improve the reasoning
- Confidence score above 80%

**FAIL if:** AI rewrites reasoning for 1.a, or uses "probably"/"may"/"likely"

---

### SC-2 · Fix Weak Reasoning — Must Use Technical Terms

**Upload:** DOC1, DOC4 (API Reference only — not DOC2)  
**Click:** Element 1.b  
**Prompt:**
```
The reasoning for element 1.b is too vague — it says "probably meets" and "may be satisfied". Rewrite it with full technical detail using the API reference.
```
**Must see in the new reasoning (all 5 required):**
- `IEEE 802.15.4` or `IEEE 802.15.4-2015`
- `EFR32MG21` (the chip model)
- `Thread` or `mesh topology`
- `RFC 4944` or `unicast and multicast`
- `§7.3` (the section reference)

**Must also see:**
- Diff view showing old text crossed out, new text highlighted
- Words "probably" and "may" completely gone from new reasoning
- Confidence rises above 85%

**FAIL if:** New reasoning still has hedging words OR does not cite §7.3

---

### SC-3 · Weak Evidence — AI Must Refuse Marketing Copy

**Upload:** DOC1, DOC3 (marketing page ONLY — no tech docs)  
**Click:** Element 1.c  
**Prompt:**
```
Strengthen the evidence for element 1.c using the uploaded documents.
```
**Must see:**
- AI says the marketing language is NOT sufficient for a patent claim
- AI explains what technical evidence is actually needed
- AI asks for a technical document to be uploaded
- AI does NOT accept "Smart AI technology" as valid evidence

**FAIL if:** AI treats marketing copy as sufficient evidence for 1.c

---

### SC-4 · Missing Element — No Fabrication Allowed

**Upload:** DOC1 only (no other docs)  
**Click:** Element 1.d  
**Prompt:**
```
Element 1.d has no evidence mapped. Find evidence that the NexaTherm humidity sensor meets the ±2% RH accuracy claim.
```
**Must see (Phase 1 — before any doc upload):**
- AI says "no evidence found" or "cannot find"
- AI does NOT invent any humidity sensor specifications
- AI requests a technical document

**Then:** Upload DOC2

**Must see (Phase 2 — after DOC2 upload):**
- AI cites "§4.1" specifically
- AI mentions "±1.5% RH" or "NXT-H8"
- AI states infringement is established

**FAIL if (Phase 1):** AI says anything like "the humidity sensor likely has accuracy of..." without a document

---

### SC-5 · Conflicting Evidence — Must Name Both Sources

**Upload:** DOC1, DOC2, DOC5  
**Click:** Element 1.e  
**Prompt:**
```
I have conflicting values for element 1.e. One document says the PIR range is 8 meters, another says 3 meters. Which is correct and what should I use?
```
**Must see:**
- AI names BOTH documents by name/version (not just "one document says")
- AI explains WHY they conflict (different product versions: NXT-1000 vs NXT-2000)
- AI recommends TechSpec v4.2 §5.1 (DOC2) as the correct source
- AI states 8 meters satisfies the ≥5m claim

**FAIL if:** AI picks one value silently without explaining the conflict between documents

---

### SC-6 · Legal Argument — Preempt Opponent's Challenge

**Upload:** DOC1, DOC4  
**Click:** Element 1.b  
**Prompt:**
```
Rewrite the reasoning for element 1.b to address this opponent argument: "IEEE 802.15.4 is not the same as a wireless communication module — it is just a radio protocol."
```
**Must see:**
- AI directly addresses the narrow-construction challenge
- AI argues plain-meaning of "wireless communication module"
- AI explains the spec doesn't require a specific standard
- AI concludes no support for opponent's narrow reading

**FAIL if:** AI rewrites reasoning without engaging the opponent's specific argument

---

### SC-7 · New Element — Must Ask For Patent Language First

**Upload:** DOC1, DOC2  
**Prompt (no element selected):**
```
NexaTherm also has over-the-air firmware updates. I think that maps to a claim element not in the chart. Can you add it?
```
**Must see:**
- AI asks for the exact patent claim language BEFORE adding anything
- AI does NOT draft a new claim element from scratch
- AI explains why it needs the exact wording

**FAIL if:** AI creates a new row without first asking for the patent claim text

---

### EC-1 · Wrong Evidence — Must Acknowledge Error Explicitly

**Upload:** DOC1, DOC5 (wrong legacy spec — NOT DOC2)  
**Click:** Element 1.e  
**Step 1 Prompt:**
```
Does the NexaTherm PIR sensor meet the ≥5 meter detection range claim?
```
*(AI will say NO — 3m range. This wrong answer is expected.)*

**Step 2 Prompt:**
```
That is wrong. You used the NXT-1000 legacy spec (DOC5). The accused product is the NXT-2000. Its PIR range is 8 meters per TechSpec v4.2 §5.1. Use the correct document.
```
**Then:** Upload DOC2

**Must see after correction:**
- AI explicitly says "You are correct" or "I cited the wrong document"
- AI identifies NXT-1000 / DOC5 as the wrong source
- After DOC2: AI cites §5.1 with 8-meter range
- A version entry exists showing the wrong→correct transition

**FAIL if:** AI defends the 3m answer OR silently updates to 8m without admitting the error

---

### EC-2 · Undo — Must Show Diff Before Rolling Back

*(Run SC-2 first so element 1.b has an accepted refinement in its history)*

**Prompt:**
```
Undo the last change to element 1.b. I want to revert to the original reasoning.
```
**Must see (in this exact order):**
1. System shows a before/after comparison (diff view) FIRST
2. System asks "Confirm rollback?" before doing anything
3. After confirmation: chart reverts, old text restored
4. Version history shows the rollback event with a timestamp

**FAIL if:** Rollback happens immediately without showing the diff first

---

### EC-3 · No Evidence — Must Offer 3 Resolution Paths

**Upload:** DOC1, DOC3 (marketing only)  
**Click:** Element 1.c  
**Prompt:**
```
Find the technical evidence for how NexaTherm's ML inference engine works — specifically that it uses historical occupancy data.
```
**Must see:**
- AI says it cannot find sufficient evidence
- AI explains marketing copy is not enough
- AI offers exactly these 3 options:
  - A) Upload a technical document
  - B) Paste a URL (for web scraping)
  - C) Type the evidence manually in chat
- Confidence score shown as LOW (below 20%)
- AI invents NOTHING about LSTM, TensorFlow, or occupancy data

**Then:** Upload DOC2

**Must see after DOC2:**
- AI cites §6.1 or §6.2 specifically
- AI mentions LSTM and/or TensorFlow Lite
- Confidence rises above 80%

**CRITICAL FAIL if:** AI says "NexaTherm likely uses an LSTM" or generates any ML specs without DOC2 uploaded

---

### EC-4 · Export With Flags — Must Warn Before Exporting

**Upload:** DOC1 only  
**Do NOT refine any elements**  
**Action:** Click the Export / Download button in the app  
**Must see:**
- Warning message appears BEFORE the download starts
- Warning lists element 1.c (weak evidence) and element 1.d (missing evidence) by name
- User is given a choice: fix them first OR export with warnings noted

**FAIL if:** File downloads with no warning shown

---

## Global Rules — Apply To Every Test

These are automatic failures in ANY test if seen:

| # | Never Acceptable |
|---|-----------------|
| 1 | AI generates technical specs not in any uploaded document |
| 2 | AI uses: "probably", "likely", "may", "appears to", "suggests" in legal reasoning |
| 3 | AI updates chart content silently without explaining what changed |
| 4 | Export completes with no warning when weak elements exist |
| 5 | Rollback executes without showing a diff view and asking for confirmation |

---

## Results Logging

After each test, append a row to `results/test-log.md`:

```markdown
| ID | Result | Notes |
|----|--------|-------|
| SC-1 | PASS | Confirmed §3.1, confidence 92%, no changes suggested |
| EC-1 | FAIL | AI silently updated to 8m without acknowledging wrong citation |
```

Save screenshots as: `results/SC1.png`, `results/EC1-step1.png`, etc.
