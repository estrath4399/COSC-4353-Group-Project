# QueueSmart – Project Guide

This document explains:
- How to use the project documentation
- How development aligns with assignments A1–A4
- How to use Cursor effectively
- Copy-paste prompts for consistent results

---

# Documentation Overview

## 1. product-requirements.md
Defines:
- What QueueSmart must do
- Functional behavior
- Phase breakdown (A1–A4)
- Use cases and conceptual data model

This is the source of truth for behavior.
Do not change scope without updating this first.

---

## 2. engineering-requirements.md
Defines:
- Folder structure
- Module boundaries
- API contracts
- In-memory structures (A3)
- Database schema (A4)
- Validation enforcement

This is the technical blueprint.
Code must follow this structure.

---

# Assignment Mapping

| Phase | Assignment | Focus |
|--------|------------|--------|
| PHASE 1 | A1 | Design only (no code) |
| PHASE 2 | A2 | Frontend only (mock data allowed) |
| PHASE 3 | A3 | Backend APIs + in-memory + tests |
| PHASE 4 | A4 | Database integration + persistence |

---

# What Not To Do

- Do NOT implement database in A2.
- Do NOT introduce Docker or cloud infrastructure.
- Do NOT modify architecture without updating documentation.
- Do NOT mix A3/A4 work into A2.

---

# How to Use Cursor (Copy-Paste Prompts)

Always:
1. Open the file you want to modify.
2. Reference engineering-requirements.md.
3. Use one of the prompts below.

---

# PHASE 2 – Frontend Prompts

## Implement a Screen

Paste into Cursor:

    You are implementing PHASE 2 of QueueSmart.

    Follow engineering-requirements.md → PHASE 2.

    Implement the [SCREEN NAME] page.

    Constraints:
    - No backend calls.
    - Use mock data only.
    - Include client-side validation.
    - Follow folder structure defined in engineering-requirements.md.
    - Do not introduce new architecture.

    Return complete code for this file.

---

## Add Client-Side Validation

    Add client-side validation to this form based on engineering-requirements.md.

    Rules:
    - Required fields enforced
    - Proper input types
    - Clear error messages
    - Do not add backend logic

---

## Implement Mock API Layer

    Create a mock API module aligned with PHASE 2 mock data structure in engineering-requirements.md.

    Functions should simulate:
    - login
    - register
    - getServices
    - joinQueue
    - leaveQueue
    - getQueueStatus
    - getHistory

    Return consistent mock responses matching planned backend contracts.

---

# PHASE 3 – Backend Prompts

## Implement Authentication Module

    You are implementing PHASE 3 of QueueSmart.

    Implement the Authentication module.

    Constraints:
    - Use in-memory storage only.
    - Follow endpoint structure in engineering-requirements.md.
    - Include validation.
    - Return appropriate HTTP status codes.
    - Do not implement database.

---

## Implement Queue Management Logic

    Implement the Queue Management module from PHASE 3.

    Requirements:
    - joinQueue
    - leaveQueue
    - serveNext
    - enforce ordering by arrival (and priority if applicable)
    - calculate estimated wait time
    - update history and notifications

    Use in-memory structures only.

---

## Generate Unit Tests

    Generate unit tests for this module.

    Cover:
    - Validation failures
    - Success cases
    - Edge cases (empty queue, duplicate join, closed queue)
    - Wait-time calculation

    Target 70–80% coverage.
    Do not mock business logic itself.

---

# PHASE 4 – Database Prompts

## Create Schema

    Generate SQL schema for PHASE 4 of QueueSmart based on engineering-requirements.md.

    Include:
    - Tables
    - Primary keys
    - Foreign keys
    - UNIQUE constraints
    - NOT NULL constraints
    - CHECK constraints

    Do not include deployment tooling.

---

## Replace In-Memory with Repository

    Refactor this module to use a repository abstraction.

    Requirements:
    - Keep API handlers unchanged.
    - Replace in-memory storage with repository calls.
    - Repository will later connect to database.

---

# Development Workflow

1. Check product-requirements.md for behavior.
2. Check engineering-requirements.md for structure.
3. Use a phase-appropriate prompt.
4. Commit only work for the current phase.

---

# When Adding Features

If a new feature is proposed:

1. Update product-requirements.md.
2. Update engineering-requirements.md.
3. Then implement.

Documentation changes must precede code changes.

---

# Team Ownership

Each member:
- Chooses one component within the current phase.
- Works only within that boundary.
- Avoids modifying unrelated modules.

---

This guide ensures QueueSmart remains aligned with course assignments and avoids scope creep.