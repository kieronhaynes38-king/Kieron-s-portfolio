# Manual Test Checklist

## Service

- Start with `.\serve.ps1 -Port 4173`.
- Open `http://127.0.0.1:4173/`.
- Confirm Application Engine shows `Service Online`.
- Confirm queue totals match the private local queue.
- Click `Prepare All Packets` and confirm one packet per queue item.

## Privacy

- Confirm the private profile and real application queue are listed in `.gitignore`.
- Confirm the webpage shows masked email/phone from `/api/profile`.
- Confirm no password, SSN, FSA ID, bank, or tax fields exist in the profile.
- Confirm no confirmation URLs, receipts, email drafts, or logs are committed.

## Queue Guardrails

- Confirm recommendations, signatures, unknown AI policies, and missing approval block sending.
- Confirm postal-mail-only opportunities are excluded from automation.
- Confirm browser-ready records stop before final submission.
- Confirm submitted records retain confirmation details only in the private local queue.

## Packet Output

- Run `.\bot.ps1 prepare`.
- Confirm each item has `outbox/<id>/application-packet.json` and `review.md`.
- Confirm email applications also have `application.eml`.
- Confirm blocked packets clearly list every blocker.

## Browser Extension

- Load the `extension` folder as an unpacked extension.
- Import `config/private-profile.json`.
- Open a test form and choose `Fill Current Page`.
- Confirm ordinary profile fields fill while passwords, checkboxes, radios, signatures, file uploads, and submit buttons remain untouched.

## Email Safety

- Leave SMTP environment variables unset and confirm sending is blocked.
- Confirm a missing signature or unknown AI policy blocks sending.
- Configure a test SMTP account only after reviewing a complete packet.
