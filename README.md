# TaskFlow - Advanced Task Manager

Full-stack task manager with React (frontend), Express + MongoDB + Mongoose (backend), session auth, email reminders, and analytics.

## Features
- Session-based auth (login, register, logout)
- Create/update/delete tasks with validation
- Automatic status: active, completed, failed, deleted
- History view with filters and colored status
- Email verification + 5-minute pre-end email reminders (verified emails only)
- Recurring tasks (daily/weekly/custom dates) for next 30 days
- Sidebar layout, mobile bottom nav, 24-hour time, dd-mm-yyyy dates

## Tech
- Frontend: React, Tailwind CSS, React Router, date-fns, react-hot-toast
- Backend: Express, Mongoose, express-session, connect-mongo, cookie-parser, helmet, express-rate-limit, express-validator, nodemailer, node-cron
- DB: MongoDB

## Prerequisites
- Node 18+
- MongoDB running locally on `mongodb://localhost:27017`

## Setup
1) Install dependencies (from project root):
```
npm run install-all
```

2) Configure backend env:
Create `backend/.env` (or copy from these values) and set:
```
PORT=5000
MONGO_URL=mongodb://localhost:27017
MONGO_DB=task-manager
SESSION_SECRET=your-secret
NODE_ENV=development

# Email
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
VALIDATE_SMTP=false
BACKEND_BASE_URL=http://localhost:5000
FRONTEND_BASE_URL=http://localhost:3000
```

3) Start dev servers:
```
npm run dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Scripts
From project root:
- `npm run install-all` - install frontend and backend deps
- `npm run dev` - start both servers (concurrently)

Backend (from `backend/`):
- `npm run dev` - start backend with nodemon

Frontend (from `frontend/`):
- `npm start` - start React dev server

## Email reminders
- Scheduler checks tasks ending in 5 minutes.
- Sends only if the user’s `emailVerified=true`.

## Email verification
- POST `/api/users/verify-email` to send the link
- GET `/api/users/verify-email/confirm?token=...` verifies and redirects to `FRONTEND_BASE_URL/settings?verified=1` if set

## Recurring tasks
- Create with `recurrence` in payload:
```
{ type: 'daily' | 'weekly' | 'custom', dates?: ['yyyy-MM-dd', ...] }
```
- Generates occurrences up to 30 days ahead using the same daily start/end times

## Notes
- UI times: 24-hour format
- UI dates: dd-mm-yyyy
- Dashboard: active tasks; History: non-active (completed/failed/deleted)

## License
MIT


