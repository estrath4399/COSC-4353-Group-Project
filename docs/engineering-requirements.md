# Engineering Requirements Document  
**QueueSmart | COSC 4353 – Software Design | Group 21 | Spring 2026**

This document translates the Product Requirements Document (PRD) into technical structure and implementation planning for Phases A2–A4. It defines modules, folder structure, API contracts, in-memory and persistent data structures, and validation enforcement. It does not restate product goals; it provides the engineering blueprint for implementing them.

---

## Architecture Layering

- **Presentation (Phase 2):** Screens, components, client-side validation, mock or live API calls.
- **Business logic (Phase 3):** Authentication, service and queue management, wait-time calculation, notification and history logic; in-memory storage for A3.
- **Persistence (Phase 4):** Relational storage; credential protection; integration with Phase 3 so that APIs read/write the database.

No Docker, cloud infrastructure, CI/CD, or deployment tooling are in scope. The architecture is layered and kept within academic scope.

If using a component-based framework, context modules may manage auth and notifications. If using plain HTML/JS, equivalent global state modules or utility files will manage this behavior.

---

## Validation Enforcement

| Concern | Frontend (Phase 2) | Backend (Phase 3) | Database (Phase 4) |
|--------|--------------------|-------------------|---------------------|
| Required fields (e.g., login, registration, service name/duration) | Validate on submit (and optionally on blur); block submit if invalid | Revalidate all inputs; return 400 with clear message if invalid | Enforce NOT NULL on required columns |
| Uniqueness (e.g., user identifier, service name) | Optional hint only | Enforce before create/update; return 409 or 400 | UNIQUE constraints on natural keys |
| Business rules (queue open, user not already in queue, position ordering) | Not authoritative | Enforce in API handlers; return 4xx with reason | Support via FKs and constraints where applicable |
| Credential protection | Never send or store plain password beyond secure submit | Never log or return secrets; in A4 delegate hashing before persist | Store only hashed/derived secret; no plain text |
| Referential integrity (e.g., queue entry → user, service) | N/A | Validate IDs exist before insert/update | Foreign key constraints |

Frontend validation improves UX; backend validation is authoritative. Database constraints are the last line of defense and support data integrity across all clients.

---

## PHASE 2 – Frontend Engineering

**Objective:** Implement the QueueSmart user interface with a clear folder structure, screen-to-file mapping, shared components, and mock data aligned to conceptual entities. For A2, backend integration is optional; mock data is allowed.

### Component A – Folder Structure and Screen-to-File Mapping

- **Folder structure (logical)**
  - **`/frontend`** (or equivalent front-end root)
    - **`/src`**
      - **`/pages`** — One module per major screen; each page is responsible for one route/screen.
      - **`/components`** — Reusable UI: layout, navigation, forms, feedback (toast/modal), buttons, inputs, cards.
      - **`/context`** — Application-wide state: auth (current user, role, login/logout), notifications (list, add, mark read).
      - **`/mock`** — Mock data and mock API layer for A2 (replaceable by real API client in integration).
      - **`/utils`** — Shared helpers: client-side validation rules, formatters (e.g., date, duration), constants.
      - **`/api`** (optional for A2) — Future API client: base URL, request helpers, mapping from backend responses to frontend models.
    - Entry point (e.g., `main`/`index`) and root `App` wire routes and layout.

- **Screen-to-file mapping**

| PRD Screen | File / Module | Responsibility |
|-------------|---------------|----------------|
| Login | `pages/Login` | Credential form; call auth register/login; redirect by role to User or Admin dashboard |
| Registration | `pages/Register` | Registration form; client-side validation; call auth register; redirect to Login or Dashboard |
| User Dashboard | `pages/UserDashboard` | Show current queue status (if any); links to Join Queue, Queue Status, History |
| Join Queue | `pages/JoinQueue` | List open services; join action; handle already-in-queue and closed-queue feedback |
| Queue Status | `pages/QueueStatus` | Show position, estimated wait time, service name; leave-queue action |
| Queue History | `pages/History` | List past queue entries (service, date/time, outcome) for current user |
| Admin Dashboard | `pages/AdminDashboard` | List services and queue open/closed state; links to Service Management, Queue Management |
| Service Management | `pages/ServiceManagement` | CRUD services: name, description, expected duration, priority; list existing |
| Queue Management | `pages/QueueManagement` | Per-service: open/close queue; list queue entries; serve next; basic usage statistics |

- **Routing**
  - Public routes: Login, Registration.
  - Protected user routes: User Dashboard, Join Queue, Queue Status, History (guard by “user” role or equivalent).
  - Protected admin routes: Admin Dashboard, Service Management, Queue Management (guard by “admin” role).
  - Single entry for app shell (layout + navbar); navbar and logout available when authenticated.

### Component B – Shared Components and Internal Responsibilities

- **Layout**
  - **Layout** — Wraps authenticated content; provides consistent shell (e.g., header + main area); renders children and optional NavBar.
  - **NavBar** — Shows app title; when authenticated: role-appropriate links (User: Dashboard, Join Queue, Status, History; Admin: Dashboard, Service Management, Queue Management); Logout. Hide or simplify for Login/Register.

- **Forms and feedback**
  - **Input** — Controlled input; optional label, error text, type (text, email, password).
  - **Button** — Primary/secondary; disabled and loading state for async actions.
  - **Card** — Container for content blocks (e.g., service card, queue status card).
  - **Modal** — Confirmations (e.g., leave queue, delete service) or simple dialogs.
  - **Toast** — Transient success/error messages (e.g., “Joined queue,” “Queue closed”); position and auto-dismiss policy defined in one place.

- **Auth and notifications**
  - **AuthContext** (or equivalent) — Holds current user (id, email, name, role); methods: login, register, logout. Persist session (e.g., in-memory for mock; later token/localStorage) so refresh keeps role. Expose: user, loading, login(), register(), logout().
  - **NotificationContext** (or equivalent) — Holds list of in-app notifications (id, type, message, timestamp, read/unread). Methods: add notification, mark read, clear. Used by Toast or a notification panel; can be fed by mock events or later by backend.
  - **ProtectedRoute** — Wraps a route; if not authenticated redirect to Login; if authenticated but wrong role (e.g., user hitting admin route) redirect to User Dashboard or 403 view.
  - **UserDashboardRoute** — Optional; redirects admin to Admin Dashboard when hitting user-only routes if desired.

- **Internal responsibilities**
  - Pages do not contain business logic for queue ordering or wait-time calculation; they call API (mock or real) and display results.
  - Validation in **utils/validation**: e.g., required string, email format, password length/confirmation; used by Registration, Login, and Service Management forms. Enforce only on frontend; backend remains authoritative.

### Component C – Mock Data Structure and Alignment with Conceptual Entities

- **Mock data shape (aligned with PRD conceptual entities)**
  - **Users (UserCredentials + UserProfile)**  
    `{ id, email, password, name, role }` — For mock, password can be plain for comparison; never use this shape for real persistence. Role: `"user"` | `"admin"`.
  - **Services**  
    `{ id, name, description, expectedDurationMinutes, priorityLevel?, isOpen? }` — `isOpen` may be stored on service or derived from a separate queue object in mock.
  - **Queues**  
    Optional in mock: either a `queue` per service `{ serviceId, isOpen, entries? }` or `isOpen` on service. For backend alignment, prefer a distinct queue concept with `serviceId` and `isOpen`.
  - **Queue entries**  
    `{ id, userId, serviceId, queueId?, position, joinedAt, status }` — status: `"waiting"` | `"served"` | `"left"`. Include `userName` or resolve from users for display.
  - **Notifications**  
    `{ id, userId, type, message?, serviceId?, timestamp, read? }` — type: e.g. `"position_update"`, `"you_are_next"`, `"served"`.
  - **History**  
    `{ id, userId, serviceId, serviceName?, joinedAt?, endedAt?, outcome }` — outcome: `"served"` | `"left"`.

- **Mock API layer**
  - **mock/data** — Export in-memory arrays (or getters) for users, services, queues, queue entries, notifications, history; export id generators (e.g., nextUserId, nextServiceId) for create operations.
  - **mock/api** — Functions that mirror backend operations: register(user), login(credentials), getServices(), getOpenQueues(), joinQueue(userId, serviceId), leaveQueue(userId, serviceId), getQueueStatus(userId, serviceId), getHistory(userId), getQueueEntries(serviceId), serveNext(serviceId), openQueue(serviceId), closeQueue(serviceId), createService(service), updateService(id, service), getNotifications(userId), getUsageStats(serviceId?). These functions read/write the mock data and return shapes that match what the real API will return (see Phase 3). This allows swapping mock/api for a real API client without changing page logic.

- **Deliverables**
  - Folder structure and screen-to-file mapping as above.
  - List of shared components and their responsibilities.
  - Mock data structure and mock API function list aligned with PRD entities and Phase 3 contracts.

---

## PHASE 3 – Backend Engineering

**Objective:** Implement the QueueSmart backend with modular handlers, logical REST-style endpoints, in-memory storage for A3, and unit tests at 70–80% coverage. No persistent database in A3.

### Component A – Modules and Logical REST Endpoints

- **Module: Authentication**
  - **Responsibilities:** Register user (create credentials + profile), login (validate credentials, return session/token and user + role), logout (invalidate session), optional get current user.
  - **Endpoints (logical REST):**
    - `POST /auth/register` — Body: `{ email, password, name }`. Returns: `201` + `{ user: { id, email, name, role } }` or `400` (validation), `409` (email exists).
    - `POST /auth/login` — Body: `{ email, password }`. Returns: `200` + `{ user: { id, email, name, role }, token }` or `401`.
    - `POST /auth/logout` — Headers: `Authorization`. Returns: `204` or `401`.
    - `GET /auth/me` — Headers: `Authorization`. Returns: `200` + `{ user: { id, email, name, role } }` or `401`.

- **Module: Service Management**
  - **Responsibilities:** CRUD for services (name, description, expected duration, priority).
  - **Endpoints:**
    - `GET /services` — Returns: `200` + `{ services: [{ id, name, description, expectedDurationMinutes, priorityLevel }] }`.
    - `GET /services/:id` — Returns: `200` + service object or `404`.
    - `POST /services` — Body: `{ name, description, expectedDurationMinutes, priorityLevel? }`. Returns: `201` + service or `400`/`409`.
    - `PUT /services/:id` — Body: same as POST. Returns: `200` + service or `400`/`404`/`409`.
    - `DELETE /services/:id` — Returns: `204` or `404` (and optionally 409 if queue has entries).

- **Module: Queue Management**
  - **Responsibilities:** Open/close queue per service; join/leave queue; list entries; serve next; enforce ordering (arrival, optional priority).
  - **Endpoints:**
    - `GET /queues` — Returns: `200` + `{ queues: [{ id, serviceId, serviceName?, isOpen }] }` (or list of open queues only).
    - `GET /queues/:queueId` or `GET /services/:serviceId/queue` — Returns: `200` + `{ id, serviceId, isOpen, entries?: [...] }` or `404`.
    - `POST /queues/:queueId/open` or `PUT /services/:serviceId/queue/open` — Returns: `200` or `404`.
    - `POST /queues/:queueId/close` or `PUT /services/:serviceId/queue/close` — Returns: `200` or `404`.
    - `POST /queues/:queueId/join` — Body: `{ userId }` (or from auth). Returns: `201` + `{ queueEntry: { id, position, estimatedWaitMinutes }, ... }` or `400` (already in queue), `409` (queue closed).
    - `POST /queues/:queueId/leave` — Body: `{ userId }`. Returns: `204` or `404`.
    - `GET /queues/:queueId/entries` — Returns: `200` + `{ entries: [{ id, userId, userName?, position, joinedAt, status }] }` (admin).
    - `POST /queues/:queueId/serve-next` — Returns: `200` + `{ served: { userId, userName?, ... } }` or `404`/`409` (empty queue).

- **Module: Wait-Time Logic**
  - **Responsibilities:** Compute estimated wait time = position × expected service duration (per service). Exposed via queue/join and queue-status responses.
  - **Endpoints (or part of queue module):**
    - `GET /users/:userId/queue-status` or `GET /queues/:queueId/status?userId=` — Returns: `200` + `{ position, estimatedWaitMinutes, serviceId, serviceName }` or `404` (not in queue).

- **Module: Notification Logic**
  - **Responsibilities:** Create notifications when “you are next,” “served,” or position change; list notifications for user; mark read.
  - **Endpoints:**
    - `GET /users/:userId/notifications` — Returns: `200` + `{ notifications: [{ id, type, message?, serviceId?, timestamp, read }] }`.
    - `PATCH /users/:userId/notifications/:id/read` — Returns: `204` or `404`.
    - Notifications are created internally on serve-next, join, leave (no separate “create notification” client endpoint unless required).

- **Module: History**
  - **Responsibilities:** Record queue lifecycle (joined, left, served); return history for user.
  - **Endpoints:**
    - `GET /users/:userId/history` — Returns: `200` + `{ history: [{ id, serviceId, serviceName, joinedAt, endedAt, outcome }] }`.
  - **Usage statistics (admin):** `GET /services/:serviceId/stats` or `GET /queues/:queueId/stats` — Returns: `200` + `{ servedToday?, totalServed?, averageWait? }` (conceptual; exact fields as needed).

- **Deliverables**
  - Module list with responsibilities (Authentication, Service Management, Queue Management, Wait-Time Logic, Notification Logic, History).
  - Logical REST endpoint list with HTTP method, path, and short description; mapping to PRD use cases and Phase 2 screens.

### Component B – Request/Response Examples and In-Memory Storage

- **Conceptual request/response examples (JSON-like)**

**POST /auth/register**  
Request: `{ "email": "student@example.com", "password": "secret", "name": "Alex Student" }`  
Response `201`: `{ "user": { "id": "u1", "email": "student@example.com", "name": "Alex Student", "role": "user" } }`

**POST /auth/login**  
Request: `{ "email": "admin@example.com", "password": "secret" }`  
Response `200`: `{ "user": { "id": "a1", "email": "admin@example.com", "name": "Admin", "role": "admin" }, "token": "..." }`

**GET /services**  
Response `200`: `{ "services": [{ "id": "s1", "name": "Advising", "description": "...", "expectedDurationMinutes": 15, "priorityLevel": "high" }] }`

**POST /queues/:id/join** (body `{ "userId": "u1" }`)  
Response `201`: `{ "queueEntry": { "id": "e1", "position": 3, "estimatedWaitMinutes": 45 }, "serviceName": "Advising" }`

**GET /users/:userId/queue-status** (or equivalent)  
Response `200`: `{ "position": 2, "estimatedWaitMinutes": 30, "serviceId": "s1", "serviceName": "Advising" }`

**GET /users/:userId/history**  
Response `200`: `{ "history": [{ "id": "h1", "serviceId": "s1", "serviceName": "Advising", "joinedAt": "2025-02-18T10:00:00Z", "endedAt": "2025-02-18T10:20:00Z", "outcome": "served" }] }`

- **In-memory storage structure (A3)**
  - **users:** Map or array of `{ id, email, passwordHashOrPlainForA3, name, role }`. For A3, plain password is acceptable for simplicity; A4 must use hashed storage.
  - **sessions/tokens:** Map token/sessionId → userId (and optional expiry); logout removes entry.
  - **services:** Map or array of `{ id, name, description, expectedDurationMinutes, priorityLevel }`.
  - **queues:** Map or array of `{ id, serviceId, isOpen }`; one queue per service.
  - **queueEntries:** Map or array of `{ id, queueId, userId, position, joinedAt, status }`; status `waiting` | `served` | `left`. Position is integer; recalc on serve-next and leave.
  - **notifications:** Map or array of `{ id, userId, type, message?, serviceId?, timestamp, read }`.
  - **history:** Map or array of `{ id, userId, serviceId, serviceName?, joinedAt, endedAt, outcome }`; append on leave and serve-next.

- **Deliverables**
  - Request/response examples for main endpoints (auth, services, queue join, queue status, history).
  - In-memory data structure description (keys and shape) for A3.

### Component C – Testing Structure and Coverage

- **Testing structure**
  - **Unit tests** target: (1) Authentication: register (validation, duplicate), login (valid/invalid), logout. (2) Service management: create, update, delete, list; validation (required name, duration). (3) Queue management: open/close, join (success, already in queue, closed queue), leave, serve-next (order, empty queue); position and ordering rules. (4) Wait-time logic: formula (position × expected duration) with known inputs. (5) Notification logic: creation on serve-next, you-are-next. (6) History: append on leave and serve-next; retrieval by user.
  - **Test organization:** One test file per module (or per handler group); tests isolate logic with in-memory stores (no real DB). Use test doubles for any cross-module calls if needed.
  - **Coverage requirement:** 70–80% for backend code (API handlers + shared business logic). Measure line or branch coverage; exclude only trivial getters or framework wiring if agreed.

- **Deliverables**
  - Test layout (per-module or per-handler files).
  - List of scenarios covered (auth, service CRUD, queue operations, wait time, notifications, history).
  - Statement that coverage meets 70–80% for Phase 3 backend.

### Component D – Implementation alignment (A3)

The following describes how the current repository maps to Components A–C above (for grading and maintenance; not a second spec).

- **Backend root:** `backend/` — Node.js (ESM), Express, entry `src/index.js`, application wiring in `src/app.js`.
- **API prefix:** All HTTP routes are under **`/api`** (e.g. `POST /api/auth/login`). Logical paths in Component A are expressed relative to this prefix in the implementation.
- **In-memory layer:** `src/store.js` holds users, sessions, services, queues, queue entries, notifications, and history; plain-text passwords are acceptable for A3 only, per earlier sections.
- **Roles:** End-user role is **`student`** in JSON (aligns with the UI); **`admin`** for administrators.
- **Registration response:** `POST /api/auth/register` returns **`201`** with `{ user, token }` so the client can authenticate without an extra login round-trip.
- **Queue and status:** Per-service routes include open/close queue, join, `GET /api/services/:serviceId/queue/me` (current user’s entry and position), `GET /api/services/:serviceId/queue/entries` (admin), serve-next, reorder; leave via `POST /api/queue-entries/:entryId/leave` (and admin remove via `DELETE` on the same resource pattern). `GET /api/users/me/active-queue` summarizes the user’s current waiting entry when applicable.
- **Wait time:** Implemented as \((\text{position} - 1) \times \text{expectedDurationMinutes}\) for users behind the head of the queue; service list exposes a coarse **`estimatedWaitMinutes`** for display.
- **Tests:** `backend/tests/` — Vitest, Supertest against the Express app; queue ordering and validation covered; **~71%** line statement coverage on `backend/src/` at last run (within the 70–80% target).
- **Front end:** `frontend/src/mock/api.js` is the API client (legacy path name from A2); the Vite dev server proxies **`/api`** to the backend during local development (run backend and frontend in separate terminals).

---

## PHASE 4 – Database Engineering

**Objective:** Replace in-memory storage with a relational database; define schema, keys, constraints, and migration path. Ensure credential protection (no plain-text passwords) and persistence integration with Phase 3 APIs.

### Component A – Entity-to-Table Mapping and Keys

- **Conceptual entity → table (logical)**

| Conceptual entity | Table name | Primary key | Main attributes |
|-------------------|------------|-------------|------------------|
| UserCredentials | user_credentials | id (surrogate) | id, email (unique), password_hash, role, created_at |
| UserProfile | user_profiles | id (FK to user_credentials or same id) | user_id (FK), display_name, email (optional duplicate for display), created_at |
| Service | services | id (surrogate) | id, name, description, expected_duration_minutes, priority_level, active (boolean) |
| Queue | queues | id (surrogate) | id, service_id (FK unique for “active” queue), is_open, created_at |
| QueueEntry | queue_entries | id (surrogate) | id, queue_id (FK), user_id (FK), position, joined_at, status (waiting/served/left), served_at (nullable) |
| Notification | notifications | id (surrogate) | id, user_id (FK), type, message, service_id (nullable), created_at, read (boolean) |
| History | history | id (surrogate) | id, user_id (FK), service_id (FK), joined_at, ended_at, outcome (served/left) |

- **Primary keys:** Surrogate keys (e.g., UUID or auto-increment integer) for all tables.
- **Foreign keys (logical):**
  - user_profiles.user_id → user_credentials.id
  - queues.service_id → services.id
  - queue_entries.queue_id → queues.id; queue_entries.user_id → user_credentials.id
  - notifications.user_id → user_credentials.id
  - history.user_id → user_credentials.id; history.service_id → services.id

- **Natural keys / uniqueness:** user_credentials.email unique; (service_id, is_open) or one active queue per service enforced by application or unique partial index; at most one waiting queue_entry per (user_id, queue_id) enforced in application or unique constraint.

### Component B – Constraint Enforcement and Persistence Integration

- **Constraints (logical)**
  - **Referential integrity:** All FKs enforced; no orphan queue_entries, notifications, or history rows.
  - **NOT NULL:** user_credentials: id, email, password_hash, role. services: id, name, expected_duration_minutes. queues: id, service_id, is_open. queue_entries: id, queue_id, user_id, position, joined_at, status. notifications: id, user_id, type, created_at. history: id, user_id, service_id, joined_at, ended_at, outcome.
  - **UNIQUE:** user_credentials.email; optionally services.name if business rule requires.
  - **CHECK (conceptual):** expected_duration_minutes > 0; position >= 1; status in (waiting, served, left); outcome in (served, left).

- **Credential protection (Phase 4)**
  - Store only a hash (or equivalent) of the password in user_credentials.password_hash; never plain text. Hashing and verification performed in backend before insert and on login.

- **Persistence integration**
  - **Registration:** INSERT user_credentials (with hashed password), INSERT user_profiles; same transaction.
  - **Login:** SELECT user_credentials by email; verify password against hash; create session/token (stored in app or DB as needed).
  - **Service CRUD:** INSERT/UPDATE/DELETE services; soft-delete via active flag if required.
  - **Queue open/close:** UPDATE queues SET is_open.
  - **Join queue:** INSERT queue_entries with position from COUNT(waiting) + 1; create notification if desired.
  - **Leave queue:** UPDATE queue_entries SET status = 'left', served_at = now; renumber positions for remaining waiting entries; INSERT history.
  - **Serve next:** UPDATE oldest waiting queue_entry SET status = 'served', served_at = now; renumber positions; INSERT history; create notification.
  - **Wait time:** SELECT queue_entry.position, services.expected_duration_minutes; compute position × expected_duration_minutes.
  - **Notifications / history:** INSERT on events; SELECT by user_id with ordering.

- **Deliverables**
  - Entity-to-table mapping with PKs and FKs.
  - Constraint list (NOT NULL, UNIQUE, CHECK, FK).
  - Mapping from Phase 3 API operations to persistence operations (which table(s), insert/update/delete/select).
  - Statement that Phase 3 backend is wired to this persistence layer so that all data survives process restart.

### Component C – Migration from In-Memory to Persistent Storage and Test Evolution

- **Migration from in-memory (A3) to database (A4)**
  - **Data access abstraction:** Introduce a small persistence layer (e.g., repository or data-access module) per entity: UserRepository, ServiceRepository, QueueRepository, QueueEntryRepository, NotificationRepository, HistoryRepository. Phase 3 handlers call these instead of in-memory maps directly.
  - **A3:** Repository implementations use in-memory structures (same as current A3).
  - **A4:** Replace with implementations that execute SQL (or equivalent) against the relational schema. API handler code remains unchanged; only repository implementations change.
  - **Schema creation:** Provide a way to create tables (e.g., schema script or migration script) with the defined tables, keys, and constraints. No requirement for versioned migration tooling; a single “create schema” script is sufficient for academic scope.

- **Test evolution**
  - **Phase 3:** Unit tests use in-memory repositories (or mocks) so tests run fast and with no external DB.
  - **Phase 4:** (1) Keep existing unit tests; swap in-memory repo for a test double or in-memory implementation that still satisfies the same interface, so logic tests remain unchanged. (2) Add integration tests (optional but recommended): tests that run against a real test database (or in-memory DB with same schema) to verify repository implementations and constraint enforcement (e.g., duplicate email returns error, FK violations are caught). Coverage target 70–80% can remain for business logic; integration tests supplement rather than replace unit tests.

- **Deliverables**
  - Description of repository (or data-access) abstraction and how A3 in-memory is replaced by A4 persistent implementation without changing API handlers.
  - Schema creation approach (e.g., single script).
  - Summary of how tests evolve: unit tests unchanged with abstraction; optional integration tests for persistence and constraints.

---

## Document Control

| Version | Date | Author(s) | Changes |
|---------|------|-----------|---------|
| 0.1 | — | Group 21 | Initial engineering requirements; frontend structure, backend modules and REST, in-memory and DB schema, validation matrix, test and migration plan |
| 0.2 | 2025-03-25 | Group 21 | Phase 3 (A3): added Component D (implementation alignment)—Express `/api` backend, store module, roles, tests/coverage, front-end client and proxy |

*Update as implementation progresses.*
