-- Database schema for CRM-4 Marketing & Engagement (Port 5104, Database crm4_db)
-- Order-to-Cash Step 1: Campaigns, Audiences, Templates, Enquiries & Surveys

-- Sequences for Entity IDs
CREATE SEQUENCE IF NOT EXISTS campaign_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS campaign_message_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS audience_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS audience_member_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS enquiry_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS template_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS survey_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS survey_response_seq START WITH 1;

-- 1. Message Templates Table [CRM4-C1]
CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Marketing Campaigns Table [CRM4-A1]
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  objective TEXT,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  segment_id VARCHAR(20) NOT NULL,
  template_id VARCHAR(20) NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Campaign Simulated Messages Table [CRM4-A3]
CREATE TABLE IF NOT EXISTS campaign_messages (
  id VARCHAR(20) PRIMARY KEY,
  campaign_id VARCHAR(20) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Target Audiences Table [CRM4-B1]
CREATE TABLE IF NOT EXISTS audiences (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Audience Members Table [CRM4-B1, CRM4-B3]
CREATE TABLE IF NOT EXISTS audience_members (
  id VARCHAR(20) PRIMARY KEY,
  audience_id VARCHAR(20) NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  customer_id VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_audience_member UNIQUE (audience_id, customer_id)
);

-- 6. Web & Dealer Enquiries Table [CRM4-B4]
CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('dealer', 'web', 'walk-in')),
  product_interest VARCHAR(50) NOT NULL,
  lead_id VARCHAR(50),
  sales_rep_id VARCHAR(20) DEFAULT 'EMP-0001',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Feedback Surveys Table [CRM4-D1]
CREATE TABLE IF NOT EXISTS surveys (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('nps', 'csat')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Survey Responses Table [CRM4-D1]
CREATE TABLE IF NOT EXISTS survey_responses (
  id VARCHAR(20) PRIMARY KEY,
  survey_id VARCHAR(20) NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  customer_id VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- B-Tree Performance Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_segment_id ON campaigns(segment_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_customer_id ON campaign_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_audience_members_audience_id ON audience_members(audience_id);
CREATE INDEX IF NOT EXISTS idx_audience_members_customer_id ON audience_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_lead_id ON enquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_product_interest ON enquiries(product_interest);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_customer_id ON survey_responses(customer_id);
