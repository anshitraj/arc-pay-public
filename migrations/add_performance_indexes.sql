-- Migration: Add performance indexes for faster queries
-- These indexes improve query performance for common operations

-- Indexes for payments table (already exist, but ensure they're there)
CREATE INDEX IF NOT EXISTS idx_payments_merchant_id_created_at ON payments(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_is_test_merchant_id ON payments(is_test, merchant_id);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_merchant_id_created_at ON invoices(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_merchant_id ON invoices(status, merchant_id);

-- Indexes for webhook events (for faster lookups)
CREATE INDEX IF NOT EXISTS idx_webhook_events_endpoint_id_status ON webhook_events(endpoint_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Indexes for API request logs (for faster querying)
CREATE INDEX IF NOT EXISTS idx_api_request_logs_merchant_id_created_at ON api_request_logs(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_path_status ON api_request_logs(path, status_code);

-- Indexes for treasury balances (for faster lookups)
CREATE INDEX IF NOT EXISTS idx_treasury_balances_merchant_currency ON treasury_balances(merchant_id, currency);

