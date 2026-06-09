import path from "node:path";
import {
  APP_ROOT,
  loadProfile,
  loadQueue,
  prepareApplication,
  prepareQueue,
  saveQueue,
  sendApprovedEmailApplication,
  summarizeQueue,
  validateProfile
} from "./lib/automation.mjs";
import { startServer } from "./server.mjs";

const [command = "status", argument] = process.argv.slice(2);

if (command === "serve") {
  const portIndex = process.argv.indexOf("--port");
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173;
  await startServer({ port });
  console.log(`Scholarship Robot running at http://127.0.0.1:${port}/`);
  await new Promise(() => {});
}

const profile = await loadProfile();
const queue = await loadQueue();

if (command === "check") {
  const result = validateProfile(profile);
  console.log(JSON.stringify({ appRoot: APP_ROOT, profile: result, queue: summarizeQueue(queue, profile) }, null, 2));
} else if (command === "status") {
  console.log(JSON.stringify(summarizeQueue(queue, profile), null, 2));
} else if (command === "prepare") {
  if (argument) {
    const application = queue.applications.find((item) => item.id === argument);
    if (!application) throw new Error(`Application not found: ${argument}`);
    console.log(JSON.stringify(await prepareApplication(application, profile), null, 2));
  } else {
    console.log(JSON.stringify(await prepareQueue(queue, profile), null, 2));
  }
} else if (command === "send") {
  if (!argument) throw new Error("Usage: node bot.mjs send <application-id> --confirm SEND");
  const application = queue.applications.find((item) => item.id === argument);
  if (!application) throw new Error(`Application not found: ${argument}`);
  const confirmIndex = process.argv.indexOf("--confirm");
  const confirm = confirmIndex >= 0 ? process.argv[confirmIndex + 1] : "";
  const result = await sendApprovedEmailApplication(application, profile, { confirm });
  application.status = "submitted";
  application.submittedAt = result.sentAt;
  application.sendReceipt = {
    to: result.to,
    subject: result.subject,
    smtpResponse: result.smtpResponse
  };
  await saveQueue(queue);
  console.log(JSON.stringify(result, null, 2));
} else if (command !== "serve") {
  throw new Error(`Unknown command: ${command}`);
}
