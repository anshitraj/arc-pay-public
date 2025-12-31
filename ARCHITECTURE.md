# Architecture Overview

This document describes the architecture of the ARC Pay public repository.

## Repository Structure

```
arc-pay-public/
├── contracts/          # Smart contracts (Foundry)
│   ├── InvoicePaymentProof.sol
│   ├── MerchantBadge.sol
│   ├── PaymentRegistry.sol
│   ├── test/          # Foundry tests
│   └── script/        # Deployment scripts
├── server/
│   ├── core/          # Public-safe modules
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── errors.ts
│   │   ├── demoMode.ts
│   │   └── publicRoutes.ts
│   ├── adapters/      # Stub interfaces
│   │   ├── interfaces.ts
│   │   └── stubs.ts
│   └── private/       # Placeholder (not in public repo)
│       └── README.md
└── client/            # Frontend (React + Vite)
```

## Module Architecture

### Smart Contracts

**InvoicePaymentProof.sol**
- Purpose: Record payment proofs on-chain
- Access: Owner-only writes, public reads
- Upgradeability: Immutable

**MerchantBadge.sol**
- Purpose: Non-transferable SBT for verified merchants
- Access: Self-minting, non-transferable
- Upgradeability: Immutable

**PaymentRegistry.sol**
- Purpose: Emit payment events
- Access: Public (anyone can emit)
- Upgradeability: Immutable

### Backend Core (`/server/core`)

**types.ts**
- TypeScript interfaces for payment intents, merchants, webhook events
- Public-safe (no private implementation details)

**validation.ts**
- Zod schemas for request validation
- Ensures type safety and input validation

**errors.ts**
- Error normalization layer
- `NotImplementedInPublicRepo` for stub methods
- `DemoModeRequiredError` for demo mode enforcement

**demoMode.ts**
- Demo mode guard (`ARCPAY_PUBLIC_DEMO_MODE=true`)
- Startup assertion
- Runtime checks

**publicRoutes.ts**
- Public API endpoints:
  - `POST /api/public/intents` - Create payment intent (demo)
  - `GET /api/public/intents/:id` - Get payment intent
  - `GET /api/public/intents` - List payment intents
  - `POST /api/public/webhooks/mock` - Mock webhook endpoint
  - `GET /health` - Health check

### Adapters (`/server/adapters`)

**interfaces.ts**
- TypeScript interfaces for:
  - `SettlementAdapter` - Settlement routing
  - `CctpAdapter` - Circle CCTP bridging
  - `ChainAdapter` - On-chain operations

**stubs.ts**
- Mock implementations that throw `NotImplementedInPublicRepo`
- Real implementations are in the private repository

### Private Modules (`/server/private`)

**Not included in public repository**

The private repository contains:
- Real settlement service
- Real CCTP implementation
- Real chain operations
- Payout processing
- Circle integration
- Admin flows
- Production secrets

## Data Flow

### Payment Intent Lifecycle (Demo Mode)

```
1. Client Request
   ↓
2. POST /api/public/intents
   ↓
3. Validation (Zod)
   ↓
4. Create Mock Intent (in-memory)
   ↓
5. Return Intent ID
   ↓
6. Client Polls GET /api/public/intents/:id
   ↓
7. Status Updates (mock)
```

### Real Payment Flow (Private Repository)

```
1. Client Request
   ↓
2. POST /api/payments/create
   ↓
3. Validation + Merchant Auth
   ↓
4. Create Payment Intent
   ↓
5. Settlement Adapter → Route Selection
   ↓
6. CCTP Adapter (if cross-chain) → Bridge
   ↓
7. Chain Adapter → Execute Transfer
   ↓
8. Update Payment Status
   ↓
9. Webhook Delivery
```

## Integration Points

### Frontend → Backend

- **Public Endpoints**: `/api/public/*` (demo mode)
- **API Key Auth**: `Authorization: Bearer <api-key>`
- **CORS**: Configured for same-origin and localhost

### Backend → Contracts

- **Contract Addresses**: Environment variables
- **ABI**: Loaded from files or env
- **RPC**: ARC testnet/mainnet RPC URLs

### Private Repository Integration

The private repository plugs into the public core via:

1. **Adapter Implementations**: Replace stubs with real implementations
2. **Service Modules**: Add real settlement, CCTP, payout services
3. **Database**: Real PostgreSQL with production schema
4. **Secrets**: Production API keys, private keys, Circle credentials

## Security Boundaries

### Public Repository

✅ **Safe to Publish**:
- Smart contracts (audit-ready)
- Public API endpoints (demo mode)
- Type definitions
- Validation schemas
- Frontend code

❌ **Never Publish**:
- Production API keys
- Private keys
- Database credentials
- Circle credentials
- Real settlement logic
- Real CCTP implementation
- Admin privileged flows

### Demo Mode Guards

- **Startup Guard**: Server refuses to start without `ARCPAY_PUBLIC_DEMO_MODE=true`
- **Runtime Checks**: Adapters throw `NotImplementedInPublicRepo`
- **Endpoint Guards**: Public routes check demo mode

## Deployment

### Contracts

1. **Testnet**: Deploy via Foundry scripts
2. **Mainnet**: Deploy after audit (via Foundry scripts)
3. **Verification**: Verify on block explorer

### Backend

1. **Demo Mode**: Set `ARCPAY_PUBLIC_DEMO_MODE=true` (required)
2. **Database**: Optional in demo mode - public routes use in-memory storage
   - If `DATABASE_URL` is not set, public routes work with in-memory storage
   - Full database routes require `DATABASE_URL` to be set
3. **Port**: Default 3001 (configurable via `PORT`)

### Frontend

1. **Build**: `npm run build`
2. **Serve**: Static files or Vite dev server
3. **API URL**: `VITE_API_BASE_URL=http://localhost:3001`

## Development Workflow

### Public Repository

1. Clone `arc-pay-public`
2. Set `ARCPAY_PUBLIC_DEMO_MODE=true`
3. Run `npm install`
4. Run `npm run dev` (frontend) and `npm run server` (backend)
5. Test with demo endpoints

### Private Repository

1. Clone private repository
2. Replace adapter stubs with real implementations
3. Add private service modules
4. Configure production secrets
5. Deploy to production

## Testing

### Contracts

```bash
forge test
```

### Backend

```bash
npm run check  # TypeScript check
```

### Frontend

```bash
npm run build  # Build check
```

## CI/CD

See `.github/workflows/ci.yml` for:
- Frontend build
- Server typecheck
- Contract tests

## Questions?

- **Architecture**: See this document
- **Security**: See SECURITY.md
- **Contracts**: See `contracts/README.md`
- **Setup**: See main README.md
