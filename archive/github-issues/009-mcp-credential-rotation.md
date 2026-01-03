# Automatic MCP Credential Rotation

**Priority:** Medium  
**Category:** Security - MCP Router  
**Labels:** `security`, `mcp`, `automation`

## Problem
Credentials stored indefinitely with no rotation. Security best practice requires periodic key rotation.

## Current State
- Manual credential updates only
- No rotation reminders
- No rotation enforcement
- No rotation audit trail

## Proposed Solution

### Database Schema
```sql
ALTER TABLE user_mcp_services
  ADD COLUMN last_rotated_at TIMESTAMPTZ,
  ADD COLUMN rotation_frequency_days INTEGER DEFAULT 90,
  ADD COLUMN auto_rotate BOOLEAN DEFAULT false,
  ADD COLUMN rotation_warning_sent BOOLEAN DEFAULT false;

CREATE TABLE credential_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES user_mcp_services(id),
  rotation_type VARCHAR(50) NOT NULL, -- 'manual', 'auto', 'forced'
  previous_key_hash VARCHAR(64), -- SHA256 of old key
  rotated_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Rotation Strategies

**1. Manual Rotation (Current)**
- User updates credentials via UI
- Old credentials immediately invalid

**2. Automatic Rotation (New)**
```typescript
async function autoRotateCredentials(serviceKey: string) {
  // Only for services that support programmatic rotation
  const supportedServices = ['stripe', 'github', 'aws'];
  
  if (!supportedServices.includes(serviceKey)) {
    // Notify user to manually rotate
    await sendRotationReminder(serviceKey);
    return;
  }
  
  // Call service API to generate new credentials
  const newCreds = await callServiceRotationAPI(serviceKey);
  
  // Update stored credentials
  await updateServiceCredentials(serviceKey, newCreds);
  
  // Log rotation
  await logRotation(serviceKey, 'auto');
}
```

**3. Grace Period Rotation**
- New credentials generated
- Old credentials valid for 24 hours
- Gradual migration to prevent downtime

### Features
1. **Rotation Reminders** - Email users 7 days before rotation needed
2. **Auto-Rotation** - For supported services, rotate automatically
3. **Rotation Dashboard** - See which credentials need rotation
4. **Rotation History** - Audit trail of all rotations
5. **Force Rotation** - Admin can force immediate rotation
6. **Rotation Policies**:
   - 30 days for high-security services (payment, financial)
   - 90 days for standard services
   - 180 days for low-risk services

### UI Components
- "Rotate Credentials" button in service config
- Rotation status indicator (green/yellow/red)
- Rotation history table
- Auto-rotation toggle
- Email notification preferences

### Background Jobs
```typescript
// Daily cron job
async function checkRotationNeeded() {
  const services = await db
    .select()
    .from('user_mcp_services')
    .where('last_rotated_at', '<', 
      new Date(Date.now() - rotation_frequency_days * 24 * 60 * 60 * 1000)
    );
  
  for (const service of services) {
    if (service.auto_rotate) {
      await autoRotateCredentials(service.service_key);
    } else {
      await sendRotationReminder(service.user_id, service.service_key);
    }
  }
}
```

### API Endpoints
```
POST /api/v1/mcp/services/:serviceKey/rotate
GET /api/v1/mcp/services/rotation-status
GET /api/v1/mcp/services/:serviceKey/rotation-history
POST /api/v1/mcp/services/:serviceKey/auto-rotate/enable
```

## Success Criteria
- [ ] Users receive rotation reminders
- [ ] Auto-rotation works for supported services
- [ ] Rotation history tracked
- [ ] Zero-downtime rotation for grace period mode
- [ ] Compliance audit requirements met

## Security Benefits
- Reduced credential theft impact
- Compliance with security policies
- Automatic security hygiene
- Audit trail for compliance

