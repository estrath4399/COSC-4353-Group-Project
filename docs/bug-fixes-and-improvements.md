# Bug fixes and improvements

This document lists notable bug fixes and product improvements for QueueSmart. Each item has a short title and a brief description.

---

## Student dashboard — show all active queues

**Description:** Students who joined more than one open service only saw a single queue under “Current queue.” The UI stopped after the first match, and the backend summarized at most one waiting entry. The dashboard now lists every queue the user is in (position, service name, wait hint, and a link to each queue’s status page). The API `GET /api/users/me/active-queue` returns an array of active entries instead of a single object.

---

## Join Queue — pre-select service from dashboard (or status page)

**Description:** “Join queue” under Active services always opened `/join-queue` with the first open service (e.g. Advising) selected. Links now include a `?service=<id>` query, and the Join Queue page reads it so the matching service is selected when it is open. The same query is used from Queue status when the user is not in that queue yet.

---

## Join Queue — show service description

**Description:** On the student Join a queue screen, only wait time and priority were shown for the selected service. The service **`description`** from the API is now shown under an “About this service” label when it is non-empty.

---

## Registration — reject weak / plain passwords (policy + errors)

**Description:** Course rules require passwords to be stored encrypted (hashed), not as plain text in the database—that was already enforced server-side. Registration did not block trivial passwords like `password` or explain requirements, so users saw no error for “plain” weak choices. Register now requires at least **8 characters** with **at least one letter and one number**, rejects a small list of **common passwords** (including `password` and `plaintext`), and shows the same messages on the **client** and from the **API** (400) when validation fails.

---

## Registration — choose Student or Administrator

**Description:** Registration always created a **student** account with no UI to pick a role. The form now includes **Account type** radios (Student vs Administrator), sends **`role`** in `POST /api/auth/register`, and the backend stores **`student`** or **`admin`**. After signup, **admins** are redirected to **`/admin`**; students to **`/dashboard`**. *(For real production systems, admin self-signup is usually disabled or gated; this matches the course need for both roles.)*

---

## Join queue — “first in line” notification missing

**Description:** After joining, “You joined the queue…” appeared but not “You are first in line — please stay nearby” even when the user was alone or first. `notifyAfterJoin` uses `waitingPosition`, which compared `userId` with strict equality; queue rows from SQLite use string `user_id` values while `req.user.id` could be a number after JSON/session handling, so the position check failed and the extra notification was skipped. **Fix:** compare IDs as strings in `waitingPosition` (and normalize `userId` in `joinQueue`).

---

## Admin remove from queue — wrong toast (“You were removed…”)

**Description:** Removing a student queued an in-app toast meant for the **student** (“You were removed from the queue”) on the **admin’s** screen because the API helper called the shared `addNotification` callback on the current browser session. Student-specific messaging is already created by the **backend** for the removed user’s account; the admin UI now only shows admin copy (e.g. “User removed from queue”). The same mistaken pattern was removed from **serve-next** (no more “Your turn has been updated” toast on the admin session).

---

## Student notifications — “first in line” listed under “joined”

**Description:** Joining a queue creates two notifications in quick succession; they often shared the same `created_at` timestamp, so `ORDER BY created_at DESC` was a tie and SQLite could list **“You joined…”** above **“You are first in line…”** even though the latter is newer. Notification listing now uses **`ORDER BY datetime(created_at) DESC, rowid DESC`** so the most recently inserted row (the position / first-in-line message) appears first when timestamps tie.

---

*Add new items below as the project evolves.*

---

## A4 — Validate persistence and end-to-end flows

**Description:** After introducing SQLite persistence, we verified that core system flows behave correctly across sessions. This included confirming that authenticated users remain logged in after reload, queue join/leave/serve operations persist correctly in the database, and notifications and history reflect stored data instead of in-memory values. Minor inconsistencies between frontend state and backend responses were also reviewed and aligned during integration.
