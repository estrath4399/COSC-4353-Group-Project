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

This guide ensures QueueSmart remains structured, assignment-aligned, and maintainable throughout the semester.