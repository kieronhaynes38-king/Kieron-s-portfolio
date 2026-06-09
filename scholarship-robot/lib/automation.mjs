import { promises as fs } from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(moduleDir, "..");
export const PROFILE_PATH = path.join(APP_ROOT, "config", "private-profile.json");
export const QUEUE_PATH = path.join(APP_ROOT, "state", "application-queue.json");
export const QUEUE_EXAMPLE_PATH = path.join(APP_ROOT, "state", "application-queue.example.json");
export const OUTBOX_PATH = path.join(APP_ROOT, "outbox");

const MIME_TYPES = {
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain"
};

export async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

export async function loadProfile() {
  return loadJson(PROFILE_PATH);
}

export async function loadQueue() {
  try {
    return await loadJson(QUEUE_PATH);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return loadJson(QUEUE_EXAMPLE_PATH);
  }
}

export async function saveQueue(queue) {
  queue.updatedAt = new Date().toISOString();
  await writeJsonAtomic(QUEUE_PATH, queue);
}

export function redactProfile(profile) {
  const identity = profile.identity || {};
  const phone = String(identity.phone || "");
  const email = String(identity.email || "");
  return {
    identity: {
      fullName: identity.fullName,
      email: email.replace(/^(.{2}).*(@.*)$/, "$1***$2"),
      phone: phone ? `***-***-${phone.replace(/\D/g, "").slice(-4)}` : "",
      address: {
        city: identity.address?.city,
        state: identity.address?.state,
        postalCode: identity.address?.postalCode
      }
    },
    education: profile.education,
    confirmations: profile.confirmations,
    publicLinks: profile.publicLinks
  };
}

export function validateProfile(profile) {
  const required = [
    ["identity.fullName", profile.identity?.fullName],
    ["identity.firstName", profile.identity?.firstName],
    ["identity.lastName", profile.identity?.lastName],
    ["identity.email", profile.identity?.email],
    ["identity.phone", profile.identity?.phone],
    ["identity.address.street", profile.identity?.address?.street],
    ["identity.address.city", profile.identity?.address?.city],
    ["identity.address.state", profile.identity?.address?.state],
    ["identity.address.postalCode", profile.identity?.address?.postalCode],
    ["education.currentSchool", profile.education?.currentSchool],
    ["education.currentDegree", profile.education?.currentDegree],
    ["education.currentMajor", profile.education?.currentMajor],
    ["education.expectedGraduation", profile.education?.expectedGraduation],
    ["education.graduateGpa", profile.education?.graduateGpa]
  ];
  const missing = required.filter(([, value]) => value === undefined || value === null || String(value).trim() === "").map(([key]) => key);
  const invalid = [];

  if (profile.identity?.email && !isEmail(profile.identity.email)) invalid.push("identity.email");
  if (profile.identity?.phone && profile.identity.phone.replace(/\D/g, "").length < 10) invalid.push("identity.phone");
  if (profile.identity?.address?.postalCode && !/^\d{5}(?:-\d{4})?$/.test(profile.identity.address.postalCode)) {
    invalid.push("identity.address.postalCode");
  }
  if (Number(profile.education?.graduateGpa) < 0 || Number(profile.education?.graduateGpa) > 4.5) {
    invalid.push("education.graduateGpa");
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid
  };
}

export function evaluateApplication(application, profile, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const blocks = [];
  const warnings = [];
  const profileResult = validateProfile(profile);

  if (application.status === "submitted") {
    return {
      action: "none",
      ready: false,
      submitted: true,
      blocks: [],
      warnings: [],
      summary: "Already submitted"
    };
  }

  if (!profileResult.ok) {
    blocks.push(...profileResult.missing.map((field) => `missing_profile:${field}`));
    blocks.push(...profileResult.invalid.map((field) => `invalid_profile:${field}`));
  }

  if (isExpired(application.deadline, now)) blocks.push("deadline_passed");
  if (application.method === "postal_mail") blocks.push("postal_mail_not_automated");
  if (application.status === "excluded") blocks.push("application_excluded");
  if (application.requiresAccount) blocks.push("account_login_required");
  if (application.requiresRecommendation) blocks.push("recommendation_required");
  if (application.requiresSignature) blocks.push("applicant_signature_or_certification_required");

  if (application.aiPolicy === "prohibited") blocks.push("ai_generated_writing_prohibited");
  if (application.aiPolicy === "restricted") blocks.push("human_authored_final_writing_required");
  if (application.aiPolicy === "unknown" && !application.aiPolicyReviewed) blocks.push("ai_policy_not_reviewed");

  if (application.sensitiveConfirmations) {
    for (const key of application.sensitiveConfirmations) {
      if (profile.confirmations?.[key] !== true) blocks.push(`confirmation_required:${key}`);
    }
  }

  if (application.method === "email") {
    if (!isEmail(application.contactEmail || "")) blocks.push("verified_recipient_email_required");
    if (!application.approvedForSend) blocks.push("per_application_send_approval_required");
    if (!application.email?.subject || !application.email?.body) warnings.push("default_email_template_will_be_used");
    for (const attachment of application.attachments || []) {
      if (!attachment.path) blocks.push(`attachment_path_required:${attachment.label || "attachment"}`);
    }
  }

  if (application.method === "online") {
    warnings.push("online_final_submit_requires_browser_review");
  }

  const action = application.method === "email" ? "email" :
    application.method === "online" ? "browser_fill_pause" : "none";

  return {
    action,
    ready: blocks.length === 0,
    submitted: false,
    blocks,
    warnings,
    summary: blocks.length ? blocks.join(", ") : action === "email" ? "Ready to prepare email" : "Ready to prepare browser autofill packet"
  };
}

export function buildBrowserPacket(application, profile) {
  const identity = profile.identity;
  const education = profile.education;
  return {
    version: 1,
    applicationId: application.id,
    scholarship: application.name,
    sponsor: application.sponsor,
    url: application.url,
    mode: "fill_and_pause",
    createdAt: new Date().toISOString(),
    fields: {
      firstName: identity.firstName,
      lastName: identity.lastName,
      fullName: identity.fullName,
      email: identity.email,
      phone: identity.phone,
      streetAddress: identity.address.street,
      city: identity.address.city,
      state: identity.address.state,
      postalCode: identity.address.postalCode,
      country: identity.address.country,
      school: education.currentSchool,
      degree: education.currentDegree,
      major: education.currentMajor,
      expectedGraduation: education.expectedGraduation,
      graduateGpa: education.graduateGpa,
      priorGpa: education.priorGpa,
      portfolio: profile.publicLinks?.portfolio,
      youtube: profile.publicLinks?.youtube,
      instagram: profile.publicLinks?.instagram
    },
    confirmations: profile.confirmations,
    stopBefore: [
      "final submit",
      "electronic signature",
      "applicant-only certification",
      "recommendation attestation",
      "payment or fee",
      "SSN, FSA ID, tax, banking, or identity-document request"
    ],
    notes: application.notes || ""
  };
}

export function buildEmailContent(application, profile) {
  const identity = profile.identity;
  const education = profile.education;
  const values = {
    fullName: identity.fullName,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    phone: identity.phone,
    currentSchool: education.currentSchool,
    currentDegree: education.currentDegree,
    currentMajor: education.currentMajor,
    expectedGraduation: education.expectedGraduation,
    graduateGpa: education.graduateGpa,
    priorGpa: education.priorGpa,
    portfolio: profile.publicLinks?.portfolio || "",
    youtube: profile.publicLinks?.youtube || "",
    scholarship: application.name,
    sponsor: application.sponsor
  };

  const subjectTemplate = application.email?.subject || "{{scholarship}} Application - {{lastName}}, {{firstName}}";
  const bodyTemplate = application.email?.body || [
    "Dear Scholarship Committee,",
    "",
    "Please accept my application for the {{scholarship}}.",
    "",
    "I am pursuing an {{currentDegree}} at {{currentSchool}} with an expected graduation date of {{expectedGraduation}}. My current graduate GPA is {{graduateGpa}}.",
    "",
    "My portfolio is available at {{portfolio}}.",
    "",
    "Thank you for your time and consideration.",
    "",
    "Sincerely,",
    "{{fullName}}",
    "{{email}}",
    "{{phone}}"
  ].join("\n");

  return {
    to: application.contactEmail || "",
    subject: renderTemplate(subjectTemplate, values),
    body: renderTemplate(bodyTemplate, values)
  };
}

export async function prepareApplication(application, profile, options = {}) {
  const root = options.root || APP_ROOT;
  const outbox = options.outbox || path.join(root, "outbox");
  const evaluation = evaluateApplication(application, profile, options);
  const destination = path.join(outbox, safeFilename(application.id));
  await fs.mkdir(destination, { recursive: true });

  const browserPacket = application.method === "online" ? buildBrowserPacket(application, profile) : null;
  const emailContent = application.method === "email" ? buildEmailContent(application, profile) : null;
  const packet = {
    application,
    evaluation,
    browserPacket,
    emailContent,
    generatedAt: new Date().toISOString()
  };

  await writeJsonAtomic(path.join(destination, "application-packet.json"), packet);
  await fs.writeFile(path.join(destination, "review.md"), buildReviewMarkdown(packet), "utf8");

  let emlPath = null;
  if (application.method === "email") {
    emlPath = path.join(destination, "application.eml");
    const eml = await buildEml(application, profile, root);
    await fs.writeFile(emlPath, eml);
  }

  return {
    applicationId: application.id,
    destination,
    packetPath: path.join(destination, "application-packet.json"),
    reviewPath: path.join(destination, "review.md"),
    emlPath,
    evaluation
  };
}

export async function prepareQueue(queue, profile, options = {}) {
  const results = [];
  for (const application of queue.applications || []) {
    results.push(await prepareApplication(application, profile, options));
  }
  return {
    preparedAt: new Date().toISOString(),
    total: results.length,
    ready: results.filter((result) => result.evaluation.ready).length,
    submitted: results.filter((result) => result.evaluation.submitted).length,
    blocked: results.filter((result) => result.evaluation.blocks.length > 0).length,
    results
  };
}

export async function sendApprovedEmailApplication(application, profile, options = {}) {
  const evaluation = evaluateApplication(application, profile, options);
  if (application.method !== "email") throw new Error("Only email applications can be sent by SMTP.");
  if (!evaluation.ready) throw new Error(`Application is blocked: ${evaluation.blocks.join(", ")}`);
  if (options.confirm !== "SEND") throw new Error("Explicit SEND confirmation is required.");

  const smtp = {
    host: options.smtpHost || process.env.SCHOLARSHIP_SMTP_HOST || "smtp.gmail.com",
    port: Number(options.smtpPort || process.env.SCHOLARSHIP_SMTP_PORT || 465),
    user: options.smtpUser || process.env.SCHOLARSHIP_SMTP_USER,
    password: options.smtpPassword || process.env.SCHOLARSHIP_SMTP_APP_PASSWORD
  };
  if (!smtp.user || !smtp.password) {
    throw new Error("SMTP is not configured. Set SCHOLARSHIP_SMTP_USER and SCHOLARSHIP_SMTP_APP_PASSWORD.");
  }

  const eml = await buildEml(application, profile, options.root || APP_ROOT);
  const email = buildEmailContent(application, profile);
  const response = await smtpSend({
    ...smtp,
    from: profile.identity.email,
    to: email.to,
    message: eml.toString("utf8")
  });
  return {
    sentAt: new Date().toISOString(),
    to: email.to,
    subject: email.subject,
    smtpResponse: response
  };
}

export async function buildEml(application, profile, root = APP_ROOT) {
  const content = buildEmailContent(application, profile);
  const boundary = `scholarship-robot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const lines = [
    `From: ${sanitizeHeader(profile.identity.fullName)} <${sanitizeHeader(profile.identity.email)}>`,
    `To: ${sanitizeHeader(content.to)}`,
    `Subject: ${sanitizeHeader(content.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    content.body.replace(/\r?\n/g, "\r\n")
  ];

  for (const attachment of application.attachments || []) {
    const resolved = path.isAbsolute(attachment.path) ? attachment.path : path.resolve(root, attachment.path);
    const bytes = await fs.readFile(resolved);
    const filename = attachment.filename || path.basename(resolved);
    const mimeType = attachment.mimeType || MIME_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream";
    lines.push(
      `--${boundary}`,
      `Content-Type: ${mimeType}; name="${sanitizeHeader(filename)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${sanitizeHeader(filename)}"`,
      "",
      wrapBase64(bytes.toString("base64"))
    );
  }

  lines.push(`--${boundary}--`, "");
  return Buffer.from(lines.join("\r\n"), "utf8");
}

export function buildReviewMarkdown(packet) {
  const application = packet.application;
  const evaluation = packet.evaluation;
  const lines = [
    `# ${application.name}`,
    "",
    `- Sponsor: ${application.sponsor}`,
    `- Method: ${application.method}`,
    `- Deadline: ${application.deadline}`,
    `- Status: ${application.status}`,
    `- Automation action: ${evaluation.action}`,
    `- Ready: ${evaluation.ready ? "yes" : "no"}`,
    "",
    "## Blocks",
    "",
    ...(evaluation.blocks.length ? evaluation.blocks.map((block) => `- ${block}`) : ["- None"]),
    "",
    "## Warnings",
    "",
    ...(evaluation.warnings.length ? evaluation.warnings.map((warning) => `- ${warning}`) : ["- None"]),
    "",
    "## Next Step",
    ""
  ];

  if (evaluation.submitted) {
    lines.push(`Already submitted. Confirmation: ${application.confirmationUrl || "recorded locally"}`);
  } else if (evaluation.action === "email") {
    lines.push(evaluation.ready
      ? "Review application.eml and attachments. Send only through the guarded send endpoint with explicit SEND confirmation."
      : "Resolve every block before sending.");
  } else if (evaluation.action === "browser_fill_pause") {
    lines.push("Use application-packet.json to fill the sponsor form, then pause before final signature/certification/submit.");
  } else {
    lines.push("No automated action is available for this application.");
  }
  lines.push("");
  return lines.join("\n");
}

export function summarizeQueue(queue, profile, options = {}) {
  const evaluations = (queue.applications || []).map((application) => ({
    id: application.id,
    name: application.name,
    method: application.method,
    status: application.status,
    deadline: application.deadline,
    ...evaluateApplication(application, profile, options)
  }));
  return {
    total: evaluations.length,
    submitted: evaluations.filter((item) => item.submitted).length,
    ready: evaluations.filter((item) => item.ready).length,
    blocked: evaluations.filter((item) => item.blocks.length > 0).length,
    browserReady: evaluations.filter((item) => item.ready && item.action === "browser_fill_pause").length,
    emailReady: evaluations.filter((item) => item.ready && item.action === "email").length,
    evaluations
  };
}

function renderTemplate(template, values) {
  return String(template).replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => values[key] ?? "");
}

function isExpired(deadline, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(deadline || ""))) return false;
  const end = new Date(`${deadline}T23:59:59`);
  return end.getTime() < now.getTime();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function safeFilename(value) {
  return String(value || "application").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function sanitizeHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function wrapBase64(value) {
  return String(value).match(/.{1,76}/g)?.join("\r\n") || "";
}

async function smtpSend({ host, port, user, password, from, to, message }) {
  const socket = tls.connect({
    host,
    port,
    servername: host,
    rejectUnauthorized: true
  });
  socket.setEncoding("utf8");

  let buffer = "";
  const pending = [];
  socket.on("data", (chunk) => {
    buffer += chunk;
    while (true) {
      const boundary = findSmtpResponseBoundary(buffer);
      if (boundary < 0) break;
      const response = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary);
      const waiter = pending.shift();
      if (waiter) waiter.resolve(response.trim());
    }
  });
  socket.on("error", (error) => {
    while (pending.length) pending.shift().reject(error);
  });

  const waitResponse = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
  const command = async (text, expected) => {
    if (text !== null) socket.write(`${text}\r\n`);
    const response = await waitResponse();
    const code = Number(response.slice(0, 3));
    if (!expected.includes(code)) throw new Error(`SMTP command failed (${code}): ${response}`);
    return response;
  };

  try {
    await command(null, [220]);
    await command(`EHLO scholarship-robot.local`, [250]);
    await command("AUTH LOGIN", [334]);
    await command(Buffer.from(user).toString("base64"), [334]);
    await command(Buffer.from(password).toString("base64"), [235]);
    await command(`MAIL FROM:<${from}>`, [250]);
    await command(`RCPT TO:<${to}>`, [250, 251]);
    await command("DATA", [354]);
    socket.write(`${dotStuff(message)}\r\n.\r\n`);
    const result = await command(null, [250]);
    await command("QUIT", [221]).catch(() => "");
    return result;
  } finally {
    socket.end();
  }
}

function findSmtpResponseBoundary(value) {
  const lines = value.split("\r\n");
  if (lines.length < 2) return -1;
  let offset = 0;
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    offset += line.length + 2;
    if (/^\d{3} /.test(line)) return offset;
  }
  return -1;
}

function dotStuff(value) {
  return String(value).replace(/^\./gm, "..");
}
