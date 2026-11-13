# AtlasLearn

**A full-stack learning management platform.**

Teachers build courses as chapters and lessons, students follow them at their own pace and take quizzes, administrators supervise users and courses, with progress tracked at every level and live online presence.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io)

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API overview](#api-overview)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

## Features

| Role | What they can do |
|---|---|
| **Teacher** | Create courses, chapters and lessons; write lessons in a rich-text editor; attach materials (PDF, DOC, MP4, MP3); create quizzes and assignments; grade submissions |
| **Student** | Enrol in courses, follow lessons, take quizzes, submit assignments, see their progress and their ranking |
| **Admin** | Manage users and roles, manage course enrolments, see platform analytics and quiz statistics |

- **Course structure**: course → ordered chapters → ordered lessons, with materials attached at any level.
- **Quizzes**: three question types (multiple choice, true/false, short answer), difficulty levels, attempts and statistics.
- **Progress engine**: completion tracked at three levels (lesson → chapter → course).
- **Rich content**: Tiptap editor (tables, images, task lists, colours, links); lessons are stored both as editor JSON and as rendered HTML.
- **Real time**: online / offline presence and notifications pushed with Socket.IO.
- **Authentication**: JWT, email verification code at sign-up and password reset (codes and tokens stored in Redis with an expiry).
- **API documentation**: Swagger UI generated from the route annotations.

## Architecture

```text
 ┌──────────────────────────────┐
 │  AtlasFront                  │  Next.js 15 (App Router), React 19, Tailwind CSS 4,
 │  http://localhost:3000       │  shadcn/ui, Tiptap; middleware protects dashboards by role
 └──────────────┬───────────────┘
                │  REST (axios, JWT) + Socket.IO
 ┌──────────────▼───────────────┐
 │  AtlasBack                   │  Express, TypeScript, Socket.IO, Swagger
 │  http://localhost:3001       │
 └──────┬──────────┬─────────┬──┘
        │ Prisma   │         │ S3 API
 ┌──────▼──────┐ ┌─▼──────┐ ┌▼──────────────────┐
 │  MongoDB    │ │ Redis  │ │ MinIO             │  course materials, question images,
 │ (24 models) │ │        │ │ (S3-compatible)   │  assignment submissions
 └─────────────┘ └────────┘ └───────────────────┘
```

Everything runs locally with Docker Compose. Each service is reached only through environment variables, so moving one online (MongoDB Atlas, a managed Redis, AWS S3 / Cloudflare R2…) means changing its lines in `AtlasBack/.env`, with no code change ([see below](#moving-a-service-online)).

## Repository layout

```text
AtlasLearn/
├── docker-compose.yml        MongoDB (replica set), Redis and MinIO for local development
├── AtlasBack/                REST + Socket.IO API
│   ├── prisma/
│   │   ├── schema.prisma     Data model (users, courses, chapters, lessons, quizzes, progress…)
│   │   ├── Schema.md         Notes on the data model
│   │   └── seed.ts           Demo data
│   ├── src/
│   │   ├── main.ts           Entry point
│   │   ├── config/storage.ts S3-compatible file storage (MinIO locally)
│   │   ├── routes/           Route definitions (with Swagger annotations)
│   │   ├── controllers/      Request handlers
│   │   ├── Services/         Business logic, Redis, email, sockets
│   │   ├── Middlewares/      JWT authentication, role checks, uploads
│   │   └── socketHandlers/   Online presence
│   └── .env.example
└── AtlasFront/               Next.js web application
    ├── app/dashboard/        admin / teacher / student dashboards
    ├── app/signIn, signUp, reset-password
    ├── components/           Course, chapter, lesson, quiz and assignment modals, rich-text editor
    ├── middleware.ts         Redirects by role, protects /dashboard
    └── .env.example
```

## Getting started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | **20.12 or later** | The API loads `.env` with `process.loadEnvFile()` |
| [Docker](https://docs.docker.com/get-docker/) + Compose | any recent | Runs MongoDB, Redis and MinIO |

No external account is needed: the database, the cache and the file storage run in Docker, and without Gmail credentials emails are printed in the API console.

### 1. Clone the repository

```bash
git clone https://github.com/JuveHeydene/AtlasLearn.git
cd AtlasLearn
```

### 2. Start MongoDB, Redis and MinIO

```bash
docker compose up -d
```

| Service | Port | Notes |
|---|---|---|
| MongoDB | `27017` | Single-node replica set `rs0` (required by Prisma), initialised by the health check |
| Redis | `6379` | |
| MinIO | `9000` (S3 API), `9001` (web console) | Console: <http://localhost:9001>, login `minioadmin` / `minioadmin`. The API creates the `atlaslearn` bucket at startup |

> A port is already used on your machine (for example a local Redis)? Change it without editing the file: `REDIS_PORT=6380 docker compose up -d`, then update `REDIS_URL` in `AtlasBack/.env`.

### 3. Start the API

```bash
cd AtlasBack
cp .env.example .env        # the defaults match docker-compose.yml
npm install
npx prisma db push          # create the collections and indexes
npm run seed                # demo accounts and a demo course
npm run dev
```

The API runs on <http://localhost:3001>; the Swagger documentation is at <http://localhost:3001/api-docs>.

### 4. Start the front end

In a second terminal:

```bash
cd AtlasFront
cp .env.example .env.local  # JWT_SECRET must match AtlasBack/.env
npm install
npm run dev
```

Open <http://localhost:3000> and sign in with a demo account:

| Email | Role | Password |
|---|---|---|
| `admin@atlaslearn.local` | Admin | `demo1234` |
| `teacher@atlaslearn.local` | Teacher | `demo1234` |
| `student@atlaslearn.local` | Student (enrolled in the demo course) | `demo1234` |

To create a new account through **Sign up**, ask for the verification code: without Gmail credentials it appears in the **API terminal**:

```text
[email] to: you@example.com
[email] subject: Your Verification Code
[email] Your verification code is: 482913
```

### Production build

```bash
cd AtlasBack && npm run build && npm run start:prod
cd AtlasFront && npm run build && npm start
```

## Configuration

### API — `AtlasBack/.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DATABASE_URL` | local replica set | MongoDB connection string (`…?replicaSet=rs0&directConnection=true` for the Docker instance) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | *(required)* | Secret used to sign JWTs |
| `EMAIL_USER` / `EMAIL_PASS` | *(empty)* | Gmail address and [app password](https://myaccount.google.com/apppasswords); empty = emails printed in the console |
| `PUBLIC_API_URL` | `http://localhost:3001` | API URL shown in Swagger |
| `S3_ENDPOINT` | `http://localhost:9000` | S3-compatible endpoint (MinIO, AWS S3, Cloudflare R2…) |
| `S3_REGION` / `S3_BUCKET` | `us-east-1` / `atlaslearn` | Region and bucket |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `minioadmin` / `minioadmin` | Storage credentials |
| `S3_FORCE_PATH_STYLE` | `true` | Path-style URLs, required by MinIO |
| `S3_PUBLIC_URL` | `http://localhost:9000/atlaslearn` | Base of the public file links stored in the database |
| `S3_AUTO_CREATE_BUCKET` | `true` | Create the bucket with public read access at startup (local MinIO) |
| `MAX_UPLOAD_MB` | `500` | Maximum size of an uploaded file |

### Front end — `AtlasFront/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | API URL, `http://localhost:3001` |
| `JWT_SECRET` | Same value as the API: the Next.js middleware verifies the token to route each role to its dashboard |
| `NEXT_PUBLIC_STORAGE_URL` | Public URL of the file storage, same as `S3_PUBLIC_URL` (allowed by `next/image`) |

### Moving a service online

Only `.env` files change:

| Service | Lines to change |
|---|---|
| MongoDB Atlas | `DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>/atlaslearn` |
| Managed Redis | `REDIS_URL=rediss://default:<password>@<host>:6379` |
| AWS S3 | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL`, and `S3_AUTO_CREATE_BUCKET=false` (create the bucket in the console). Set `NEXT_PUBLIC_STORAGE_URL` in the front end to the same public URL |
| API deployed | `PUBLIC_API_URL` in the API, `NEXT_PUBLIC_API_URL` in the front end |

## API overview

The full, interactive list is in Swagger (`/api-docs`). Main groups:

| Prefix | Purpose |
|---|---|
| `/auth` | Verification code, sign up, sign in, password reset |
| `/users`, `/user` | Users and profiles, admin user management |
| `/course`, `/chapter`, `/lesson`, `/coursematerials` | Course content |
| `/courseenrollement`, `/teachercourseenrollement` | Enrolments of students and teachers |
| `/quiz`, `/question`, `/quizattemp` | Quizzes, questions, attempts |
| `/assignment`, `/assignmentsubs` | Assignments and submissions |
| `/courseprogress`, `/chapterprogress`, `/lessonprogress` | Progress tracking |
| `/files` | Generic upload to the storage (`/files/upload`) and upload of course materials (`/files/upload-materials`) |
| `/notification` | Notifications |

**Socket.IO** (same port): the client joins its own room with `join_user_room` and receives its notifications; connection and disconnection update the user's online status.

## Known limitations

- The sign-up form lets the user choose a role; in production, teacher and admin accounts should be created by an administrator only.
- No automated tests yet.

## Roadmap

- Tests (Jest + Supertest) for sign-up and the progress computation.
- Screenshots and a short demo GIF in this README.
- Hosted demo (front on Vercel, API on a VPS, MongoDB Atlas).

## Author

**Adriel Juve SALONG** — [github.com/JuveHeydene](https://github.com/JuveHeydene)
