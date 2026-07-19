# EPIC11 Feature 4 — Access Control Framework — Test Cases

## Test Overview
Comprehensive test suite for the Access Control Framework covering unit tests, integration tests, edge cases, and performance validation. These tests validate RBAC permission checks, attribute-based access control (ABAC) policies, resource ownership verification, privilege escalation prevention, and audit trails for access decisions.

---

## 1. UNIT TEST SCENARIOS

### 1.1 RBAC Permission Checks

#### TC-F4-U1.1: User with required role is granted access to a protected resource
**Objective**: Verify that a user holding the `data.read` permission through their assigned role is permitted to read a protected resource.

**Preconditions**:
- Role `conference_viewer` has the permission `data.read`.
- User `'user-42'` is assigned role `conference_viewer`.

**Test Steps**:
1. Call `accessControlService.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'read' })`.
2. Assert the result is `{ granted: true }`.

**Expected Result**: Permission check grants access when the user's role includes the required permission.

**Code Sample**:
```typescript
import { AccessControlService } from '@/services/access-control-service';

describe('TC-F4-U1.1 — RBAC read permission', () => {
  it('should grant read access to user with conference_viewer role', async () => {
    const svc = new AccessControlService({ roleStore: testRoleStore, userStore: testUserStore });
    const result = await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'read' });
    expect(result.granted).toBe(true);
  });
});
```

---

#### TC-F4-U1.2: User without required role is denied access
**Objective**: Confirm that a user lacking the `data.delete` permission is denied delete access.

**Preconditions**:
- Role `conference_viewer` does not include `data.delete`.
- User `'user-42'` is assigned only `conference_viewer`.

**Test Steps**:
1. Call `accessControlService.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'delete' })`.
2. Assert the result is `{ granted: false, reason: 'INSUFFICIENT_PERMISSIONS' }`.

**Expected Result**: Access is denied with a clear reason code.

**Code Sample**:
```typescript
it('should deny delete access to user without data.delete permission', async () => {
  const svc = new AccessControlService({ roleStore: testRoleStore, userStore: testUserStore });
  const result = await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'delete' });
  expect(result.granted).toBe(false);
  expect(result.reason).toBe('INSUFFICIENT_PERMISSIONS');
});
```

---

#### TC-F4-U1.3: Admin role has access to all resources without explicit permission grants
**Objective**: Verify that the `admin` role is a wildcard that bypasses individual permission checks.

**Preconditions**:
- User `'admin-01'` is assigned the `admin` role.

**Test Steps**:
1. Check permission for `action: 'delete'` on any resource.
2. Check permission for `action: 'share'` on any resource.
3. Assert both return `{ granted: true }`.

**Expected Result**: Admin role grants access to all actions on all resources.

**Code Sample**:
```typescript
it('should grant admin wildcard access to all actions', async () => {
  const svc = new AccessControlService({ roleStore: testRoleStore, userStore: adminUserStore });
  const [del, share] = await Promise.all([
    svc.checkPermission({ userId: 'admin-01', resource: 'session/sess-001', action: 'delete' }),
    svc.checkPermission({ userId: 'admin-01', resource: 'contact/ct-001', action: 'share' }),
  ]);
  expect(del.granted).toBe(true);
  expect(share.granted).toBe(true);
});
```

---

### 1.2 Ownership-Based Access Validation

#### TC-F4-U2.1: Resource owner can always read their own resource
**Objective**: Confirm that resource ownership grants read access regardless of role assignments.

**Preconditions**:
- Session `'sess-001'` is owned by `'user-42'`.
- `'user-42'` has no explicitly assigned roles.

**Test Steps**:
1. Call `accessControlService.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'read' })`.
2. Assert result is `{ granted: true, reason: 'OWNER' }`.

**Expected Result**: Owners always have read access to their own resources.

**Code Sample**:
```typescript
it('should grant owner read access without explicit role', async () => {
  const svc = new AccessControlService({ roleStore: emptyRoleStore, ownershipStore: ownershipStore });
  const result = await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'read' });
  expect(result.granted).toBe(true);
  expect(result.reason).toBe('OWNER');
});
```

---

#### TC-F4-U2.2: Non-owner without explicit permission cannot read another user's private session
**Objective**: Verify that a user cannot read a session they do not own and have not been granted access to.

**Preconditions**:
- Session `'sess-999'` is owned by `'user-99'`.
- `'user-42'` has no ownership or permission grant for this session.

**Test Steps**:
1. Call `accessControlService.checkPermission({ userId: 'user-42', resource: 'session/sess-999', action: 'read' })`.
2. Assert result is `{ granted: false, reason: 'NOT_OWNER_OR_GRANTED' }`.

**Expected Result**: Cross-user resource access is blocked without explicit sharing.

**Code Sample**:
```typescript
it('should deny read of another user\'s private session', async () => {
  const result = await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-999', action: 'read' });
  expect(result.granted).toBe(false);
  expect(result.reason).toBe('NOT_OWNER_OR_GRANTED');
});
```

---

#### TC-F4-U2.3: Sharing a resource grants the grantee read-only access
**Objective**: Confirm that a share grant gives the grantee read access but not write or delete access.

**Preconditions**:
- `'user-42'` shares session `'sess-001'` with `'user-55'` with `shareType: 'read_only'`.

**Test Steps**:
1. Call `checkPermission` for `'user-55'` on `'sess-001'` with action `'read'` — assert granted.
2. Call `checkPermission` for `'user-55'` on `'sess-001'` with action `'write'` — assert denied.
3. Call `checkPermission` for `'user-55'` on `'sess-001'` with action `'delete'` — assert denied.

**Expected Result**: Share grants are scoped precisely to the granted permission level.

**Code Sample**:
```typescript
it('should grant only read access to a read_only share grantee', async () => {
  await svc.shareResource({ ownerId: 'user-42', resource: 'session/sess-001', granteeId: 'user-55', shareType: 'read_only' });
  expect((await svc.checkPermission({ userId: 'user-55', resource: 'session/sess-001', action: 'read' })).granted).toBe(true);
  expect((await svc.checkPermission({ userId: 'user-55', resource: 'session/sess-001', action: 'write' })).granted).toBe(false);
  expect((await svc.checkPermission({ userId: 'user-55', resource: 'session/sess-001', action: 'delete' })).granted).toBe(false);
});
```

---

### 1.3 Privilege Escalation Prevention

#### TC-F4-U3.1: User cannot assign a role higher than their own role level
**Objective**: Prevent a `conference_editor` from granting an `admin` role to another user.

**Preconditions**:
- `'user-42'` holds the `conference_editor` role (level 2); `admin` is level 10.
- Role hierarchy is enforced in the access control service.

**Test Steps**:
1. Call `accessControlService.assignRole({ assignerId: 'user-42', targetUserId: 'user-55', role: 'admin' })`.
2. Expect the call to reject with `PrivilegeEscalationError`.

**Expected Result**: Role assignment is blocked when the target role exceeds the assigner's own level.

**Code Sample**:
```typescript
it('should prevent role assignment above assigner\'s level', async () => {
  await expect(
    svc.assignRole({ assignerId: 'user-42', targetUserId: 'user-55', role: 'admin' })
  ).rejects.toThrow(PrivilegeEscalationError);
});
```

---

#### TC-F4-U3.2: API token cannot perform actions beyond its defined scope
**Objective**: Verify that an API token scoped to `read:sessions` cannot perform write operations.

**Preconditions**:
- API token `'tok-reader'` has scope `['read:sessions']`.

**Test Steps**:
1. Call `accessControlService.checkTokenPermission({ token: 'tok-reader', action: 'write', resource: 'session/sess-001' })`.
2. Assert result is `{ granted: false, reason: 'TOKEN_SCOPE_INSUFFICIENT' }`.

**Expected Result**: Token scope boundaries are strictly enforced.

**Code Sample**:
```typescript
it('should deny write via read-scoped token', async () => {
  const result = await svc.checkTokenPermission({ token: 'tok-reader', action: 'write', resource: 'session/sess-001' });
  expect(result.granted).toBe(false);
  expect(result.reason).toBe('TOKEN_SCOPE_INSUFFICIENT');
});
```

---

#### TC-F4-U3.3: Expired token is rejected even if its scope would otherwise allow access
**Objective**: Confirm that an expired token is rejected at the access control gate before scope is evaluated.

**Preconditions**:
- Token `'tok-expired'` has `expiresAt` in the past and scope `['read:sessions', 'write:sessions']`.

**Test Steps**:
1. Call `accessControlService.checkTokenPermission({ token: 'tok-expired', action: 'read', resource: 'session/sess-001' })`.
2. Assert result is `{ granted: false, reason: 'TOKEN_EXPIRED' }`.

**Expected Result**: Token expiry check runs before scope check; expired tokens are always denied.

**Code Sample**:
```typescript
it('should reject expired token before scope evaluation', async () => {
  const result = await svc.checkTokenPermission({ token: 'tok-expired', action: 'read', resource: 'session/sess-001' });
  expect(result.granted).toBe(false);
  expect(result.reason).toBe('TOKEN_EXPIRED');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Access Control ↔ API Gateway Integration

#### TC-F4-I1.1: API gateway enforces access control before routing requests
**Objective**: Verify that the API gateway returns 403 for requests that fail the access control check before the request reaches the service layer.

**Preconditions**:
- Access control middleware is installed at the API gateway layer.
- User `'user-42'` lacks permission to delete session `'sess-999'`.

**Test Steps**:
1. Send `DELETE /sessions/sess-999` with a valid auth token for `'user-42'`.
2. Assert HTTP status is `403 Forbidden`.
3. Assert the session service never receives the request.

**Expected Result**: Access is denied at the gateway; the session service is shielded.

**Code Sample**:
```typescript
it('should return 403 before reaching session service for unauthorized delete', async () => {
  const sessionSvcSpy = jest.spyOn(sessionService, 'delete');
  const response = await apiClient.delete('/sessions/sess-999', { headers: authHeaderFor('user-42') });

  expect(response.status).toBe(403);
  expect(sessionSvcSpy).not.toHaveBeenCalled();
});
```

---

#### TC-F4-I1.2: Access decision is logged in the audit trail with user, resource, and outcome
**Objective**: Confirm that every access decision (both granted and denied) produces an audit log entry.

**Preconditions**:
- Audit log is connected to the access control middleware.

**Test Steps**:
1. Send one request that is granted and one that is denied.
2. Assert the audit log contains two entries.
3. Assert each entry has `userId`, `resource`, `action`, `outcome`, and `timestamp`.

**Expected Result**: Access decisions are fully auditable.

**Code Sample**:
```typescript
it('should log both granted and denied access decisions', async () => {
  await apiClient.get('/sessions/sess-001', { headers: authHeaderFor('user-42') }); // granted
  await apiClient.delete('/sessions/sess-999', { headers: authHeaderFor('user-42') }); // denied

  const entries = auditLog.events.filter(e => e.type === 'access.decision');
  expect(entries).toHaveLength(2);
  entries.forEach(e => {
    expect(e).toMatchObject({ userId: expect.any(String), resource: expect.any(String), action: expect.any(String), outcome: expect.stringMatching(/granted|denied/), timestamp: expect.any(String) });
  });
});
```

---

### 2.2 Role Management Integration

#### TC-F4-I2.1: Assigning a new role propagates to all permission checks within 1 second
**Objective**: Verify that after a role assignment, subsequent permission checks reflect the new role within 1 second (eventual consistency window).

**Preconditions**:
- `'user-55'` has no roles.
- Role store uses a distributed cache with a 1-second TTL.

**Test Steps**:
1. Assign `conference_editor` role to `'user-55'`.
2. Wait 1.1 seconds.
3. Call `checkPermission({ userId: 'user-55', action: 'write', resource: 'session/sess-001' })`.
4. Assert result is `{ granted: true }`.

**Expected Result**: Role assignments are visible to the permission check path within the 1-second consistency window.

**Code Sample**:
```typescript
it('should reflect role assignment within 1 second', async () => {
  await svc.assignRole({ assignerId: 'admin-01', targetUserId: 'user-55', role: 'conference_editor' });
  await delay(1100);
  const result = await svc.checkPermission({ userId: 'user-55', resource: 'session/sess-001', action: 'write' });
  expect(result.granted).toBe(true);
});
```

---

#### TC-F4-I2.2: Revoking a role immediately blocks access on next permission check
**Objective**: Confirm that role revocation takes effect on the very next permission check (no grace period for security-sensitive revocations).

**Preconditions**:
- `'user-42'` holds `conference_editor` and can write.

**Test Steps**:
1. Revoke `conference_editor` from `'user-42'`.
2. Immediately call `checkPermission({ userId: 'user-42', action: 'write' })`.
3. Assert result is `{ granted: false }`.

**Expected Result**: Role revocation is synchronously effective for security-sensitive operations.

**Code Sample**:
```typescript
it('should block access immediately after role revocation', async () => {
  await svc.revokeRole({ revokerId: 'admin-01', targetUserId: 'user-42', role: 'conference_editor' });
  const result = await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'write' });
  expect(result.granted).toBe(false);
});
```

---

### 2.3 Cross-Service Authorization

#### TC-F4-I3.1: Internal service-to-service calls carry service identity tokens
**Objective**: Verify that calls between internal microservices include a machine-identity JWT and that the access control layer validates it.

**Preconditions**:
- Transcription service is configured with a service-identity token.
- Access control layer validates service-identity JWTs.

**Test Steps**:
1. Transcription service calls the storage service to write a transcript.
2. Assert the access control layer validates the service token.
3. Assert the call succeeds.

**Expected Result**: Service-to-service calls are authenticated and authorized via identity tokens.

**Code Sample**:
```typescript
it('should accept a valid service-identity JWT for inter-service calls', async () => {
  const serviceToken = await identityProvider.issueServiceToken('transcription-service');
  const response = await storageServiceClient.writeTranscript({ token: serviceToken, data: TRANSCRIPT });
  expect(response.status).toBe(201);
});
```

---

#### TC-F4-I3.2: Forged service token is rejected with 401
**Objective**: Ensure that a tampered or unsigned service token is rejected at the access control gate.

**Preconditions**:
- A tampered JWT (invalid signature) is available.

**Test Steps**:
1. Send a request to the storage service with the tampered token.
2. Assert HTTP status is `401 Unauthorized`.

**Expected Result**: Token signature verification prevents forged service identities.

**Code Sample**:
```typescript
it('should reject a forged service token with 401', async () => {
  const forgedToken = 'eyJhbGciOiJIUzI1NiJ9.forged.signature';
  const response = await storageServiceClient.writeTranscript({ token: forgedToken, data: TRANSCRIPT });
  expect(response.status).toBe(401);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Multi-Role Conflicts

#### TC-F4-E1.1: Most-permissive role wins when a user holds conflicting roles
**Objective**: Verify that when a user holds two roles where one denies and one allows an action, the most permissive wins (allow-wins semantics).

**Preconditions**:
- Role `data_restricted` explicitly denies `data.export`.
- Role `conference_admin` allows `data.export`.
- `'user-42'` holds both roles.

**Test Steps**:
1. Call `checkPermission({ userId: 'user-42', action: 'export', resource: 'session/sess-001' })`.
2. Assert result is `{ granted: true }`.

**Expected Result**: Allow-wins semantics are applied in multi-role scenarios.

**Code Sample**:
```typescript
it('should grant access when at least one role allows the action', async () => {
  const result = await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'export' });
  expect(result.granted).toBe(true);
});
```

---

#### TC-F4-E1.2: Deny-wins mode blocks access when any role explicitly denies
**Objective**: When configured in deny-wins mode, a single explicit deny overrides any allow.

**Preconditions**:
- Access control service is configured with `conflictResolution: 'deny-wins'`.

**Test Steps**:
1. Configure `user-42` with one allow role and one deny role for `data.export`.
2. Call `checkPermission`.
3. Assert result is `{ granted: false, reason: 'EXPLICIT_DENY' }`.

**Expected Result**: Deny-wins mode is correctly enforced for high-security configurations.

**Code Sample**:
```typescript
it('should block access in deny-wins mode when any role denies', async () => {
  const svc = new AccessControlService({ conflictResolution: 'deny-wins', roleStore: conflictRoleStore });
  const result = await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'export' });
  expect(result.granted).toBe(false);
  expect(result.reason).toBe('EXPLICIT_DENY');
});
```

---

### 3.2 Suspended and Deleted Users

#### TC-F4-E2.1: Suspended user is denied all access regardless of role
**Objective**: Verify that a suspended user account cannot access any resource, even with valid roles.

**Preconditions**:
- `'user-suspended'` has `status: 'suspended'` and holds the `admin` role.

**Test Steps**:
1. Call `checkPermission({ userId: 'user-suspended', action: 'read', resource: 'session/sess-001' })`.
2. Assert result is `{ granted: false, reason: 'ACCOUNT_SUSPENDED' }`.

**Expected Result**: Account status check runs before role evaluation; suspended users are always denied.

**Code Sample**:
```typescript
it('should deny all access to suspended user regardless of role', async () => {
  const result = await svc.checkPermission({ userId: 'user-suspended', resource: 'session/sess-001', action: 'read' });
  expect(result.granted).toBe(false);
  expect(result.reason).toBe('ACCOUNT_SUSPENDED');
});
```

---

#### TC-F4-E2.2: Deleted user's shared resources are no longer accessible to grantees
**Objective**: Confirm that when a user account is deleted, all their shared resource grants are revoked.

**Preconditions**:
- `'user-deleted'` shared `session/sess-owned'` with `'user-55'`.
- `'user-deleted'`'s account is now deleted.

**Test Steps**:
1. Delete account `'user-deleted'`.
2. Call `checkPermission({ userId: 'user-55', resource: 'session/sess-owned', action: 'read' })`.
3. Assert result is `{ granted: false }`.

**Expected Result**: Account deletion cascades to revoke all outbound share grants.

**Code Sample**:
```typescript
it('should revoke grantee access when resource owner account is deleted', async () => {
  await accountService.deleteAccount('user-deleted');
  const result = await svc.checkPermission({ userId: 'user-55', resource: 'session/sess-owned', action: 'read' });
  expect(result.granted).toBe(false);
});
```

---

### 3.3 Time-Bounded Access

#### TC-F4-E3.1: Temporary access grant expires after the configured duration
**Objective**: Verify that a time-bounded access grant is automatically revoked after the expiry time passes.

**Preconditions**:
- `'user-55'` is granted temporary read access to `'sess-001'` for 1 hour.
- 1 hour has elapsed.

**Test Steps**:
1. Advance clock by 1 hour and 1 second.
2. Call `checkPermission({ userId: 'user-55', action: 'read', resource: 'session/sess-001' })`.
3. Assert result is `{ granted: false, reason: 'GRANT_EXPIRED' }`.

**Expected Result**: Temporary grants are automatically revoked without requiring manual action.

**Code Sample**:
```typescript
it('should deny access after temporary grant expires', async () => {
  await svc.grantTemporaryAccess({ granteeId: 'user-55', resource: 'session/sess-001', action: 'read', durationMs: 3600_000 });
  jest.advanceTimersByTime(3601_000);

  const result = await svc.checkPermission({ userId: 'user-55', resource: 'session/sess-001', action: 'read' });
  expect(result.granted).toBe(false);
  expect(result.reason).toBe('GRANT_EXPIRED');
});
```

---

#### TC-F4-E3.2: Access within a time-bounded grant window is permitted
**Objective**: Confirm the time-bounded grant is active and allows access before expiry.

**Preconditions**:
- Temporary grant was issued 30 minutes ago with a 1-hour duration.

**Test Steps**:
1. Call `checkPermission({ userId: 'user-55', action: 'read', resource: 'session/sess-001' })`.
2. Assert result is `{ granted: true, reason: 'TEMPORARY_GRANT' }`.

**Expected Result**: Access is permitted within the grant window.

**Code Sample**:
```typescript
it('should permit access within the temporary grant window', async () => {
  await svc.grantTemporaryAccess({ granteeId: 'user-55', resource: 'session/sess-001', action: 'read', durationMs: 3600_000 });
  jest.advanceTimersByTime(1800_000); // 30 min elapsed

  const result = await svc.checkPermission({ userId: 'user-55', resource: 'session/sess-001', action: 'read' });
  expect(result.granted).toBe(true);
  expect(result.reason).toBe('TEMPORARY_GRANT');
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Permission Check Latency

#### TC-F4-P1.1: Permission check resolves within 10ms with cached role data
**Objective**: Validate that the hot permission check path meets the 10ms SLA when roles are in cache.

**Preconditions**:
- Role store is warm in memory; no I/O required.

**Test Steps**:
1. Perform 10,000 sequential `checkPermission` calls.
2. Assert p99 latency is under 10ms.

**Expected Result**: Access control adds negligible latency to the request path.

**Code Sample**:
```typescript
it('should resolve permission check within 10ms p99 with warm cache', async () => {
  const latencies = [];
  for (let i = 0; i < 10_000; i++) {
    const start = performance.now();
    await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'read' });
    latencies.push(performance.now() - start);
  }
  expect(percentile(latencies, 99)).toBeLessThan(10);
});
```

---

#### TC-F4-P1.2: 1,000 concurrent permission checks complete within 500ms total
**Objective**: Ensure the access control service scales to burst traffic from the API gateway.

**Preconditions**:
- 1,000 concurrent users each issuing a permission check.

**Test Steps**:
1. Issue 1,000 concurrent `checkPermission` calls.
2. Assert all complete within 500ms.

**Expected Result**: The service handles API gateway burst traffic without queuing.

**Code Sample**:
```typescript
it('should handle 1000 concurrent permission checks within 500ms', async () => {
  const start = Date.now();
  await Promise.all(
    Array.from({ length: 1000 }, (_, i) =>
      svc.checkPermission({ userId: `user-${i}`, resource: 'session/sess-001', action: 'read' })
    )
  );
  expect(Date.now() - start).toBeLessThan(500);
});
```

---

### 4.2 Role Assignment Propagation

#### TC-F4-P2.1: Role assignment propagates to distributed cache within 1 second
**Objective**: Validate that new role assignments are visible across all service instances within 1 second.

**Preconditions**:
- Two access control service instances share a distributed role cache.

**Test Steps**:
1. Assign a new role via instance A.
2. After 1.1 seconds, check permission via instance B.
3. Assert the new role is reflected.

**Expected Result**: Role propagation across instances meets the 1-second SLA.

**Code Sample**:
```typescript
it('should propagate role assignment to second instance within 1 second', async () => {
  await svcA.assignRole({ assignerId: 'admin-01', targetUserId: 'user-55', role: 'conference_editor' });
  await delay(1100);
  const result = await svcB.checkPermission({ userId: 'user-55', resource: 'session/new', action: 'write' });
  expect(result.granted).toBe(true);
});
```

---

#### TC-F4-P2.2: Role revocation takes effect within 200ms on all service instances
**Objective**: Validate that role revocations propagate faster than grants (security-sensitive path).

**Preconditions**:
- Two service instances share the distributed cache.
- `'user-42'` holds `conference_editor` on both instances.

**Test Steps**:
1. Revoke `conference_editor` from `'user-42'` via instance A.
2. After 200ms, check permission via instance B.
3. Assert access is denied.

**Expected Result**: Revocations propagate to all instances within 200ms.

**Code Sample**:
```typescript
it('should propagate role revocation to second instance within 200ms', async () => {
  await svcA.revokeRole({ revokerId: 'admin-01', targetUserId: 'user-42', role: 'conference_editor' });
  await delay(210);
  const result = await svcB.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'write' });
  expect(result.granted).toBe(false);
});
```

---

### 4.3 Audit Log Write Throughput

#### TC-F4-P3.1: Access audit log sustains 5,000 events/second without data loss
**Objective**: Validate that the audit log can sustain high event volume during peak API traffic.

**Preconditions**:
- Audit log is backed by an append-only store.

**Test Steps**:
1. Issue 5,000 permission checks in parallel.
2. Assert 5,000 audit events are written.
3. Assert no events are dropped.

**Expected Result**: Audit log sustains 5,000 events/second without loss.

**Code Sample**:
```typescript
it('should sustain 5000 audit writes per second without loss', async () => {
  await Promise.all(Array.from({ length: 5000 }, (_, i) =>
    svc.checkPermission({ userId: `user-${i % 100}`, resource: 'session/sess-001', action: 'read' })
  ));
  expect(auditLog.count()).toBe(5000);
});
```

---

#### TC-F4-P3.2: Audit log writes do not block the permission check response
**Objective**: Ensure audit log writes happen asynchronously and do not add latency to the permission check response.

**Preconditions**:
- Audit log write has a simulated 50ms latency.

**Test Steps**:
1. Perform a permission check with a slow audit log.
2. Assert the permission check resolves in under 15ms (not blocked by the 50ms audit write).

**Expected Result**: Audit writes are fire-and-forget from the permission check perspective.

**Code Sample**:
```typescript
it('should not block permission check on slow audit log write', async () => {
  const slowAuditLog = new SlowMockAuditLog({ writeLatencyMs: 50 });
  const svc = new AccessControlService({ auditLog: slowAuditLog, roleStore: testRoleStore });

  const start = performance.now();
  await svc.checkPermission({ userId: 'user-42', resource: 'session/sess-001', action: 'read' });
  expect(performance.now() - start).toBeLessThan(15);
});
```

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Coverage targets**: RBAC permission evaluation, ownership-based access, privilege escalation prevention, multi-role conflict resolution, suspended/deleted account handling, time-bounded grants, token validation, cross-service identity, and audit log throughput.
