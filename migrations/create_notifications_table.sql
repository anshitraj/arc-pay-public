-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR REFERENCES merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on merchant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_merchant_id ON notifications(merchant_id);

-- Create index on read status for faster unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(merchant_id, read) WHERE read = FALSE;

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

