# COSC-4353-Group-Project

Software Design group project repository for **Group 21** (Spring 2026) — **QueueSmart**.

## Overview

QueueSmart is a queue management web app for student-style services. Users join queues, see position and wait estimates, and get notifications; admins manage services, queues, and reporting.

## Current status (final project complete)

- **Frontend (A2):** React + Vite UI with auth, dashboards, join/status/history, and admin tools.
- **Backend (A3):** Node.js + Express REST API under `/api`.
- **Database (A4):** SQLite (users, services, queues, history, notifications, sessions).
- **Reporting:** Admins can view filtered summaries and export **CSV** from the Reports page.
- **Smart feature:** Join Queue suggests shorter waits only for **related** services (similarity-based), not random alternatives.
- **Tests:** Backend Vitest + Supertest; coverage target met for phase work.

## Contributors

- Peter O Akinwunmi  
- Jesus Andrew Losoya  
- Sharar G Ohee  
- Jiaxin Ye
