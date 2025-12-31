# Security Policy

## Supported Versions

This is the **public repository** (`arc-pay-public`) containing:
- Smart contracts (audit-ready)
- Public backend core (demo/audit mode only)
- Frontend integration

The **private repository** contains production backend with real settlement, custody, and CCTP bridging logic.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to: **security@arcpaykit.com**

**Please do NOT** open a public GitHub issue for security vulnerabilities.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

## Security Scope

### In Scope for Audit

✅ **Smart Contracts**
- `InvoicePaymentProof.sol`
- `MerchantBadge.sol`
- `PaymentRegistry.sol`

✅ **Public Backend Core**
- Request validation (Zod schemas)
- Type definitions
- Public API endpoints (demo mode)
- Error handling

✅ **Frontend**
- Client-side validation
- Wallet connection security
- API key handling

### Out of Scope

❌ **Private Backend Modules**
- Settlement service (private repository)
- CCTP bridging implementation (private repository)
- Payout processing (private repository)
- Circle integration (private repository)
- Production API keys and secrets
- Infrastructure configuration

❌ **Production Environment**
- Production database
- Production API endpoints
- Real on-chain transactions
- Real custody operations

## Threat Model

### High-Level Threats

1. **Smart Contract Vulnerabilities**
   - Reentrancy attacks
   - Access control bypass
   - Integer overflow/underflow
   - Front-running

2. **Frontend Security**
   - XSS (Cross-Site Scripting)
   - CSRF (Cross-Site Request Forgery)
   - API key leakage
   - Wallet private key exposure

3. **Backend Security** (Public Core Only)
   - Input validation bypass
   - Rate limiting bypass
   - SQL injection (if using raw queries)
   - Authentication bypass

### Mitigations

- **Smart Contracts**: OpenZeppelin libraries, access control, write-once patterns
- **Frontend**: React best practices, input sanitization, secure wallet integration
- **Backend**: Zod validation, rate limiting, API key authentication

## Known Limitations

### Public Repository

- **No Real Settlement**: All settlement operations are stubbed
- **No Real CCTP**: CCTP bridging is not implemented
- **No Real Custody**: No funds are held or transferred
- **Demo Mode Only**: Server requires `ARCPAY_PUBLIC_DEMO_MODE=true`

### Smart Contracts

- **InvoicePaymentProof**: Requires owner to record proofs (centralized control)
- **MerchantBadge**: Allows self-minting (merchants can mint their own badges)
- **PaymentRegistry**: No access control (anyone can emit events)

## Security Best Practices

### For Developers

1. **Never commit secrets** to the public repository
2. **Use demo mode** when running the public repository
3. **Validate all inputs** using Zod schemas
4. **Use rate limiting** on public endpoints
5. **Keep dependencies updated** and audit regularly

### For Auditors

1. Focus on smart contract logic and access control
2. Review public API endpoints for validation issues
3. Check frontend for XSS/CSRF vulnerabilities
4. Verify demo mode guards are in place

## Disclosure Policy

We follow **responsible disclosure**:

1. Report vulnerability privately
2. We acknowledge and investigate
3. We develop and test a fix
4. We deploy the fix
5. We publicly disclose (if appropriate)

We will credit security researchers who responsibly disclose vulnerabilities (with permission).

## Security Updates

Security updates will be:
- Tagged with `[SECURITY]` in commit messages
- Documented in CHANGELOG.md
- Announced via GitHub releases (if critical)

## Contact

- **Security Email**: security@arcpaykit.com
- **General Issues**: Use GitHub Issues (non-security)
- **Documentation**: See README.md and ARCHITECTURE.md
