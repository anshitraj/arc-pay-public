import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const paymentStatusEnum = pgEnum("payment_status", ["created", "pending", "confirmed", "failed", "refunded", "expired"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled"]);
export const merchantStatusEnum = pgEnum("merchant_status", ["demo", "pending_verification", "verified"]);
export const webhookEventTypeEnum = pgEnum("webhook_event_type", ["payment.created", "payment.confirmed", "payment.succeeded", "payment.failed", "payment.refunded", "payment.intent.created", "payment.intent.pending", "payment.intent.completed", "payment.intent.failed", "invoice.created", "invoice.paid", "subscription.created", "subscription.invoice_generated", "subscription.past_due", "subscription.canceled", "payout.created", "payout.completed", "payout.failed"]);
export const webhookEventStatusEnum = pgEnum("webhook_event_status", ["pending", "delivered", "failed"]);
export const settlementRouteTypeEnum = pgEnum("settlement_route_type", ["same_chain", "cctp"]);
export const settlementRouteStatusEnum = pgEnum("settlement_route_status", ["pending", "processing", "completed", "failed"]);
export const fxQuoteStatusEnum = pgEnum("fx_quote_status", ["active", "expired", "used"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "paused", "canceled", "past_due"]);
export const subscriptionIntervalEnum = pgEnum("subscription_interval", ["monthly", "yearly"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", ["fee", "split", "payout", "refund"]);

// Session table (managed by connect-pg-simple for Express sessions)
// This is defined here so Drizzle knows about it and won't try to delete it during migrations
// The table is auto-created by connect-pg-simple, so we just need to declare it for Drizzle
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  webhookSecret: text("webhook_secret").notNull(),
  walletAddress: text("wallet_address"),
  logoUrl: text("logo_url"),
  status: merchantStatusEnum("status").notNull().default("demo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: text("currency").notNull().default("USDC"), // Payment asset (what user pays with)
  settlementCurrency: text("settlement_currency").notNull().default("USDC"), // Settlement currency (USDC or EURC on Arc)
  paymentAsset: text("payment_asset"), // Specific asset identifier (e.g., "USDC_ARC", "USDC_BASE", "ETH_BASE")
  paymentChainId: integer("payment_chain_id"), // Chain ID where payment is made
  conversionPath: text("conversion_path"), // JSON string describing conversion path
  estimatedFees: decimal("estimated_fees", { precision: 18, scale: 6 }), // Estimated network/gas fees
  status: paymentStatusEnum("status").notNull().default("created"),
  description: text("description"),
  customerEmail: text("customer_email"),
  payerWallet: text("payer_wallet"),
  merchantWallet: text("merchant_wallet"),
  txHash: text("tx_hash"),
  settlementTime: integer("settlement_time"),
  metadata: text("metadata"),
  idempotencyKey: text("idempotency_key"), // Idempotency key for payment creation
  isDemo: boolean("is_demo").default(false).notNull(), // Legacy field, keep for compatibility
  isTest: boolean("is_test").default(true).notNull(), // Test mode flag
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  paymentId: varchar("payment_id").references(() => payments.id),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: text("currency").notNull().default("USDC"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  dueDate: timestamp("due_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  url: text("url").notNull(),
  events: text("events").array().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpointId: varchar("endpoint_id").notNull().references(() => webhookEndpoints.id),
  eventType: webhookEventTypeEnum("event_type").notNull(),
  payload: text("payload").notNull(),
  status: webhookEventStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastAttempt: timestamp("last_attempt"),
  responseCode: integer("response_code"),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => payments.id),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: text("currency").notNull().default("USDC"),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  url: text("url").notNull(),
  events: text("events").array().notNull(),
  secret: text("secret").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const treasuryBalances = pgTable("treasury_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  currency: text("currency").notNull(),
  balance: decimal("balance", { precision: 18, scale: 6 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const merchantBadges = pgTable("merchant_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id).unique(),
  tokenId: varchar("token_id"),
  mintTxHash: text("mint_tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentProofs = pgTable("payment_proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => payments.id),
  invoiceHash: text("invoice_hash").notNull().unique(),
  proofTxHash: text("proof_tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentLinks = pgTable("payment_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  paymentId: varchar("payment_id").notNull().references(() => payments.id),
  isTest: boolean("is_test").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qrCodes = pgTable("qr_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  amountType: text("amount_type").notNull().default("open"), // "fixed" or "open"
  amount: decimal("amount", { precision: 18, scale: 6 }), // null for open amount
  description: text("description"),
  isTest: boolean("is_test").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const merchantProfiles = pgTable("merchant_profiles", {
  walletAddress: text("wallet_address").primaryKey(),
  businessName: text("business_name").notNull(),
  logoUrl: text("logo_url"),
  country: text("country"),
  businessType: text("business_type"), // "unregistered", "registered", "nonprofit"
  defaultGasSponsorship: boolean("default_gas_sponsorship").default(false).notNull(),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businessWalletAddresses = pgTable("business_wallet_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(), // Merchant's wallet address (FK to merchant_profiles)
  paymentWalletAddress: text("payment_wallet_address").notNull(), // Wallet address to receive payments
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeyTypeEnum = pgEnum("api_key_type", ["publishable", "secret"]);
export const apiKeyModeEnum = pgEnum("api_key_mode", ["test", "live"]);
export const adminRoleEnum = pgEnum("admin_role", ["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
export const changeRequestStatusEnum = pgEnum("change_request_status", ["pending", "approved", "rejected"]);

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(), // Wallet-scoped keys
  keyType: apiKeyTypeEnum("key_type").notNull(),
  mode: apiKeyModeEnum("mode").notNull(),
  keyPrefix: text("key_prefix").notNull(), // e.g., "pk_arc_test_" or "sk_arc_live_"
  hashedKey: text("hashed_key").notNull(), // Only for secret keys, publishable keys stored in plaintext prefix
  name: text("name"), // Optional name for the API key
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  merchants: many(merchants),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  user: one(users, { fields: [merchants.userId], references: [users.id] }),
  payments: many(payments),
  invoices: many(invoices),
  webhookEndpoints: many(webhookEndpoints),
  treasuryBalances: many(treasuryBalances),
  badge: one(merchantBadges, { fields: [merchants.id], references: [merchantBadges.merchantId] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  merchant: one(merchants, { fields: [payments.merchantId], references: [merchants.id] }),
  refunds: many(refunds),
  proof: one(paymentProofs, { fields: [payments.id], references: [paymentProofs.paymentId] }),
  auditLogs: many(paymentAuditLogs),
  settlementRoutes: many(settlementRoutes),
  fxQuotes: many(fxQuotes),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, { fields: [refunds.paymentId], references: [payments.id] }),
  merchant: one(merchants, { fields: [refunds.merchantId], references: [merchants.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  merchant: one(merchants, { fields: [invoices.merchantId], references: [merchants.id] }),
  payment: one(payments, { fields: [invoices.paymentId], references: [payments.id] }),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  merchant: one(merchants, { fields: [webhookEndpoints.merchantId], references: [merchants.id] }),
  events: many(webhookEvents),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  endpoint: one(webhookEndpoints, { fields: [webhookEvents.endpointId], references: [webhookEndpoints.id] }),
}));

export const treasuryBalancesRelations = relations(treasuryBalances, ({ one }) => ({
  merchant: one(merchants, { fields: [treasuryBalances.merchantId], references: [merchants.id] }),
}));

export const merchantBadgesRelations = relations(merchantBadges, ({ one }) => ({
  merchant: one(merchants, { fields: [merchantBadges.merchantId], references: [merchants.id] }),
}));

export const paymentProofsRelations = relations(paymentProofs, ({ one }) => ({
  payment: one(payments, { fields: [paymentProofs.paymentId], references: [payments.id] }),
}));

export const paymentLinksRelations = relations(paymentLinks, ({ one }) => ({
  merchant: one(merchants, { fields: [paymentLinks.merchantId], references: [merchants.id] }),
  payment: one(payments, { fields: [paymentLinks.paymentId], references: [payments.id] }),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  merchant: one(merchants, { fields: [customers.merchantId], references: [merchants.id] }),
}));

export const merchantProfilesRelations = relations(merchantProfiles, ({ many }) => ({
  paymentWallets: many(businessWalletAddresses),
}));

export const businessWalletAddressesRelations = relations(businessWalletAddresses, ({ one }) => ({
  merchant: one(merchantProfiles, { fields: [businessWalletAddresses.walletAddress], references: [merchantProfiles.walletAddress] }),
}));

// Admin Users
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  walletAddress: text("wallet_address").unique(),
  role: adminRoleEnum("role").notNull().default("ADMIN"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

// Business Name Change Requests
export const businessNameChangeRequests = pgTable("business_name_change_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  currentName: text("current_name").notNull(),
  requestedName: text("requested_name").notNull(),
  reason: text("reason"),
  status: changeRequestStatusEnum("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => adminUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin Audit Logs
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id),
  action: text("action").notNull(), // e.g., "merchant.approved", "badge.issued", "config.updated"
  entityType: text("entity_type"), // "merchant", "payment", "config", etc.
  entityId: text("entity_id"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Global Config
export const globalConfig = pgTable("global_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => adminUsers.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Blocklist
export const blocklist = pgTable("blocklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "wallet", "merchant", "email"
  value: text("value").notNull(),
  reason: text("reason"),
  blockedBy: varchar("blocked_by").notNull().references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").references(() => merchants.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"), // "info", "warning", "success", "error"
  read: boolean("read").default(false).notNull(),
  createdBy: varchar("created_by").references(() => adminUsers.id), // Admin who sent the notification
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API Request Logs - Enhanced observability
export const apiRequestLogs = pgTable("api_request_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: text("request_id").notNull(), // Correlation ID
  merchantId: varchar("merchant_id").references(() => merchants.id),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code").notNull(),
  latency: integer("latency").notNull(), // milliseconds
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  errorTrace: text("error_trace"), // Error stack trace if any
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment Audit Logs - Internal audit trail
export const paymentAuditLogs = pgTable("payment_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => payments.id),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  action: text("action").notNull(), // "created", "status_changed", "settlement_routed", "cctp_initiated", etc.
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  metadata: text("metadata"), // JSON string for additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Settlement Routes - CCTP and same-chain routing
export const settlementRoutes = pgTable("settlement_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => payments.id),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  routeType: settlementRouteTypeEnum("route_type").notNull(), // "same_chain" or "cctp"
  sourceChainId: integer("source_chain_id"),
  destinationChainId: integer("destination_chain_id").notNull(), // Default: Arc (5042001/5042002)
  sourceCurrency: text("source_currency").notNull(),
  destinationCurrency: text("destination_currency").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  status: settlementRouteStatusEnum("status").notNull().default("pending"),
  cctpBurnTxHash: text("cctp_burn_tx_hash"), // CCTP burn transaction hash
  cctpMintTxHash: text("cctp_mint_tx_hash"), // CCTP mint transaction hash
  cctpAttestation: text("cctp_attestation"), // CCTP attestation message
  metadata: text("metadata"), // JSON string for additional routing data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// FX Quotes - On-chain FX rate quotes
export const fxQuotes = pgTable("fx_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").references(() => payments.id), // Optional: linked to payment
  merchantId: varchar("merchant_id").references(() => merchants.id), // Optional: merchant-specific quote
  fromCurrency: text("from_currency").notNull(), // e.g., "USDC"
  toCurrency: text("to_currency").notNull(), // e.g., "EURC"
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(), // Exchange rate
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(), // Amount in fromCurrency
  convertedAmount: decimal("converted_amount", { precision: 18, scale: 6 }).notNull(), // Amount in toCurrency
  status: fxQuoteStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at").notNull(), // Quote expiry time
  metadata: text("metadata"), // JSON string for additional quote data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 3A: Subscriptions (Non-custodial, Invoice-based)
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: text("currency").notNull().default("USDC"),
  interval: subscriptionIntervalEnum("interval").notNull().default("monthly"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  nextBillingAt: timestamp("next_billing_at").notNull(),
  gracePeriodDays: integer("grace_period_days").notNull().default(7),
  canceledAt: timestamp("canceled_at"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionSchedules = pgTable("subscription_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  invoiceId: varchar("invoice_id").references(() => invoices.id), // Generated invoice
  status: text("status").notNull().default("pending"), // pending, executed, skipped, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  paymentId: varchar("payment_id").references(() => payments.id), // PaymentIntent created for invoice
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 3B: Payouts (Merchant Withdrawals)
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: text("currency").notNull().default("USDC"),
  destinationWallet: text("destination_wallet").notNull(),
  destinationChainId: integer("destination_chain_id").notNull().default(5042002), // Default: Arc
  status: payoutStatusEnum("status").notNull().default("pending"),
  txHash: text("tx_hash"), // Transaction hash when completed
  failureReason: text("failure_reason"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payoutAttempts = pgTable("payout_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payoutId: varchar("payout_id").notNull().references(() => payouts.id),
  attemptNumber: integer("attempt_number").notNull().default(1),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 3C: Platform Fees & Splits (Ledger-based)
export const feeRules = pgTable("fee_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").references(() => merchants.id), // null = global rule
  feeType: text("fee_type").notNull(), // "platform", "processing"
  feeBasisPoints: integer("fee_basis_points"), // e.g., 30 = 0.3%
  feeFixedAmount: decimal("fee_fixed_amount", { precision: 18, scale: 6 }), // Fixed fee amount
  currency: text("currency").notNull().default("USDC"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const splitRules = pgTable("split_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  recipientWallet: text("recipient_wallet").notNull(),
  splitBasisPoints: integer("split_basis_points").notNull(), // e.g., 1000 = 10%
  currency: text("currency").notNull().default("USDC"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ledgerEntries = pgTable("ledger_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  paymentId: varchar("payment_id").references(() => payments.id),
  entryType: ledgerEntryTypeEnum("entry_type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(), // Positive = debit, Negative = credit
  currency: text("currency").notNull().default("USDC"),
  description: text("description"),
  feeRuleId: varchar("fee_rule_id").references(() => feeRules.id),
  splitRuleId: varchar("split_rule_id").references(() => splitRules.id),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const merchantsRelationsWithCustomers = relations(merchants, ({ many }) => ({
  customers: many(customers),
  paymentLinks: many(paymentLinks),
  qrCodes: many(qrCodes),
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  merchant: one(merchants, { fields: [qrCodes.merchantId], references: [merchants.id] }),
}));

export const paymentAuditLogsRelations = relations(paymentAuditLogs, ({ one }) => ({
  payment: one(payments, { fields: [paymentAuditLogs.paymentId], references: [payments.id] }),
  merchant: one(merchants, { fields: [paymentAuditLogs.merchantId], references: [merchants.id] }),
}));

export const settlementRoutesRelations = relations(settlementRoutes, ({ one }) => ({
  payment: one(payments, { fields: [settlementRoutes.paymentId], references: [payments.id] }),
  merchant: one(merchants, { fields: [settlementRoutes.merchantId], references: [merchants.id] }),
}));

export const fxQuotesRelations = relations(fxQuotes, ({ one }) => ({
  payment: one(payments, { fields: [fxQuotes.paymentId], references: [payments.id] }),
  merchant: one(merchants, { fields: [fxQuotes.merchantId], references: [merchants.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  merchant: one(merchants, { fields: [subscriptions.merchantId], references: [merchants.id] }),
  schedules: many(subscriptionSchedules),
  invoices: many(subscriptionInvoices),
}));

export const subscriptionSchedulesRelations = relations(subscriptionSchedules, ({ one }) => ({
  subscription: one(subscriptions, { fields: [subscriptionSchedules.subscriptionId], references: [subscriptions.id] }),
  invoice: one(invoices, { fields: [subscriptionSchedules.invoiceId], references: [invoices.id] }),
}));

export const subscriptionInvoicesRelations = relations(subscriptionInvoices, ({ one }) => ({
  subscription: one(subscriptions, { fields: [subscriptionInvoices.subscriptionId], references: [subscriptions.id] }),
  invoice: one(invoices, { fields: [subscriptionInvoices.invoiceId], references: [invoices.id] }),
  payment: one(payments, { fields: [subscriptionInvoices.paymentId], references: [payments.id] }),
}));

export const payoutsRelations = relations(payouts, ({ one, many }) => ({
  merchant: one(merchants, { fields: [payouts.merchantId], references: [merchants.id] }),
  attempts: many(payoutAttempts),
}));

export const payoutAttemptsRelations = relations(payoutAttempts, ({ one }) => ({
  payout: one(payouts, { fields: [payoutAttempts.payoutId], references: [payouts.id] }),
}));

export const feeRulesRelations = relations(feeRules, ({ one, many }) => ({
  merchant: one(merchants, { fields: [feeRules.merchantId], references: [merchants.id] }),
  ledgerEntries: many(ledgerEntries),
}));

export const splitRulesRelations = relations(splitRules, ({ one, many }) => ({
  merchant: one(merchants, { fields: [splitRules.merchantId], references: [merchants.id] }),
  ledgerEntries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  merchant: one(merchants, { fields: [ledgerEntries.merchantId], references: [merchants.id] }),
  payment: one(payments, { fields: [ledgerEntries.paymentId], references: [payments.id] }),
  feeRule: one(feeRules, { fields: [ledgerEntries.feeRuleId], references: [feeRules.id] }),
  splitRule: one(splitRules, { fields: [ledgerEntries.splitRuleId], references: [splitRules.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({ id: true, createdAt: true });
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, createdAt: true });
export const insertTreasuryBalanceSchema = createInsertSchema(treasuryBalances).omit({ id: true, updatedAt: true });
export const insertRefundSchema = createInsertSchema(refunds).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({ id: true, createdAt: true });
export const insertMerchantBadgeSchema = createInsertSchema(merchantBadges).omit({ id: true, createdAt: true });
export const insertPaymentProofSchema = createInsertSchema(paymentProofs).omit({ id: true, createdAt: true });
export const insertPaymentLinkSchema = createInsertSchema(paymentLinks).omit({ id: true, createdAt: true });
export const insertQRCodeSchema = createInsertSchema(qrCodes).omit({ id: true, createdAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMerchantProfileSchema = createInsertSchema(merchantProfiles).omit({ createdAt: true, updatedAt: true });
export const insertBusinessWalletAddressSchema = createInsertSchema(businessWalletAddresses).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertApiRequestLogSchema = createInsertSchema(apiRequestLogs).omit({ id: true, createdAt: true });
export const insertPaymentAuditLogSchema = createInsertSchema(paymentAuditLogs).omit({ id: true, createdAt: true });
export const insertSettlementRouteSchema = createInsertSchema(settlementRoutes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFxQuoteSchema = createInsertSchema(fxQuotes).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionScheduleSchema = createInsertSchema(subscriptionSchedules).omit({ id: true, createdAt: true });
export const insertSubscriptionInvoiceSchema = createInsertSchema(subscriptionInvoices).omit({ id: true, createdAt: true });
export const insertPayoutSchema = createInsertSchema(payouts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPayoutAttemptSchema = createInsertSchema(payoutAttempts).omit({ id: true, createdAt: true });
export const insertFeeRuleSchema = createInsertSchema(feeRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSplitRuleSchema = createInsertSchema(splitRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertTreasuryBalance = z.infer<typeof insertTreasuryBalanceSchema>;
export type TreasuryBalance = typeof treasuryBalances.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;
export type InsertWebhookSubscription = z.infer<typeof insertWebhookSubscriptionSchema>;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type InsertMerchantBadge = z.infer<typeof insertMerchantBadgeSchema>;
export type MerchantBadge = typeof merchantBadges.$inferSelect;
export type InsertPaymentProof = z.infer<typeof insertPaymentProofSchema>;
export type PaymentProof = typeof paymentProofs.$inferSelect;
export type InsertPaymentLink = z.infer<typeof insertPaymentLinkSchema>;
export type PaymentLink = typeof paymentLinks.$inferSelect;
export type InsertQRCode = z.infer<typeof insertQRCodeSchema>;
export type QRCode = typeof qrCodes.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertMerchantProfile = z.infer<typeof insertMerchantProfileSchema>;
export type MerchantProfile = typeof merchantProfiles.$inferSelect;
export type BusinessWalletAddress = typeof businessWalletAddresses.$inferSelect;
export type InsertBusinessWalletAddress = z.infer<typeof insertBusinessWalletAddressSchema>;

// Admin types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type BusinessNameChangeRequest = typeof businessNameChangeRequests.$inferSelect;
export type InsertBusinessNameChangeRequest = typeof businessNameChangeRequests.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;
export type GlobalConfig = typeof globalConfig.$inferSelect;
export type InsertGlobalConfig = typeof globalConfig.$inferInsert;
export type BlocklistEntry = typeof blocklist.$inferSelect;
export type InsertBlocklistEntry = typeof blocklist.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;
export type InsertApiRequestLog = typeof apiRequestLogs.$inferInsert;
export type PaymentAuditLog = typeof paymentAuditLogs.$inferSelect;
export type InsertPaymentAuditLog = typeof paymentAuditLogs.$inferInsert;
export type SettlementRoute = typeof settlementRoutes.$inferSelect;
export type InsertSettlementRoute = typeof settlementRoutes.$inferInsert;
export type FxQuote = typeof fxQuotes.$inferSelect;
export type InsertFxQuote = typeof fxQuotes.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionSchedule = typeof subscriptionSchedules.$inferSelect;
export type InsertSubscriptionSchedule = typeof subscriptionSchedules.$inferInsert;
export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type InsertSubscriptionInvoice = typeof subscriptionInvoices.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;
export type PayoutAttempt = typeof payoutAttempts.$inferSelect;
export type InsertPayoutAttempt = typeof payoutAttempts.$inferInsert;
export type FeeRule = typeof feeRules.$inferSelect;
export type InsertFeeRule = typeof feeRules.$inferInsert;
export type SplitRule = typeof splitRules.$inferSelect;
export type InsertSplitRule = typeof splitRules.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;
