import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildEml,
  evaluateApplication,
  loadProfile,
  loadQueue,
  prepareApplication,
  sendApprovedEmailApplication,
  summarizeQueue,
  validateProfile
} from "../lib/automation.mjs";

const profile = await loadProfile();
const queue = await loadQueue();
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "scholarship-robot-test-"));

try {
  const profileResult = validateProfile(profile);
  assert.equal(profileResult.ok, true);
  assert.deepEqual(profileResult.missing, []);
  assert.deepEqual(profileResult.invalid, []);

  const summary = summarizeQueue(queue, profile, { now: "2026-06-08T12:00:00-05:00" });
  assert.equal(summary.total, queue.applications.length);
  assert.equal(summary.submitted >= 0, true);
  assert.equal(summary.browserReady >= 1, true);
  assert.equal(summary.emailReady, 0);

  const online = queue.applications.find((item) => item.id === "sallie-grad-no-essay");
  const browserEvaluation = evaluateApplication(online, profile, { now: "2026-06-08T12:00:00-05:00" });
  assert.equal(browserEvaluation.ready, true);
  assert.equal(browserEvaluation.action, "browser_fill_pause");
  const prepared = await prepareApplication(online, profile, {
    root: temporaryRoot,
    outbox: path.join(temporaryRoot, "outbox"),
    now: "2026-06-08T12:00:00-05:00"
  });
  assert.equal(Boolean(prepared.packetPath), true);
  const packet = JSON.parse(await fs.readFile(prepared.packetPath, "utf8"));
  assert.equal(packet.browserPacket.fields.phone, profile.identity.phone);
  assert.equal(packet.browserPacket.fields.expectedGraduation, profile.education.expectedGraduation);
  assert.equal(packet.browserPacket.mode, "fill_and_pause");

  const blockedEmail = queue.applications.find((item) => item.id === "genetex");
  const blockedEvaluation = evaluateApplication(blockedEmail, profile, { now: "2026-06-08T12:00:00-05:00" });
  assert.equal(blockedEvaluation.ready, false);
  assert.equal(blockedEvaluation.blocks.includes("applicant_signature_or_certification_required"), true);
  assert.equal(blockedEvaluation.blocks.includes("ai_policy_not_reviewed"), true);

  const readyEmail = {
    id: "test-email",
    name: "Test Scholarship",
    sponsor: "Test Sponsor",
    method: "email",
    contactEmail: "committee@example.org",
    deadline: "2026-12-31",
    aiPolicy: "not_applicable",
    aiPolicyReviewed: true,
    requiresAccount: false,
    requiresSignature: false,
    requiresRecommendation: false,
    approvedForSend: true,
    status: "ready_for_review",
    email: { subject: "{{scholarship}} - {{fullName}}", body: "Applicant: {{fullName}}\nDegree: {{currentDegree}}" }
  };
  assert.equal(evaluateApplication(readyEmail, profile, { now: "2026-06-08T12:00:00-05:00" }).ready, true);
  const eml = (await buildEml(readyEmail, profile, temporaryRoot)).toString("utf8");
  assert.match(eml, /To: committee@example\.org/);
  assert.equal(eml.includes(`Subject: Test Scholarship - ${profile.identity.fullName}`), true);
  assert.equal(eml.includes(profile.education.currentDegree), true);

  await assert.rejects(() => sendApprovedEmailApplication(readyEmail, profile, { confirm: "SEND", smtpUser: "", smtpPassword: "", root: temporaryRoot }), /SMTP is not configured/);
  await assert.rejects(() => sendApprovedEmailApplication(readyEmail, profile, { confirm: "NO", root: temporaryRoot }), /Explicit SEND confirmation/);

  console.log(JSON.stringify({ ok: true, tests: 18, queue: { total: summary.total, submitted: summary.submitted, browserReady: summary.browserReady, emailReady: summary.emailReady } }, null, 2));
} finally {
  const resolvedTemporary = path.resolve(temporaryRoot);
  const resolvedSystemTemporary = path.resolve(os.tmpdir());
  if (resolvedTemporary.startsWith(`${resolvedSystemTemporary}${path.sep}`)) {
    await fs.rm(resolvedTemporary, { recursive: true, force: true });
  }
}
