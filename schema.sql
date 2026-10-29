CREATE TABLE IF NOT EXISTS internships (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  domain    TEXT NOT NULL,
  mode      TEXT NOT NULL CHECK (mode IN ('Remote', 'Hybrid', 'On-site')),
  location  TEXT NOT NULL,
  skills    TEXT NOT NULL DEFAULT '[]',   -- JSON array stored as text
  openings  INTEGER NOT NULL DEFAULT 0 CHECK (openings >= 0)
);

CREATE INDEX IF NOT EXISTS idx_internships_domain ON internships (domain);
CREATE INDEX IF NOT EXISTS idx_internships_mode ON internships (mode);
