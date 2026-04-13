# SaaS Implementation Plan: Parent-Child Architecture

This document outlines the changes required to transform the current office time tracking system into a SaaS-ready platform. The core enhancement is the introduction of a **Super-Admin** role that manages multiple **Admins**, each of whom manages their own isolated team of managers and employees.

## 1. Architectural Changes

### Multi-Tenancy Logic (Tenant Isolation)
To ensure isolation between different organizations (Admins), we will introduce a `tenantId` field to the `User` model.
- **Tenant ID**: For every user, the `tenantId` will point to the `_id` of the "Head Admin" of their organization.
- **Super-Admin**: Has no `tenantId` (or it is `null`), as they operate above the tenant level.
- **Admin**: Their `tenantId` is their own `_id`.
- **Team Members (Manager, HR, Employee)**: Their `tenantId` is the `_id` of the Admin who created them (or the organization they belong to).

## 2. Model Updates

### `models/User.ts`
- **Role Enum**: Add `"super-admin"` to the allowed roles.
- **Tenant ID Field**: 
  ```typescript
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true
  }
  ```

### `models/Role.ts`
- Update the `RoleName` type and `RoleSchema` enum to include `"super-admin"`.

## 3. Authentication & Authorization

### `lib/auth.ts`
- Update `JwtPayload` to include `super-admin` role.
- Include `tenantId` in the JWT payload so that API routes can easily filter data without extra DB lookups.

### `middleware.ts`
- Add protection for Super-Admin routes:
  - `/dashboard/super-admin/**` -> Only `super-admin` role.
  - Ensure regular users cannot access super-admin areas.

## 4. New Pages & Routes

### Super-Admin Portal
- **Login Page**: `app/(auth)/super-admin/login/page.tsx`
  - URL: `http://localhost:3000/auth/super-admin/login`
- **Dashboard**: `app/dashboard/super-admin/page.tsx`
  - Statistics: Total number of Admins, Active Users across all tenants.
  - Admin Management Table: List, search, and manage (active/inactive) all Admins.
- **Admin Creation Form**: Create new "Admin" accounts.
  - Fields: First Name, Last Name, Email, Password, Company/Department Name.

### Administrative API
- **New Super-Admin API**: `api/super-admin/admins/route.ts`
  - `GET`: List all users with the `admin` role.
  - `POST`: Create a new `admin` and automatically set their `tenantId` to their own new ID.

## 5. Existing Logic Refactoring (Non-Breaking)

### API Route Filtering
All existing API routes (Users, Tasks, Attendance, etc.) will be updated to respect the `tenantId`.
- **Logic**: `const query = { tenantId: payload.tenantId, isDeleted: false };`
- This ensures that Admin A can only see and manage their own team, even if Admin B is using the same database.

### User Creation
- When an Admin creates a user, the `tenantId` of the new user is automatically inherited from the creator's `tenantId`.

## 6. Implementation Steps

1. **Step 1: Database Migration**
   - Update `User` and `Role` schemas.
   - Run a script to set `tenantId` for existing users (existing Admin's `tenantId` = their `_id`; their team members' `tenantId` = existing Admin's `_id`).

2. **Step 2: Authentication Infrastructure**
   - Update `lib/auth.ts` and `api/auth/login`.

3. **Step 3: Super-Admin Portal**
   - Create the login page and dashboard.
   - Implement the Admin creation logic.

4. **Step 4: Global Tenant Filtering**
   - Apply the `tenantId` filter across all API routes to ensure data isolation.

5. **Step 5: UI Adjustments**
   - Hide/Show menu items based on the new `super-admin` role.

---
> [!IMPORTANT]
> The existing "Admin" logic remains unchanged. Employees and Managers still function as they do today, but their scope is now limited to their own tenant.
