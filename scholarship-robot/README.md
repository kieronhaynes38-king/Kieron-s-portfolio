# Scholarship Robot

Local scholarship CRM and application automation service for Kieron Christopher
Haynes. It uses only the Node runtime already bundled with Codex; there is no npm
install, Python environment, cloud database, or paid API.

## Start

Copy `config/private-profile.example.json` to
`config/private-profile.json`, enter the applicant's private details, then
double-click `start-scholarship-robot.cmd`. It starts the service in the
background and opens the dashboard.

To stop it, double-click `stop-scholarship-robot.cmd`.

For a visible foreground server, run:

```powershell
.\serve.ps1 -Port 4173
```

Open `http://127.0.0.1:4173/`. The service binds only to `127.0.0.1`.

## What Works

- Validates the private applicant profile before preparing an application.
- Tracks a persistent application queue with submission status and blockers.
- Creates review files, JSON browser packets, and RFC-compatible `.eml` drafts.
- Supports guarded Gmail SMTP sending for complete email applications.
- Blocks unknown/prohibited AI use, signatures, recommendations, missing accounts, expired deadlines, and missing approval.
- Never stores passwords, SSNs, FSA IDs, banking data, or tax documents.
- Includes a Chrome/Edge autofill extension that never submits.

Prepared packets are written to `outbox/<application-id>/`. The outbox, private profile, real queue, receipts, and logs are git-ignored.

## CLI

```powershell
.\bot.ps1 check
.\bot.ps1 status
.\bot.ps1 prepare
.\bot.ps1 prepare sallie-grad-no-essay
.\bot.ps1 serve --port 4173
```

## Email Sending

Sending requires a verified email-only record, reviewed AI policy, complete attachments, no missing signature/recommendation, per-application approval, and explicit `SEND` confirmation.

```powershell
$env:SCHOLARSHIP_SMTP_USER = "your-gmail-address"
$env:SCHOLARSHIP_SMTP_APP_PASSWORD = "your-google-app-password"
.\serve.ps1 -Port 4173
```

Use a Google app password, not the normal Gmail password. Never put credentials in source files.

## Browser Autofill

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose `Load unpacked` and select `extension`.
4. Import `config/private-profile.json` in the popup.
5. Open an application and choose `Fill Current Page`.

The extension fills common contact, address, school, degree, major, graduation, GPA, and portfolio fields. It skips passwords, SSNs, financial/tax/FAFSA fields, file uploads, signatures, certifications, recommendations, radios, consent checkboxes, and submit buttons.

## Files

- `server.mjs`: local HTTP/API service
- `bot.mjs`: command-line entry point
- `lib/automation.mjs`: validation, packets, MIME, and SMTP engine
- `config/private-profile.json`: private applicant data; git-ignored
- `state/application-queue.example.json`: safe starter queue
- `state/application-queue.json`: private persistent queue; git-ignored
- `outbox/`: private generated packets and email drafts; git-ignored
- `extension/`: browser autofill companion
- `tests/run-tests.mjs`: no-dependency engine tests

## Safety Boundary

The robot can prepare every application and send complete email-only applications after explicit approval. Online applications remain fill-and-pause because sponsor forms commonly include legal attestations, applicant-only signatures, terms, or account challenges. The bot records blockers instead of fabricating answers or falsely claiming submission.
