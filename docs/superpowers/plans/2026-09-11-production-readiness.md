# FinBuddy Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-oriented hardening pass for the FinBuddy backend REST API. Secure environment configuration, implement multi-stage non-root Docker builds, document database backup/recovery and deployment procedures, and enforce operational quality gates without altering existing business logic or adding unnecessary infrastructure.

**Architecture:** Extend environment validation schema with `NODE_ENV` and `SWAGGER_ENABLED` flags. Update `src/main.ts` for safe production CORS fallbacks and conditional Swagger mounting. Refactor `Dockerfile` to a two-stage non-root Alpine container (`USER node`). Create operational documentation (`docs/backup-recovery.md`, `docs/deployment.md`, `docs/production-checklist.md`).

**Tech Stack:** NestJS 11, TypeScript, Docker, Prisma 7, PostgreSQL 17, Jest, Supertest.

---

## Tasks

### Task 1: Environment Validation & Production Configuration Hardening

**Files:**
- Modify: `src/config/env.validation.ts`
- Modify: `.env.example`
- Modify: `src/main.ts`
- Create: `src/config/env.validation.spec.ts`

- [ ] **Step 1: Write unit tests for `src/config/env.validation.ts`**
Test `NODE_ENV` validation, default values (`LOG_LEVEL`, `RECURRING_TRANSACTION_AUTOMATION_ENABLED`, `SWAGGER_ENABLED`), and invalid config failure.

- [ ] **Step 2: Update `src/config/env.validation.ts` and `.env.example`**
Add `NODE_ENV` (`@IsEnum(['development', 'production', 'test'])`) and `SWAGGER_ENABLED` (`@IsBoolean()`, default: `true`).

- [ ] **Step 3: Update `src/main.ts` CORS and Swagger mounting**
Update CORS origin fallback: in production (`NODE_ENV === 'production'`), fallback to `false` instead of `true` if `CORS_ORIGIN` is unset. Only mount Swagger documentation at `/docs` if `SWAGGER_ENABLED` is true.

- [ ] **Step 4: Run unit tests, build, and lint**
Run `npm test && npm run build && npm run lint`

- [ ] **Step 5: Commit**
`git commit -m "chore(config): harden production environment validation and CORS/Swagger configuration"`

---

### Task 2: Multi-Stage Dockerfile & Production Container Hardening

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Refactor `Dockerfile` to multi-stage build running as non-root user**
Create `builder` stage for compiling NestJS and generating Prisma client. Create `runner` production stage using `USER node` and copying compiled assets.

- [ ] **Step 2: Update `docker-compose.yml`**
Add `NODE_ENV: production` and `SWAGGER_ENABLED: "true"` environment settings to `api` service.

- [ ] **Step 3: Test Docker container build**
Run `docker build -t finbuddy-api:prod .`

- [ ] **Step 4: Commit**
`git commit -m "chore(docker): harden production container configuration with multi-stage non-root build"`

---

### Task 3: Production Readiness E2E & Operational Regression Tests

**Files:**
- Create: `test/production-readiness.e2e-spec.ts`

- [ ] **Step 1: Create `test/production-readiness.e2e-spec.ts`**
Add E2E tests verifying:
1. Invalid/missing environment configuration fails startup safely.
2. Swagger UI (`/docs`) toggling based on `SWAGGER_ENABLED`.
3. Health check liveness (`/health/live`) and readiness (`/health/ready`) probe responses.
4. Response headers & logs never expose secrets (`JWT_SECRET`, database passwords).

- [ ] **Step 2: Run E2E test suite**
Run `npx jest --config ./test/jest-e2e.json test/production-readiness.e2e-spec.ts`

- [ ] **Step 3: Commit**
`git commit -m "test(ops): add production readiness regression test suite"`

---

### Task 4: Comprehensive Operational & Disaster Recovery Documentation

**Files:**
- Create: `docs/backup-recovery.md`
- Create: `docs/deployment.md`
- Create: `docs/production-checklist.md`

- [ ] **Step 1: Create `docs/backup-recovery.md`**
Document PostgreSQL logical backup via `pg_dump`, retention policy, restore procedure, local restore testing, RPO (1 hour), and RTO (1 hour).

- [ ] **Step 2: Create `docs/deployment.md`**
Document 10-step production deployment workflow, environment secret injection, `prisma migrate deploy`, health probe verification, and safe rollback strategy.

- [ ] **Step 3: Create `docs/production-checklist.md`**
Document production verification checklist across Security, Database, Application, Deployment, and Operations.

- [ ] **Step 4: Commit documentation**
`git commit -m "docs(ops): add backup recovery procedures and deployment production checklist"`

---

### Task 5: Final Baseline Verification & Operational Quality Gates

- [ ] **Step 1: Run full verification suite**
Run `npm test`, `npm run test:e2e`, `npm run build`, `npm run lint`. Ensure zero lint errors without `--fix`.

- [ ] **Step 2: Verify zero schema/migration changes**
Verify `git status` shows zero changes to `prisma/schema.prisma` or `prisma/migrations`.
