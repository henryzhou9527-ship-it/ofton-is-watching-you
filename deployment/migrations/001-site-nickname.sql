-- Apply once when upgrading an existing deployment. Does not change any nickname.
CREATE TABLE IF NOT EXISTS site_preferences (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
