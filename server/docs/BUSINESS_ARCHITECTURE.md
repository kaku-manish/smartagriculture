# Business Architecture Layer: Agriculture SaaS Platform

## 1. Multi-Tenant Strategy
The platform follows a **Siloed Multi-Tenancy** approach at the database level using an `org_id` column on every tenant-specific entity.

### Core Entities
- **Organization**: The top-level tenant (e.g., "Krishna Valley FPO").
- **Subscription Plan**: Defines caps (Acres/Scans) and billing cycles.
- **Usage Ledger**: Tracks consumption (acres scanned) per billing cycle.
- **Roles**: RBAC system (Super Admin, Org Admin, Operator, Agronomist, Farmer).

## 2. Permission Matrix (RBAC)

| Resource | Super Admin | Org Admin | Operator | Agronomist | Farmer |
|----------|-------------|-----------|----------|------------|--------|
| Organizations | CRUD All | View Own | - | - | - |
| Users | CRUD All | CRUD Own Org| - | - | - |
| Subscription | CRUD | View Own | - | - | - |
| Fields/Farms | View All | CRUD Own | View Own | View Own | View Own |
| Scans Schedule| - | CRUD | CRUD | View | - |
| Scans Upload | - | - | CRUD | - | - |
| Analysis | View | View | View | Edit/Approve| View |
| Billing | CRUD | View | - | - | - |
| Audit Logs | View All | View Own | - | - | - |

## 3. Data Contracts (API Interfaces)

### Auth
- `POST /auth/register`: `{ username, password, full_name, org_name, email, phone }` -> Creates Org + Org Admin.
- `POST /auth/login`: `{ username, password }` -> Returns `{ token, user: { role, org_id } }`.

### Scans Workflow
- `POST /scans/schedule`: `{ field_id, scheduled_date, drone_type }`.
- `POST /scans/upload`: Multipart `image`, `{ scan_id, acres_covered }`.

### Billing & Usage
- `GET /billing/usage`: Returns `{ current_month_acres, limit, overage_cost }`.

## 4. Database Schema (V2 Migration)

New Tables:
1. `organizations`: `id, name, slug, plan_id, status (active/suspended)`
2. `subscription_plans`: `id, name, monthly_acre_limit, price, overage_rate`
3. `scans`: `id, org_id, field_id, status (scheduled/completed/analyzed), acres, result_json`
4. `audit_logs`: `id, org_id, user_id, action, timestamp`

## 5. Audit Logging Policy
Every write operation (INSERT/UPDATE/DELETE) on sensitive entities (Fields, Billing, Users) must trigger a record in `audit_logs`.

---

## Deliverables Implementation Plan
1. **Schema Migration**: `server/database/migration_v2.js`
2. **RBAC Middleware**: `server/middleware/permission_middleware.js`
3. **Billing Service**: `server/services/usage_tracker.js`
4. **API Layer**: `server/routes/business.js`
