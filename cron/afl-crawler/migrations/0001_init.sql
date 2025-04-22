-- Migration number: 0001 	 2025-04-10T23:43:26.744Z
DROP TABLE IF EXISTS jobs;

CREATE TABLE Job (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  field TEXT NOT NULL,
  description TEXT NOT NULL,
  -- created_at TEXT NOT NULL,
  visa_sponsor BOOLEAN,
  experience INTEGER,
  swedish VARCHAR(10),
  skills TEXT,
  education TEXT,
  lastApplicationDate	INTEGER
);

CREATE INDEX idx_job_region ON Job(region);
CREATE INDEX idx_job_field ON Job(field);
