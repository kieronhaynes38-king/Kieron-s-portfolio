(function () {
  const data = window.SCHOLARSHIP_ROBOT_DATA;
  const storageKey = "scholarshipRobotState.v1";
  const today = new Date();
  let selectedId = data.scholarships[0].id;
  const state = loadState();
  const byId = (id) => document.getElementById(id);
  const els = {
    profileGate: byId("profileGate"), degreeVerified: byId("degreeVerified"), transcriptVerified: byId("transcriptVerified"), identityConfirmed: byId("identityConfirmed"), stats: byId("stats"), rows: byId("scholarshipRows"), detail: byId("detail"), resultCount: byId("resultCount"), search: byId("search"), categoryFilter: byId("categoryFilter"), statusFilter: byId("statusFilter"), hideBlocked: byId("hideBlocked"), draftBox: byId("draftBox"), promptBox: byId("promptBox"), toneSelect: byId("toneSelect"), checks: byId("checks"), profileTruth: byId("profileTruth"), missingFields: byId("missingFields"), submissionAttempts: byId("submissionAttempts"), automationServiceStatus: byId("automationServiceStatus"), automationStats: byId("automationStats"), automationRows: byId("automationRows"), automationMessage: byId("automationMessage"), refreshAutomation: byId("refreshAutomation"), prepareAllApplications: byId("prepareAllApplications")
  };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || { degreeVerified: false, transcriptVerified: false, identityConfirmed: false, overrides: {}, notes: {} }; }
    catch { return { degreeVerified: false, transcriptVerified: false, identityConfirmed: false, overrides: {}, notes: {} }; }
  }
  function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
  function effectiveStatus(item) { return state.overrides[item.id] || item.status; }
  function isExpired(item) { return /^\d{4}-\d{2}-\d{2}$/.test(item.deadline) && new Date(`${item.deadline}T23:59:59`) < today; }
  function safety(item) {
    const warnings = [];
    if (!state.degreeVerified || !state.transcriptVerified) warnings.push({ level: "danger", text: "Profile gate: degree timeline, enrollment status, transcript, and GPA must be verified before final submission." });
    if (isExpired(item) && effectiveStatus(item) !== "submitted_by_user") warnings.push({ level: "danger", text: "Deadline appears to be in the past. Verify the current cycle before applying." });
    if (item.aiPolicy === "unknown") warnings.push({ level: "danger", text: "AI policy is unknown. Do not submit generated writing until policy is checked." });
    if (item.aiPolicy === "prohibited") warnings.push({ level: "danger", text: "Sponsor prohibits AI-generated applications. Use the robot for fact organization only." });
    if (item.aiPolicy === "restricted") warnings.push({ level: "warn", text: "Use outlines and notes only; the final essay must be applicant-authored." });
    if (item.sensitiveTags.length && !state.identityConfirmed) warnings.push({ level: "warn", text: "Sensitive eligibility requires private applicant confirmation." });
    if (item.applicationMethod === "email") warnings.push({ level: "warn", text: "Email-only application: draft first and send only after reviewing recipient, attachments, subject, and body." });
    if (item.status === "not_eligible") warnings.push({ level: "danger", text: "Marked not eligible under the current profile." });
    return warnings;
  }
  function canMoveToReview(item) { return !safety(item).some((warning) => warning.level === "danger") && ["verified", "drafted"].includes(effectiveStatus(item)); }
  function adjustedScore(item) {
    let score = item.matchScore;
    if (effectiveStatus(item) === "verified") score += 6;
    if (item.applicationMethod === "search") score -= 15;
    if (isExpired(item)) score -= 18;
    if (item.status === "not_eligible") score -= 40;
    if (item.aiPolicy === "prohibited") score -= 8;
    if (item.sensitiveTags.length && !state.identityConfirmed) score -= 4;
    return Math.max(0, Math.min(100, score));
  }
  function sortedItems() { return data.scholarships.map((item) => ({ ...item, adjustedScore: adjustedScore(item), effectiveStatus: effectiveStatus(item) })).sort((a, b) => b.adjustedScore - a.adjustedScore || a.name.localeCompare(b.name)); }
  function filteredItems() {
    const query = els.search.value.trim().toLowerCase(), category = els.categoryFilter.value, status = els.statusFilter.value;
    return sortedItems().filter((item) => {
      const haystack = [item.name, item.sponsor, item.category, item.eligibility, item.materials, item.matchReasons.join(" "), item.risks.join(" ")].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (category === "all" || item.category === category) && (status === "all" || item.effectiveStatus === status) && (!els.hideBlocked.checked || !safety(item).some((warning) => warning.level === "danger"));
    });
  }
  function renderProfileGate() {
    els.degreeVerified.checked = state.degreeVerified; els.transcriptVerified.checked = state.transcriptVerified; els.identityConfirmed.checked = state.identityConfirmed;
    const ok = state.degreeVerified && state.transcriptVerified;
    els.profileGate.textContent = ok ? "Profile Verified" : "Verification Required";
    els.profileGate.className = `status-pill ${ok ? "ok" : "blocked"}`;
  }
  function renderStats() {
    const items = sortedItems();
    const metrics = [["Seeds", items.length], ["Top Queue", items.slice(0, 50).length], ["Verified", items.filter((item) => item.effectiveStatus === "verified").length], ["Ready", items.filter(canMoveToReview).length], ["Blocked", items.filter((item) => safety(item).some((warning) => warning.level === "danger")).length], ["Monitor", items.filter((item) => item.effectiveStatus === "monitor_next_cycle" || isExpired(item)).length]];
    els.stats.innerHTML = metrics.map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
  }
  function renderSubmissionConsole() {
    const applicant = data.applicant;
    const facts = [["Current application degree", applicant.currentDegreeForApplications], ["Completed graduate degree", applicant.completedGraduateDegree], ["Location", applicant.mailingCityStateZip], ["Contact", applicant.email], ["Education", applicant.education.join("; ")], ["Verified resume highlights", applicant.verifiedResumeHighlights.join("; ")], ["Technical skills", applicant.verifiedSkills.join("; ")]];
    els.profileTruth.innerHTML = facts.map(([label, value]) => `<div class="fact-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("");
    els.missingFields.innerHTML = applicant.missingSubmissionFields.map((field) => `<li>${escapeHtml(field)}</li>`).join("");
    els.submissionAttempts.innerHTML = (data.submissionAttempts || []).map((attempt) => `<article class="attempt-card"><header><strong>${escapeHtml(attempt.rank)}. ${escapeHtml(attempt.scholarship)}</strong>${statusPill(attempt.status)}</header><p><strong>Action:</strong> ${escapeHtml(attempt.attemptedAction)}</p><p><strong>Hold:</strong> ${escapeHtml(attempt.reason)}</p><p><strong>Needed:</strong> ${escapeHtml(attempt.nextUserAction)}</p></article>`).join("") || '<p class="muted">Private submission history is available only in the local application service.</p>';
  }
  async function loadAutomation() {
    try {
      const [queueResponse, profileResponse] = await Promise.all([fetch("/api/queue", { cache: "no-store" }), fetch("/api/profile", { cache: "no-store" })]);
      if (!queueResponse.ok || !profileResponse.ok) throw new Error("Local service unavailable");
      const payload = await queueResponse.json(), profilePayload = await profileResponse.json();
      if (profilePayload.validation?.ok) { state.degreeVerified = true; state.transcriptVerified = true; saveState(); render(); }
      renderAutomation(payload);
      els.automationServiceStatus.textContent = "Service Online"; els.automationServiceStatus.className = "status-pill ok"; els.automationMessage.textContent = "Local profile and queue are loaded. Packets stay on this computer."; els.prepareAllApplications.disabled = false;
    } catch {
      els.automationServiceStatus.textContent = "Local Service Offline"; els.automationServiceStatus.className = "status-pill neutral"; els.automationMessage.textContent = "The hosted dashboard is read-only. Run the downloaded local service to prepare applications."; els.prepareAllApplications.disabled = true; els.automationStats.innerHTML = ""; els.automationRows.innerHTML = "";
    }
  }
  function renderAutomation(payload) {
    const summary = payload.summary;
    els.automationStats.innerHTML = [["Queue", summary.total], ["Submitted", summary.submitted], ["Ready", summary.ready], ["Browser Ready", summary.browserReady], ["Email Ready", summary.emailReady], ["Blocked", summary.blocked]].map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
    els.automationRows.innerHTML = summary.evaluations.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.deadline)}</div></td><td>${escapeHtml(title(item.method))}</td><td>${statusPill(item.status)}</td><td>${escapeHtml(title(item.action))}</td><td>${escapeHtml(item.blocks.join(", ") || "None")}</td><td><button class="button secondary" type="button" data-prepare="${escapeHtml(item.id)}">Prepare</button><button class="button primary" type="button" data-send="${escapeHtml(item.id)}" ${item.action !== "email" || !item.ready ? "disabled" : ""}>Send</button></td></tr>`).join("");
    els.automationRows.querySelectorAll("[data-prepare]").forEach((button) => button.addEventListener("click", () => prepareOne(button.dataset.prepare)));
    els.automationRows.querySelectorAll("[data-send]").forEach((button) => button.addEventListener("click", () => sendOne(button.dataset.send)));
  }
  async function apiRequest(url, body) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Scholarship-Robot": "local-ui" }, body: JSON.stringify(body) });
    const payload = await response.json(); if (!response.ok || !payload.ok) throw new Error(payload.error || `Request failed with ${response.status}`); return payload;
  }
  async function prepareAll() { try { const payload = await apiRequest("/api/prepare-all", {}); els.automationMessage.textContent = `Prepared ${payload.result.total} packets.`; await loadAutomation(); } catch (error) { els.automationMessage.textContent = error.message; } }
  async function prepareOne(id) { try { const payload = await apiRequest(`/api/applications/${encodeURIComponent(id)}/prepare`, {}); els.automationMessage.textContent = payload.result.evaluation.ready ? `Packet prepared for ${id}.` : `Packet prepared with blocks: ${payload.result.evaluation.blocks.join(", ")}`; } catch (error) { els.automationMessage.textContent = error.message; } }
  async function sendOne(id) { if (!window.confirm("Send this reviewed email-only scholarship application now?")) return; try { const payload = await apiRequest(`/api/applications/${encodeURIComponent(id)}/send`, { confirm: "SEND" }); els.automationMessage.textContent = `Sent to ${payload.result.to}.`; await loadAutomation(); } catch (error) { els.automationMessage.textContent = error.message; } }
  function renderFilters() {
    els.categoryFilter.innerHTML = ["all", ...new Set(data.scholarships.map((item) => item.category).sort())].map((value) => `<option value="${escapeHtml(value)}">${title(value)}</option>`).join("");
    els.statusFilter.innerHTML = ["all", ...data.statuses].map((value) => `<option value="${escapeHtml(value)}">${title(value)}</option>`).join("");
  }
  function renderRows() {
    const items = filteredItems(); els.resultCount.textContent = `${items.length} shown`;
    els.rows.innerHTML = items.map((item) => `<tr data-id="${escapeHtml(item.id)}" class="${item.id === selectedId ? "is-selected" : ""}"><td><strong>${item.adjustedScore}</strong></td><td><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.sponsor)} - ${escapeHtml(item.category)}</div></td><td>${escapeHtml(item.deadline)}</td><td>${escapeHtml(title(item.applicationMethod))}</td><td>${statusPill(item.effectiveStatus)}</td><td>${safetyPill(safety(item), item)}</td></tr>`).join("");
    els.rows.querySelectorAll("tr").forEach((row) => row.addEventListener("click", () => { selectedId = row.dataset.id; render(); }));
  }
  function renderDetail() {
    const item = sortedItems().find((candidate) => candidate.id === selectedId) || sortedItems()[0]; if (!item) return;
    const template = byId("detailTemplate").content.cloneNode(true);
    template.querySelector('[data-field="name"]').textContent = item.name; template.querySelector('[data-field="summary"]').textContent = item.eligibility; template.querySelector('[data-field="url"]').href = item.url;
    template.querySelector(".detail-list").innerHTML = [["Sponsor", item.sponsor], ["Amount", item.amount], ["Deadline", item.deadline], ["Method", title(item.applicationMethod)], ["Status", title(effectiveStatus(item))], ["AI Policy", title(item.aiPolicy)], ["Materials", item.materials], ["Fit Reasons", item.matchReasons.join("; ")], ["Risks", item.risks.join("; ")], ["Next Action", item.nextAction]].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    template.querySelector(".warning-box").innerHTML = safety(item).map((warning) => `<p class="${warning.level === "danger" ? "danger" : ""}">${escapeHtml(warning.text)}</p>`).join("");
    const notes = template.querySelector('[data-field="notes"]'); notes.value = state.notes[item.id] || ""; notes.addEventListener("input", () => { state.notes[item.id] = notes.value; saveState(); });
    template.querySelector('[data-action="draft"]').addEventListener("click", () => buildDraft(item)); template.querySelector('[data-action="copyEmail"]').addEventListener("click", () => copyText(buildEmailPacket(item)));
    template.querySelectorAll("[data-status]").forEach((button) => { if (button.dataset.status === "ready_for_review" && !canMoveToReview(item)) button.disabled = true; button.addEventListener("click", () => { if (!button.disabled) { state.overrides[item.id] = button.dataset.status; saveState(); render(); } }); });
    els.detail.innerHTML = ""; els.detail.appendChild(template);
  }
  function statusPill(status) { const kind = status === "verified" || status === "submitted_by_user" ? "ok" : status === "not_eligible" || status === "closed" || String(status).includes("blocked") ? "blocked" : status === "monitor_next_cycle" || String(status).includes("partial") ? "warn" : "neutral"; return `<span class="status-pill ${kind}">${escapeHtml(title(status))}</span>`; }
  function safetyPill(warnings, item) { if (item.applicationMethod === "search") return '<span class="status-pill neutral">Lead Source</span>'; if (warnings.some((warning) => warning.level === "danger")) return '<span class="status-pill blocked">Blocked</span>'; if (warnings.length) return '<span class="status-pill warn">Review</span>'; return '<span class="status-pill ok">Clear</span>'; }
  function buildDraft(item) {
    const prompt = els.promptBox.value.trim() || "Explain why you are a strong fit for this scholarship.";
    const stories = { professional: "engineering management, computer science, and data systems work", personal: "resilience, self-support, entrepreneurship, and balancing family responsibilities", technical: "cloud/data systems, SQL, Power BI, SharePoint, CRM cleanup, and AI workflow design", creative: "filmmaking, digital storytelling, and technology", faith: "long-term community service and youth leadership" };
    els.draftBox.value = `Scholarship: ${item.name}\nPrompt: ${prompt}\n\nWorking thesis:\n${data.applicant.name} is a strong candidate because his graduate training, technical systems work, and leadership history show academic readiness and practical service.\n\nEvidence to use:\n- ${stories[els.toneSelect.value]}\n- Portfolio: ${data.applicant.portfolioUrl}\n- Match reasons: ${item.matchReasons.join("; ")}\n\nSafety note: verify eligibility, deadline, transcript facts, AI policy, and sensitive eligibility before submission.`;
  }
  function buildEmailPacket(item) { return `To: ${item.contactEmail || "[verify sponsor email]"}\nSubject: ${item.name} Application\n\nDear Scholarship Committee,\n\nPlease accept my application for the ${item.name}. My verified profile and supporting materials are attached for review.\n\nPortfolio: ${data.applicant.portfolioUrl}\n\nSincerely,\n${data.applicant.name}\n\nSAFETY NOTE: Do not send until every attachment, eligibility claim, AI policy, deadline, and recipient address is manually verified.`; }
  function runChecks() {
    const items = sortedItems(), top = items.slice(0, 50);
    const checks = [["Profile Gate", state.degreeVerified && state.transcriptVerified, "Degree timeline and GPA verification are required."], ["Safety Blocks", items.some((item) => safety(item).some((warning) => warning.level === "danger")), "Danger states block review."], ["Match Reasons", top.every((item) => item.matchReasons.length), `${top.length} public sample records include fit reasons.`], ["Email Safety", items.filter((item) => item.applicationMethod === "email").every((item) => buildEmailPacket(item).includes("Do not send")), "Email packets are review-first."], ["AI Policy", items.filter((item) => item.aiPolicy === "prohibited").every((item) => safety(item).some((warning) => warning.level === "danger")), "AI-prohibited opportunities are blocked."], ["Exports", true, "CSV exports are available."]];
    els.checks.innerHTML = checks.map(([label, ok, text]) => `<div class="check-card"><span class="status-pill ${ok ? "ok" : "warn"}">${ok ? "Pass" : "Needs Action"}</span><strong>${escapeHtml(label)}</strong><p>${escapeHtml(text)}</p></div>`).join("");
  }
  function exportCsv(kind) {
    const items = kind === "top50" ? sortedItems().slice(0, 50) : sortedItems();
    const headers = ["rank", "id", "name", "sponsor", "category", "url", "amount", "deadline", "method", "status", "score", "ai_policy", "sensitive_tags", "eligibility", "materials", "match_reasons", "risks", "next_action", "notes"];
    const rows = items.map((item, index) => [index + 1, item.id, item.name, item.sponsor, item.category, item.url, item.amount, item.deadline, item.applicationMethod, effectiveStatus(item), item.adjustedScore, item.aiPolicy, item.sensitiveTags.join("|"), item.eligibility, item.materials, item.matchReasons.join("|"), item.risks.join("|"), item.nextAction, state.notes[item.id] || ""]);
    const text = [headers, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })), link = document.createElement("a"); link.href = url; link.download = `${kind}_scholarships.csv`; link.click(); URL.revokeObjectURL(url);
  }
  function copyText(text) { navigator.clipboard.writeText(text).catch(() => {}); els.draftBox.value = text; }
  function title(value) { return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
  function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
  function bindEvents() {
    [els.search, els.categoryFilter, els.statusFilter, els.hideBlocked].forEach((element) => { element.addEventListener("input", render); element.addEventListener("change", render); });
    els.degreeVerified.addEventListener("change", () => { state.degreeVerified = els.degreeVerified.checked; saveState(); render(); }); els.transcriptVerified.addEventListener("change", () => { state.transcriptVerified = els.transcriptVerified.checked; saveState(); render(); }); els.identityConfirmed.addEventListener("change", () => { state.identityConfirmed = els.identityConfirmed.checked; saveState(); render(); });
    byId("exportTop50").addEventListener("click", () => exportCsv("top50")); byId("exportProspects").addEventListener("click", () => exportCsv("prospects")); byId("exportTracker").addEventListener("click", () => exportCsv("tracker")); byId("runChecks").addEventListener("click", runChecks); byId("copyDraft").addEventListener("click", () => copyText(els.draftBox.value)); els.refreshAutomation.addEventListener("click", loadAutomation); els.prepareAllApplications.addEventListener("click", prepareAll);
  }
  function render() { renderProfileGate(); renderStats(); renderSubmissionConsole(); renderRows(); renderDetail(); }
  renderFilters(); bindEvents(); render(); runChecks(); loadAutomation();
})();
