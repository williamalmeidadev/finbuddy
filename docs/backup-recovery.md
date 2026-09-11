# FinBuddy PostgreSQL Disaster Recovery & Backup Strategy

## 1. Overview & Service Level Objectives (SLOs)

FinBuddy stores mission-critical personal financial data, including transaction histories, account balances, categorization rules, recurring commitments, and user credentials. Maintaining data durability, integrity, and swift recovery in catastrophic scenarios (e.g., host failure, datacenter outage, data corruption, or ransomware) is essential.

This document outlines the backup architecture, retention policies, storage isolation, automated execution, step-by-step restoration workflow, and testing verification routines.

### 1.1 Service Level Objectives

| Metric | Target | Definition |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **1 Hour** | The maximum acceptable data loss window measured backwards from the time of disaster. In worst-case catastrophic failure, no more than 1 hour of transaction data may be lost. |
| **Recovery Time Objective (RTO)** | **1 Hour** | The maximum allowable duration from disaster declaration to full database restoration, migration validation, health probe green status, and application traffic resumption. |

To satisfy the **1-hour RPO**, FinBuddy utilizes daily full logical backups combined with continuous Write-Ahead Log (WAL) archiving.

---

## 2. Backup Architecture & Policies

### 2.1 Logical Backups via `pg_dump`

Logical backups produce an atomic, self-consistent snapshot of the PostgreSQL schema and table data. FinBuddy mandates the PostgreSQL custom archive format (`-Fc`), which provides:
- Built-in zlib compression for minimal storage footprint.
- Parallel restoration support (`pg_restore -j <jobs>`).
- Granular object filtering during restoration if selective table recovery is needed.
- Metadata headers that enable integrity verification before loading.

Standard backup command:
```bash
pg_dump -h <host> -p <port> -U <user> -d <database> -Fc -f backup_<database>_$(date +%Y%m%d_%H%M%S).dump
```

### 2.2 Continuous Archiving & Point-in-Time Recovery (PITR)

While daily logical dumps provide baseline disaster recovery, achieving the **1-hour RPO** requires WAL (Write-Ahead Log) archiving:
1. **WAL Archiving**: In production PostgreSQL, `wal_level = replica` and `archive_mode = on` stream WAL segments to isolated object storage continuously (or at minimum every 16MB segment / 5-minute timeout via `archive_timeout`).
2. **Point-in-Time Recovery (PITR)**: Enables replay of transactions up to any specific minute prior to an accidental data corruption or incident. Tools like `wal-g` or `pgBackRest` manage physical base backups and WAL archiving.

### 2.3 Retention Policy (Grandfather-Father-Son)

Backups are rotated according to an automated lifecycle retention schedule:

| Backup Tier | Frequency | Retention Window | Storage Target | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Daily Backups** | Every 24 hours (02:00 UTC) | **7 Days** | Isolated S3 / GCS Bucket | Fast operational rollbacks and short-term recovery |
| **Weekly Backups** | Every Sunday at 02:00 UTC | **4 Weeks** | Isolated S3 / GCS Glacier-IR | Medium-term disaster recovery |
| **Monthly Backups** | 1st of every calendar month | **12 Months** | Encrypted Cold Archive (Glacier) | Long-term financial compliance and auditing |

Older snapshots exceeding retention thresholds are automatically purged via object storage lifecycle management rules.

### 2.4 Storage Isolation, Encryption at Rest & Access Control

Backup files must never reside on the same compute instance, host disk, or local virtual private cloud (VPC) as the operational database:
- **Dedicated Object Storage**: Backups are transferred immediately to a dedicated, offsite cloud storage bucket (e.g., AWS S3, Google Cloud Storage, or Cloudflare R2).
- **Encryption at Rest**: All backup objects are encrypted using **AES-256** (via server-side encryption with customer-managed KMS keys `SSE-KMS` or `SSE-S3`).
- **Encryption in Transit**: All backup transfers enforce **TLS 1.3**.
- **Object Lock & Immutability**: Production backup buckets enforce S3 Object Lock (WORM - Write Once, Read Many) in compliance mode for 30 days to prevent ransomware modification or accidental deletion.
- **Principle of Least Privilege (PoLP)**:
  - The automated backup agent uses an IAM role with write-only (`s3:PutObject`) permissions. It cannot delete (`s3:DeleteObject`) or overwrite existing backups.
  - Restoration credentials require separate, audited elevated permissions.

---

## 3. Backup Execution Workflow

### 3.1 Automated Backup Script

The following script (`scripts/db-backup.sh`) encapsulates the logical backup procedure, calculates a SHA-256 checksum, and pushes to isolated storage:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-finbuddy}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/finbuddy}"
S3_BUCKET="${BACKUP_S3_BUCKET:-s3://finbuddy-backups-production}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u)] Starting pg_dump for database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}..."

# 1. Execute logical dump in custom binary format
pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -Fc \
  --no-owner \
  --no-privileges \
  -f "${BACKUP_FILE}"

echo "[$(date -u)] pg_dump complete. Generating SHA-256 checksum..."

# 2. Compute SHA-256 checksum
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

echo "[$(date -u)] Uploading backup and checksum to encrypted object storage..."

# 3. Stream to remote isolated object storage with AES-256 encryption
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/daily/" --sse aws:kms --sse-kms-key-id alias/finbuddy-backup-key
aws s3 cp "${CHECKSUM_FILE}" "${S3_BUCKET}/daily/" --sse aws:kms --sse-kms-key-id alias/finbuddy-backup-key

echo "[$(date -u)] Backup successful: ${BACKUP_FILE} uploaded to ${S3_BUCKET}/daily/"

# 4. Clean up local temporary copy
rm -f "${BACKUP_FILE}" "${CHECKSUM_FILE}"
```

---

## 4. Step-by-Step Restoration Workflow (Clean Database Recovery)

Follow this standardized operational playbook when recovering FinBuddy onto a fresh, clean PostgreSQL instance or during disaster recovery drills.

### Step 1: Provision Clean PostgreSQL Target Instance
Ensure a clean target PostgreSQL instance (version 17.x matching production) is online, accessible over a secure private network, and initialized with an empty database:
```bash
# Connect to PostgreSQL server as superuser / admin
psql -h <target-host> -U <admin-user> -d postgres -c "DROP DATABASE IF EXISTS finbuddy;"
psql -h <target-host> -U <admin-user> -d postgres -c "CREATE DATABASE finbuddy WITH OWNER finbuddy_user ENCODING 'UTF8';"
```

### Step 2: Retrieve Backup Artifact & Verify SHA-256 Integrity
Download the designated backup archive and its corresponding checksum file from isolated storage:
```bash
aws s3 cp s3://finbuddy-backups-production/daily/finbuddy_20260911_020000Z.dump ./backup.dump
aws s3 cp s3://finbuddy-backups-production/daily/finbuddy_20260911_020000Z.dump.sha256 ./backup.dump.sha256

# Verify cryptographic integrity
sha256sum -c backup.dump.sha256
```
> **Warning**: Never proceed with restoration if checksum verification fails. Retrieve an alternative snapshot immediately.

### Step 3: Execute Restoration with `pg_restore`
Restore the schema, tables, indexes, constraints, and rows using `pg_restore`:
```bash
pg_restore \
  -h <target-host> \
  -p 5432 \
  -U <target-user> \
  -d finbuddy \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  backup.dump
```
*Flags explained:*
- `-h / -p / -U / -d`: Target database connection parameters.
- `--clean --if-exists`: Cleans database objects before restoring them if any exist.
- `--no-owner --no-privileges`: Skips restoring original ownership/privilege statements so the target environment user acquires ownership properly.
- `--verbose`: Emits detailed progress for real-time auditability.

### Step 4: Verify Schema & Migration Alignment via Prisma
Ensure the restored database matches the application's Prisma migration history:
```bash
DATABASE_URL="postgresql://<target-user>:<target-password>@<target-host>:5432/finbuddy" \
  npx prisma migrate status
```
*Expected output:*
```
Database schema is up to date!
```
If pending migrations exist (e.g. disaster recovery restored a dump taken 6 hours before code deploy), apply pending forward-compatible migrations:
```bash
DATABASE_URL="postgresql://<target-user>:<target-password>@<target-host>:5432/finbuddy" \
  npx prisma migrate deploy
```

### Step 5: Validate Relational Integrity & Data Sanity
Run sanity checks to confirm core tables contain consistent records:
```bash
psql -h <target-host> -U <target-user> -d finbuddy -c "
  SELECT
    (SELECT COUNT(*) FROM users) AS user_count,
    (SELECT COUNT(*) FROM accounts) AS account_count,
    (SELECT COUNT(*) FROM categories) AS category_count,
    (SELECT COUNT(*) FROM transactions) AS transaction_count,
    (SELECT COUNT(*) FROM transfers) AS transfer_count,
    (SELECT COUNT(*) FROM budgets) AS budget_count;
"
```
Verify the latest recorded transaction timestamp is within the expected RPO window:
```bash
psql -h <target-host> -U <target-user> -d finbuddy -c "
  SELECT MAX(created_at) AS latest_transaction_timestamp FROM transactions;
"
```

### Step 6: Verify Application Health Probes
Point the FinBuddy API service to the restored database and execute the automated health checks:
```bash
# 1. Liveness check (process responsive)
curl -s -f http://<api-host>:3000/health/live
# Expected: {"status":"ok"}

# 2. Readiness check (database active and responsive)
curl -s -f http://<api-host>:3000/health/ready
# Expected: {"status":"ok","info":{"database":{"status":"up"}}}
```

---

## 5. Backup Testing and Verification Procedure

Backups that are not routinely restored are untrusted. FinBuddy mandates an automated restoration testing protocol.

### 5.1 Automated Restoration Drill in Isolated Sandbox
Every week, an automated CI/CD pipeline triggers an ephemeral restoration drill:
1. Spawns an isolated ephemeral PostgreSQL 17 Docker container.
2. Downloads the latest daily backup from cloud object storage.
3. Verifies SHA-256 checksum.
4. Restores via `pg_restore`.
5. Executes `npx prisma migrate status`.
6. Executes automated query tests verifying table row counts, relational foreign keys, and indexes.
7. Emits an alert to the engineering team if any step fails.
8. Destroys the ephemeral container.

### 5.2 Local Sandbox Restoration Test Command
Developers and DevOps engineers can test backups locally against Docker:
```bash
# 1. Spin up ephemeral postgres container
docker run --name test-restore-db -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=finbuddy -p 5499:5432 -d postgres:17-alpine

# 2. Restore dump into ephemeral container
pg_restore -h localhost -p 5499 -U postgres -d finbuddy --clean --if-exists --no-owner --no-privileges backup.dump

# 3. Verify Prisma migration status against container
DATABASE_URL="postgresql://postgres:testpass@localhost:5499/finbuddy" npx prisma migrate status

# 4. Tear down ephemeral container
docker stop test-restore-db && docker rm test-restore-db
```

---

## 6. Incident Escalation & DR Playbook

In the event of an unrecoverable database event:
1. **Declare Severity 1 Incident**: Notify Incident Commander and Database Administrator (DBA).
2. **Halt Mutating Traffic**: Set reverse proxy to serve `503 Service Unavailable` with maintenance banner to prevent data skew.
3. **Determine Recovery Point**: Assess whether to restore the latest daily `pg_dump` or replay WAL archives up to point of failure.
4. **Execute Section 4 Restoration Workflow**: Time each phase to ensure RTO is maintained within 1 hour.
5. **Conduct Post-Restoration Validation**: Complete Section 4 smoke checks.
6. **Resume Traffic**: Re-enable reverse proxy routing to FinBuddy API instances.
7. **Post-Incident Review (PIR)**: Document root cause, actual RTO/RPO achieved, and remediation actions within 48 hours.
