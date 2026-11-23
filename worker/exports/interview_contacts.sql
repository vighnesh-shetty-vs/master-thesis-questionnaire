SELECT
  submitted_at,
  language,
  preferred_name,
  email,
  preferred_format,
  discussion_topic
FROM interview_contacts
ORDER BY submitted_at;
