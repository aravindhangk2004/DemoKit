# DemoKit - Production-ready local project

This version keeps the supplied DemoKit frontend and moves authentication and application data to a Node.js + Express + SQLite backend.

## Features
- Server-side login with bcrypt password hashing
- SQLite database shared by all users
- No application data stored in browser localStorage
- Server-side Admin/User authorization
- Shared bookings and demo-kit data
- Server-side activity logs
- Persistent SQLite-backed sessions
- Security headers and login rate limiting
- Optional SMTP password-reset email support

## Run locally

1. Install Node.js 20+.
2. Open a terminal in this folder.
3. Copy `.env.example` to `.env` and change `SESSION_SECRET`.
4. Install packages:

```bash
npm install
```

5. Start:

```bash
npm start
```

6. Open `http://localhost:3000`.

## Initial demo accounts

- Admin: `admin` / `admin123`
- User: `user1` / `user123`
- User: `user2` / `user123`
- Manager: `manager1` / `manager123`

Change these passwords before production use. The passwords are seeded into the database as bcrypt hashes; they are not sent to the browser.

## Password reset

In development, the reset OTP is shown in the existing DemoKit reset dialog. In production, configure SMTP variables in `.env`; the OTP will be emailed and will not be returned to the browser.

## Deployment

Deploy this folder to a Node.js host with a persistent disk if you keep SQLite. Set `NODE_ENV=production`, a strong `SESSION_SECRET`, and SMTP variables if password reset is required. Start with `npm start`.

For higher traffic or multiple server instances, move the database to PostgreSQL and the session store to a shared store such as Redis.
