'use strict';

export const OPTION_COUNTS = [8, 5, 6, 8, 6, 8, 8, 6, 5, 6, 6, 6, 6, 6, 6, 6, 5, 9, 6, null, null, null, null, 3];
const REQUIRED_QUESTIONS = new Set(['Q01', 'Q02', 'Q03', 'Q05', 'Q08']);
const MAX_BODY_BYTES = 32 * 1024;
const MAX_EMAIL_LENGTH = 150;

function jsonResponse(body, status, origin) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Vary', 'Origin');
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function isLanguage(value) {
  return value === 'en' || value === 'fr';
}

function validateSurvey(body) {
  if (!isLanguage(body.language)) return 'Invalid language.';
  if (body.consent !== 'yes') return 'Consent is required.';
  if (typeof body.survey_version !== 'string' || body.survey_version.length > 32) return 'Invalid survey version.';
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) return 'Invalid answers.';

  const keys = Object.keys(body.answers);
  if (keys.length !== OPTION_COUNTS.length) return 'All question fields must be included.';

  for (let i = 0; i < OPTION_COUNTS.length; i++) {
    const id = `Q${String(i + 1).padStart(2, '0')}`;
    const value = body.answers[id];
    if (typeof value !== 'string') return `Invalid value for ${id}.`;
    if (REQUIRED_QUESTIONS.has(id) && value === '') return `${id} is required.`;

    const optionCount = OPTION_COUNTS[i];
    if (optionCount === null) {
      if (value.length > 5000) return `${id} is too long.`;
      continue;
    }
    if (value === '') continue;

    const choices = i === 5 || i === 6 || i === 17
      ? value.split('|')
      : [value];
    if (choices.some(choice => !/^\d+$/.test(choice) || Number(choice) >= optionCount)) {
      return `Invalid choice for ${id}.`;
    }
    if (new Set(choices).size !== choices.length) return `Duplicate choice for ${id}.`;
  }
  return null;
}

function validateInterview(body) {
  if (!isLanguage(body.language)) return 'Invalid language.';
  if (body.contact_consent !== 'yes') return 'Contact consent is required.';
  if (typeof body.email !== 'string' || body.email.length > MAX_EMAIL_LENGTH ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'A valid email is required.';
  if (typeof body.preferred_name !== 'string' || body.preferred_name.length > 100) return 'Invalid preferred name.';
  if (typeof body.preferred_format !== 'string' || !/^[0-3]$/.test(body.preferred_format)) return 'Invalid interview format.';
  if (typeof body.discussion_topic !== 'string' || body.discussion_topic.length > 2000) return 'Discussion topic is too long.';
  return null;
}

async function readJson(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { error: 'Content-Type must be application/json.' };
  }
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return { error: 'Request is too large.' };

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { error: 'Request is too large.' };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: 'Invalid JSON.' };
  }
}

async function saveSurvey(body, env) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO survey_responses
      (id, submitted_at, language, consent, survey_version, answers_json)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).bind(crypto.randomUUID(), now, body.language, body.survey_version, JSON.stringify(body.answers)).run();
}

async function saveInterview(body, env) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO interview_contacts
      (id, submitted_at, language, preferred_name, email, preferred_format, discussion_topic, contact_consent)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    crypto.randomUUID(),
    now,
    body.language,
    body.preferred_name,
    body.email,
    body.preferred_format,
    body.discussion_topic
  ).run();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: 'Origin not allowed.' }, 403);
    }

    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return jsonResponse({ ok: true }, 200, origin);
    }
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin);
    if (url.pathname !== '/api/survey' && url.pathname !== '/api/interview') {
      return jsonResponse({ error: 'Not found.' }, 404, origin);
    }
    if (env.SUBMISSION_LIMITER) {
      const key = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rate = await env.SUBMISSION_LIMITER.limit({ key });
      if (!rate.success) return jsonResponse({ error: 'Too many submissions. Please try again later.' }, 429, origin);
    }

    const parsed = await readJson(request);
    if (parsed.error) return jsonResponse({ error: parsed.error }, 400, origin);
    const body = parsed.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'Invalid request body.' }, 400, origin);
    }
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return jsonResponse({ ok: true }, 202, origin);
    }

    const error = url.pathname === '/api/survey' ? validateSurvey(body) : validateInterview(body);
    if (error) return jsonResponse({ error }, 400, origin);

    try {
      if (url.pathname === '/api/survey') await saveSurvey(body, env);
      else await saveInterview(body, env);
      return jsonResponse({ ok: true }, 201, origin);
    } catch (error) {
      console.error('Response could not be saved.', error);
      return jsonResponse({ error: 'Submission could not be saved. Please try again.' }, 500, origin);
    }
  },

  async scheduled(_controller, env) {
    const months = Number(env.RETENTION_MONTHS || '12');
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      throw new Error('RETENTION_MONTHS must be an integer from 1 to 120.');
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM survey_responses WHERE submitted_at < datetime('now', '-' || ? || ' months')").bind(months),
      env.DB.prepare("DELETE FROM interview_contacts WHERE submitted_at < datetime('now', '-' || ? || ' months')").bind(months)
    ]);
  }
};
