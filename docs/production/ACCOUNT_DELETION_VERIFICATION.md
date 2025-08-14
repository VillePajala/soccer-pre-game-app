# Account Deletion Implementation - Testing & Verification Guide

**Created**: 2025-08-11  
**Status**: Ready for Testing  
**Priority**: CRITICAL - Required for Google Play Store compliance

## Overview

This document provides a complete testing and verification guide for the account deletion functionality. All components have been implemented and are ready for testing.

## 🗂️ Implementation Summary

### Files Created/Modified:

1. **SQL Functions** (`docs/production/SQL/account_deletion.sql`)
   - Complete data deletion function covering all 14 tables
   - Scheduled deletion processor for automated cleanup
   - Verification function to confirm complete deletion
   - RLS policies and security constraints

2. **Edge Functions**:
   - `supabase/functions/process-account-deletion/index.ts` - Secure deletion processing
   - `supabase/functions/scheduled-account-cleanup/index.ts` - Automated cleanup

3. **TypeScript Client** (`src/lib/supabase/accountDeletion.ts`)
   - Secure edge function integration
   - Grace period validation
   - Complete error handling

4. **React Components**:
   - Enhanced `AccountDeletionModal.tsx` with full workflow
   - Updated `useAccountDeletion.ts` hook with new functions

## 🔧 Pre-Testing Setup

### Step 1: Deploy SQL Functions to Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content of:
-- docs/production/SQL/account_deletion.sql
```

**Verification**:
```sql
-- Check functions were created successfully
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%account%' 
OR routine_name LIKE '%delete_user_data%';

-- Should return:
-- delete_user_data | FUNCTION
-- process_expired_account_deletions | FUNCTION  
-- verify_user_data_deleted | FUNCTION
```

### Step 2: Deploy Edge Functions to Supabase

```bash
# Deploy the account deletion processor
supabase functions deploy process-account-deletion

# Deploy the scheduled cleanup (optional for initial testing)
supabase functions deploy scheduled-account-cleanup
```

### Step 3: Set Environment Variables

Ensure these are set in your Supabase project:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SCHEDULED_FUNCTION_SECRET_KEY=your-secret-key-for-cron-jobs
```

## 🧪 Testing Protocol

### Test 1: Request Account Deletion

**Prerequisites**: 
- Test user account with some data (players, games, etc.)
- User logged in to the application

**Steps**:
1. Open Account Deletion Modal
2. Check "I understand this cannot be undone"
3. Enter password
4. Click "Request Deletion"

**Expected Results**:
```
✅ Success message appears
✅ Shows grace period expiry date (30 days from now)
✅ Shows days remaining counter
✅ Modal updates to show cancellation option
✅ Database record created in account_deletion_requests table
```

**Verification Query**:
```sql
SELECT * FROM account_deletion_requests WHERE user_id = 'test-user-id';
-- Should show: status='pending', scheduled_deletion_at = NOW() + 30 days
```

### Test 2: Cancel Account Deletion

**Prerequisites**: Account deletion request exists

**Steps**:
1. Open Account Deletion Modal (should show pending state)
2. Click "Cancel Deletion Request"

**Expected Results**:
```
✅ Success message appears  
✅ Modal returns to initial state
✅ Database record updated to 'cancelled'
```

**Verification Query**:
```sql
SELECT status FROM account_deletion_requests WHERE user_id = 'test-user-id';
-- Should show: status='cancelled'
```

### Test 3: Complete Data Deletion (Manual Test)

**Prerequisites**: 
- Account deletion request with past grace period date
- Test data in multiple tables

**Setup Test Data**:
```sql
-- Create test data
INSERT INTO account_deletion_requests (user_id, scheduled_deletion_at, status)
VALUES ('test-user-id', NOW() - INTERVAL '1 day', 'pending');
```

**Steps**:
1. Open Account Deletion Modal
2. Should show "Grace period has expired" message
3. Click "Finalize Deletion"
4. Wait for completion

**Expected Results**:
```
✅ Success message with logout countdown
✅ User automatically logged out
✅ All user data completely removed
```

**Verification Queries**:
```sql
-- Check all tables are empty for this user
SELECT * FROM verify_user_data_deleted('test-user-id');
-- Should return 0 for all tables

-- Check specific tables manually
SELECT COUNT(*) FROM players WHERE user_id = 'test-user-id'; -- Should be 0
SELECT COUNT(*) FROM games WHERE user_id = 'test-user-id'; -- Should be 0
SELECT COUNT(*) FROM seasons WHERE user_id = 'test-user-id'; -- Should be 0
-- etc. for all user tables
```

### Test 4: Edge Function Direct Test

**Prerequisites**: Valid user access token

**Test via curl**:
```bash
# Get access token from browser dev tools or Supabase auth
curl -X POST https://your-project.supabase.co/functions/v1/process-account-deletion \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Account and all associated data has been permanently deleted",
  "deletedTables": [
    "timer_states: 2 rows",
    "games: 5 rows", 
    "players: 10 rows",
    "seasons: 1 rows"
  ],
  "processed_at": "2025-08-11T10:30:00.000Z"
}
```

### Test 5: Scheduled Cleanup Test (Optional)

**Prerequisites**: 
- Multiple accounts with expired grace periods
- Scheduled function secret key configured

**Manual Trigger**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/scheduled-account-cleanup \
  -H "x-scheduled-function-key: YOUR_SECRET_KEY"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Processed 2 expired account deletions",
  "processed_users": [
    {
      "user_id": "user-1-id",
      "summary": "games: 3 rows, players: 5 rows, seasons: 1 rows"
    }
  ]
}
```

## 🚨 Critical Verification Checklist

Before considering this feature complete, verify:

### Data Integrity
- [ ] All user tables are completely empty after deletion
- [ ] No orphaned records remain in any table
- [ ] Foreign key relationships maintained during deletion
- [ ] No errors during referential integrity checks

### Security 
- [ ] Users can only delete their own accounts
- [ ] Edge function requires valid authentication
- [ ] No direct client-side deletion possible
- [ ] Service role key properly secured

### UI/UX
- [ ] Clear messaging about grace period
- [ ] Visual distinction between pending and expired states  
- [ ] Proper loading states during async operations
- [ ] Error messages are user-friendly

### Compliance
- [ ] User data completely removed (GDPR/CCPA compliant)
- [ ] Grace period implemented as specified
- [ ] Audit trail maintained (deletion logs)
- [ ] No recovery possible after deletion

## 🐛 Common Issues & Troubleshooting

### Issue: "Function does not exist"
**Cause**: SQL functions not deployed to Supabase
**Fix**: Run the complete SQL script in Supabase SQL Editor

### Issue: "Unauthorized" when calling edge function  
**Cause**: Missing or invalid access token
**Fix**: Check authentication and token validity

### Issue: "Grace period has not expired"
**Cause**: Deletion scheduled for future date
**Fix**: Either wait for grace period or manually update scheduled date for testing

### Issue: Partial data deletion
**Cause**: Referential integrity issues or missing tables
**Fix**: Check deletion order and verify all tables included

### Issue: Edge function timeout
**Cause**: Large amounts of data taking too long to delete
**Fix**: Consider batching deletions or increasing timeout limits

## 📋 Production Deployment Checklist

Before enabling in production:

### Database
- [ ] SQL functions deployed and tested
- [ ] RLS policies verified  
- [ ] Indexes created for performance
- [ ] Backup strategy in place

### Functions  
- [ ] Edge functions deployed to production
- [ ] Environment variables configured
- [ ] Function logs monitored
- [ ] Error alerts configured

### Application
- [ ] UI tested on multiple devices/browsers
- [ ] Error handling verified
- [ ] Loading states working
- [ ] Analytics tracking (if needed)

### Legal/Compliance
- [ ] Privacy policy updated to mention deletion
- [ ] Terms of service include deletion terms
- [ ] Legal team approval (if required)
- [ ] Data retention policy documented

## 🎯 Success Criteria

The account deletion feature is ready for production when:

1. **All tests pass** without errors or data remnants
2. **Edge functions respond** with proper authentication
3. **UI workflow is smooth** and user-friendly  
4. **No user data remains** after deletion verification
5. **Error handling works** for all failure scenarios
6. **Performance is acceptable** for expected user data volumes

---

**Next Steps**: 
1. Run this complete test suite
2. Address any issues found
3. Get final approval for production deployment
4. Update TASK 1 in PRE_LAUNCH_CRITICAL_TASKS.md as completed