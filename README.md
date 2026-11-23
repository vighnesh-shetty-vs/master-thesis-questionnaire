# AI and Business Decisions questionnaire

This bilingual, mobile-friendly questionnaire is hosted as a static site on GitHub Pages. A Cloudflare Worker receives submissions and writes them to Cloudflare D1. The existing page layout and question flow are retained.

## Where responses are stored

- Survey answers are stored in the `survey_responses` D1 table.
- Interview volunteer details are stored separately in `interview_contacts`.
- Neither kind of response is written to the GitHub repository. Do not commit exports or respondent data.
- The Worker uses the request IP as a transient rate-limit key but does not store it in D1. Cloudflare may process connection metadata as part of providing its service.
- A scheduled Worker task removes records older than `RETENTION_MONTHS` (default: 12 months). Keep that value aligned with the approved retention notice in `config.js`.
- Existing submissions in any previous Netlify deployment are not migrated or deleted by this change. Export them separately before retiring that service.

The interview form contains identifiable contact information. Keep it separate from survey answers and do not link the two by submission time or other indirect identifiers. Obtain institutional approval for the data controller, lawful basis, processors, data location, participant rights, retention, voice input, and ethics review before collecting real responses. The configured privacy text must be accurate and approved.

## Deploy the GitHub Pages frontend

The repository includes `.github/workflows/pages.yml`.

1. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
2. Push to `main` or run the workflow manually under **Actions**. The site should appear at `https://vighnesh-shetty-vs.github.io/master-thesis-questionnaire/`.
3. Asset links are relative so the site works from the repository subpath.

## Deploy the Cloudflare backend

You need a Cloudflare account. Cloudflare Workers and D1 have plan limits; check current quotas, pricing, data location, and terms before collecting responses. This is not a limitless or guaranteed-zero-cost service.

1. Install Node.js, then in a terminal run:

   ```sh
   cd worker
   npx wrangler login
   npx wrangler d1 create thesis-questionnaire
   ```

2. Copy the `database_id` returned by the create command into `worker/wrangler.toml`, replacing the all-zero placeholder UUID. If your approved data-location requirements call for EU-only storage, create the database with `--jurisdiction eu` and confirm that this meets your institution’s requirements.
3. Apply the schema and deploy the Worker:

   ```sh
   npx wrangler d1 migrations apply thesis-questionnaire --remote
   npx wrangler deploy
   ```

4. Copy the deployed `https://...workers.dev` URL into `apiBaseUrl` in the root `config.js` (without a path such as `/api`). Keep the four privacy fields institutionally approved.
5. Push the `config.js` update. GitHub Actions will publish the frontend. The browser only enables submissions when the API URL and privacy values are configured.
6. The Worker’s `ALLOWED_ORIGIN` is set to `https://vighnesh-shetty-vs.github.io`, which is the browser origin for this GitHub Pages site. If you use another domain, update it in `worker/wrangler.toml` and redeploy the Worker.
7. The Worker has an approximate 30-submission-per-minute rate limit per IP and Cloudflare location. The endpoint is still public; CORS is a browser restriction, not authentication. The Worker also validates every field and ignores submissions that fill the honeypot.
8. Test both forms with fictional data, verify the rows in D1, and remove test rows before recruitment. Do not use real participant data until privacy and institutional approvals are complete.

## Retrieve responses for analysis

Use Wrangler while logged into the Cloudflare account. From the `worker` folder, export each dataset separately:

```sh
npx wrangler d1 execute thesis-questionnaire --remote --file=exports/survey_responses.sql --json > survey-responses.json
npx wrangler d1 execute thesis-questionnaire --remote --file=exports/interview_contacts.sql --json > interview-contacts.json
```

These output files are local analysis files and must not be committed. Excel can import JSON using **Data → Get Data → From File → From JSON**. Keep the interview contact export restricted and separate from the anonymous survey export.

Choice responses are stored as zero-based option indices (multi-select answers are pipe-separated). Use `questions.json` to map indices back to labels. The survey export query presents each `Q01`–`Q24` answer as a separate column.

## Development and tests

Run the backend tests with:

```sh
cd worker
npm test
```

The tests cover validation, origin restrictions, separate storage tables, the honeypot, and retention cleanup.
