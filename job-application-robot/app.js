(function () {
  const data = window.JOB_APPLICATION_ROBOT_DATA;
  const storageKey = "jobApplicationRobotState.v1";
  const pageSize = 15;
  const statuses = ["prospect", "saved", "tailored", "ready_to_apply", "applied", "interview", "offer", "rejected", "archived"];
  let selectedId = data.jobs[0]?.id || "";
  let pageIndex = 0;
  let activeTab = "letter";
  const state = loadState();

  const els = {
    stats: byId("stats"),
    verificationDate: byId("verificationDate"),
    portfolioLink: byId("portfolioLink"),
    educationSummary: byId("educationSummary"),
    searchInput: byId("searchInput"),
    modeFilter: byId("modeFilter"),
    familyFilter: byId("familyFilter"),
    fitFilter: byId("fitFilter"),
    statusFilter: byId("statusFilter"),
    sortFilter: byId("sortFilter"),
    savedOnly: byId("savedOnly"),
    jobResults: byId("jobResults"),
    jobDetail: byId("jobDetail"),
    resultCount: byId("resultCount"),
    previousPage: byId("previousPage"),
    nextPage: byId("nextPage"),
    pageLabel: byId("pageLabel"),
    sourceCards: byId("sourceCards"),
    sourceTotal: byId("sourceTotal")
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function defaultState() {
    return {
      saved: [],
      statuses: {},
      notes: {},
      followUps: {},
      letterEdits: {},
      resumeEdits: {}
    };
  }

  function loadState() {
    try {
      return { ...defaultState(), ...(JSON.parse(localStorage.getItem(storageKey)) || {}) };
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function jobStatus(job) {
    return state.statuses[job.id] || job.applicationStatus || "prospect";
  }

  function filteredJobs() {
    const query = els.searchInput.value.trim().toLowerCase();
    const mode = els.modeFilter.value;
    const family = els.familyFilter.value;
    const fit = els.fitFilter.value;
    const status = els.statusFilter.value;
    const savedOnly = els.savedOnly.checked;

    const jobs = data.jobs.filter((job) => {
      const haystack = [
        job.title,
        job.company,
        job.location,
        job.roleFamily,
        job.description,
        job.skillsMatched.join(" "),
        job.fitReasons.join(" ")
      ].join(" ").toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (mode !== "all" && job.workMode !== mode) return false;
      if (family !== "all" && job.roleFamily !== family) return false;
      if (fit !== "all" && job.fitBand !== fit) return false;
      if (status !== "all" && jobStatus(job) !== status) return false;
      if (savedOnly && !state.saved.includes(job.id)) return false;
      return true;
    });

    return jobs.sort((a, b) => {
      if (els.sortFilter.value === "recent") return String(b.postedDate).localeCompare(String(a.postedDate)) || b.score - a.score;
      if (els.sortFilter.value === "company") return a.company.localeCompare(b.company) || b.score - a.score;
      if (els.sortFilter.value === "title") return a.title.localeCompare(b.title) || b.score - a.score;
      return b.score - a.score || a.rank - b.rank;
    });
  }

  function renderStats() {
    const applied = data.jobs.filter((job) => ["applied", "interview", "offer"].includes(jobStatus(job))).length;
    const saved = state.saved.length;
    const metrics = [
      ["Jobs", data.jobs.length],
      ["Remote USA", data.jobs.filter((job) => job.workMode === "Remote").length],
      ["New Orleans", data.jobs.filter((job) => job.workMode === "New Orleans").length],
      ["Strong + Good", data.jobs.filter((job) => ["Strong", "Good"].includes(job.fitBand)).length],
      ["Saved", saved],
      ["Applied", applied]
    ];
    els.stats.innerHTML = metrics.map(([label, value]) => `
      <div class="stat-card">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `).join("");
  }

  function renderFilters() {
    const families = ["all", ...new Set(data.jobs.map((job) => job.roleFamily).sort())];
    els.familyFilter.innerHTML = families.map((family) => `
      <option value="${escapeHtml(family)}">${family === "all" ? "All role families" : escapeHtml(family)}</option>
    `).join("");
    els.statusFilter.innerHTML = ["all", ...statuses].map((status) => `
      <option value="${escapeHtml(status)}">${status === "all" ? "All statuses" : escapeHtml(titleCase(status))}</option>
    `).join("");
  }

  function renderProfile() {
    els.verificationDate.textContent = `Collected ${data.verificationDate}`;
    els.portfolioLink.href = data.applicant.portfolio;
    els.educationSummary.textContent = [
      data.applicant.currentDegree,
      ...data.applicant.completedDegrees
    ].join(" | ");
  }

  function renderResults() {
    const jobs = filteredJobs();
    const pageCount = Math.max(1, Math.ceil(jobs.length / pageSize));
    pageIndex = Math.min(pageIndex, pageCount - 1);
    const visible = jobs.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    els.resultCount.textContent = `${jobs.length} jobs`;
    els.pageLabel.textContent = `Page ${pageIndex + 1} of ${pageCount}`;
    els.previousPage.disabled = pageIndex === 0;
    els.nextPage.disabled = pageIndex >= pageCount - 1;

    if (!jobs.some((job) => job.id === selectedId)) selectedId = visible[0]?.id || "";

    els.jobResults.innerHTML = visible.length ? visible.map((job) => {
      const selected = job.id === selectedId;
      const saved = state.saved.includes(job.id);
      return `
        <button class="job-result ${selected ? "selected" : ""}" type="button" data-job-id="${escapeHtml(job.id)}">
          <span class="result-score">${job.score}</span>
          <span class="result-copy">
            <strong>${escapeHtml(job.title)}</strong>
            <span>${escapeHtml(job.company)} | ${escapeHtml(job.location)}</span>
            <span>${escapeHtml(job.roleFamily)} | ${escapeHtml(job.source)}</span>
          </span>
          <span class="result-flags">
            <span class="pill ${job.fitBand.toLowerCase()}">${escapeHtml(job.fitBand)}</span>
            ${saved ? '<span class="pill strong">Saved</span>' : ""}
          </span>
        </button>
      `;
    }).join("") : '<p class="empty-state">No jobs match the current filters.</p>';

    els.jobResults.querySelectorAll("[data-job-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedId = button.dataset.jobId;
        activeTab = "letter";
        renderResults();
        renderDetail();
        if (window.matchMedia("(max-width: 820px)").matches) {
          els.jobDetail.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
    renderDetail();
  }

  function renderDetail() {
    const job = data.jobs.find((candidate) => candidate.id === selectedId);
    if (!job) {
      els.jobDetail.innerHTML = '<p class="empty-state">Select a job to open its application packet.</p>';
      return;
    }

    const template = byId("detailTemplate").content.cloneNode(true);
    setText(template, "title", job.title);
    setText(template, "company", `${job.company} | ${job.location}`);
    setText(template, "score", job.score);
    setHtml(template, "fit", `<span class="pill ${job.fitBand.toLowerCase()}">${escapeHtml(job.fitBand)} fit</span>`);
    setHtml(template, "mode", `<span class="pill">${escapeHtml(job.workMode)}</span>`);
    setText(template, "description", job.description || "Open the live application to review the full description.");
    setHtml(template, "reasons", job.fitReasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join(""));
    setHtml(template, "gaps", job.gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join(""));
    template.querySelector('[data-field="applyUrl"]').href = job.applyUrl;

    const facts = [
      ["Role family", job.roleFamily],
      ["Work mode", job.workMode],
      ["Posted", job.postedDate || "Check listing"],
      ["Employment", job.employmentType],
      ["Salary", job.salary],
      ["Source", job.source],
      ["Matched skills", job.skillsMatched.join(", ") || "Review listing"],
      ["Location check", job.locationEligibility],
      ["Rank", `#${job.rank} of ${data.jobs.length}`]
    ];
    template.querySelector(".fact-grid").innerHTML = facts.map(([label, value]) => `
      <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
    `).join("");

    const coverLetter = state.letterEdits[job.id] ?? job.coverLetter;
    const coverBox = template.querySelector('[data-field="coverLetter"]');
    coverBox.value = coverLetter;
    setText(template, "wordCount", `${countWords(coverLetter)} words`);
    const tailoredResume = state.resumeEdits[job.id] ?? job.tailoredResume ?? "";
    const resumeBox = template.querySelector('[data-field="tailoredResume"]');
    resumeBox.value = tailoredResume;
    setText(template, "resumeWordCount", `${countWords(tailoredResume)} words`);

    const answers = [
      ["Why are you interested in this role?", job.applicationAnswers.whyThisRole],
      ["What is your strongest qualification?", job.applicationAnswers.strongestQualification],
      ["Remote or local readiness", job.applicationAnswers.remoteOrLocalReadiness],
      ["Portfolio", job.applicationAnswers.portfolioAnswer],
      ["Salary expectation", job.applicationAnswers.salaryAnswer]
    ];
    setHtml(template, "answers", answers.map(([question, answer]) => `
      <article class="answer-card">
        <strong>${escapeHtml(question)}</strong>
        <p>${escapeHtml(answer)}</p>
      </article>
    `).join(""));

    const statusSelect = template.querySelector('[data-field="status"]');
    statusSelect.innerHTML = statuses.map((status) => `
      <option value="${escapeHtml(status)}" ${jobStatus(job) === status ? "selected" : ""}>${escapeHtml(titleCase(status))}</option>
    `).join("");
    template.querySelector('[data-field="notes"]').value = state.notes[job.id] || "";
    template.querySelector('[data-field="followUp"]').value = state.followUps[job.id] || "";

    const saved = state.saved.includes(job.id);
    template.querySelector('[data-action="save"]').textContent = saved ? "Remove Saved" : "Save Job";

    template.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === activeTab);
      button.addEventListener("click", () => {
        activeTab = button.dataset.tab;
        renderDetail();
      });
    });
    template.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === activeTab);
    });

    template.querySelector('[data-action="save"]').addEventListener("click", () => {
      if (saved) state.saved = state.saved.filter((id) => id !== job.id);
      else state.saved.push(job.id);
      saveState();
      render();
    });
    template.querySelector('[data-action="copy-link"]').addEventListener("click", () => copyText(job.applyUrl));
    template.querySelector('[data-action="copy-letter"]').addEventListener("click", () => copyText(coverBox.value));
    template.querySelector('[data-action="download-letter"]').addEventListener("click", () => {
      downloadText(`${safeFilename(job.company)}-${safeFilename(job.title)}-cover-letter.txt`, coverBox.value);
    });
    template.querySelector('[data-action="copy-resume"]').addEventListener("click", () => copyText(resumeBox.value));
    template.querySelector('[data-action="download-resume"]').addEventListener("click", () => {
      downloadText(`${safeFilename(job.company)}-${safeFilename(job.title)}-tailored-resume.txt`, resumeBox.value);
    });
    template.querySelector('[data-action="reset-letter"]').addEventListener("click", () => {
      delete state.letterEdits[job.id];
      saveState();
      renderDetail();
    });
    template.querySelector('[data-action="reset-resume"]').addEventListener("click", () => {
      delete state.resumeEdits[job.id];
      saveState();
      renderDetail();
    });
    coverBox.addEventListener("input", () => {
      state.letterEdits[job.id] = coverBox.value;
      saveState();
      const counter = els.jobDetail.querySelector('[data-field="wordCount"]');
      if (counter) counter.textContent = `${countWords(coverBox.value)} words`;
    });
    resumeBox.addEventListener("input", () => {
      state.resumeEdits[job.id] = resumeBox.value;
      saveState();
      const counter = els.jobDetail.querySelector('[data-field="resumeWordCount"]');
      if (counter) counter.textContent = `${countWords(resumeBox.value)} words`;
    });
    statusSelect.addEventListener("change", () => {
      state.statuses[job.id] = statusSelect.value;
      saveState();
      renderStats();
    });
    template.querySelector('[data-field="notes"]').addEventListener("input", (event) => {
      state.notes[job.id] = event.target.value;
      saveState();
    });
    template.querySelector('[data-field="followUp"]').addEventListener("change", (event) => {
      state.followUps[job.id] = event.target.value;
      saveState();
    });

    els.jobDetail.replaceChildren(template);
  }

  function renderSources() {
    els.sourceTotal.textContent = `${data.stats.rawCollected.toLocaleString()} raw listings checked`;
    els.sourceCards.innerHTML = data.sourceSummary.map((source) => {
      const credit = data.sourceCredits.find((item) => item.name.toLowerCase().includes(source.source.toLowerCase().split(" ")[0]));
      return `
        <article class="source-card">
          <strong>${escapeHtml(source.source)}</strong>
          <span>${Number(source.collected).toLocaleString()} collected | ${escapeHtml(source.status)}</span>
          ${credit ? `<a href="${escapeHtml(credit.url)}" target="_blank" rel="noreferrer">Source</a>` : ""}
        </article>
      `;
    }).join("");
  }

  function exportJobs(kind) {
    const jobs = kind === "filtered" ? filteredJobs() : data.jobs;
    const headers = [
      "rank", "title", "company", "location", "work_mode", "role_family", "fit_score", "fit_band",
      "status", "apply_url", "posted_date", "source", "matched_skills", "fit_reasons", "gaps",
      "saved", "follow_up", "notes"
    ];
    const rows = jobs.map((job) => [
      job.rank,
      job.title,
      job.company,
      job.location,
      job.workMode,
      job.roleFamily,
      job.score,
      job.fitBand,
      jobStatus(job),
      job.applyUrl,
      job.postedDate,
      job.source,
      job.skillsMatched.join("|"),
      job.fitReasons.join("|"),
      job.gaps.join("|"),
      state.saved.includes(job.id) ? "yes" : "no",
      state.followUps[job.id] || "",
      state.notes[job.id] || ""
    ]);
    downloadCsv(kind === "filtered" ? "job_robot_filtered_view.csv" : "job_application_tracker.csv", [headers, ...rows]);
  }

  function downloadCsv(filename, rows) {
    const content = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    downloadBlob(filename, content, "text/csv;charset=utf-8");
  }

  function downloadText(filename, content) {
    downloadBlob(filename, content, "text/plain;charset=utf-8");
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function copyText(value) {
    navigator.clipboard.writeText(value).catch(() => {
      const temporary = document.createElement("textarea");
      temporary.value = value;
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand("copy");
      temporary.remove();
    });
  }

  function countWords(value) {
    return String(value || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function safeFilename(value) {
    return String(value || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  }

  function titleCase(value) {
    return String(value).replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function setText(root, field, value) {
    root.querySelector(`[data-field="${field}"]`).textContent = value;
  }

  function setHtml(root, field, value) {
    root.querySelector(`[data-field="${field}"]`).innerHTML = value;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function bindEvents() {
    [els.searchInput, els.modeFilter, els.familyFilter, els.fitFilter, els.statusFilter, els.sortFilter, els.savedOnly]
      .forEach((control) => {
        ["input", "change"].forEach((eventName) => {
          control.addEventListener(eventName, () => {
            pageIndex = 0;
            renderResults();
          });
        });
      });
    els.previousPage.addEventListener("click", () => {
      pageIndex = Math.max(0, pageIndex - 1);
      renderResults();
      els.jobResults.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.nextPage.addEventListener("click", () => {
      pageIndex += 1;
      renderResults();
      els.jobResults.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    byId("exportFiltered").addEventListener("click", () => exportJobs("filtered"));
    byId("exportTracker").addEventListener("click", () => exportJobs("tracker"));
  }

  function render() {
    renderStats();
    renderResults();
  }

  renderProfile();
  renderFilters();
  renderSources();
  bindEvents();
  render();
})();
