# 📜 Project Constitution — AI Bug Tracker

> `gemini.md` is **law**. All schemas, rules, and architectural decisions live here.

---

## 1. Data Schemas

### 1.1 Bug Report — Input Schema (Create/Edit)

```json
{
  "title": "string (required) — Short descriptive bug title",
  "description": "string (required) — Detailed bug description",
  "steps_to_reproduce": "string (required) — Step-by-step reproduction instructions",
  "expected_result": "string (required) — What should have happened",
  "actual_result": "string (required) — What actually happened",
  "severity": "enum: ['Major', 'Minor', 'Trivial'] — Set by reporter",
  "priority": "enum: ['P1', 'P2', 'P3', 'P4'] — Set by reporter",
  "module": "string (optional) — Application module/component affected",
  "screenshots": "array of file objects (optional, recommended) — Uploaded images",
  "reporter": "string (required) — QA person who found the bug",
  "assignee": "string (optional) — Developer assigned to fix"
}
```

### 1.2 Bug Report — Stored Record Schema

```json
{
  "bug_id": "string (auto-generated) — Format: BUG-XXXX",
  "title": "string",
  "description": "string — Detailed professional technical description",
  "steps_to_reproduce": "string",
  "expected_result": "string",
  "actual_result": "string",
  "severity": "enum: ['Major', 'Minor', 'Trivial']",
  "priority": "enum: ['P1', 'P2', 'P3', 'P4']",
  "status": "enum: ['To Do', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Rejected']",
  "module": "string",
  "screenshots": [
    {
      "filename": "string",
      "url": "string",
      "uploaded_at": "ISO 8601 datetime"
    }
  ],
  "reporter": "string",
  "assignee": "string",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime",
  "comments": [
    {
      "author": "string",
      "text": "string",
      "timestamp": "ISO 8601 datetime"
    }
  ],
  "audit_history": [
    {
      "field_changed": "string",
      "old_value": "string",
      "new_value": "string",
      "changed_by": "string",
      "changed_at": "ISO 8601 datetime"
    }
  ],
  "ai_metadata": {
    "disabled_for_mvp": true
  }
}
```

### 1.3 User Schema

```json
{
  "user_id": "string (auto-generated)",
  "name": "string (required)",
  "email": "string (required, unique)",
  "role": "enum: ['QA', 'Frontend Developer', 'Backend Developer', 'Lead']",
  "avatar_url": "string (optional)",
  "created_at": "ISO 8601 datetime"
}
```

### 1.4 Status Workflow (State Machine)

```
To Do → In Progress → Fixed → Retest → Closed
                  ↘                    ↗
                   → Rejected ←───────
```

**Allowed transitions:**
| From         | To            | Allowed Roles       |
|--------------|---------------|---------------------|
| To Do        | In Progress   | Developer           |
| In Progress  | Fixed         | Developer           |
| Fixed        | Retest        | QA                  |
| Retest       | Closed        | QA only             |
| Retest       | In Progress   | QA (reopen)         |
| Any          | Rejected      | Lead, Admin         |

### 1.5 Dashboard Payload Schema

```json
{
  "summary": {
    "total_bugs": "integer",
    "by_status": {
      "to_do": "integer",
      "in_progress": "integer",
      "fixed": "integer",
      "retest": "integer",
      "closed": "integer",
      "rejected": "integer"
    },
    "by_severity": {
      "major": "integer",
      "minor": "integer",
      "trivial": "integer"
    },
    "by_priority": {
      "p1": "integer",
      "p2": "integer",
      "p3": "integer",
      "p4": "integer"
    }
  },
  "bugs": "array of Bug Records (paginated, filterable, sortable)",
  "export_formats": ["CSV", "Excel"]
}
```

---

## 2. Behavioral Rules

### 2.1 AI Rules (Disabled for MVP)
- **BR-01:** AI integration is disabled for the MVP due to quota limitations.
- **BR-02:** Bug classification and duplicate detection must be done manually by QA.
- **BR-03:** AI-formatting features are disabled.
- **BR-04:** This section is reserved for future AI feature re-enablement.

### 2.2 Workflow Rules
- **BR-05:** Status transitions must follow the defined state machine (Section 1.4).
- **BR-06:** Only **QA** can mark bugs as **Closed** after **Retest**.
- **BR-07:** All bug reports must include structured fields: **steps to reproduce, expected result, actual result**.
- **BR-08:** Screenshots are **strongly recommended** but not mandatory.
- **BR-09:** The system must maintain full **audit history** of all status changes.

### 2.3 Access Control Rules
- **BR-10:** QA: Create bugs, Retest, Close/Reopen after retest. Can view all tickets. Admin role with permission to Delete tickets.
- **BR-11:** Lead: Full access, can view all tickets, and can Reject bugs from any status.
- **BR-12:** Frontend Developer: Can only view tickets assigned to the Frontend role. Can update status and comment.
- **BR-13:** Backend Developer: Can only view tickets assigned to the Backend role. Can update status and comment.

---

## 3. Architectural Invariants

- **Data-First Rule:** Define Schema before building any Tool.
- **Self-Annealing:** On failure → Analyze → Patch → Test → Update Architecture.
- **Layered Architecture:**
  - Layer 1: SOPs in `architecture/` (Markdown)
  - Layer 2: Navigation / Decision Logic
  - Layer 3: Tools in `tools/` (Deterministic Python Scripts)
- **No Guessing:** Never assume business logic. Ask or research.
- **Constitution Authority:** `gemini.md` overrides all other docs. Changes require justification.
- **Internal-Only:** No external bug tracker integration (no Jira, no GitHub Issues). System is self-contained.
- **AI Disabled:** AI integrations are paused for the MVP.

---

## 4. Technology Stack

| Component       | Technology                          | Rationale                              |
|-----------------|-------------------------------------|----------------------------------------|
| Frontend        | HTML + CSS + JavaScript             | Simple, no framework overhead for MVP  |
| Backend         | Python (Flask)                      | Lightweight, rapid API development     |
| Database        | SQLite (MVP) → PostgreSQL (future)  | Zero-config local, easy migration path |
| AI/LLM          | Disabled for MVP                      | N/A                                    |
| Notifications   | Slack Webhook (future)              | Status change alerts                   |
| Export          | CSV / Excel                         | Management reporting                   |

---

## 5. Maintenance Log

| Date       | Change Description                                    | Author     |
|------------|-------------------------------------------------------|------------|
| 2026-03-04 | Initial constitution created                          | System     |
| 2026-03-04 | Phase 1 Discovery complete — Schema & Rules defined   | System     |
| 2026-03-04 | Phase 2 Link — AI integrations disabled for MVP       | System     |

---

## 6. Environment & Credentials

> Credentials stored in `.env`. AI integrations disabled for MVP.

| Service         | Key Name              | Status      |
|-----------------|-----------------------|-------------|
| AI/LLM          | `GEMINI_API_KEY`     | ❌ Disabled |
| Slack Webhook    | `SLACK_WEBHOOK_URL`  | ⏳ Optional |
