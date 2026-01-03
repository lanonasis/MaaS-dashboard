# Authentication Features Test Plan

**Dashboard:** `apps/dashboard`  
**Test Date:** November 18, 2025  
**Tester:** ******\_******

## Pre-Test Setup

### 1. Start Development Server

```bash
cd apps/dashboard
npm run dev
```

### 2. Open Browser

Navigate to: `http://localhost:5173/auth/login` (or your dev URL)

### 3. Prepare Test Accounts

- Valid email: `test@example.com`
- Valid password: `Test123!`
- Invalid email: `invalid-email`
- Short password: `12345`

---

## Test Suite 1: Social Login Providers

### Test 1.1: Google OAuth

- [ ] Click "Google" button
- [ ] **Expected:** Redirects to Google OAuth page
- [ ] **Expected:** URL contains `accounts.google.com`
- [ ] Complete Google auth
- [ ] **Expected:** Redirects back to dashboard
- [ ] **Expected:** User is logged in
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 1.2: GitHub OAuth

- [ ] Click "GitHub" button
- [ ] **Expected:** Redirects to GitHub OAuth page
- [ ] **Expected:** URL contains `github.com/login/oauth`
- [ ] Complete GitHub auth
- [ ] **Expected:** Redirects back to dashboard
- [ ] **Expected:** User is logged in
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 1.3: LinkedIn OAuth

- [ ] Click "LinkedIn" button
- [ ] **Expected:** Redirects to LinkedIn OAuth page
- [ ] **Expected:** URL contains `linkedin.com/oauth`
- [ ] Complete LinkedIn auth
- [ ] **Expected:** Redirects back to dashboard
- [ ] **Expected:** User is logged in
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 1.4: Discord OAuth

- [ ] Click "Discord" button
- [ ] **Expected:** Redirects to Discord OAuth page
- [ ] **Expected:** URL contains `discord.com/oauth2`
- [ ] Complete Discord auth
- [ ] **Expected:** Redirects back to dashboard
- [ ] **Expected:** User is logged in
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 1.5: Apple OAuth

- [ ] Click "Apple" button
- [ ] **Expected:** Redirects to Apple OAuth page
- [ ] **Expected:** URL contains `appleid.apple.com`
- [ ] Complete Apple auth
- [ ] **Expected:** Redirects back to dashboard
- [ ] **Expected:** User is logged in
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 2: Email/Password Authentication

### Test 2.1: Valid Login

- [ ] Enter valid email
- [ ] Enter valid password
- [ ] Click "Sign in"
- [ ] **Expected:** Success toast appears
- [ ] **Expected:** Redirects to `/dashboard`
- [ ] **Expected:** User session is active
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 2.2: Invalid Email Format

- [ ] Enter `invalid-email` (no @)
- [ ] Enter valid password
- [ ] Click "Sign in"
- [ ] **Expected:** Error message "Email is invalid"
- [ ] **Expected:** Email field has red border
- [ ] **Expected:** No redirect occurs
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 2.3: Empty Email

- [ ] Leave email empty
- [ ] Enter valid password
- [ ] Click "Sign in"
- [ ] **Expected:** Error message "Email is required"
- [ ] **Expected:** Email field has red border
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 2.4: Short Password

- [ ] Enter valid email
- [ ] Enter `12345` (5 chars)
- [ ] Click "Sign in"
- [ ] **Expected:** Error message "Password must be at least 6 characters"
- [ ] **Expected:** Password field has red border
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 2.5: Empty Password

- [ ] Enter valid email
- [ ] Leave password empty
- [ ] Click "Sign in"
- [ ] **Expected:** Error message "Password is required"
- [ ] **Expected:** Password field has red border
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 3: Password Visibility Toggle

### Test 3.1: Show Password

- [ ] Enter password in password field
- [ ] **Expected:** Password shows as dots (••••••)
- [ ] Click eye icon
- [ ] **Expected:** Icon changes to eye-off
- [ ] **Expected:** Password shows as plain text
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 3.2: Hide Password

- [ ] With password visible (from 3.1)
- [ ] Click eye-off icon
- [ ] **Expected:** Icon changes to eye
- [ ] **Expected:** Password shows as dots again
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 4: Registration Flow

### Test 4.1: Switch to Register Mode

- [ ] From login page, click "Create one"
- [ ] **Expected:** Form changes to registration mode
- [ ] **Expected:** Name field appears
- [ ] **Expected:** Confirm password field appears
- [ ] **Expected:** Title changes to "Create an account"
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 4.2: Valid Registration

- [ ] Enter name: "Test User"
- [ ] Enter valid email
- [ ] Enter valid password
- [ ] Enter matching confirm password
- [ ] Click "Create account"
- [ ] **Expected:** Success toast appears
- [ ] **Expected:** Message about email confirmation
- [ ] **Expected:** Switches back to login mode
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 4.3: Password Mismatch

- [ ] Enter name
- [ ] Enter valid email
- [ ] Enter password: "Test123!"
- [ ] Enter confirm: "Different123!"
- [ ] Click "Create account"
- [ ] **Expected:** Error "Passwords do not match"
- [ ] **Expected:** Confirm password field has red border
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 4.4: Missing Name

- [ ] Leave name empty
- [ ] Enter valid email and passwords
- [ ] Click "Create account"
- [ ] **Expected:** Error "Name is required"
- [ ] **Expected:** Name field has red border
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 5: Forgot Password Flow

### Test 5.1: Switch to Forgot Password

- [ ] From login page, click "Forgot password?"
- [ ] **Expected:** Form changes to forgot password mode
- [ ] **Expected:** Only email field visible
- [ ] **Expected:** No password fields
- [ ] **Expected:** No social login buttons
- [ ] **Expected:** Title changes to "Reset your password"
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 5.2: Send Reset Link

- [ ] Enter valid email
- [ ] Click "Send reset link"
- [ ] **Expected:** Success toast appears
- [ ] **Expected:** Message about checking email
- [ ] **Expected:** Switches back to login mode
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 5.3: Invalid Email in Reset

- [ ] Enter invalid email format
- [ ] Click "Send reset link"
- [ ] **Expected:** Error "Email is invalid"
- [ ] **Expected:** Email field has red border
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 6: Error Handling & UX

### Test 6.1: Real-time Error Clearing

- [ ] Trigger an email error (empty field)
- [ ] **Expected:** Error message appears
- [ ] Start typing in email field
- [ ] **Expected:** Error message disappears immediately
- [ ] **Expected:** Red border disappears
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 6.2: Loading State

- [ ] Click "Sign in" with valid credentials
- [ ] **Expected:** Button shows loading spinner
- [ ] **Expected:** Button text changes or spinner appears
- [ ] **Expected:** Form fields are disabled
- [ ] **Expected:** Social buttons are disabled
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 6.3: Failed Login Toast

- [ ] Enter valid email
- [ ] Enter wrong password
- [ ] Click "Sign in"
- [ ] **Expected:** Error toast appears
- [ ] **Expected:** Toast has destructive/red styling
- [ ] **Expected:** Error message is clear
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 7: Navigation & Routing

### Test 7.1: Login to Dashboard Redirect

- [ ] Successfully log in
- [ ] **Expected:** URL changes to `/dashboard`
- [ ] **Expected:** Dashboard page loads
- [ ] **Expected:** User data is visible
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 7.2: OAuth Callback Redirect

- [ ] Complete OAuth flow (any provider)
- [ ] **Expected:** Returns to correct callback URL
- [ ] **Expected:** Session is established
- [ ] **Expected:** Redirects to dashboard
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 7.3: Mode Switching Links

- [ ] Click "Create one" from login
- [ ] **Expected:** URL updates (if applicable)
- [ ] Click "Sign in" from register
- [ ] **Expected:** Returns to login mode
- [ ] Click "Back to sign in" from forgot password
- [ ] **Expected:** Returns to login mode
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 8: Responsive Design

### Test 8.1: Mobile View (375px)

- [ ] Resize browser to 375px width
- [ ] **Expected:** Form is readable
- [ ] **Expected:** Social buttons stack properly
- [ ] **Expected:** No horizontal scroll
- [ ] **Expected:** All buttons are clickable
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 8.2: Tablet View (768px)

- [ ] Resize browser to 768px width
- [ ] **Expected:** Layout adjusts appropriately
- [ ] **Expected:** Form remains centered
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 8.3: Desktop View (1920px)

- [ ] Resize browser to 1920px width
- [ ] **Expected:** Form stays max-width
- [ ] **Expected:** Centered on screen
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 9: Dark Mode

### Test 9.1: Dark Mode Toggle

- [ ] Switch to dark mode (if toggle available)
- [ ] **Expected:** Background changes to dark
- [ ] **Expected:** Text remains readable
- [ ] **Expected:** Form card has dark styling
- [ ] **Expected:** Borders are visible
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Test Suite 10: Accessibility

### Test 10.1: Keyboard Navigation

- [ ] Tab through all form fields
- [ ] **Expected:** Focus indicator visible
- [ ] **Expected:** Logical tab order
- [ ] Press Enter on submit button
- [ ] **Expected:** Form submits
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

### Test 10.2: Screen Reader Labels

- [ ] Check all inputs have labels
- [ ] Check buttons have descriptive text
- [ ] Check error messages are associated with fields
- [ ] **Result:** ✅ Pass / ❌ Fail
- **Notes:** ******\_******

---

## Summary

### Total Tests: 40

- **Passed:** **\_**
- **Failed:** **\_**
- **Skipped:** **\_**

### Critical Issues Found:

1. ***
2. ***
3. ***

### Minor Issues Found:

1. ***
2. ***
3. ***

### Recommendations:

1. ***
2. ***
3. ***

---

## Sign-off

**Tester Name:** ******\_******  
**Date:** ******\_******  
**Signature:** ******\_******
