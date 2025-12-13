import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "processing", "final", "refunded", "failed"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled"]);
export const webhookEventTypeEnum = pgEnum("webhook_event_type", ["payment.created", "payment.finalized", "payment.refunded", "invoice.created", "invoice.paid"]);

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: text("currency").notNull().default("USDC"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  description: text("description"),
  customerEmail: text("customer_email"),
  txHash: text("tx_hash"),
  settlementTime: integer("settlement_time"),
  metadata: text("metadata"),
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
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastAttempt: timestamp("last_attempt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const treasuryBalances = pgTable("treasury_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id),
  currency: text("currency").notNull(),
  balance: decimal("balance", { precision: 18, scale: 6 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  merchant: one(merchants, { fields: [payments.merchantId], references: [merchants.id] }),
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({ id: true, createdAt: true });
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, createdAt: true });
export const insertTreasuryBalanceSchema = createInsertSchema(treasuryBalances).omit({ id: true, updatedAt: true });

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
