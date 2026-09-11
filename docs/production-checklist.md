# FinBuddy Production Readiness Checklist

This document provides a comprehensive operational readiness gate for the FinBuddy backend API before going live in a production environment. Every item must be reviewed, verified, and signed off prior to routing production traffic.

---

## 1. Security & Secret Management

- [ ] **Strong Secret Generation**:
  - `JWT_SECRET` is generated using a cryptographically secure random generator with at least 256 bits of entropy (>= 32 characters).
  - Database password is high entropy and distinct from development/staging passwords.
- [ ] **No Secrets in Code or Version Control**:
  - Verify `.env` is absent from git tracking (`git ls-files .env` returns empty).
  - No credentials, tokens, or private keys are hardcoded in source code or Dockerfile.
- [ ] **Secure Secret Injection**:
  - Environment variables are injected at runtime via an audited secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault, Doppler, or Kubernetes Secrets).
- [ ] **Non-Root Container Execution**:
  - The production container runs strictly under the unprivileged `USER node` (UID 1000). Root access inside the container is forbidden.
- [ ] **Strict CORS Whitelisting**:
  - In production (`NODE_ENV=production`), `CORS_ORIGIN` is configured with explicit frontend domains (no wildcard `*` allowed).
  - Verified that omitting `CORS_ORIGIN` in production defaults to `false` (blocking cross-origin requests).
- [ ] **Swagger Documentation Hardening**:
  - `SWAGGER_ENABLED` is set to `false` in public environments, or restricted behind internal VPN/authenticated gateway.
- [ ] **Security Headers Configured**:
  - Helmet middleware is active and serving `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and HSTS headers.
- [ ] **Rate Limiting & Brute-Force Protection**:
  - `@nestjs/throttler` is enabled with production-appropriate limits (`THROTTLE_LIMIT`, `THROTTLE_AUTH_LIMIT`).
  - Edge reverse proxy (Cloudflare/WAF) enforces IP-based rate limiting on `/auth/login` and `/auth/register`.
- [ ] **Response Sanitization**:
  - Verified that passwords, password hashes (`passwordHash`), and sensitive internal fields are stripped from all API outputs.

---

## 2. Database & Data Integrity

- [ ] **PostgreSQL Version & Sizing**:
  - Target cluster runs PostgreSQL 17 with adequate CPU, memory, and high-performance SSD/NVMe storage.
  - Sized appropriately for expected transactions per second (TPS) and connection pooling limits.
- [ ] **Schema Migrations**:
  - All migrations are applied strictly using `npx prisma migrate deploy` in an isolated pre-flight step.
  - `npx prisma migrate status` reports zero pending or unapplied migrations.
  - Migrations adhere to the Expand & Contract pattern (forward and backward compatible).
- [ ] **Connection Pooling**:
  - Connection pool limits (`connection_limit` in `DATABASE_URL` or PgBouncer) match container replica counts without exhausting database connection limits.
- [ ] **Performance & Index Verification**:
  - Indexes exist on all foreign keys, composite filters (`userId` + `date`), and recurring execution lookups.
  - Explain analyze plans verified for high-traffic endpoints (`/transactions`, `/financial-summary`).
- [ ] **Disaster Recovery & Backup Schedules**:
  - Logical backup script (`pg_dump -Fc`) scheduled daily at off-peak hours (02:00 UTC).
  - Continuous WAL archiving active to achieve **1-Hour RPO**.
  - Backup retention policy configured: 7 days daily, 4 weeks weekly, 12 months monthly.
  - Backups pushed to isolated, encrypted (AES-256) object storage with Object Lock enabled.
- [ ] **Restoration Verification**:
  - Restoration procedure from [`docs/backup-recovery.md`](./backup-recovery.md) tested in an isolated staging sandbox.
  - **1-Hour RTO** target verified under drill conditions.

---

## 3. Application Configuration & Runtime

- [ ] **Environment Validation**:
  - `NODE_ENV=production` is set.
  - All required environment variables pass validation during startup (`DATABASE_URL`, `JWT_SECRET`, `PORT`).
- [ ] **Global Validation & Sanitization**:
  - Global `ValidationPipe` enforces `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- [ ] **Graceful Shutdown**:
  - `app.enableShutdownHooks()` is enabled, ensuring in-flight database transactions finish cleanly on `SIGTERM`.
- [ ] **Scheduled Jobs & Automation**:
  - Recurring transaction automation cron job (`RECURRING_TRANSACTION_AUTOMATION_ENABLED`) is configured properly.
  - Only one worker instance executes singleton recurring cron jobs if running multiple container replicas (or distributed locks configured).
- [ ] **Structured Logging**:
  - Logging outputs structured JSON to `stdout` / `stderr`.
  - `LOG_LEVEL` set to `info` or `warn` (no verbose debug logs in production).
  - PII and credentials are never written to application logs.

---

## 4. Deployment & Infrastructure

- [ ] **Multi-Stage Docker Build**:
  - Production image built from two-stage `Dockerfile` with zero dev dependencies.
  - Image scanned with vulnerability scanner (Trivy/Snyk) with zero HIGH/CRITICAL unmitigated vulnerabilities.
- [ ] **Reverse Proxy & TLS Termination**:
  - Reverse proxy (Cloudflare, NGINX, or AWS ALB) terminates TLS 1.3.
  - Automated HTTP to HTTPS redirection (301) active.
  - HSTS header (`max-age=31536000; includeSubDomains; preload`) enforced.
- [ ] **Proxy Headers & Trust Proxy**:
  - `trust proxy` configured so client IP addresses resolve accurately for rate limiting and audit logs.
- [ ] **Health Check Probes**:
  - Liveness probe (`GET /health/live`) configured on container orchestrator with appropriate timeout (5s) and period (10s).
  - Readiness probe (`GET /health/ready`) configured with startup grace period, verifying PostgreSQL connectivity.
- [ ] **Zero-Downtime Deployment Strategy**:
  - Rolling update or Blue/Green deployment configured.
  - Old container instances only terminated after new instances pass readiness checks.
- [ ] **Rollback Strategy**:
  - Rollback playbook documented and rehearsed as detailed in [`docs/deployment.md`](./deployment.md).
  - Previous stable Docker image tag readily available in container registry.

---

## 5. Operations, Observability & Monitoring

- [ ] **Log Aggregation**:
  - Container stdout/stderr shipped to centralized log storage (e.g. Datadog, Grafana Loki, AWS CloudWatch).
- [ ] **Metrics & Dashboards**:
  - Real-time monitoring of CPU, memory, HTTP response status codes (2xx, 4xx, 5xx), and p95/p99 latency.
  - Database monitoring for connection pool utilization, transaction locks, and slow queries.
- [ ] **Alerting Thresholds**:
  - Alerts configured for:
    - 5xx error rate > 1% over 5 minutes.
    - Health readiness probe failure on any instance.
    - Database connection pool exhaustion (> 80%).
    - Daily backup job failure or missing backup artifact.
- [ ] **On-Call & Escalation Playbook**:
  - Primary and secondary on-call engineers assigned.
  - Incident response channel and escalation path defined.
- [ ] **Smoke Test Suite Ready**:
  - Post-deployment synthetic test suite ready to execute against newly deployed production endpoint.
