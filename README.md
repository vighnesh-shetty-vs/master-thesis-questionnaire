# Standalone HTTPS thesis survey — English / French

A mobile-first, standalone website. Public respondents **do not use Google Apps Script, Google Drive, or Google account authorization**.

## What is implemented

- Responsive, three-section participant questionnaire with 24 questions based on the previous thesis question schema.
- English / French language selection. Respondents can switch without losing the choices already made; stored values are language-independent codes.
- Text answers can be typed or dictated using the phone's normal keyboard microphone. An optional in-page speech-to-text button appears only if the browser supports the Web Speech API. Text is displayed and remains editable prior to submission. Browser speech services can process audio externally; the website neither saves nor submits audio files.
- Explicit voluntary consent and plain-language research information.
- Separate optional interview volunteer page that stores contact information in a **different form** from the anonymous questionnaire.
- Netlify Forms backend: data viewable in Netlify Forms admin and exportable to CSV. **No Google Sheets synchronization** in this version.
- A static Netlify form blueprint at `__forms.html`; JavaScript sends URL-encoded POST submissions to that file.
- A honeypot field for basic bot protection.

## IMPORTANT: Before publishing, edit `config.js`

Change the four `REPLACE_...` placeholders: approved research contact email, approved data controller, privacy contact, and approved retention period. The UI intentionally blocks form submission while placeholders remain.

**Seek approval from your KEDGE supervisor/institutional data protection contact before accepting real responses.** Confirm lawful basis; identity and contact information of controller; data processors and international transfers; participant rights and withdrawal arrangements; retention; disclosure of browser-based dictation; age appropriateness; permission to use Netlify Forms; and whether your survey requires an institutional ethics review. The questionnaire is anonymous by design but open-ended responses can contain indirect identifiers, and the hosting provider may process metadata.

## Deploy from a GitHub repository with Netlify

This site uses Netlify Forms to receive and store responses. **GitHub Pages alone only hosts static files and will not collect answers with the current form code.**

1. Push the contents of this folder to the root of a GitHub repository, so `index.html` is at the repository root. Do not commit any respondent data or exported submissions.
2. In Netlify, choose **Add new site → Import an existing project**, connect GitHub, and select the repository. Use the repository root as the base directory, leave the build command empty, and set the publish directory to `.`.
3. Before collecting real responses, replace the four `REPLACE_...` values in `config.js` with institutionally approved privacy information, commit, and push the change. The forms intentionally remain disabled until these details are complete.
4. In the Netlify site dashboard open **Forms** and enable form detection, then trigger a new deploy. Confirm Netlify detects `thesis-survey` and `thesis-interview`.
5. Test the generated HTTPS site on mobile and desktop. Submit fictional test entries to both forms and confirm they appear separately in Netlify Forms. Delete the test submissions before recruiting.
6. Only after approvals and testing, share the Netlify site URL with participants. Subsequent commits pushed to GitHub will trigger site redeploys.

The GitHub repository contains the website source; response records are stored in the Netlify account, not in GitHub.

## Confirm that the site is ready to share

- Public site opens without a Google login or Drive redirect.
- Changing languages preserves entered answers and question meanings.
- Required profile questions and consent stop empty submissions.
- Keyboard microphone works if enabled on the participant's device. Optional Web Speech API microphone is *best effort*, not universal.
- Both survey and interview submissions appear in separate Netlify forms. Check Netlify spam if a test appears missing.
- The public site does not disclose the response admin or contact list.
- Privacy notice and data processing arrangement are approved.

## Files and mapping

- `index.html`: main questionnaire layout.
- `survey.js`: questionnaire rendering and posting.
- `questions.json`: the original 24 English and French thesis questions with identical IDs `Q01–Q24`.
- `interview.html` and `interview.js`: separate follow-up contact form.
- `styles.css`: responsive accessible styling.
- `__forms.html`: static backend form detection blueprint. Keep it in the deployment.
- `_headers`: conservative browser security headers.
- `config.js`: privacy details and questionnaire version.

### CSV coding

The survey stores answers as `Q01..Q24` with choice values coded as zero-based option indices. In multi-select questions, selected indices are pipe-separated (e.g. `1|3|5`). For Likert scales, always consult the actual option order in `questions.json` before interpreting values. `language`, `consent`, and `survey_version` are separate fields. The collected contact details from `thesis-interview` must **not** be merged with anonymous survey records by IP, timestamp, or other indirect identifiers.

### Existing responses

This is a **new** collection endpoint. Existing responses previously submitted to a Google Sheet through Apps Script are not migrated or deleted. Do not delete the old spreadsheet. Export both sources into your analysis workspace, keep each dataset's origin/version documented, and deduplicate only when you have a defensible basis for doing so.

## Limitations

- No public Netlify site was created or remotely tested by ChatGPT. You must deploy it in your own hosting account.
- Netlify form quotas, pricing, and data residency depend on your account and agreements. Check suitability before collecting personal data.
- Speech recognition is not uniformly supported or privately processed. Typing and keyboard dictation are always the fallback.
- The survey measures self-reported experiences, not causal effects; responses may be self-selected and sectorally unbalanced.

Sources: https://docs.netlify.com/manage/forms/setup/ ; https://docs.netlify.com/manage/forms/submissions/ ; https://app.netlify.com/drop ; https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
