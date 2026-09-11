# FinBuddy Production Deployment Guide & Architecture Topology

## 1. Architecture & Network Topology

FinBuddy is architected for zero-trust, defense-in-depth network isolation. Public Internet traffic never connects directly to the Node.js application process or the PostgreSQL database.

### 1.1 Deployment Topology

```
+-------------------------------------------------------------------------+
|                              PUBLIC INTERNET                            |
+-------------------------------------------------------------------------+
                                     │
                                     │ HTTPS (Port 443 / TLS 1.3)
                                     ▼
+-------------------------------------------------------------------------+
|                  EDGE / REVERSE PROXY LAYER (Cloudflare / NGINX)         |
|  - WAF, DDoS Protection, Rate Limiting Edge Rules                       |
|  - TLS 1.3 Termination, Automated HTTP -> HTTPS Redirection (301)      |
|  - Strict-Transport-Security (HSTS) Header Enforcement                  |
|  - Appends X-Forwarded-For, X-Forwarded-Proto, X-Real-IP                |
+-------------------------------------------------------------------------+
                                     │
                                     │ HTTP (Port 3000 / Internal VPC Network)
                                     ▼
+-------------------------------------------------------------------------+
|                    APPLICATION LAYER (FinBuddy API)                     |
|  - Container: node:22-alpine (Multi-stage build)                        |
|  - Non-root Execution: USER node (UID 1000)                             |
|  - Framework: NestJS 11 + Fastify/Express + Prisma 7 Engine             |
|  - Security: Helmet, Trust Proxy, Strict CORS Origin Whitelisting       |
|  - Health Probes: /health/live, /health/ready                           |
+-------------------------------------------------------------------------+
                                     │
                                     │ PostgreSQL Protocol (Port 5432 / TLS)
                                     ▼
+-------------------------------------------------------------------------+
|                    DATA LAYER (PostgreSQL 17 Private Subnet)             |
|  - Isolated Private Database Subnet (No Public IP Route)                |
|  - Storage: Encrypted NVMe / SSD with Automated Snapshots               |
|  - Continuous WAL Archiving to Isolated S3 Object Storage               |
+-------------------------------------------------------------------------+
```

### 1.2 Mermaid Architecture Diagram

```mermaid
flowchart TD
    Client(["Internet Clients (Browsers, Mobile Apps)"])
    Edge["Edge Reverse Proxy (Cloudflare / NGINX)\n- TLS 1.3 Termination\n- HTTP -> HTTPS Redirect\n- HSTS & DDoS Protection"]
    API["FinBuddy API Container\n- node:22-alpine (USER node)\n- Helmet & Strict CORS\n- NestJS 11 + Prisma 7"]
    DB[("PostgreSQL 17 Database\n- Private VPC Subnet\n- Encrypted at Rest (AES-256)")]
    BackupStore[("Isolated Object Storage\n- Daily pg_dump & WAL\n- S3 / WORM Object Lock")]

    Client -->|HTTPS :443| Edge
    Edge -->|HTTP :3000 (Internal VPC)| API
    API -->|TCP :5432 (TLS Internal)| DB
    DB -.->|Continuous Archival| BackupStore
```

---

## 2. Web Security, Proxy & Edge Hardening

### 2.1 Reverse Proxy Configuration (NGINX Example)

When deploying behind NGINX, HAProxy, or AWS ALB, the reverse proxy must terminate TLS, enforce modern cipher suites, inject forwarding headers, and redirect plaintext HTTP requests.

```nginx
# HTTP to HTTPS Redirection
server {
    listen 80;
    listen [::]:80;
    server_name api.finbuddy.example.com;
    return 301 https://$host$request_uri;
}

# HTTPS Production Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.finbuddy.example.com;

    # TLS Certificates & Protocols
    ssl_certificate /etc/letsencrypt/live/api.finbuddy.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.finbuddy.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (Strict-Transport-Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Proxy Headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;

    location / {
        proxy_pass http://finbuddy_upstream;
    }
}
```

### 2.2 Trust Proxy & Client IP Resolution

FinBuddy employs `@nestjs/throttler` for rate limiting. When running behind a reverse proxy or load balancer, the client IP is passed in the `X-Forwarded-For` header. In production, configure the underlying Express application to trust the proxy:

```typescript
// src/main.ts
const app = await NestFactory.create(AppModule);
const expressApp = app.getHttpAdapter().getInstance();
// Trust 1 hop (e.g. reverse proxy / AWS ALB / Cloudflare)
expressApp.set('trust proxy', 1);
```

### 2.3 Strict CORS Origin Whitelisting

In `src/main.ts`, CORS origin behavior is strictly enforced based on `NODE_ENV`:
- **Production (`NODE_ENV=production`)**: `CORS_ORIGIN` must be defined as an explicit comma-separated list of authorized domains (e.g., `https://app.finbuddy.example.com,https://admin.finbuddy.example.com`). If `CORS_ORIGIN` is not set, CORS falls back to `false` (blocking all cross-origin requests).
- **Development (`NODE_ENV=development`)**: Falls back to `true` to facilitate local development.

### 2.4 Helmet Middleware & Security Headers

FinBuddy applies `helmet()` middleware globally to ensure all responses carry standard web security protections:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- `X-Frame-Options: SAMEORIGIN`: Protects against clickjacking.
- `X-XSS-Protection: 0`: Modern standard to prevent legacy XSS auditor vulnerabilities.
- `Strict-Transport-Security`: HSTS header preventing HTTP downgrade attacks.

---

## 3. 10-Step Production Deployment Procedure

Follow this 10-step sequence for zero-downtime, verified production deployments.

### Step 1: Pre-Deployment Verification & Testing
Ensure the release commit passes all automated quality gates prior to building the release artifact:
```bash
# Run unit tests, E2E suite, production build, and linting
npm test
npm run test:e2e
npm run build
npm run lint
```
Confirm `git status` is clean and the target release tag is checked out.

### Step 2: Build Multi-Stage Docker Image
Build the production Docker image using the two-stage `Dockerfile`. The builder stage compiles TypeScript and generates the Prisma client; the runner stage copies only production assets and executes as `USER node`:
```bash
RELEASE_TAG="v1.0.0"
docker build -t finbuddy-api:${RELEASE_TAG} -t finbuddy-api:latest .
```

### Step 3: Container Vulnerability Scanning & Registry Push
Scan the built image for known vulnerabilities (CVEs) before pushing to the private container registry:
```bash
trivy image --severity HIGH,CRITICAL finbuddy-api:${RELEASE_TAG}
docker tag finbuddy-api:${RELEASE_TAG} registry.finbuddy.example.com/finbuddy-api:${RELEASE_TAG}
docker push registry.finbuddy.example.com/finbuddy-api:${RELEASE_TAG}
```

### Step 4: Production Environment Secret Injection
Retrieve secrets from an encrypted secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, or Doppler) and inject them as environment variables. Mandatory variables:
- `NODE_ENV`: Must be `production`.
- `PORT`: Typically `3000`.
- `DATABASE_URL`: Production PostgreSQL connection string with SSL (`sslmode=require`).
- `JWT_SECRET`: High-entropy 256-bit+ random secret (at least 32 characters).
- `CORS_ORIGIN`: Comma-separated list of authorized front-end client domains.
- `SWAGGER_ENABLED`: Set to `false` in production (or `true` only if internal VPN access is enforced).
- `LOG_LEVEL`: Set to `info` or `warn`.

### Step 5: Database Availability Check
Verify that the PostgreSQL primary instance is accepting connections and responsive prior to schema operations:
```bash
pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"
```

### Step 6: Pre-Flight Database Migration Execution
Execute pending database schema migrations in an isolated pre-flight container or migration job before starting the new application containers:
```bash
# In an ephemeral runner container with production DATABASE_URL:
npx prisma migrate deploy
```
> **Rule**: Never run migrations inside the application container startup script (`CMD`). Migrations must run as a single-instance job to avoid database locking contention or race conditions during multi-instance rolling deploys.

### Step 7: Application Container Startup
Deploy the new container image using a rolling update or blue/green strategy:
```bash
docker run -d \
  --name finbuddy-api-prod \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /etc/finbuddy/production.env \
  --user node \
  registry.finbuddy.example.com/finbuddy-api:${RELEASE_TAG}
```
*(Or via orchestrator: `kubectl rollout restart deployment/finbuddy-api`)*

### Step 8: Health Probe Verification
Verify the application has started, initialized its dependency injection container, and successfully connected to PostgreSQL:
```bash
# 1. Liveness check (process responds)
curl -s -f http://127.0.0.1:3000/health/live
# Expected: {"status":"ok"}

# 2. Readiness check (database connection verified)
curl -s -f http://127.0.0.1:3000/health/ready
# Expected: {"status":"ok","info":{"database":{"status":"up"}}}
```
Both endpoints must return HTTP status `200 OK`. If `/health/ready` returns `503`, halt deployment immediately.

### Step 9: Edge Traffic Cutover & Log Inspection
Gradually shift ingress traffic to the newly deployed container instances. Inspect live container logs for unhandled exceptions, database query errors, or abnormal spikes:
```bash
docker logs -f --tail 100 finbuddy-api-prod
```
Verify logs do not output sensitive values (`JWT_SECRET`, database passwords) and reflect expected initialization.

### Step 10: Post-Deployment Smoke Tests
Execute automated synthetic smoke tests against the live deployment to confirm critical paths:
1. `GET /health/ready` -> HTTP 200 `database: up`
2. `POST /auth/login` -> HTTP 200 with valid JWT access token
3. `GET /users/me` (with Bearer token) -> HTTP 200 with sanitized user profile
4. `GET /financial-summary` -> HTTP 200 with correct data structure

Upon successful completion, mark the release as stable.

---

## 4. Deployment Rollback Strategy

When a newly deployed release introduces unexpected defects, performance degradations, or errors, execute a controlled rollback.

### 4.1 Forward-Compatible Migrations (Expand & Contract Pattern)

FinBuddy adheres to the **Expand and Contract** pattern for zero-downtime database migrations:
1. **Expand**: Add new columns as optional/nullable, add new tables, or create additive indexes. Never drop or rename columns in the same release as code changes that rely on them.
2. **Migrate**: Deploy the new application version that writes to both old and new structures if necessary.
3. **Contract**: In a subsequent release, remove legacy unused columns after older application versions are fully decommissioned.

Because migrations are strictly additive, rolling back the application container to the previous image tag is almost always database-compatible.

### 4.2 Rollback Scenarios & Playbooks

#### Scenario A: Application-Only Regression (Schema is Forward-Compatible)
The new code has a bug, but the database schema changes were purely additive (new optional columns, new indexes).
1. **Action**: Immediately redeploy the previous stable Docker image tag:
   ```bash
   docker stop finbuddy-api-prod
   docker run -d --name finbuddy-api-prod -p 3000:3000 --env-file /etc/finbuddy/production.env registry.finbuddy.example.com/finbuddy-api:v<previous-stable-tag>
   ```
2. **Database Status**: The database remains on the current migrated schema. The previous application code ignores new unused columns.
3. **Verification**: Confirm `/health/ready` is 200 and smoke tests pass.

#### Scenario B: Migration Failure During Pre-Flight Deploy
`npx prisma migrate deploy` fails during Step 6 before new application containers are started.
1. **Action**: The previous application containers are still running untouched and serving traffic. Do not restart or deploy new containers.
2. **Remediation**: Inspect migration error logs (e.g. unique constraint collision or timeout). Resolve the data discrepancy manually or run `npx prisma migrate resolve` if appropriate.

#### Scenario C: Severe Data Corruption or Catastrophic Defect
The deployment caused unexpected corruption or invalid mutations across production data.
1. **Action**: Put the application into maintenance mode by routing ingress to a static 503 page.
2. **Database Restore**: Follow the clean database restoration procedure documented in [`docs/backup-recovery.md`](./backup-recovery.md):
   - Restore the pre-deployment `pg_dump` snapshot to the target database.
   - Run `npx prisma migrate status` to verify migration consistency.
3. **Container Rollback**: Deploy the previous stable container image tag.
4. **Validation**: Execute full verification suite and health checks.
5. **Traffic Resumption**: Re-route edge traffic from maintenance mode back to the application.
