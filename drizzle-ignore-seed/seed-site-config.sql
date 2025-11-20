-- Insert initial site config records (skip if already exist)
INSERT OR IGNORE INTO site_config (uuid, scope, config, created_at, updated_at)
VALUES
  ('ZgyvcqDDikAvHY7s02hS6', 'client', '{}', unixepoch(), unixepoch()),
  ('dhW8qKoRN4bNHIwpAvh37', 'admin', '{}', unixepoch(), unixepoch()),
  ('29xpjYWJLPrYrIY13gKOr', 'common', '{}', unixepoch(), unixepoch());
