# Job Application Robot

Responsive job-search CRM for Kieron Christopher Haynes.

The current build contains 500 deduplicated job prospects:

- 420 listings marked for USA, U.S., North America, or worldwide remote work.
- 80 in-person or hybrid listings located in New Orleans.
- A unique, editable cover letter and reusable application answers for every job.
- Fit scoring based on the resume and public portfolio.
- Filters, saved jobs, status tracking, notes, follow-up dates, and CSV exports.

## Files

- `index.html`: application structure
- `styles.css`: desktop and mobile layout
- `app.js`: filtering, tracking, cover-letter editor, and exports
- `jobs-data.js`: generated 500-job dataset and cover letters
- `500_jobs.csv`: spreadsheet export of the initial ranked list
- `scripts/collect-jobs.mjs`: no-dependency live job collector
- `collection-report.json`: source counts from the most recent collection
- `server.mjs`: restricted local static server
- `tests/validate-data.mjs`: dataset integrity and eligibility checks

## Refresh

Run with the Node.js runtime:

```powershell
node .\scripts\collect-jobs.mjs
```

The collector reads current public job feeds from employer Greenhouse boards,
Jobicy, Remotive, Tulane University, Ochsner Health, and Entergy. It rewrites
`jobs-data.js`, `500_jobs.csv`, and `collection-report.json`.

## Launch

Double-click `start-job-robot.cmd`, or run:

```powershell
node .\server.mjs
```

Then open `http://127.0.0.1:4174/`. The published GitHub Pages build does not
require the local server.

## Validate

```powershell
node .\tests\validate-data.mjs
```

## Safety

The robot does not submit job applications. It opens the live application,
stores tracking notes in the current browser, and provides editable draft
materials. Availability, Louisiana remote eligibility, required years,
employment authorization, salary, and application answers must be checked on
the live employer page.
