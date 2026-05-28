# RegulMate — CLAUDE.md

## Project Overview

RegulMate is a Next.js 15 + TypeScript + Firebase + Genkit B2B SaaS that automates the compliance pipeline:
law amendment detection → internal regulation impact analysis → revision draft generation.

## Dev Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run test         # jest
npm run build        # Production build
```

## Environment

Copy `.env.example` to `.env.local` and set `GOOGLE_GENAI_API_KEY`.

## Health Stack

```
typecheck: tsc --noEmit
lint:      next lint
test:      jest --passWithNoTests
deadcode:  knip
```
