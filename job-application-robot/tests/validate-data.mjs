import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../jobs-data.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);

const data = context.window.JOB_APPLICATION_ROBOT_DATA;
const jobs = data.jobs;
const ids = new Set(jobs.map((job) => job.id));
const urls = new Set(jobs.map((job) => job.applyUrl));
const letters = new Set(jobs.map((job) => job.coverLetter));
const resumes = new Set(jobs.map((job) => job.tailoredResume));
const remote = jobs.filter((job) => job.workMode === "Remote");
const local = jobs.filter((job) => job.workMode === "New Orleans");
const blockedTitles = /\b(nurse|physician|therapist|pharmacist|radiology|surgical|sterile compounding|med surg)\b/i;
const invalidLocal = local.filter((job) => !/new orleans/i.test(job.location));
const invalidRemote = remote.filter((job) => !/(remote|usa|u\.s\.|united states|north america|americas|worldwide)/i.test(`${job.title} ${job.location}`));
const clinicalTitles = jobs.filter((job) => blockedTitles.test(job.title));
const malformedUrls = jobs.filter((job) => {
  try {
    return new URL(job.applyUrl).protocol !== "https:";
  } catch {
    return true;
  }
});

assert.equal(jobs.length, 500, "The dataset must contain exactly 500 jobs.");
assert.equal(ids.size, 500, "Every job must have a unique ID.");
assert.equal(urls.size, 500, "Every job must have a unique application URL.");
assert.equal(letters.size, 500, "Every job must have a distinct cover letter.");
assert.equal(resumes.size, 500, "Every job must have a distinct tailored resume.");
assert.equal(remote.length, 420, "The dataset must contain 420 remote jobs.");
assert.equal(local.length, 80, "The dataset must contain 80 New Orleans jobs.");
assert.equal(invalidLocal.length, 0, `Local jobs outside New Orleans: ${invalidLocal.map((job) => job.title).join(", ")}`);
assert.equal(invalidRemote.length, 0, `Remote jobs without an eligibility signal: ${invalidRemote.map((job) => job.title).join(", ")}`);
assert.equal(clinicalTitles.length, 0, `Clinical titles leaked into the list: ${clinicalTitles.map((job) => job.title).join(", ")}`);
assert.equal(malformedUrls.length, 0, "Every application URL must be a valid HTTPS URL.");
assert.ok(jobs.every((job) => job.coverLetter.length >= 1000), "Every cover letter must be substantive.");
assert.ok(jobs.every((job) => job.tailoredResume.length >= 1800), "Every tailored resume must be substantive.");
assert.ok(jobs.every((job) => job.applicationAnswers && Object.keys(job.applicationAnswers).length >= 5), "Every job must include an answer bank.");

console.log("Validated 500 jobs, 500 unique links, 500 personalized cover letters, and 500 tailored resumes.");
console.log(`Work modes: ${remote.length} remote, ${local.length} New Orleans.`);
console.log(`Fit bands: Strong ${data.stats.strong}, Good ${data.stats.good}, Possible ${data.stats.possible}, Stretch ${data.stats.stretch}.`);
