# QueueSmart

A responsive web application for queue management, with separate flows for students and administrators. Built with React (Vite), React Router, and mock data.

---

## How to Run This Program

### Prerequisites

- **Node.js** (version 18 or newer recommended)
- **npm** (comes with Node.js)

To check if you have Node.js and npm installed, open a terminal and run:

```bash
node --version
npm --version
```

If either command fails or is not found, install Node.js from [nodejs.org](https://nodejs.org) (choose the LTS version). After installing, close and reopen your terminal.

---

### Step-by-Step Instructions

1. **Open a terminal** and navigate to the project folder:
   ```bash
   cd path/to/frontend
   ```
   *(Replace `path/to/frontend` with the actual path to this project on your machine.)*

2. **Install dependencies** (only needed the first time or after pulling changes):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open the app in your browser**:
   - Look at the terminal output. You will see something like:
     ```
     ➜  Local:   http://localhost:5173/
     ```
   - Open that URL in your browser (for example, http://localhost:5173/).
   - If port 5173 is in use, Vite may use 5174, 5175, etc. — use the URL shown in your terminal.

5. **Stop the server** when done:
   - Press `Ctrl + C` in the terminal.

---

### Alternative Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (hot reload) |
| `npm run build` | Build the app for production |
| `npm run preview` | Serve the built app locally (run after `npm run build`) |

---

## Test Accounts (Login Credentials)

Use these accounts to sign in and access different parts of the app. All use the **same password**: `password`.

### Student Accounts (User Dashboard)

| Email | Password | Name | Landing Page After Login |
|-------|----------|------|--------------------------|
| `student@test.com` | `password` | Alex Student | **Dashboard** (`/dashboard`) |
| `jane@test.com` | `password` | Jane Doe | **Dashboard** (`/dashboard`) |

### Admin Account

| Email | Password | Name | Landing Page After Login |
|-------|----------|------|--------------------------|
| `admin@test.com` | `password` | Admin User | **Admin Dashboard** (`/admin`) |

---

## Pages & Routes Overview

### Public (No Login Required)

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Sign in with email and password |
| `/register` | Register | Create a new student account |

### Student Pages (Login as `student@test.com` or `jane@test.com`)

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | User Dashboard | Overview: current queue status, active services, notifications |
| `/join-queue` | Join Queue | Select a service and join its queue |
| `/queue/:serviceId` | Queue Status | See your position and estimated wait time |
| `/history` | History | View past queue visits and outcomes |

### Admin Pages (Login as `admin@test.com`)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Admin Dashboard | Manage services: open or close each queue |
| `/admin/services` | Service Management | Create and edit services |
| `/admin/queue` | Queue Management | Serve next, remove users, reorder queue |

---

## Quick Testing Guide

1. **Test as a student:**
   - Go to Login
   - Email: `student@test.com`, Password: `password`
   - Explore Dashboard → Join Queue → Queue Status → History

2. **Test as an admin:**
   - Log out (if logged in)
   - Go to Login
   - Email: `admin@test.com`, Password: `password`
   - Explore Admin Dashboard → Service Management → Queue Management

---

## Important Notes

- **All data is in-memory** — refreshing the page resets everything. No database is used.
- **New accounts** created via Register are students by default and land on the Dashboard.
- If you see "Port X is in use", Vite will automatically try the next port. Use the URL printed in the terminal.

---

## Features Summary

- **Auth:** Login and register with client-side validation (email format, password ≥ 6 characters).
- **Student:** Dashboard (queue overview, active services, notifications), Join Queue, Queue Status (position, wait time, timeline), History (table/cards).
- **Admin:** Dashboard (open/close queues), Service Management (create/edit services), Queue Management (serve next, remove user, reorder).
- **UI:** Shared nav (role-based links), toast notifications, modal confirmations, responsive layout.
