# 🔍 Findings — AI Bug Tracker

> This file stores research, discoveries, constraints, and learnings encountered during the project.

---

## Phase 0 Findings

### Project Context
- **Project Name:** AI Bug Tracker
- **Initialized:** 2026-03-04
- **Protocol:** B.L.A.S.T. (Blueprint, Link, Architect, Stylize, Trigger)
- **Architecture:** A.N.T. 3-Layer (Architecture, Navigation, Tools)

### Previous Related Work
- A **Bug Reporter** web app was previously built (separate project) with Jira API integration
- An **AI Test Planner** project also exists with BLAST protocol usage
- This project is a **replacement for manual Google Sheets bug tracking**

---

## Phase 1 Findings

### Discovery Answers Summary

| Question        | Answer                                                              |
|-----------------|---------------------------------------------------------------------|
| North Star      | Centralized AI-assisted internal bug tracker replacing Google Sheets |
| Integrations    | AI/LLM (Gemini/OpenAI), Slack (future), no Jira/GitHub             |
| Source of Truth  | Manual web form + screenshot uploads                                |
| Delivery Payload | Web dashboard + CSV/Excel export                                   |
| Behavioral Rules | 12 rules defined in gemini.md covering AI, workflow, access control |

### Key Architectural Decisions
1. **Internal-only system** — no external tracker integration (no Jira, GitHub Issues)
2. **SQLite for MVP** — zero-config, easy migration to PostgreSQL later
3. **Flask backend** — lightweight Python API server
4. **Vanilla frontend** — HTML + CSS + JavaScript (no React/Vue overhead)
5. **AI is advisory** — suggests severity & duplicates, never auto-acts
6. **Role-based access** — QA, Developer, Lead, Admin with defined permissions

### Status Workflow Design
```
To Do → In Progress → Fixed → Retest → Closed
                  ↘                    ↗
                   → Rejected ←───────
```

### AI Capabilities (MVP)
1. **Auto-format descriptions** — Polish raw bug descriptions into professional technical language
2. **Severity suggestion** — Analyze bug details and suggest Critical/Major/Minor/Trivial
3. **Duplicate detection** — Compare new bugs against existing bugs, flag potential duplicates

### Technology Research
- **Flask** — Well-suited for REST API, SQLite integration, file upload handling
- **SQLite** — Perfect for MVP, built-in Python support via `sqlite3` module
- **Gemini API** — Google's LLM for text generation and analysis
- **Flask-CORS** — Cross-origin support for frontend-backend separation
- **openpyxl** — Python library for Excel export
- **python-dotenv** — Environment variable management

### Database Tables (MVP)
1. `users` — User accounts with roles
2. `bugs` — Bug reports with all fields
3. `bug_screenshots` — Screenshot file references
4. `bug_comments` — Comment thread per bug
5. `audit_log` — Full history of all changes
