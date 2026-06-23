# HackMate — Backend API

HackMate is a full-stack platform for **discovering hackathons, forming teams, and managing collaboration**. This repository contains the **Node.js + Express + MongoDB** backend with a **Socket.io** real-time layer, **Cloudinary** media handling, **Nodemailer** email notifications, and **Devpost/MLH** hackathon ingestion.

## Architecture

```
Client (React SPA)  ──REST──►  Express API  ──►  MongoDB (Users, Hackathons, Teams, JoinRequests)
        ▲                          │  ▲
        └────── Socket.io ─────────┘  ├──► Cloudinary (avatars / media)
         (real-time notifications)    ├──► Nodemailer / SendGrid (emails)
                                      └──► Devpost / MLH (hackathon ingestion)
```

Three tiers, four domain modules that map 1:1 to the Mongoose models:

| Module        | Model         | Responsibilities                                   |
| ------------- | ------------- | -------------------------------------------------- |
| Users         | `User`        | Auth (JWT), profiles, teammate discovery           |
| Hackathons    | `Hackathon`   | CRUD, browse/filter/search, Devpost/MLH ingestion  |
| Teams         | `Team`        | Create/manage teams, members, roles                |
| JoinRequests  | `JoinRequest` | Join requests & invites, accept/reject (real-time) |

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Server:** Express 5
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (access + refresh tokens) via httpOnly cookies / Bearer header
- **Real-time:** Socket.io
- **File storage:** Cloudinary (via Multer for uploads)
- **Email:** Nodemailer (falls back to console logging if SMTP is unset)
- **Ingestion:** Axios against the Devpost public API

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.sample` to `.env` and fill in your values:

```bash
cp .env.sample .env
```

Required: `MONGODB_URI`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`.
Optional: Cloudinary keys (for avatar uploads) and SMTP keys (for emails).

### 3. Run the server

```bash
npm run dev    # with nodemon (auto-reload)
npm start      # plain node
```

The API runs on `http://localhost:8000` (configurable via `PORT`).

### 4. (Optional) Seed hackathons

Pull real hackathons from Devpost, or fall back to a curated sample set:

```bash
npm run seed:hackathons
```

## API Reference

Base URL: `/api/v1`

### Health

- `GET /health` — service health check

### Users — `/users`

| Method | Path                | Auth | Description                          |
| ------ | ------------------- | ---- | ------------------------------------ |
| POST   | `/register`         | —    | Register (multipart `avatar` optional) |
| POST   | `/login`            | —    | Login, returns tokens + sets cookies |
| POST   | `/refresh-token`    | —    | Rotate access token                  |
| GET    | `/search`           | —    | Discover users by skill/role/experience |
| GET    | `/:id`              | —    | Public user profile                  |
| POST   | `/logout`           | ✅   | Logout                               |
| GET    | `/me`               | ✅   | Current user                         |
| POST   | `/change-password`  | ✅   | Change password                      |
| PATCH  | `/profile`          | ✅   | Update profile fields                |
| PATCH  | `/avatar`           | ✅   | Update avatar (multipart `avatar`)   |

### Hackathons — `/hackathons`

| Method | Path        | Auth | Description                                  |
| ------ | ----------- | ---- | -------------------------------------------- |
| GET    | `/`         | —    | Browse (filters: `q,theme,mode,status,sort`) |
| POST   | `/`         | ✅   | Create a hackathon                           |
| POST   | `/ingest`   | ✅   | Ingest from Devpost (`?pages=N`)             |
| GET    | `/:id`      | —    | Hackathon details                            |
| PATCH  | `/:id`      | ✅   | Update (creator only)                        |
| DELETE | `/:id`      | ✅   | Delete (creator only)                        |

### Teams — `/teams`

| Method | Path                      | Auth | Description                         |
| ------ | ------------------------- | ---- | ---------------------------------- |
| GET    | `/`                       | —    | Browse teams (filters)             |
| POST   | `/`                       | ✅   | Create team (creator = leader)     |
| GET    | `/mine`                   | ✅   | Teams the current user belongs to  |
| GET    | `/:id`                    | —    | Team details                       |
| PATCH  | `/:id`                    | ✅   | Update (leader only)               |
| DELETE | `/:id`                    | ✅   | Delete (leader only)               |
| POST   | `/:id/leave`              | ✅   | Leave a team                       |
| DELETE | `/:id/members/:userId`    | ✅   | Remove a member (leader only)      |

### Join Requests — `/join-requests` (all require auth)

| Method | Path             | Description                                    |
| ------ | ---------------- | --------------------------------------------- |
| POST   | `/request`       | User requests to join a team                  |
| POST   | `/invite`        | Leader invites a user                         |
| GET    | `/sent`          | Requests/invites you initiated                |
| GET    | `/incoming`      | Requests/invites awaiting your response       |
| PATCH  | `/:id/respond`   | Accept/reject (`{ "action": "accept" }`)      |
| PATCH  | `/:id/cancel`    | Cancel your own pending request               |

## Real-time (Socket.io)

Connect with the JWT access token:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:8000", { auth: { token: ACCESS_TOKEN } });
```

**Events emitted by the server:**

- `joinRequest:received` — a leader gets a new join request
- `joinRequest:invited` — a user gets a team invite
- `joinRequest:responded` — your request/invite was accepted or rejected
- `team:updated`, `team:deleted`, `team:member-left`, `team:member-removed`
- `team:message` — team chat relay

**Events the client can emit:**

- `team:join` / `team:leave` — `(teamId)` join/leave a team chat room
- `team:message` — `({ teamId, message })` send a chat message

## Project Structure

```
.
├── app.js                 # Express app, middleware, route mounting, error handler
├── index.js               # HTTP server bootstrap + Socket.io init
├── constants.js           # DB name
└── src
    ├── controllers/       # Route handlers per domain
    ├── routes/            # Express routers per domain
    ├── models/            # Mongoose schemas
    ├── middlewares/       # auth (JWT), multer, error handler
    ├── utils/             # ApiError, ApiResponse, asyncHandler, cloudinary, email
    ├── services/          # Devpost/MLH ingestion + seed script
    ├── socket/            # Socket.io setup + emit helpers
    └── db/                # Mongo connection
```

## Notes

- Email and Cloudinary are **optional** in development — missing credentials degrade gracefully (emails log to console, registration uses a default avatar).
- A standard JSON envelope is used everywhere: `{ success, status, message, data }`.
