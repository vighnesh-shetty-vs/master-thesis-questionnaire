import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import worker, { OPTION_COUNTS } from '../src/index.js';

const origin = 'https://vighnesh-shetty-vs.github.io';
const questions = JSON.parse(readFileSync(new URL('../../questions.json', import.meta.url), 'utf8'));

test('answer-choice validation matches the bilingual questionnaire schema', () => {
  const counts = questions.en.map(question => question.kind === 'long' ? null : question.options.length);
  assert.deepEqual(counts, OPTION_COUNTS);
  assert.deepEqual(
    questions.en.map(question => question.options.length),
    questions.fr.map(question => question.options.length)
  );
});

function createEnv() {
  const statements = [];
  return {
    statements,
    ALLOWED_ORIGIN: origin,
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              sql,
              values,
              async run() {
                statements.push({ sql, values });
                return { success: true };
              }
            };
          }
        };
      },
      async batch(statementsToRun) {
        statements.push(...statementsToRun.map(statement => ({
          sql: statement.sql,
          values: statement.values
        })));
        return statementsToRun.map(() => ({ success: true }));
      }
    }
  };
}

function makeAnswers() {
  const answers = Object.fromEntries(
    Array.from({ length: 24 }, (_, i) => [`Q${String(i + 1).padStart(2, '0')}`, ''])
  );
  for (const id of ['Q01', 'Q02', 'Q03', 'Q05', 'Q08']) answers[id] = '0';
  return answers;
}

function post(path, body, requestOrigin = origin) {
  return new Request(`https://api.example.test${path}`, {
    method: 'POST',
    headers: {
      Origin: requestOrigin,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

test('stores valid survey answers in the survey table', async () => {
  const env = createEnv();
  const response = await worker.fetch(post('/api/survey', {
    language: 'en',
    consent: 'yes',
    survey_version: '1.0',
    website: '',
    answers: makeAnswers()
  }), env);

  assert.equal(response.status, 201);
  assert.match(env.statements[0].sql, /INSERT INTO survey_responses/);
});

test('stores interview contact details separately', async () => {
  const env = createEnv();
  const response = await worker.fetch(post('/api/interview', {
    language: 'fr',
    preferred_name: 'Test',
    email: 'test@example.com',
    preferred_format: '0',
    discussion_topic: '',
    contact_consent: 'yes',
    website: ''
  }), env);

  assert.equal(response.status, 201);
  assert.match(env.statements[0].sql, /INSERT INTO interview_contacts/);
  assert.doesNotMatch(env.statements[0].sql, /survey_responses/);
});

test('rejects origins other than the configured Pages origin', async () => {
  const env = createEnv();
  const response = await worker.fetch(post('/api/survey', {}, 'https://other.example'), env);

  assert.equal(response.status, 403);
  assert.equal(env.statements.length, 0);
});

test('allows CORS preflight from the configured Pages origin', async () => {
  const env = createEnv();
  const response = await worker.fetch(new Request('https://api.example.test/api/survey', {
    method: 'OPTIONS',
    headers: { Origin: origin }
  }), env);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
});

test('rejects submissions when the configured rate limit is exceeded', async () => {
  const env = createEnv();
  env.SUBMISSION_LIMITER = {
    async limit() {
      return { success: false };
    }
  };
  const response = await worker.fetch(post('/api/survey', {}), env);

  assert.equal(response.status, 429);
  assert.equal(env.statements.length, 0);
});

test('rejects invalid answer choices without saving', async () => {
  const env = createEnv();
  const answers = makeAnswers();
  answers.Q01 = '99';
  const response = await worker.fetch(post('/api/survey', {
    language: 'en',
    consent: 'yes',
    survey_version: '1.0',
    website: '',
    answers
  }), env);

  assert.equal(response.status, 400);
  assert.equal(env.statements.length, 0);
});

test('does not save submissions that fill the honeypot', async () => {
  const env = createEnv();
  const response = await worker.fetch(post('/api/survey', {
    language: 'en',
    consent: 'yes',
    survey_version: '1.0',
    website: 'bot-filled-this',
    answers: makeAnswers()
  }), env);

  assert.equal(response.status, 202);
  assert.equal(env.statements.length, 0);
});

test('scheduled retention cleanup deletes both data sets', async () => {
  const env = createEnv();
  await worker.scheduled({}, env);

  assert.equal(env.statements.length, 2);
  assert.match(env.statements[0].sql, /DELETE FROM survey_responses/);
  assert.match(env.statements[1].sql, /DELETE FROM interview_contacts/);
  assert.deepEqual(env.statements.map(statement => statement.values[0]), [12, 12]);
});
