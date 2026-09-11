# Rate Limiting & Abuse Protection Architecture

This document describes the rate limiting and abuse protection baseline implemented for the FinBuddy backend REST API.

---

## 1. Overview

The FinBuddy API enforces application-level rate limiting to protect endpoints against:
- Brute-force authentication attempts on credentials and refresh tokens
- Denial-of-Service (DoS) and request flooding
- Resource exhaustion on compute and database connections

Rate limiting is implemented natively using NestJS `@nestjs/throttler` (v6) integrated into the core HTTP request execution pipeline.

---

## 2. Architecture & Design

```
                     +---------------------------------------+
                     |            Client Request             |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         RequestIdMiddleware           |
                     |       (Attaches X-Request-Id)         |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |      RequestLoggingMiddleware         |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |           RateLimitGuard              |
                     |   (Checks IP & User Rate Buckets)     |
                     +---------------------------------------+
                       /                                   \
        [Under Limit] /                                     \ [Exceeds Limit]
                     v                                       v
         +-----------------------+              +--------------------------+
         | Controller / Handler  |              | ThrottlerException (429) |
         +-----------------------+              +--------------------------+
                                                             |
                                                             v
                                                +--------------------------+
                                                |   AllExceptionsFilter    |
                                                |  (Returns JSON 429 Body  |
                                                |   with X-Request-Id)     |
                                                +--------------------------+
```

### Keying Strategy & Proxy Security
1. **Unauthenticated Requests**: Keyed by client IP (`req.ip`, extracted safely from `X-Forwarded-For` when behind a reverse proxy or `socket.remoteAddress`).
2. **Authenticated Requests**: Keyed by combination of `userId` and client IP (`${userId}:${clientIp}`). This prevents a single compromised account or single IP from exhausting limits across other users while maintaining strict isolated tracking.
3. **No Sensitive Keying**: Requests are **never** keyed on raw JWT tokens, refresh tokens, passwords, or request payload bodies.

### Throttler Configurations
- **`default` Throttler**: Applied globally across all REST endpoints. Default limit: 100 requests per 60 seconds.
- **`auth` Throttler**: Tighter limits applied to sensitive authentication routes (`/auth/login`, `/auth/refresh`). Default limit: 10 requests per 60 seconds.

### Selective Exemptions
- **Health Probes**: `HealthController` endpoints (`/health/live` and `/health/ready`) are decorated with `@SkipThrottle({ default: true, auth: true })` to guarantee Docker container healthchecks and Kubernetes liveness probes are never blocked.
- **Background Scheduler**: Internal recurring transaction automation tasks run in-process via cron schedules and bypass HTTP rate limiting entirely.

---

## 3. Environment Configuration

Rate limits can be tuned per environment using standard environment variables:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `THROTTLE_TTL` | number | `60000` | Time-to-live window in milliseconds (default: 60s) |
| `THROTTLE_LIMIT` | number | `100` | Global default request limit per TTL window |
| `THROTTLE_AUTH_LIMIT` | number | `10` | Auth endpoint request limit per TTL window |

Variables are validated at application bootstrap in `src/config/env.validation.ts`.

---

## 4. HTTP 429 Response Format & Observability

When rate limits are exceeded, the API returns HTTP 429 (`Too Many Requests`).

### Error JSON Response
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "requestId": "c8f1e9b2-3d4a-4b1e-9f8a-5c2d1b0a9e8f"
}
```

### Response Headers
- `X-Request-Id`: Preserved request correlation ID.
- `Retry-After`: Standard throttling retry header indicating seconds until request budget resets.

### Logging & OpenAPI
- **Logging**: Thrown `ThrottlerException` HTTP 429 responses are automatically logged at `WARN` level by `RequestLoggingMiddleware`.
- **OpenAPI**: Swagger endpoints document status 429 under `@ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })`.

---

## 5. In-Memory Limitations & Production Scaling Path

- **Current Implementation**: Single-instance in-memory storage suitable for single-process Node.js services.
- **Future Multi-Instance Production Path**: To scale horizontally across multiple instances or Kubernetes pods, replace the default in-memory throttler storage with `@nestjs/throttler-storage-redis` connected to Redis.
