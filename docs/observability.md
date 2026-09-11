# FinBuddy Backend Observability & Health Checks

## 1. Overview
The FinBuddy Observability layer provides production-ready health monitoring, request correlation, structured JSON HTTP logging, global exception sanitization, and lightweight in-memory metrics counters for key business domain operations.

---

## 2. Health Check Endpoints (`/health`)

| Endpoint | Method | Auth Required | Purpose | HTTP Success | HTTP Failure |
|---|---|---|---|---|---|
| `/health/live` | `GET` | No | Liveness probe verifying application process is responsive | `200 OK` (`{"status":"ok"}`) | N/A |
| `/health/ready` | `GET` | No | Readiness probe verifying PostgreSQL database connection using lightweight `SELECT 1` | `200 OK` (`{"status":"ok","info":{"database":{"status":"up"}}}`) | `503 Service Unavailable` |

### Security & Privacy Guarantee
Health endpoints are intentionally unauthenticated to support orchestrators (Docker, Kubernetes) while ensuring zero disclosure of sensitive internal data:
- No database credentials, URLs, connection strings, or port numbers exposed.
- No system paths, stack traces, or environment variables revealed.

---

## 3. Request Correlation (`X-Request-Id`)

Every HTTP request processed by the API is assigned or correlated with a unique identifier via `RequestIdMiddleware`:

1. **Incoming Header Handling**: If a request includes `X-Request-Id` matching regex `/^[a-zA-Z0-9_-]{1,64}$/`, it is preserved.
2. **Generation Fallback**: Missing, malformed, or oversized headers are sanitized and replaced with a newly generated UUID v4.
3. **Propagation**:
   - Attached to request object as `req.requestId`.
   - Returned in HTTP response headers as `X-Request-Id`.
   - Included in structured HTTP log payloads.
   - Included in JSON error responses returned by `AllExceptionsFilter`.

---

## 4. Structured HTTP Logging & Sensitive Data Redaction

`RequestLoggingMiddleware` automatically emits structured JSON log entries for completed HTTP requests:

```json
{
  "requestId": "51bce15e-5bf1-44ce-8a88-8f36ad6311bd",
  "method": "POST",
  "path": "/transactions",
  "statusCode": 201,
  "durationMs": 42,
  "userId": "usr_12345"
}
```

### Log Levels
- `2xx / 3xx`: Logged at `LOG` level.
- `4xx`: Logged at `WARN` level.
- `5xx`: Logged at `ERROR` level.

### Sensitive Data Protection
Request/response body payloads and authorization headers (`Authorization`, `Cookie`, `password`, `refreshToken`, tokens) are strict redacting boundaries and are **never** logged to stdout/stderr.

---

## 5. Global Exception Sanitization (`AllExceptionsFilter`)

All uncaught exceptions across the application are intercepted by `AllExceptionsFilter`:

- **Client Errors (4xx / HttpExceptions)**: Returned with status code, standard message payload, and correlated `requestId`.
- **Server Errors (500 Internal Error)**: Logged with stack trace internally under the correlated `requestId`. The client receives a generic, sanitized response:
  ```json
  {
    "statusCode": 500,
    "message": "Internal server error",
    "requestId": "correlated-uuid-here"
  }
  ```

---

## 6. In-Memory Metrics Foundation (`MetricsService`)

`MetricsService` provides thread-safe in-memory counters tracking critical domain lifecycle events:

- `http_requests_total`: Total HTTP requests processed.
- `http_errors_total`: Total HTTP 4xx/5xx responses emitted.
- `recurring_transactions_automated_total`: Total automated recurring transaction executions completed.

Metrics are kept completely lightweight without external TS/Prometheus runtime dependencies.

---

## 7. Container Health Checks

`docker-compose.yml` configures automated container probing:
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health/ready || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 15s
```
