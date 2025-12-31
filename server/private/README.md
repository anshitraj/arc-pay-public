# Private Modules

This directory is **not included** in the public repository.

## What's Here (Private Repository Only)

The private repository contains:

- **Real Settlement Logic**: Actual payment settlement, routing, and execution
- **CCTP Implementation**: Real Circle CCTP bridging with API keys and attestation handling
- **Chain Operations**: Real on-chain token transfers and transaction monitoring
- **Payout Service**: Real payout processing with bank transfers, ACH, etc.
- **Circle Integration**: Real Circle Wallets SDK integration with production keys
- **Admin Flows**: Privileged admin operations and internal tooling
- **Production Secrets**: API keys, private keys, and infrastructure configuration

## Public Repository

The public repository (`arc-pay-public`) only includes:

- **Demo/Stub Adapters**: Interfaces with `NotImplementedInPublicRepo` stubs
- **Public Core**: Validation, types, and public API endpoints
- **Smart Contracts**: Audit-ready contracts for public review

## Integration

In the private repository, these modules plug into the public core via the adapter interfaces defined in `/server/adapters/interfaces.ts`.
