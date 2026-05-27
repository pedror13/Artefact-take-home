# Task Manager (Take-Home Challenge)

Simple and functional task manager built for a Next.js + tRPC take-home.

## Context

This project implements a practical challenge to build a task management app with:

- Next.js v15
- tRPC backend
- In-memory task storage (no database)
- Full CRUD operations
- SSR task preloading
- Incremental loading (infinite scroll)

The goal was to keep the solution straightforward while still covering the required behavior and user feedback states.

## Live Demo

- [https://artefact-take-home-obx5a5c2c-pedror13s-projects.vercel.app/](https://artefact-take-home-obx5a5c2c-pedror13s-projects.vercel.app/)

## Tech Stack

- [Next.js](https://nextjs.org) `15.5.18`
- [React](https://react.dev) `19`
- [tRPC](https://trpc.io) `11`
- [TanStack Query](https://tanstack.com/query/latest)
- [Zod](https://zod.dev) for validation
- [Vitest](https://vitest.dev) + Testing Library for tests

## Implemented Requirements

### 1) Project Setup

- Next.js app created with modern versions.
- tRPC configured end-to-end (`server` + `client`) so frontend and backend communicate through typed procedures.

### 2) Backend (tRPC)

Task model includes:

- `id` (unique, auto-generated)
- `titulo` (required string)
- `descricao` (optional string)
- `dataCriacao` (timestamp)
- Additional fields in this implementation: `prazo` and `status`

CRUD procedures:

- `task.create`
- `task.list` (cursor pagination)
- `task.update`
- `task.delete`

Validation and error handling:

- Empty/blank title is rejected by schema validation.
- Meaningful errors are returned for invalid cursor and missing task cases (for update/delete).

### 3) Frontend (Next.js/React)

- Task list page preloads data using SSR + hydration.
- Tasks are displayed in a simple, clean UI.
- Delete action is available from the list, with visual feedback.
- Create and edit flows are handled with modal forms and functional components/hooks.
- Frontend validation prevents invalid submissions (for example, empty title).
- Loading, success, and failure states are surfaced to the user.

### 4) Bonus

- Infinite scroll implemented using cursor-based pagination and `IntersectionObserver`.
- Tests and in-code comments were added for key decisions and behaviors.

## How to Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful Scripts

- `npm run dev`: start with an empty in-memory store.
- `npm run dev:mock`: start with 100 seeded tasks (`SEED_MOCK_TASKS=true`).
- `npm run test`: run test suite.
- `npm run lint`: run lint checks.
- `npm run typecheck`: run TypeScript checks.
- `npm run check`: run lint + typecheck.

## In-Memory Storage

Tasks are stored in a process-level global store (`globalThis.__taskStore`).

- Data is intentionally ephemeral.
- Restarting the server clears all tasks.
- This behavior follows the take-home requirement (no database persistence).

## Security Note

This repository is intended to be public and contains no real credentials, tokens, or sensitive personal data.
