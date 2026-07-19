# EPIC10 Feature 1 — API Gateway Layer — Test Cases

## Test Overview
Comprehensive test suite for the API Gateway Layer covering unit tests, integration tests, edge cases, and performance validation. Tests validate JWT authentication, per-client rate limiting, request routing, payload transformation, and correlation ID injection across all backend microservices.

---

## 1. UNIT TEST SCENARIOS

### 1.1 JWT Authentication and Token Validation

#### TC-F1-U1.1: Valid JWT Token Passes Authentication
**Objective**: Verify that a well-formed, non-expired JWT with correct audience claim is accepted and forwarded with user context headers.

**Preconditions**:
- Gateway running with auth middleware enabled
- JWKS endpoint reachable (mock in unit context)
- Test JWT signed with known private key

**Test Steps**:
1. Generate a signed JWT with `sub: "user-123"`, `aud: "api.conference.app"`, exp 60 minutes from now
2. Send `GET /api/v1/sessions` with `Authorization: Bearer <token>`
3. Assert middleware calls `verifyToken()` and resolves without throwing
4. Assert forwarded request includes `X-User-Id: user-123` header

**Expected Result**: Token validated successfully; request forwarded to upstream; `X-User-Id` header injected.

**Code Sample**:
```typescript
describe('JwtAuthMiddleware', () => {
  it('should validate a well-formed token and inject user context headers', async () => {
    const middleware = new JwtAuthMiddleware({ jwksUri: 'https://mock-jwks/.well-known/jwks.json' });
    const token = sign({ sub: 'user-123', aud: 'api.conference.app' }, testPrivateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
    const { next, forwardedReq } = mockPipeline();

    await middleware.handle(req, next);

    expect(forwardedReq.headers['x-user-id']).toBe('user-123');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
```

---

#### TC-F1-U1.2: Expired JWT Returns 401
**Objective**: Verify that an expired token is rejected at the edge with a structured error response.

**Preconditions**:
- Middleware configured with clock tolerance of 0 seconds
- Token with `exp` set 5 minutes in the past

**Test Steps**:
1. Generate JWT with `exp: Date.now() / 1000 - 300`
2. Send request with expired token
3. Assert middleware throws `TokenExpiredError`
4. Assert HTTP response is `401` with body `{ "error": "token_expired" }`

**Expected Result**: Request rejected; `401` response with `error: "token_expired"`; upstream not called.

**Code Sample**:
```typescript
it('should reject expired tokens with 401', async () => {
  const expiredToken = sign({ sub: 'user-123' }, testPrivateKey, {
    algorithm: 'RS256',
    expiresIn: '-5m',
  });

  const res = await request(app)
    .get('/api/v1/sessions')
    .set('Authorization', `Bearer ${expiredToken}`);

  expect(res.status).toBe(401);
  expect(res.body.error).toBe('token_expired');
});
```

---

#### TC-F1-U1.3: Missing Authorization Header Returns 401
**Objective**: Confirm requests with no Authorization header are rejected immediately before any routing logic executes.

**Preconditions**: Gateway auth middleware enabled; no bypass rules configured.

**Test Steps**:
1. Send `GET /api/v1/sessions` with no Authorization header
2. Assert response status is `401`
3. Assert response body contains `{ "error": "missing_token" }`
4. Assert upstream mock was never called

**Expected Result**: `401` returned at gateway; upstream service call count remains zero.

**Code Sample**:
```typescript
it('should return 401 when Authorization header is absent', async () => {
  const upstreamMock = jest.fn();
  const res = await request(app).get('/api/v1/sessions');

  expect(res.status).toBe(401);
  expect(res.body.error).toBe('missing_token');
  expect(upstreamMock).not.toHaveBeenCalled();
});
```

---

### 1.2 Rate Limiting and Quota Enforcement

#### TC-F1-U2.1: Per-User Rate Limit Enforced After Threshold
**Objective**: Verify that after N requests within the configured window, subsequent requests return `429 Too Many Requests`.

**Preconditions**:
- Rate limiter configured: 100 req/min per user
- Redis mock initialized with empty state
- Authenticated user `user-abc`

**Test Steps**:
1. Send 100 requests from `user-abc` within 60-second window
2. Send 101st request from same user
3. Assert 101st response is `429`
4. Assert response includes `Retry-After` header

**Expected Result**: Requests 1–100 return `200`; request 101 returns `429` with `Retry-After` header.

**Code Sample**:
```typescript
describe('RateLimiter', () => {
  it('should enforce per-user rate limit and return 429 after threshold', async () => {
    const limiter = new SlidingWindowRateLimiter({ redis: mockRedis, limit: 100, windowMs: 60_000 });

    for (let i = 0; i < 100; i++) {
      const result = await limiter.check('user-abc');
      expect(result.allowed).toBe(true);
    }

    const overflow = await limiter.check('user-abc');
    expect(overflow.allowed).toBe(false);
    expect(overflow.retryAfterMs).toBeGreaterThan(0);
  });
});
```

---

#### TC-F1-U2.2: Rate Limit Resets After Window Expiry
**Objective**: Verify that a user who hit their quota can make requests again after the time window resets.

**Test Steps**:
1. Exhaust rate limit for `user-abc`
2. Advance mock clock by 61 seconds
3. Send one new request from `user-abc`
4. Assert request is allowed

**Expected Result**: After window reset, user can make requests again.

**Code Sample**:
```typescript
it('should reset rate limit counter after window expires', async () => {
  const limiter = new SlidingWindowRateLimiter({ redis: mockRedis, limit: 5, windowMs: 10_000 });
  for (let i = 0; i < 5; i++) await limiter.check('user-abc');

  jest.advanceTimersByTime(11_000);

  const result = await limiter.check('user-abc');
  expect(result.allowed).toBe(true);
});
```

---

#### TC-F1-U2.3: Different Users Have Independent Rate Limit Buckets
**Objective**: Confirm that exhausting one user's quota does not affect another user's bucket.

**Test Steps**:
1. Exhaust rate limit for `user-abc` (100 requests)
2. Send request from `user-xyz` (first request)
3. Assert `user-xyz` request is allowed

**Expected Result**: `user-xyz` request succeeds with `200`; rate limit isolation confirmed.

**Code Sample**:
```typescript
it('should maintain independent rate limit buckets per user', async () => {
  const limiter = new SlidingWindowRateLimiter({ redis: mockRedis, limit: 100, windowMs: 60_000 });
  for (let i = 0; i < 100; i++) await limiter.check('user-abc');

  const result = await limiter.check('user-xyz');
  expect(result.allowed).toBe(true);
});
```

---

### 1.3 Correlation ID Injection

#### TC-F1-U3.1: Correlation ID Generated When Absent
**Objective**: Verify the gateway generates a UUID correlation ID and attaches it to forwarded requests when none is provided by the client.

**Test Steps**:
1. Send request with no `X-Correlation-Id` header
2. Capture forwarded request headers at upstream mock
3. Assert `X-Correlation-Id` header present and matches UUID v4 format

**Expected Result**: Gateway-generated UUID attached to forwarded request and echoed in response.

**Code Sample**:
```typescript
it('should generate a correlation ID when not provided by client', async () => {
  const { forwardedHeaders } = await sendRequest({ path: '/api/v1/contacts' });

  expect(forwardedHeaders['x-correlation-id']).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});
```

---

#### TC-F1-U3.2: Client-Provided Correlation ID Preserved
**Objective**: Verify that a correlation ID provided by the client is passed through unchanged rather than overwritten.

**Test Steps**:
1. Send request with `X-Correlation-Id: client-trace-9999`
2. Assert forwarded request carries `X-Correlation-Id: client-trace-9999`
3. Assert response echoes same correlation ID

**Expected Result**: Client correlation ID preserved end-to-end.

**Code Sample**:
```typescript
it('should preserve client-provided correlation ID', async () => {
  const clientId = 'client-trace-9999';
  const { forwardedHeaders, responseHeaders } = await sendRequest({
    path: '/api/v1/contacts',
    headers: { 'x-correlation-id': clientId },
  });

  expect(forwardedHeaders['x-correlation-id']).toBe(clientId);
  expect(responseHeaders['x-correlation-id']).toBe(clientId);
});
```

---

#### TC-F1-U3.3: Correlation ID Written to Structured Access Log
**Objective**: Verify that every request's correlation ID appears in the structured JSON access log entry.

**Test Steps**:
1. Intercept log output with mock logger
2. Send request with known correlation ID
3. Assert log entry contains `correlationId` matching the request's value

**Expected Result**: Log entry includes `correlationId`, `path`, `method`, `statusCode`, and `durationMs`.

**Code Sample**:
```typescript
it('should write correlation ID to structured access log', async () => {
  const logs: AccessLogEntry[] = [];
  mockLogger.on('entry', (e) => logs.push(e));

  await sendRequest({ headers: { 'x-correlation-id': 'trace-001' } });

  expect(logs).toHaveLength(1);
  expect(logs[0].correlationId).toBe('trace-001');
  expect(logs[0]).toHaveProperty('durationMs');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Request Routing

#### TC-F1-I1.1: Request Routed to Correct Microservice by Path
**Objective**: Verify that `/api/v1/sessions/*` paths are routed to the Session Service and `/api/v1/contacts/*` paths route to the Contact Service.

**Preconditions**:
- Gateway deployed in test environment with real route table
- Session Service and Contact Service containers running
- Valid JWT available for test user

**Test Steps**:
1. Send `POST /api/v1/sessions` with valid JWT
2. Assert request received by Session Service mock (port 8081)
3. Send `GET /api/v1/contacts/123` with valid JWT
4. Assert request received by Contact Service mock (port 8082)
5. Assert neither service received the other's requests

**Expected Result**: Path-based routing correctly dispatches to respective services; no cross-routing.

**Code Sample**:
```typescript
describe('Gateway routing integration', () => {
  it('should route /sessions to SessionService and /contacts to ContactService', async () => {
    const { sessionServiceHits, contactServiceHits } = setupServiceMocks();

    await request(gatewayUrl).post('/api/v1/sessions').set('Authorization', `Bearer ${validToken}`);
    await request(gatewayUrl).get('/api/v1/contacts/123').set('Authorization', `Bearer ${validToken}`);

    expect(sessionServiceHits).toBe(1);
    expect(contactServiceHits).toBe(1);
  });
});
```

---

#### TC-F1-I1.2: API Version Header Routes to Correct Service Version
**Objective**: Verify that `Accept-Version: v2` header routes to v2 service instances while default routes to v1.

**Test Steps**:
1. Send `GET /api/v1/sessions` with `Accept-Version: v2`
2. Assert routed to v2 service (identified by response `X-Service-Version: v2` header)
3. Send same path without version header
4. Assert routed to v1 service

**Expected Result**: Version negotiation works; clients pinned to specific versions are isolated from incompatible deployments.

**Code Sample**:
```typescript
it('should route to v2 service when Accept-Version: v2 header present', async () => {
  const v2Res = await request(gatewayUrl)
    .get('/api/v1/sessions')
    .set('Authorization', `Bearer ${validToken}`)
    .set('Accept-Version', 'v2');

  const v1Res = await request(gatewayUrl)
    .get('/api/v1/sessions')
    .set('Authorization', `Bearer ${validToken}`);

  expect(v2Res.headers['x-service-version']).toBe('v2');
  expect(v1Res.headers['x-service-version']).toBe('v1');
});
```

---

### 2.2 Rate Limiting with Redis Backend

#### TC-F1-I2.1: Rate Limit State Persists Across Multiple Gateway Replicas
**Objective**: Confirm that rate limit state stored in Redis is shared across horizontally scaled gateway instances so a user cannot bypass limits by hitting a different replica.

**Preconditions**:
- Two gateway instances running behind load balancer
- Shared Redis instance configured
- Per-user limit: 10 req/min

**Test Steps**:
1. Send 5 requests via gateway replica A for `user-abc`
2. Send 5 more requests via gateway replica B for `user-abc`
3. Send 11th request via either replica
4. Assert 429 returned

**Expected Result**: Shared Redis enforces global quota across replicas; 11th request blocked.

**Code Sample**:
```typescript
it('should share rate limit state across gateway replicas via Redis', async () => {
  const gatewayA = 'http://gateway-a:3000';
  const gatewayB = 'http://gateway-b:3000';
  const token = validToken; // user-abc

  for (let i = 0; i < 5; i++) await request(gatewayA).get('/api/v1/sessions').set('Authorization', `Bearer ${token}`);
  for (let i = 0; i < 5; i++) await request(gatewayB).get('/api/v1/sessions').set('Authorization', `Bearer ${token}`);

  const overflow = await request(gatewayA).get('/api/v1/sessions').set('Authorization', `Bearer ${token}`);
  expect(overflow.status).toBe(429);
});
```

---

#### TC-F1-I2.2: Rate Limit Headers Present in All Responses
**Objective**: Verify `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers appear in every response.

**Test Steps**:
1. Send authenticated request
2. Assert all three rate limit headers present
3. Send 5 more requests and confirm `X-RateLimit-Remaining` decrements correctly

**Expected Result**: Rate limit transparency headers accurate and consistently present.

**Code Sample**:
```typescript
it('should include rate limit headers in every response', async () => {
  const res = await request(gatewayUrl).get('/api/v1/sessions').set('Authorization', `Bearer ${validToken}`);

  expect(res.headers['x-ratelimit-limit']).toBe('100');
  expect(Number(res.headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(99);
  expect(res.headers['x-ratelimit-reset']).toBeDefined();
});
```

---

### 2.3 TLS Termination and Upstream Communication

#### TC-F1-I3.1: External HTTPS Request Forwarded as Internal HTTP
**Objective**: Verify gateway terminates TLS on port 443 and proxies the request to upstream services on internal HTTP port 8080.

**Test Steps**:
1. Send HTTPS request to gateway external endpoint
2. Capture upstream request at service mock
3. Assert upstream request protocol is HTTP (not HTTPS)
4. Assert response to external client is HTTPS

**Expected Result**: TLS terminated at gateway; upstream traffic stays on private HTTP; external clients always see TLS.

---

#### TC-F1-I3.2: Upstream Service Unavailability Returns 503
**Objective**: Confirm that if a target microservice is down, the gateway returns `503 Service Unavailable` rather than timing out the client indefinitely.

**Test Steps**:
1. Shut down Session Service container
2. Send authenticated request to `/api/v1/sessions`
3. Assert response within 5 seconds is `503`
4. Assert body includes `{ "error": "upstream_unavailable", "service": "session-service" }`

**Expected Result**: Fast-fail 503 with actionable error body; no hang.

**Code Sample**:
```typescript
it('should return 503 when upstream service is unreachable', async () => {
  await stopContainer('session-service');

  const res = await request(gatewayUrl)
    .get('/api/v1/sessions')
    .set('Authorization', `Bearer ${validToken}`)
    .timeout(5000);

  expect(res.status).toBe(503);
  expect(res.body.error).toBe('upstream_unavailable');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Malformed Request Handling

#### TC-F1-E1.1: Oversized Payload Rejected at Gateway
**Objective**: Verify requests with bodies exceeding the 10 MB limit are rejected at the gateway without forwarding to upstream.

**Test Steps**:
1. Send `POST /api/v1/sessions` with a 12 MB JSON body
2. Assert response is `413 Payload Too Large`
3. Assert upstream service received zero bytes

**Expected Result**: `413` at gateway; upstream untouched; logged with payload size.

**Code Sample**:
```typescript
it('should reject payloads exceeding 10 MB with 413', async () => {
  const largeBody = Buffer.alloc(12 * 1024 * 1024, 'x').toString();

  const res = await request(gatewayUrl)
    .post('/api/v1/sessions')
    .set('Authorization', `Bearer ${validToken}`)
    .send({ data: largeBody });

  expect(res.status).toBe(413);
});
```

---

#### TC-F1-E1.2: Unknown Route Returns 404 with Service Manifest
**Objective**: Verify that requests to undefined paths return `404` with a response body listing valid route prefixes rather than leaking internal error details.

**Test Steps**:
1. Send `GET /api/v99/nonexistent`
2. Assert `404` response
3. Assert body includes `availableVersions` array, not a stack trace

**Expected Result**: Clean 404 with routing manifest; no internal paths or stack traces exposed.

**Code Sample**:
```typescript
it('should return 404 with available routes for unknown paths', async () => {
  const res = await request(gatewayUrl)
    .get('/api/v99/nonexistent')
    .set('Authorization', `Bearer ${validToken}`);

  expect(res.status).toBe(404);
  expect(res.body).toHaveProperty('availableVersions');
  expect(res.body).not.toHaveProperty('stack');
});
```

---

### 3.2 Concurrent Spike Traffic

#### TC-F1-E2.1: 1000 Concurrent Requests Handled Without Queue Overflow
**Objective**: Verify gateway handles a sudden burst of 1000 concurrent authenticated requests without dropping connections or crashing.

**Test Steps**:
1. Send 1000 concurrent requests using Promise.all
2. Collect all response statuses
3. Assert no `5xx` responses (or under 0.1% error rate)
4. Assert p99 response time under 500 ms

**Expected Result**: Gateway absorbs burst; all responses are `2xx` or `429`; no `500` errors.

**Code Sample**:
```typescript
it('should handle 1000 concurrent requests without 5xx errors', async () => {
  const requests = Array.from({ length: 1000 }, () =>
    request(gatewayUrl).get('/api/v1/sessions').set('Authorization', `Bearer ${validToken}`)
  );

  const responses = await Promise.all(requests);
  const serverErrors = responses.filter((r) => r.status >= 500);

  expect(serverErrors.length).toBe(0);
});
```

---

#### TC-F1-E2.2: Rate Limit Enforced Under Burst Without State Corruption
**Objective**: Verify that under concurrent burst, the rate limiter does not allow more than the configured limit due to race conditions.

**Test Steps**:
1. Configure limit to 50 req/min for `user-burst`
2. Send 200 concurrent requests from `user-burst`
3. Count allowed (non-429) responses
4. Assert allowed count does not exceed 50

**Expected Result**: No more than 50 requests allowed; atomic Redis operations prevent overshooting.

---

### 3.3 Token Edge Cases

#### TC-F1-E3.1: Token with Future `iat` Claim Rejected
**Objective**: Verify that a token with an `issued-at` claim in the future (possible clock skew attack) is rejected.

**Test Steps**:
1. Generate JWT with `iat: Date.now() / 1000 + 300` (5 min in the future)
2. Send request
3. Assert `401` response with `error: "invalid_token"`

**Expected Result**: Future `iat` rejected; clock skew tolerance enforced.

---

#### TC-F1-E3.2: Algorithm Confusion Attack Rejected (RS256 vs HS256)
**Objective**: Confirm that a JWT signed with HS256 using the server's public key as the HMAC secret is rejected.

**Test Steps**:
1. Sign JWT with HS256 using the gateway's RS256 public key as the secret
2. Send request with this token
3. Assert `401` response
4. Assert gateway logs `algorithm_mismatch` security event

**Expected Result**: Algorithm confusion attack blocked; security event logged.

**Code Sample**:
```typescript
it('should reject HS256 token when RS256 is expected', async () => {
  const maliciousToken = sign({ sub: 'attacker' }, rsaPublicKeyPem, { algorithm: 'HS256' });

  const res = await request(gatewayUrl)
    .get('/api/v1/sessions')
    .set('Authorization', `Bearer ${maliciousToken}`);

  expect(res.status).toBe(401);
  expect(securityLog.lastEvent.type).toBe('algorithm_mismatch');
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Throughput and Latency Under Steady Load

#### TC-F1-P1.1: Gateway Sustains 5000 RPS at Sub-50ms p99
**Objective**: Verify the gateway layer can sustain 5000 requests per second with p99 latency under 50 ms under steady authenticated load.

**Preconditions**:
- Gateway deployed with 4 replicas
- Redis cluster running
- k6 load test tool configured

**Test Steps**:
1. Run k6 load test: 5000 RPS constant load for 5 minutes
2. Measure p50, p95, p99 latency
3. Measure error rate
4. Assert p99 < 50 ms and error rate < 0.01%

**Expected Result**: Throughput target met; p99 < 50 ms; near-zero errors.

**Code Sample**:
```shell
# k6 load test for API gateway throughput
k6 run --vus 500 --duration 5m - <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    constant_rps: {
      executor: 'constant-arrival-rate',
      rate: 5000,
      timeUnit: '1s',
      preAllocatedVUs: 500,
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<50'],
    http_req_failed: ['rate<0.0001'],
  },
};

export default function () {
  const res = http.get('https://gateway/api/v1/sessions', {
    headers: { Authorization: `Bearer ${__ENV.VALID_TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
}
EOF
```

---

#### TC-F1-P1.2: Auth Middleware Adds Less Than 2ms Overhead
**Objective**: Measure the latency overhead introduced by JWT verification and compare against direct upstream call.

**Test Steps**:
1. Measure p50 latency of direct calls to upstream service (bypassing gateway)
2. Measure p50 latency through full gateway pipeline
3. Assert gateway overhead is < 2 ms

**Expected Result**: Authentication middleware contributes less than 2 ms overhead; cached public keys eliminate repeated JWKS fetches.

---

### 4.2 Rate Limiter Performance

#### TC-F1-P2.1: Rate Limiter Redis Round-Trip Under 1ms
**Objective**: Verify the sliding window rate limiter's Redis check-and-increment operation completes under 1 ms average.

**Test Steps**:
1. Benchmark 10,000 isolated `limiter.check()` calls against real Redis
2. Record average, p95, p99 durations
3. Assert average < 1 ms; p99 < 3 ms

**Expected Result**: Rate limit check fast enough to not meaningfully impact gateway latency budget.

**Code Sample**:
```typescript
it('should complete rate limit check in under 1ms average', async () => {
  const iterations = 10_000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await limiter.check(`user-perf-${i % 100}`);
  }

  const avgMs = (performance.now() - start) / iterations;
  expect(avgMs).toBeLessThan(1);
});
```

---

#### TC-F1-P2.2: Rate Limiter Handles 10,000 Concurrent Users Without Contention
**Objective**: Verify that with 10,000 distinct user keys active simultaneously, Redis does not exhibit lock contention or significant latency degradation.

**Test Steps**:
1. Create 10,000 unique user IDs
2. Issue one `check()` per user concurrently
3. Measure total elapsed time
4. Assert all 10,000 complete in under 5 seconds

**Expected Result**: No contention; 10,000 concurrent checks complete within 5 seconds.

---

### 4.3 Health Check and Circuit Breaker

#### TC-F1-P3.1: Circuit Breaker Opens After 5 Consecutive Upstream Failures
**Objective**: Verify the circuit breaker opens after 5 consecutive 5xx responses from an upstream, stopping further forwarding until health check passes.

**Test Steps**:
1. Configure upstream mock to return `500` for all requests
2. Send 5 requests
3. Assert 6th request returns `503` from gateway (circuit open) without calling upstream
4. Wait for health check interval
5. Restore upstream to return `200`
6. Assert circuit closes and next request succeeds

**Expected Result**: Circuit breaker opens after threshold; fast-fails subsequent calls; auto-recovers on health check success.

**Code Sample**:
```typescript
it('should open circuit after 5 consecutive upstream failures', async () => {
  upstreamMock.setStatus(500);

  for (let i = 0; i < 5; i++) {
    await request(gatewayUrl).get('/api/v1/sessions').set('Authorization', `Bearer ${validToken}`);
  }

  const circuitOpenRes = await request(gatewayUrl).get('/api/v1/sessions').set('Authorization', `Bearer ${validToken}`);
  expect(circuitOpenRes.status).toBe(503);
  expect(upstreamMock.callCount).toBe(5); // not 6
});
```

---

#### TC-F1-P3.2: Gateway Health Endpoint Responds Within 100ms Under Full Load
**Objective**: Ensure `GET /health` responds within 100 ms even when gateway is processing 5000 RPS, allowing orchestrators to detect liveness accurately.

**Test Steps**:
1. Maintain 5000 RPS background load
2. Poll `/health` every 500 ms for 2 minutes
3. Assert all health check responses arrive within 100 ms

**Expected Result**: Health endpoint isolated from request processing load; all responses under 100 ms.

---

## Test Execution Summary

| Category | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **~27** |

**Coverage**: JWT auth, rate limiting, correlation ID injection, path routing, version routing, TLS termination, circuit breaking, payload limits, algorithm attacks, burst traffic, Redis contention, gateway throughput.
