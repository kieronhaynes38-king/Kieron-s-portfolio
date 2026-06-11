import http from "node:http";
import path from "node:path";
import { promises as fs } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  APP_ROOT,
  loadProfile,
  loadQueue,
  prepareApplication,
  prepareQueue,
  redactProfile,
  saveQueue,
  sendApprovedEmailApplication,
  summarizeQueue,
  validateProfile
} from "./lib/automation.mjs";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

export async function startServer({ host = "127.0.0.1", port = 4173 } = {}) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url);
        return;
      }
      await serveStatic(response, url.pathname);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error.message
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return server;
}

async function handleApi(request, response, url) {
  const method = request.method || "GET";
  if (method === "POST") {
    const expectedOrigin = `http://${request.headers.host}`;
    const origin = request.headers.origin;
    const localHeader = request.headers["x-scholarship-robot"];
    if ((origin && origin !== expectedOrigin) || localHeader !== "local-ui") {
      sendJson(response, 403, {
        ok: false,
        error: "Rejected non-local or untrusted automation request."
      });
      return;
    }
  }
  const profile = await loadProfile();
  const queue = await loadQueue();

  if (method === "GET" && url.pathname === "/api/health") {
    const summary = summarizeQueue(queue, profile);
    sendJson(response, 200, {
      ok: true,
      service: "scholarship-robot",
      profile: validateProfile(profile),
      queue: {
        total: summary.total,
        submitted: summary.submitted,
        ready: summary.ready,
        blocked: summary.blocked,
        browserReady: summary.browserReady,
        emailReady: summary.emailReady
      },
      smtpConfigured: Boolean(process.env.SCHOLARSHIP_SMTP_USER && process.env.SCHOLARSHIP_SMTP_APP_PASSWORD),
      now: new Date().toISOString()
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/profile") {
    sendJson(response, 200, {
      ok: true,
      profile: redactProfile(profile),
      validation: validateProfile(profile)
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/queue") {
    sendJson(response, 200, {
      ok: true,
      queue,
      summary: summarizeQueue(queue, profile)
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/prepare-all") {
    const result = await prepareQueue(queue, profile);
    sendJson(response, 200, {
      ok: true,
      result
    });
    return;
  }

  const applicationRoute = url.pathname.match(/^\/api\/applications\/([^/]+)\/(prepare|approve|send|status)$/);
  if (applicationRoute && method === "POST") {
    const [, applicationId, action] = applicationRoute;
    const application = queue.applications.find((item) => item.id === applicationId);
    if (!application) {
      sendJson(response, 404, { ok: false, error: "Application not found." });
      return;
    }
    const body = await readJsonBody(request);

    if (action === "prepare") {
      const result = await prepareApplication(application, profile);
      sendJson(response, 200, { ok: true, result });
      return;
    }

    if (action === "approve") {
      application.approvedForSend = body.approved === true;
      application.approvedAt = application.approvedForSend ? new Date().toISOString() : null;
      await saveQueue(queue);
      sendJson(response, 200, { ok: true, application });
      return;
    }

    if (action === "status") {
      const allowed = new Set([
        "prospect",
        "verified",
        "drafted",
        "ready_for_review",
        "ready_for_browser",
        "filled_pause",
        "submitted",
        "blocked",
        "account_required",
        "human_writing_required",
        "excluded"
      ]);
      if (!allowed.has(body.status)) {
        sendJson(response, 400, { ok: false, error: "Unsupported status." });
        return;
      }
      application.status = body.status;
      application.notes = body.notes ?? application.notes;
      if (body.confirmationUrl) application.confirmationUrl = body.confirmationUrl;
      if (body.status === "submitted") application.submittedAt = new Date().toISOString();
      await saveQueue(queue);
      sendJson(response, 200, { ok: true, application });
      return;
    }

    if (action === "send") {
      const result = await sendApprovedEmailApplication(application, profile, {
        confirm: body.confirm
      });
      application.status = "submitted";
      application.submittedAt = result.sentAt;
      application.sendReceipt = {
        to: result.to,
        subject: result.subject,
        smtpResponse: result.smtpResponse
      };
      await saveQueue(queue);
      sendJson(response, 200, { ok: true, result });
      return;
    }
  }

  sendJson(response, 404, {
    ok: false,
    error: "API route not found."
  });
}

async function serveStatic(response, pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const publicFiles = new Set([
    "index.html",
    "app.js",
    "data.js",
    "scholarship-library.js",
    "styles.css"
  ]);
  if (!publicFiles.has(relative.replace(/\\/g, "/"))) {
    sendText(response, 404, "Not found");
    return;
  }
  const resolved = path.resolve(APP_ROOT, relative);
  if (!resolved.startsWith(`${APP_ROOT}${path.sep}`) && resolved !== path.join(APP_ROOT, "index.html")) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) {
      sendText(response, 404, "Not found");
      return;
    }
    const bytes = await fs.readFile(resolved);
    const type = MIME_TYPES[path.extname(resolved).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Content-Length": bytes.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    });
    response.end(bytes);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(response, 404, "Not found");
      return;
    }
    throw error;
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request body exceeds 1 MB.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, value) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function sendText(response, status, value) {
  const body = Buffer.from(String(value), "utf8");
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": body.length
  });
  response.end(body);
}

function parseArguments(argv) {
  const result = { host: "127.0.0.1", port: 4173 };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--port") result.port = Number(argv[index + 1]);
    if (argv[index] === "--host") result.host = argv[index + 1];
  }
  return result;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  const options = parseArguments(process.argv.slice(2));
  const server = await startServer(options);
  console.log(`Scholarship Robot running at http://${options.host}:${options.port}/`);
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
