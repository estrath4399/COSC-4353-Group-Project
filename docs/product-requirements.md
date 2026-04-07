# Product Requirements Document  
**QueueSmart | COSC 4353 – Software Design | Group 21 | Spring 2026**

---

## Executive Summary

This document defines the product requirements for QueueSmart, a smart queue management web application developed as the semester-long COSC 4353 group project. The work is organized into four phases aligned with course assignments A1–A4: System Design, Front-End UI/UX, Backend APIs, and Database & Persistence. Each phase is decomposed into components with clear functional requirements, exclusions, and deliverables to support consistent scope and evaluation. QueueSmart addresses queue management needs in student services and clinic-style settings by allowing users to join queues, view position and estimated wait time, and receive notifications, while administrators create and manage services and queues and serve users in order.

---

## Problem Statement

Student services, academic advising, health clinics, and similar on-campus or institutional settings often rely on physical sign-in sheets or ad hoc waiting. Students and clients cannot reliably know their place in line, how long they will wait, or when they will be called. Staff lack a single view of who is waiting and in what order, and cannot close or prioritize queues in a consistent way. QueueSmart addresses this by providing a web-based queue management system where users register and join queues, see their current position and estimated wait time (derived from position and expected service duration), receive in-app notifications, and view queue history; administrators create and manage services (name, description, expected duration, priority), open or close queues, view current queue entries, serve the next user, and view basic usage statistics. The solution must deliver predictable, fair ordering (arrival-based, with optional priority) and clear feedback to both users and staff without requiring physical presence to hold a place in line.

---

## Stakeholders

| Stakeholder | Role | Interests |
|-------------|------|-----------|
| End Users (Students / Clients) | Primary users who join queues and receive service | Ease of registration and login, accurate position and wait time, reliable in-app notifications, visibility of queue history |
| Administrators (Staff) | Operators who manage services and queues and serve users | Service and queue configuration, ability to open/close queues, view entries and serve next user, basic usage statistics |
| Development Team (Group 21) | Builders | Clear scope, achievable milestones, alignment with A1–A4 deliverables |
| Instructor / Evaluator | Evaluator | Alignment with assignments, design quality, and grading criteria |

---

## System Overview

QueueSmart is a web application with a clear separation between presentation, business logic, and data persistence. Two primary roles are supported: End Users (students or clients) and Administrators (staff). End Users register and log in, join or leave a queue for a service, view their current queue position and estimated wait time (position × expected service duration per service), receive in-app notifications (e.g., when nearing the front or when served), and view their queue history. Administrators create and manage services (name, description, expected duration, priority), open or close queues for those services, view current queue entries, serve the next user in order, and view basic usage statistics. Queue ordering is based on arrival time and may consider priority level where configured. The high-level workflow is: user or admin authenticates; user selects a service and joins its queue (if open); system assigns position and computes estimated wait; user may view status and history and receive notifications; admin serves users in order and may manage services and queue state. Presentation (front-end) handles all user and admin screens and client-side validation; business logic (backend) enforces authentication, service and queue management, wait-time estimation, notification triggering, and history tracking; data persistence stores users, services, queues, queue entries, and notification/history records with appropriate constraints and lifecycle.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Delays, incomplete phases | Strict adherence to phase exclusions; change control for new features |
| Unclear boundaries between phases | Rework, overlap | Use this PRD and phase deliverables as the single source of truth |
| Dependency delays (e.g., APIs before UI) | Blocked work | Define interfaces and contracts early in Phase 1 |
| Team coordination | Inconsistent design or duplicate work | Shared docs, defined components, and clear ownership per component |
| Inconsistent wait-time or ordering logic | User confusion, unfair service | Define wait-time and ordering rules in Phase 1 and Phase 3; validate in Phase 4 with real data |

---

## Non-Functional Requirements

- **Usability:** The interface must be intuitive and require minimal training. End users and administrators should be able to complete primary tasks (e.g., join a queue, view position and wait time, manage services, serve next user) without extensive documentation or support.
- **Performance:** Wait-time calculation and queue position retrieval must respond within a short, consistent time so that users and staff are not delayed when checking status or when the system assigns position on join.
- **Reliability:** Queue ordering must remain consistent and fair. Position assignment and serve-next behavior must reflect the defined rules (arrival-based, with optional priority) and must not be lost or corrupted under normal use.
- **Security:** User authentication credentials must be protected. In Phase 4, credentials must not be stored in plain text; appropriate protection (e.g., hashing or equivalent) must be applied for stored secrets.
- **Maintainability:** Phase separation (A1–A4) ensures modular development. The system must be structured so that presentation, business logic, and persistence can be developed and changed with clear boundaries and minimal cross-phase coupling.

---

## PHASE 1 – A1: System Design

**Objective:** Establish QueueSmart’s structure, boundaries, and behavior so that Phases 2–4 can be implemented consistently.

### Component A – Context and Boundaries
- **Functional requirements**
  - Document the QueueSmart system boundary (in scope: user registration and login, joining and leaving queues, position and wait-time display, in-app notifications, queue history; admin service and queue management, serve-next, usage statistics; out of scope: external payment, physical kiosks, or third-party calendar integration unless explicitly added).
  - Identify external actors: End Users (Students/Clients) and Administrators (Staff). Optionally show external systems in the context diagram for notification channels (e.g., Email or SMS) at a conceptual level only—no implementation of email or SMS is required.
  - Describe high-level data flows and triggers: user registers or logs in; user joins or leaves a queue; system computes position and estimated wait time; system sends in-app notifications; user views queue status and history; admin creates or updates services and opens or closes queues; admin views queue entries and serves next user; admin views usage statistics.
- **Exclusions**
  - Detailed screen layouts, API signatures, or database schemas.
  - Implementation or deployment details.
- **Deliverables**
  - Context diagram showing QueueSmart with actors End Users and Administrators, and optional external systems (e.g., Email/SMS) as conceptual notification channels.
  - Brief narrative of system purpose and scope for queue management in student services or clinic-style settings.

### Component B – Functional Decomposition
- **Functional requirements**
  - Decompose QueueSmart into major functional areas: Authentication (registration, login, session); User Queue Experience (join/leave queue, view position and wait time, view history, receive in-app notifications); Service and Queue Management (create/update services with name, description, expected duration, priority; open/close queues; view queue entries; serve next user); Usage and History (queue history per user; basic usage statistics for administrators); optionally Notifications (in-app notification delivery; conceptual placeholder for future channels).
  - For each area, list the main capabilities (e.g., Authentication: register user, log in, log out; User Queue Experience: join queue, leave queue, get current position and estimated wait time, get queue history, receive in-app notifications).
  - Ensure decomposition supports Phase 2 screens, Phase 3 API operations, and Phase 4 data entities.
- **Exclusions**
  - Technology choices, frameworks, or coding standards.
  - Low-level module or class design.
- **Deliverables**
  - Functional decomposition diagram or feature list by subsystem for QueueSmart.
  - Short description of each subsystem and its responsibilities (Authentication, User Queue Experience, Service and Queue Management, Usage and History, and optionally Notifications).

### Component C – Key Use Cases / User Stories
- **Functional requirements**
  - Define QueueSmart-specific use cases: User Registration; User Login; Join Queue (user selects open service and joins; system assigns position and estimated wait time); Leave Queue; View Current Queue Position and Estimated Wait Time; View Queue History; Receive In-App Notifications (e.g., position update or “you are next”); Administrator Login; Create Service (name, description, expected duration, priority); Update Service; Open Queue / Close Queue; View Current Queue Entries; Serve Next User (advance queue, mark user as served); View Basic Usage Statistics.
  - Include main and alternative flows (e.g., Join Queue: main—user selects service and joins; alternate—user already in queue for that service, system rejects or shows current status; error—queue closed or service not found). Note boundary cases (empty queue, single user, priority ordering).
  - Keep descriptions implementation-agnostic (no UI or API specifics).
- **Exclusions**
  - Wireframes, mockups, or detailed interaction design.
  - Database or API design.
- **Deliverables**
  - Use case list for QueueSmart with brief descriptions and, where useful, flow summaries (main/alternate paths) for registration, login, join/leave queue, view position and wait time, view history, notifications, admin service and queue management, serve next, and usage statistics.

### Component D – Data and Information Concepts
- **Functional requirements**
  - Identify QueueSmart conceptual entities: User (identity and profile for registration and login); Service (name, description, expected duration, priority); Queue (per service, open/closed state, ordering by arrival and optionally priority); Queue Entry (user in a queue, position, join time, status—waiting, served, left); Notification or History record (user, event type, queue/service context, timestamp). Describe relationships: a User has many Queue Entries and many History/Notification records; a Service has one Queue and many Queue Entries; a Queue Entry belongs to one User and one Queue/Service.
  - Describe cardinality at a conceptual level (e.g., one user has many queue entries over time; one service has one active queue; one queue has many queue entries).
  - Do not specify tables, keys, or storage; focus on what information exists and how it relates.
- **Exclusions**
  - Physical database design, indexing, or persistence technology.
  - API request/response formats.
- **Deliverables**
  - Conceptual data model or entity-relationship overview for QueueSmart (User, Service, Queue, Queue Entry, Notification/History) at domain level only.

---

## PHASE 2 – A2: Front-End UI/UX

**Objective:** Define and deliver the QueueSmart user-facing experience so that all primary workflows are usable and consistent with Phase 1. For A2, the front-end may use mock data; backend integration is not required.

### Component A – Information Architecture and Navigation
- **Functional requirements**
  - Define the main sections and views of QueueSmart: (1) Public/auth: Login screen, Registration screen; (2) User area: User Dashboard (overview of current queue status and quick actions), Join Queue screen (select service and join), Queue Status screen (current position and estimated wait time), Queue History screen (past queue participation); (3) Admin area: Admin Dashboard (overview of services and queues), Service Management screen (create, edit, list services with name, description, expected duration, priority), Queue Management screen (open/close queue, view current queue entries, serve next user, view basic usage statistics). Optional: shared header with navigation and in-app notification area.
  - Specify navigation: unauthenticated users see Login and Registration; after login, role-based entry to User Dashboard or Admin Dashboard; from User Dashboard to Join Queue, Queue Status, and History; from Admin Dashboard to Service Management and Queue Management; consistent way to log out.
  - Ensure coverage of all Phase 1 use cases (registration, login, join/leave queue, view position and wait time, view history, receive in-app notifications; admin service and queue management, serve next, usage statistics).
- **Exclusions**
  - Backend logic, live API calls, or data persistence implementation; mock data is allowed for A2.
  - Choice of UI frameworks or libraries.
- **Deliverables**
  - Site map or application structure diagram for QueueSmart showing Login, Registration, User Dashboard, Join Queue, Queue Status, History, Admin Dashboard, Service Management, and Queue Management.
  - List of main views/screens with short purpose statements.

### Component B – Screen Layouts and Key Flows
- **Functional requirements**
  - Login screen: layout with fields for login credentials (e.g., identifier and password), submit and optional link to Registration; behavior: user enters credentials and submits; system validates (or mock validates) and redirects to User or Admin Dashboard or shows error.
  - Registration screen: layout with registration form (e.g., display name, email, password, confirmation); submit and link to Login; behavior: user fills required fields and submits; client-side validation and success/error feedback.
  - User Dashboard: layout with summary of current queue status (if in a queue: service name, position, estimated wait time), actions to Join Queue, View Queue Status, View History; navigation to Join Queue, Queue Status, History.
  - Join Queue screen: layout listing available (open) services; user selects a service and joins; feedback when already in queue or queue full/closed; flow: select service → join → confirmation and redirect to Queue Status or Dashboard.
  - Queue Status screen: layout showing current position, estimated wait time, service name, option to leave queue; optional refresh or auto-update indication.
  - Queue History screen: layout listing past queue entries (service, date/time, outcome—e.g., served or left).
  - Admin Dashboard: layout with list or cards of services and queue status (open/closed), quick links to Service Management and Queue Management.
  - Service Management screen: layout to create and edit services (name, description, expected duration, priority), list existing services; flows: create service, edit service, delete or deactivate if in scope.
  - Queue Management screen: layout per service to open/close queue, view current queue entries (e.g., order, user identifier, join time), button to serve next user; optional area for basic usage statistics (e.g., count served today, queue length over time).
  - Indicate required inputs, validation expectations, and success/error feedback at a behavioral level for each flow.
- **Exclusions**
  - Backend implementation; may reference “system” or mock behavior without specifying APIs.
  - Responsive breakpoints or accessibility standards implementation details (unless explicitly in scope).
- **Deliverables**
  - Wireframes or low-fidelity mockups for Login, Registration, User Dashboard, Join Queue, Queue Status, History, Admin Dashboard, Service Management, and Queue Management.
  - Flow descriptions or simple task flows for sign-in, registration, join queue, view status, view history, and admin service/queue management and serve-next.

### Component C – Interaction and Feedback
- **Functional requirements**
  - Define how the UI responds to user actions: button states (enabled/disabled, loading where appropriate), loading indicators during mock or future API calls, clear error messages for invalid login, duplicate join, or closed queue; success confirmations for registration, join queue, leave queue, and admin actions (e.g., queue opened, next user served).
  - Client-side validation rules: required fields for registration and login (e.g., non-empty identifier and password); password strength or confirmation match if applicable; required selection when joining a queue; admin forms for service (name, expected duration, priority) validated before submit. Specify when validation errors are shown (e.g., on submit or on blur).
  - In-app notifications: define when the UI shows in-app notifications (e.g., “You are next,” “Your position is now 3,” “You have been served”) and where they appear (e.g., banner, toast, or dedicated notification area); for A2, notifications may be driven by mock data or timers.
  - Mock data usage: document that A2 may use mock data for users, services, queues, and queue entries to demonstrate all screens and flows without a live backend; structure of mock data should align with Phase 1 conceptual entities so that Phase 3/4 integration is straightforward.
  - Keep descriptions technology-agnostic (what happens, not how it is coded).
- **Exclusions**
  - Backend validation logic or persistence.
  - Specific UI component libraries or styling systems.
- **Deliverables**
  - Interaction notes or state/feedback matrix for main actions (login, registration, join/leave queue, serve next, open/close queue, create/edit service).
  - Description of client-side validation rules and in-app notification behavior; note on mock data usage for A2.
  - Optional: simple prototype or clickable mockup demonstrating key flows with mock data.

---

## PHASE 3 – A3: Backend APIs

**Objective:** Specify and deliver the QueueSmart backend behavior and interfaces that the front-end and (in Phase 4) persistence layer will use. For A3, backend APIs may use in-memory data; unit test coverage of 70–80% is required.

### Component A – API Scope and Operations
- **Functional requirements**
  - Authentication module: operations for user registration (create user credentials and profile), user login (validate credentials and establish session or token), logout (invalidate session), and optional get-current-user; map to Phase 1 use cases User Registration and User Login and Phase 2 Login and Registration screens.
  - Service management module: operations to create service (name, description, expected duration, priority), list services, get service by identifier, update service, delete or deactivate service; map to Phase 1 admin use cases and Phase 2 Service Management screen.
  - Queue management module: operations to open queue (for a service), close queue, list open queues or queues for a service, join queue (user joins a service’s queue; system assigns position and returns position and estimated wait time), leave queue, get current queue position and estimated wait time for a user in a queue, list queue entries (for admin), serve next user (advance queue and mark user as served); map to Phase 1 Join/Leave Queue, View Position and Wait Time, View Queue Entries, Serve Next, and Phase 2 Join Queue, Queue Status, Queue Management screens.
  - Wait-time estimation: backend logic to compute estimated wait time (e.g., position × expected service duration for that service); exposed via get-position-and-wait-time or as part of join-queue and queue-status responses.
  - Notification triggering logic: backend logic that determines when to create or emit in-app notification events (e.g., when user is next, when position changes, when served); operations for user to fetch their notifications or to receive notification payloads; map to Phase 1 Receive In-App Notifications and Phase 2 in-app notification area.
  - History tracking: operations to record queue entry lifecycle (joined, left, served) and to retrieve queue history for a user; map to Phase 1 View Queue History and Phase 2 History screen.
  - Usage statistics: operation(s) for admin to retrieve basic usage statistics (e.g., number of users served per service, queue lengths); map to Phase 1 View Basic Usage Statistics and Phase 2 Queue Management screen.
  - Define logical inputs and outputs for each operation at contract level.
- **Exclusions**
  - Database schema or persistent storage implementation (in-memory storage is acceptable for A3).
  - UI implementation; only the fact that the front-end will consume these operations is assumed.
- **Deliverables**
  - API operation list with short descriptions for authentication, service management, queue management, wait-time exposure, notification delivery, history, and usage statistics.
  - Mapping from operations to Phase 1 use cases and Phase 2 screens.

### Component B – Request and Response Contracts
- **Functional requirements**
  - For each operation in the authentication, service management, queue management, notification, and history modules: define logical request parameters (e.g., credentials, service identifier, user identifier) and response payload (e.g., user profile, list of services, queue entry with position and estimated wait time, list of notifications, history records).
  - Specify which operations are idempotent (e.g., get service by id) and which have side effects (e.g., join queue, serve next, create notification).
  - Describe error conditions: invalid or missing credentials, service not found, queue closed, user already in queue, user not in queue, empty queue on serve-next; and how errors are communicated (e.g., validation failure, not found, forbidden) at a conceptual level.
- **Exclusions**
  - Serialization format unless required by assignment.
  - Authentication/authorization implementation details beyond logical “logged-in user” or “admin role” where needed for contract.
- **Deliverables**
  - API contract documentation: operation name, parameters, response shape, and error cases for QueueSmart authentication, service, queue, notification, history, and statistics operations.

### Component C – Business Rules and Validation
- **Functional requirements**
  - Authentication: validation rules for registration (required fields, uniqueness of identifier or email where applicable); login validates credentials; session or token scope and expiry as defined for the assignment.
  - Service management: required name and expected duration; priority and description optional or required as defined; uniqueness of service name or identifier as appropriate.
  - Queue management: user may join only if queue is open and user is not already in that queue; position assigned by arrival order, optionally adjusted by priority; leave queue and serve next update queue entry status and reorder remaining entries; estimated wait time = position × expected service duration (or defined formula).
  - Notifications: rules for when to create notifications (e.g., user is next, user served, position changed by more than N); history records created on join, leave, and served.
  - Document validation rules and business rules per operation or entity; keep rules implementation-agnostic where possible.
  - Unit testing: backend logic (authentication, service and queue management, wait-time estimation, notification triggering, history tracking) must be covered by unit tests; target 70–80% test coverage as required by the assignment.
- **Exclusions**
  - Front-end validation implementation (may mirror rules but is out of scope for this phase’s backend focus).
  - Database constraints or triggers (Phase 4).
- **Deliverables**
  - List of validation and business rules per operation or entity for QueueSmart (authentication, services, queues, wait time, notifications, history).
  - Confirmation that unit tests achieve 70–80% coverage for backend APIs and supporting logic.
  - Optional: decision table or short narrative for ordering (arrival and priority) and wait-time calculation.

### Implementation status (A3)

The Phase 3 backend is implemented in this repository: REST-style JSON APIs, authentication with bearer tokens, queue ordering by priority then arrival, wait-time estimation from position and service duration, in-app notifications and history events, and unit tests with line coverage in the 70–80% target band. The front end consumes these APIs (replacing the A2 mock layer). **Phase 4** replaced the original in-memory store with **SQLite**; technical alignment (paths, stack, persistence, test layout) is summarized under **Implementation alignment (A3–A4)** in `engineering-requirements.md`.

### Implementation status (A4)

Phase 4 persistence is implemented: **SQLite** database (schema + migrate + seed), **hashed passwords**, API behavior preserved with data surviving process restarts; bearer **sessions** stored in the database. The student dashboard lists **all** active queues via **`GET /api/users/me/active-queue`**. See **Implementation alignment (A3–A4)** in `engineering-requirements.md` and **`bug-fixes-and-improvements.md`** for notable fixes.

---

## PHASE 4 – A4: Database & Persistence

**Objective:** Define and deliver the persistent data model and behavior so that all Phase 3 QueueSmart API operations are supported with durable, consistent data. A4 implements real database persistence with appropriate constraints.

### Component A – Logical Data Model
- **Functional requirements**
  - Translate Phase 1 conceptual entities into the following logical data model. Entities: UserCredentials (identifier, secret or hash, role—user vs. admin, and any session or token metadata if stored); UserProfile (user identifier, display name, email, and other profile attributes; one-to-one with UserCredentials); Service (identifier, name, description, expected duration, priority, active flag or equivalent); Queue (identifier, service identifier, open/closed state, optional metadata); QueueEntry (identifier, queue identifier, user identifier, position, join time, status—e.g., waiting, served, left); Notification or History (identifier, user identifier, type—e.g., position update, served, you-are-next—queue/service context, timestamp, read/unread if applicable). For history, a unified History or separate QueueHistory entity may record queue participation (user, service/queue, join time, end time, outcome—served/left).
  - Relationships and cardinalities: UserCredentials has one UserProfile; UserProfile has many QueueEntry and many Notification/History records; Service has one Queue (active queue per service); Queue has many QueueEntry; QueueEntry references one User and one Queue; Notification/History references one User. Define unique identifiers (e.g., surrogate keys) and natural keys (e.g., unique service name or user login) where relevant.
  - Ensure the model supports all Phase 3 API operations: authentication (read/write UserCredentials and UserProfile); service CRUD (Service); queue open/close and entries (Queue, QueueEntry); wait-time derivation from QueueEntry position and Service expected duration; notification and history (Notification/History or equivalent).
- **Exclusions**
  - Physical storage, indexing strategy, or specific database product features.
  - API or UI implementation.
- **Deliverables**
  - Logical data model (normalized entity-relationship diagram or equivalent) for UserCredentials, UserProfile, Service, Queue, QueueEntry, and Notification/History (or equivalent history entity).
  - Glossary of entities and main attributes and relationships.

### Component B – Persistence Operations and Integrity
- **Functional requirements**
  - Specify how each Phase 3 API operation maps to persistence actions: registration → insert UserCredentials and UserProfile; login → read UserCredentials (and optionally UserProfile); service create/update/delete → insert/update/delete Service; open/close queue → update Queue state; join queue → insert QueueEntry and assign position; leave queue / serve next → update QueueEntry status and optionally reorder positions; get position and wait time → read QueueEntry and Service; list queue entries → read QueueEntry by Queue; notifications and history → insert/read Notification or History records; usage statistics → aggregate over QueueEntry or History. Describe any derived or computed data that must be stored or updated (e.g., position recalculated after serve or leave).
  - Define integrity constraints: referential integrity (QueueEntry references valid Queue and User; Queue references Service; Notification/History references User); uniqueness (e.g., one active Queue per Service, unique user credential identifier, unique QueueEntry per user per queue when status is waiting); non-null for required attributes (e.g., service name, expected duration, queue state, entry status); business constraints (e.g., position positive, expected duration positive) that the persistence layer must enforce.
  - Persistence integration: document that Phase 3 backend APIs are integrated with the real database so that all create/read/update/delete operations persist and retrieve data according to this model and constraints.
- **Exclusions**
  - Specific SQL or query language.
  - Caching, replication, or infrastructure.
- **Deliverables**
  - Mapping from Phase 3 API operations to persistence operations (create/read/update/delete per entity).
  - Constraint list (referential integrity, uniqueness, non-null, and business rules) for the logical model.
  - Statement of persistence integration with Phase 3 backend.

### Component C – Data Lifecycle and Retention
- **Functional requirements**
  - UserCredentials and UserProfile: retain while account is active; soft-delete or deactivate (e.g., active flag) rather than hard delete if required for referential integrity or audit; no automatic purge of user data unless specified.
  - Service: retain for lifecycle of system; soft-delete or deactivate when service is discontinued so that history and queue entries can still reference it.
  - Queue: one active queue per service; closing a queue does not delete it—state is updated to closed; historical queue data may be retained for statistics.
  - QueueEntry: retain after status changes to served or left for history and usage statistics; define retention policy (e.g., retain indefinitely for reporting or archive after a defined period) at a policy level.
  - Notification/History: retain for user visibility and auditing; optional retention (e.g., keep last N days or last N records per user) or retain indefinitely; read/unread state for notifications is updated when user views them.
  - Keep at a policy level; no implementation technology.
- **Exclusions**
  - Backup, recovery, or infrastructure.
  - Implementation details of archival or purge jobs.
- **Deliverables**
  - Data lifecycle and retention summary per entity (UserCredentials, UserProfile, Service, Queue, QueueEntry, Notification/History).
  - Optional: simple state diagram for QueueEntry lifecycle (waiting → served or left) and Queue state (open/closed).

---

## Document Control

| Version | Date | Author(s) | Changes |
|---------|------|-----------|---------|
| 0.1 | — | Group 21 | Initial PRD aligned to A1–A4 |
| 0.2 | — | Group 21 | QueueSmart-specific requirements; completed problem statement, stakeholders, system overview; Phase 1–4 components revised for queue management |
| 0.3 | 2025-03-25 | Group 21 | Phase 3 (A3): added implementation status note—backend APIs, in-memory storage, tests, and front-end integration documented as delivered in-repo |
| 0.4 | 2026-04-06 | Group 21 | Phase 4 (A4): implementation status note—SQLite persistence, bcrypt, DB sessions, multi-queue dashboard; points to engineering alignment and bug-fixes log |

*Update as the project and assignments evolve.*
