CREATE TABLE survey_responses (
  id TEXT PRIMARY KEY NOT NULL,
  submitted_at TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'fr')),
  consent INTEGER NOT NULL CHECK (consent = 1),
  survey_version TEXT NOT NULL,
  answers_json TEXT NOT NULL
);

CREATE INDEX survey_responses_submitted_at
  ON survey_responses (submitted_at);

CREATE TABLE interview_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  submitted_at TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'fr')),
  preferred_name TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_format TEXT NOT NULL,
  discussion_topic TEXT NOT NULL,
  contact_consent INTEGER NOT NULL CHECK (contact_consent = 1)
);

CREATE INDEX interview_contacts_submitted_at
  ON interview_contacts (submitted_at);
