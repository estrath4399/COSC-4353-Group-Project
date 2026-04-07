# QueueSmart – Development Guide

This document explains how QueueSmart should be implemented across assignments A1–A4.  
It ensures consistency between documentation and code and helps prevent scope creep.

---

# Documentation Hierarchy

## 1. product-requirements.md
Defines:
- Functional behavior
- Use cases
- Conceptual data model
- Phase breakdown (A1–A4)

This is the source of truth for what the system must do.

---

## 2. engineering-requirements.md
Defines:
- Folder structure
- Module boundaries
- API contracts
- In-memory design (A3)
- Database schema (A4)
- Validation enforcement

This is the technical blueprint for implementation.

All code should align with these two documents.

---

# Assignment Alignment

| Phase | Assignment | Focus |
|--------|------------|--------|
| PHASE 1 | A1 | System design only (no code) |
| PHASE 2 | A2 | Frontend only (mock data allowed) |
| PHASE 3 | A3 | Backend APIs with in-memory storage and unit tests |
| PHASE 4 | A4 | Database integration and persistence |

---

# Phase-Specific Implementation Guidelines

## PHASE 2 – Frontend

Scope:
- Screens and navigation
- Client-side validation
- Mock data usage
- In-app notifications (UI only)

Rules:
- Do not implement backend logic.
- Do not connect to a real database.
- Follow the folder and module structure defined in engineering-requirements.md.
- Ensure validation matches documented requirements.
- Keep UI behavior aligned with use cases in the PRD.

Before committing:
- Confirm screen matches defined use case.
- Confirm required fields are validated.
- Confirm no backend or database logic was introduced.

---

## PHASE 3 – Backend

Scope:
- REST-style API endpoints
- Business logic
- In-memory data storage
- Unit testing (70–80% coverage)

Rules:
- Use in-memory structures only.
- Enforce validation and business rules.
- Return appropriate status codes.
- Follow endpoint definitions in engineering-requirements.md.
- Write meaningful unit tests.

Before committing:
- Confirm edge cases are handled.
- Confirm wait-time logic is correct.
- Confirm tests pass and coverage target is met.

---

## PHASE 4 – Database

Scope:
- Relational schema implementation
- Constraint enforcement
- Persistence integration
- Credential protection (no plain-text passwords)

Rules:
- Follow entity-to-table mapping from engineering-requirements.md.
- Enforce primary keys, foreign keys, uniqueness, and NOT NULL constraints.
- Replace in-memory storage through repository abstraction.
- Do not modify API handler behavior unnecessarily.

Before committing:
- Confirm schema matches documentation.
- Confirm persistence works across restarts.
- Confirm passwords are hashed before storage.

---

# Change Management

If a new feature or behavior is proposed:

1. Update product-requirements.md.
2. Update engineering-requirements.md.
3. Review changes as a team.
4. Then implement.

Documentation should be updated before implementation.

---

# Contribution Guidelines

- Each team member selects a component within the current phase.
- Work should be scoped to one component per branch or commit set.
- Avoid modifying unrelated modules.
- Keep commits focused and descriptive.
- Ensure code aligns with documented architecture.

---

# Cursor, AI assistants, and keeping documentation in sync

Everyone on the team should see the **same** specs and AI hints as long as the repo is shared via Git.

## What travels in Git (no extra setup)

- **`docs/`** — `product-requirements.md`, `engineering-requirements.md`, this guide, `bug-fixes-and-improvements.md`, etc. Teammates get updates when they **`git pull`**.
- **`.cursor/rules/`** — Project rules for Cursor (QueueSmart context, backend/frontend conventions, A4 database expectations). These are **committed to the repo**; after a pull, Cursor loads them automatically for files they apply to (or “always apply” rules for every chat).

So: **push your doc and `.cursor` changes** when you merge work; **pull before starting** a session so agents and humans read the same sources.

## What teammates should do in Cursor

1. **Pull latest** from `main` (or your team branch) before starting work.
2. **Treat `docs/product-requirements.md` and `docs/engineering-requirements.md` as source of truth** for behavior and architecture. If the agent suggests something that contradicts them, fix the code—or update the docs first if the change is intentional (see change management below).
3. **Optional:** At the start of a chat, ask the agent to *briefly confirm* it is following the repo’s Cursor rules and the current phase (e.g. A4).
4. When you **fix a user-facing bug or make a notable improvement**, add a short entry to **`docs/bug-fixes-and-improvements.md`** in the same PR or immediately after, so the whole team and future agents see it.

## Why Document Control tables looked “stale”

The footers (“*Update as implementation progresses*”) are a **reminder**, not automation. They only change when someone **edits the table** in Git. If code lands without a Document Control row, teammates and agents can miss that the spec already moved on—so **batch doc updates with merges** when you can.

## Change management (quick reminder)

1. For **new behavior or scope**: update **PRD + engineering** docs (and this guide if phase/process changes), then implement—or put doc edits in the **same PR** as the code.
2. For **bug fixes / small improvements**: at minimum add **`bug-fixes-and-improvements.md`**; bump **Document Control** on the specs if the fix reflects a clarified requirement.

---

This guide ensures QueueSmart remains structured, assignment-aligned, and maintainable throughout the semester.

---

## Documentation revision note

**2025-03-25:** `product-requirements.md` and `engineering-requirements.md` were updated (Document Control versions **0.3** and **0.2** respectively) to record Phase **A3** implementation status and repository alignment, per the change-management rule (docs before or in sync with implementation).

**2026-04-06:** Added **Cursor / documentation sync** guidance above; recorded **A4** (SQLite persistence) and related implementation notes in the PRD and engineering Document Control tables; added **`bug-fixes-and-improvements.md`** for ad-hoc fixes and improvements.

**2026-04-07:** Verified A4 persistence integration and end-to-end flows.  
Validated authentication, queue operations, and notification behavior with SQLite storage.  
Updated documentation and tracked fixes in `bug-fixes-and-improvements.md` to ensure consistency between implementation and requirements.
