# Thesis survey coding notes

The survey retains `Q01` through `Q24` from the previous bilingual question bank in `questions.json`. The first five required variables are role, location, organization size, AI-use frequency and frequency of AI influence (`Q01`, `Q02`, `Q03`, `Q05`, `Q08`). All other question responses are optional.

## Sampling and analyses

- Q01–Q07: professional background and exposure to AI systems.
- Q08–Q19: decision role of AI, perceived quality / efficacy, organizational data readiness, trust, verification practices, barriers and perceived reliance on intuition.
- Q20–Q23: open-ended personal examples and suggestions (qualitative thematic analysis).
- Q24: willingness to receive an **unlinked** interview invitation. Interview contact form is separate, and a Q24 Yes answer alone contains no contact details.

Export the `thesis-survey` CSV from Netlify Forms. Interpret multi-choice numerical values using the *ordered* English labels in `questions.json`. The `0` index is the first choice, and `5` is the sixth choice (where available). For Likert items Q10–Q15 the "Not applicable" option must be handled as missing, not as a high or low score. The English and French choices are positionally aligned; validate both translations before release.

Questionnaire should be piloted with 3–5 people on Android/iOS and in both languages. No statistical analysis is valid until authenticity, response quality, exclusions and coding are reviewed.
