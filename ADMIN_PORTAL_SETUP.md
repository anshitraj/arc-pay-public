# Admin Portal Setup Guide

## Overview

The Admin Portal provides comprehensive management capabilities for ArcPayKit, including merchant management, payment oversight, business name change requests, and system configuration.

## Database Setup

First, run the database migration to create the new tables:

```bash
npm run db:push
```

This will create:
- `admin_users` - Admin user accounts
- `business_name_change_requests` - Business name change requests
- `admin_audit_logs` - Audit trail for admin actions
- `global_config` - Global system configuration
- `blocklist` - Blocked wallets, merchants, and emails

## Create First Admin User

### Wallet-Based Admin (Recommended)

The easiest way is to use the `ADMIN_WALLET` environment variable. The admin user will be automatically created on server startup.

1. Add to your `.env` file:
   ```env
   ADMIN_WALLET=0xYourWalletAddressHere
   ```

2. Start the server - the admin user will be automatically created with:
   - Email: `{wallet}@admin.wallet.local`
   - Role: `SUPER_ADMIN`
   - Wallet address: Your wallet address

3. Login at `/admin/login` using wallet connection (RainbowKit)

### Email/Password Admin (Alternative)

If you prefer email/password authentication, you can manually create an admin:

```sql
INSERT INTO admin_users (email, password, name, role, active, wallet_address)
VALUES (
  'admin@arcpaykit.com',
  '$2b$10$...', -- Use bcrypt hash of your password
  'Super Admin',
  'SUPER_ADMIN',
  true,
  NULL -- No wallet address for email/password login
);
```

To generate a password hash, you can use Node.js:
```javascript
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('yourpassword', 10);
console.log(hash);
```

## Features

### 1. Merchant Management
- View all merchants
- Approve/disable merchants
- Issue/revoke MerchantBadge (SBT)
- Toggle merchant Live mode access

### 2. Business Name Change Requests
- View all pending/approved/rejected requests
- Approve or reject change requests
- Automatically updates merchant profile on approval

### 3. Payments Overview
- View all payments across all merchants
- Flag suspicious payments
- Add internal notes
- Force status resync

### 4. Webhooks Management
- View all webhook endpoints
- Disable webhooks
- Retry failed deliveries
- View delivery logs

### 5. QR Codes Management
- View all merchant QR codes
- Disable QR codes
- Regenerate QR payload

### 6. Global Config
Manage system-wide settings:
- Enable/disable Test mode globally
- Min/max payment amounts
- Allowed currencies
- Maintenance mode
- Fee configuration

### 7. Risk & Safety
- Blocklist wallet addresses
- Blocklist merchants
- Blocklist emails
- View flagged payments
- Emergency "Pause payments" toggle

### 8. Audit Logs
Complete audit trail of:
- Merchant approvals/rejections
- Badge issuances/revocations
- Payment flagging
- Config changes
- Blocklist additions/removals

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/me` - Get current admin

### Merchants
- `GET /api/admin/merchants` - List all merchants
- `GET /api/admin/merchants/:id` - Get merchant details
- `PATCH /api/admin/merchants/:id` - Update merchant
- `POST /api/admin/merchants/:id/badge` - Issue/revoke badge

### Change Requests
- `GET /api/admin/change-requests` - List change requests
- `POST /api/admin/change-requests/:id/review` - Approve/reject request

### Payments
- `GET /api/admin/payments` - List all payments
- `POST /api/admin/payments/:id/flag` - Flag payment

### Config
- `GET /api/admin/config` - Get all config
- `PUT /api/admin/config/:key` - Update config

### Blocklist
- `GET /api/admin/blocklist` - List blocklist entries
- `POST /api/admin/blocklist` - Add to blocklist
- `DELETE /api/admin/blocklist/:id` - Remove from blocklist

### Audit Logs
- `GET /api/admin/audit-logs` - Get audit logs

## Frontend Routes

- `/admin/login` - Admin login page
- `/admin/dashboard` - Admin dashboard (to be created)
- `/admin/merchants` - Merchant management (to be created)
- `/admin/payments` - Payments overview (to be created)
- `/admin/change-requests` - Change requests (to be created)
- `/admin/config` - Global config (to be created)
- `/admin/blocklist` - Blocklist management (to be created)
- `/admin/logs` - Audit logs (to be created)

## Next Steps

1. Create admin dashboard pages in `client/src/pages/admin/`
2. Add admin sidebar navigation
3. Implement protected admin routes
4. Add admin user management (for SUPER_ADMIN only)
5. Create admin dashboard widgets (stats, charts)

## Security Notes

- Admin routes require authentication via session
- SUPER_ADMIN role required for sensitive operations
- All admin actions are logged in audit trail
- Supports both wallet-based and email/password authentication
- Wallet-based admin: Uses `ADMIN_WALLET` env var, automatically created on startup
- Email/password admin: Manual creation required, passwords hashed with bcrypt
- Admin sessions are separate from merchant sessions
- Wallet address must match exactly (case-insensitive) for wallet login

