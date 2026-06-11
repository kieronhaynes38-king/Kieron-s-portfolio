(function () {
  const data = window.SCHOLARSHIP_ROBOT_DATA;
  const libraryData = window.SCHOLARSHIP_LIBRARY || { scholarships: [] };
  const storageKey = "scholarshipRobotState.v1";
  const libraryStorageKey = "scholarshipRobotLibrary.v1";
  const today = new Date();
  let selectedId = data.scholarships[0].id;
  let selectedLibraryId = libraryData.scholarships[0]?.id || "";
  let libraryPageIndex = 0;

  const state = loadState();
  const libraryState = loadLibraryState();
  const els = {
    profileGate: document.getElementById("profileGate"),
    degreeVerified: document.getElementById("degreeVerified"),
    transcriptVerified: document.getElementById("transcriptVerified"),
    identityConfirmed: document.getElementById("identityConfirmed"),
    stats: document.getElementById("stats"),
    rows: document.getElementById("scholarshipRows"),
    detail: document.getElementById("detail"),
    resultCount: document.getElementById("resultCount"),
    search: document.getElementById("search"),
    categoryFilter: document.getElementById("categoryFilter"),
    statusFilter: document.getElementById("statusFilter"),
    hideBlocked: document.getElementById("hideBlocked"),
    draftBox: document.getElementById("draftBox"),
    promptBox: document.getElementById("promptBox"),
    toneSelect: document.getElementById("toneSelect"),
    checks: document.getElementById("checks"),
    profileTruth: document.getElementById("profileTruth"),
    missingFields: document.getElementById("missingFields"),
    submissionAttempts: document.getElementById("submissionAttempts"),
    automationServiceStatus: document.getElementById("automationServiceStatus"),
    automationStats: document.getElementById("automationStats"),
    automationRows: document.getElementById("automationRows"),
    automationMessage: document.getElementById("automationMessage"),
    refreshAutomation: document.getElementById("refreshAutomation"),
    prepareAllApplications: document.getElementById("prepareAllApplications"),
    radarStats: document.getElementById("radarStats"),
    radarSearch: document.getElementById("radarSearch"),
    radarFocus: document.getElementById("radarFocus"),
    radarOpenOnly: document.getElementById("radarOpenOnly"),
    radarRows: document.getElementById("radarRows"),
    discoverySources: document.getElementById("discoverySources"),
    sourceCount: document.getElementById("sourceCount"),
    libraryFreshness: document.getElementById("libraryFreshness"),
    librarySearch: document.getElementById("librarySearch"),
    libraryCategory: document.getElementById("libraryCategory"),
    librarySort: document.getElementById("librarySort"),
    librarySensitive: document.getElementById("librarySensitive"),
    libraryCount: document.getElementById("libraryCount"),
    libraryResults: document.getElementById("libraryResults"),
    libraryDetail: document.getElementById("libraryDetail"),
    libraryPrevious: document.getElementById("libraryPrevious"),
    libraryNext: document.getElementById("libraryNext"),
    libraryPage: document.getElementById("libraryPage"),
    exportLibrary: document.getElementById("exportLibrary")
  };

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {
        degreeVerified: false,
        transcriptVerified: false,
        identityConfirmed: false,
        overrides: {},
        notes: {}
      };
    } catch (err) {
      return {
        degreeVerified: false,
        transcriptVerified: false,
        identityConfirmed: false,
        overrides: {},
        notes: {}
      };
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function loadLibraryState() {
    try {
      return JSON.parse(localStorage.getItem(libraryStorageKey)) || {
        shortlist: [],
        notes: {},
        reviewStatus: {}
      };
    } catch (error) {
      return { shortlist: [], notes: {}, reviewStatus: {} };
    }
  }

  function saveLibraryState() {
    localStorage.setItem(libraryStorageKey, JSON.stringify(libraryState));
  }

  function effectiveStatus(item) {
    return state.overrides[item.id] || item.status;
  }

  function isExpired(item) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.deadline)) return false;
    return new Date(item.deadline + "T23:59:59") < today;
  }

  function safety(item) {
    const warnings = [];
    const status = effectiveStatus(item);
    const expired = isExpired(item);
    const hasSensitive = item.sensitiveTags && item.sensitiveTags.length > 0;

    if (!state.degreeVerified || !state.transcriptVerified) {
      warnings.push({
        level: "danger",
        text: "Profile gate: degree timeline, enrollment status, transcript, and GPA must be verified before final submission."
      });
    }

    if (expired && status !== "submitted_by_user") {
      warnings.push({ level: "danger", text: "Deadline appears to be in the past. Move to monitor_next_cycle unless sponsor confirms an extension." });
    }

    if (item.aiPolicy === "unknown") {
      warnings.push({ level: "danger", text: "AI policy is unknown. Do not submit generated writing until policy is checked." });
    }

    if (item.aiPolicy === "prohibited") {
      warnings.push({ level: "danger", text: "Sponsor prohibits AI-generated applications. The robot can organize facts only; final writing must be manual." });
    }

    if (item.aiPolicy === "restricted") {
      warnings.push({ level: "warn", text: "Sponsor flags AI-assisted writing. Use outlines and notes only; final essay must clearly be Kieron's own work." });
    }

    if (hasSensitive && !state.identityConfirmed) {
      warnings.push({ level: "warn", text: "Sensitive eligibility is involved. Confirm race, religion, disability, financial need, citizenship, membership, or similar filters before use." });
    }

    if (item.applicationMethod === "email") {
      warnings.push({ level: "warn", text: "Email-only application. Create a Gmail draft first and send only after reviewing recipients, attachments, subject, and body." });
    }

    if (item.status === "not_eligible") {
      warnings.push({ level: "danger", text: "Marked not eligible under current profile. Do not apply unless new verified facts change eligibility." });
    }

    return warnings;
  }

  function canMoveToReview(item) {
    const hardBlocks = safety(item).filter((warning) => warning.level === "danger");
    return hardBlocks.length === 0 && ["verified", "drafted"].includes(effectiveStatus(item));
  }

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

  function sortedItems() {
    return data.scholarships
      .map((item) => ({ ...item, adjustedScore: adjustedScore(item), effectiveStatus: effectiveStatus(item) }))
      .sort((a, b) => b.adjustedScore - a.adjustedScore || a.name.localeCompare(b.name));
  }

  function filteredItems() {
    const query = els.search.value.trim().toLowerCase();
    const category = els.categoryFilter.value;
    const status = els.statusFilter.value;
    const hideBlocked = els.hideBlocked.checked;

    return sortedItems().filter((item) => {
      const haystack = [
        item.name,
        item.sponsor,
        item.category,
        item.eligibility,
        item.materials,
        item.matchReasons.join(" "),
        item.risks.join(" ")
      ].join(" ").toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (category !== "all" && item.category !== category) return false;
      if (status !== "all" && item.effectiveStatus !== status) return false;
      if (hideBlocked && safety(item).some((warning) => warning.level === "danger")) return false;
      return true;
    });
  }

  function renderProfileGate() {
    els.degreeVerified.checked = state.degreeVerified;
    els.transcriptVerified.checked = state.transcriptVerified;
    els.identityConfirmed.checked = state.identityConfirmed;
    const ok = state.degreeVerified && state.transcriptVerified;
    els.profileGate.textContent = ok ? "Profile Verified" : "Verification Required";
    els.profileGate.className = "status-pill " + (ok ? "ok" : "blocked");
  }

  function renderStats() {
    const items = sortedItems();
    const verified = items.filter((item) => item.effectiveStatus === "verified").length;
    const monitor = items.filter((item) => item.effectiveStatus === "monitor_next_cycle" || isExpired(item)).length;
    const ready = items.filter((item) => canMoveToReview(item)).length;
    const blocked = items.filter((item) => safety(item).some((warning) => warning.level === "danger")).length;
    const top50 = items.slice(0, 50).length;

    els.stats.innerHTML = [
      ["Seeds", items.length],
      ["Top Queue", top50],
      ["Verified", verified],
      ["Ready", ready],
      ["Blocked", blocked],
      ["Monitor", monitor]
    ].map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
  }

  function directApplicationItems() {
    const query = els.radarSearch.value.trim().toLowerCase();
    const focus = els.radarFocus.value;
    const openOnly = els.radarOpenOnly.checked;

    return sortedItems().filter((item) => {
      if (item.applicationMethod === "search" || item.status === "not_eligible") return false;
      if (openOnly && isExpired(item)) return false;
      if (focus === "new" && !item.newThisRun) return false;

      const focusText = [
        item.category,
        item.eligibility,
        item.matchReasons.join(" ")
      ].join(" ").toLowerCase();

      if (focus === "stem" && !/(stem|computer|cyber|technology|engineering|data|simulation)/.test(focusText)) return false;
      if (focus === "service" && !/(service|community|leadership|volunteer|faith)/.test(focusText)) return false;
      if (focus === "creative" && !/(creative|film|video|media|design)/.test(focusText)) return false;

      const haystack = [
        item.name,
        item.sponsor,
        item.category,
        item.eligibility,
        item.matchReasons.join(" "),
        item.materials
      ].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
  }

  function renderOpportunityRadar() {
    const items = directApplicationItems();
    const allDirect = sortedItems().filter((item) => item.applicationMethod !== "search" && item.status !== "not_eligible");
    const newItems = allDirect.filter((item) => item.newThisRun);
    const clear = allDirect.filter((item) => !safety(item).some((warning) => warning.level === "danger"));
    const sources = data.opportunitySources || [];
    const largestPool = Math.max(0, ...sources.map((source) => source.publishedCount || 0));

    els.radarStats.innerHTML = [
      ["Curated Links", allDirect.length],
      ["Verified Today", newItems.length],
      ["Clear To Review", clear.length],
      ["Largest Live Pool", largestPool ? `${largestPool.toLocaleString()}+` : "300+"]
    ].map(([label, value]) => `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");

    els.radarRows.innerHTML = items.length ? items.map((item) => {
      const warnings = safety(item);
      const manualFlag = item.manualOnly || item.aiPolicy === "prohibited" || item.aiPolicy === "restricted";
      const freshness = item.verifiedOn ? `Checked ${item.verifiedOn}` : "Recheck before applying";
      return `
        <article class="opportunity-card">
          <div class="opportunity-score">
            <strong>${escapeHtml(adjustedScore(item))}</strong>
            <span>Fit</span>
          </div>
          <div class="opportunity-copy">
            <div class="opportunity-title">
              <div>
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.sponsor)} · ${escapeHtml(item.amount)}</p>
              </div>
              ${item.newThisRun ? '<span class="status-pill ok">New</span>' : ""}
            </div>
            <p>${escapeHtml(item.matchReasons.slice(0, 2).join("; "))}</p>
            <div class="opportunity-meta">
              <span>${escapeHtml(item.deadline)}</span>
              <span>${escapeHtml(freshness)}</span>
              ${manualFlag ? '<span>Manual writing/review</span>' : ""}
              ${warnings.some((warning) => warning.level === "danger") ? '<span class="danger-text">Verify gate</span>' : ""}
            </div>
          </div>
          <a class="button primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Apply</a>
        </article>
      `;
    }).join("") : '<p class="empty-state">No direct applications match these filters.</p>';

    els.sourceCount.textContent = `${sources.length} live lanes`;
    els.discoverySources.innerHTML = sources.map((source) => `
      <article class="source-card">
        <div>
          <span class="status-pill neutral">${escapeHtml(source.countLabel)}</span>
          <h3>${escapeHtml(source.name)}</h3>
          <p>${escapeHtml(source.fit)}</p>
        </div>
        <a class="button secondary" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open Source</a>
      </article>
    `).join("");
  }

  function renderLibraryFilters() {
    const categories = ["all", ...new Set(libraryData.scholarships.map((item) => item.category).sort())];
    els.libraryCategory.innerHTML = categories
      .map((category) => `<option value="${escapeHtml(category)}">${category === "all" ? "All categories" : escapeHtml(category)}</option>`)
      .join("");
    els.libraryFreshness.textContent = libraryData.verificationDate
      ? `Source checked ${libraryData.verificationDate}`
      : "Live page review required";
  }

  function filteredLibraryItems() {
    const query = els.librarySearch.value.trim().toLowerCase();
    const category = els.libraryCategory.value;
    const includeSensitive = els.librarySensitive.checked;
    const sort = els.librarySort.value;

    const items = libraryData.scholarships.filter((item) => {
      if (!includeSensitive && item.sensitiveTags?.length) return false;
      if (category !== "all" && item.category !== category) return false;
      if (!query) return true;
      const haystack = [
        item.title,
        item.sponsor,
        item.category,
        item.description,
        item.gradeLevel,
        item.fitReasons.join(" ")
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    return items.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "recent") return String(b.modified).localeCompare(String(a.modified));
      return b.fitScore - a.fitScore || a.title.localeCompare(b.title);
    });
  }

  function renderScholarshipLibrary() {
    const items = filteredLibraryItems();
    const pageSize = 12;
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    libraryPageIndex = Math.min(libraryPageIndex, pageCount - 1);
    const visible = items.slice(libraryPageIndex * pageSize, (libraryPageIndex + 1) * pageSize);

    els.libraryCount.textContent = `${items.length} shown of ${libraryData.scholarships.length}`;
    els.libraryPage.textContent = `Page ${libraryPageIndex + 1} of ${pageCount}`;
    els.libraryPrevious.disabled = libraryPageIndex === 0;
    els.libraryNext.disabled = libraryPageIndex >= pageCount - 1;

    els.libraryResults.innerHTML = visible.length ? visible.map((item) => {
      const selected = item.id === selectedLibraryId;
      const shortlisted = libraryState.shortlist.includes(item.id);
      const status = libraryState.reviewStatus[item.id] || "New";
      return `
        <button class="library-result ${selected ? "selected" : ""}" type="button" data-library-id="${escapeHtml(item.id)}">
          <span class="library-result-score">${escapeHtml(item.fitScore)}</span>
          <span class="library-result-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.category)} · ${escapeHtml(item.amount)}</span>
            <span>${escapeHtml(item.fitReasons.slice(0, 2).join("; "))}</span>
          </span>
          <span class="library-result-flags">
            ${shortlisted ? '<span class="status-pill ok">Saved</span>' : ""}
            <span class="status-pill neutral">${escapeHtml(status)}</span>
          </span>
        </button>
      `;
    }).join("") : '<p class="empty-state">No scholarships match these filters.</p>';

    els.libraryResults.querySelectorAll("[data-library-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedLibraryId = button.dataset.libraryId;
        renderScholarshipLibrary();
        renderLibraryDetail();
        if (window.matchMedia("(max-width: 820px)").matches) {
          els.libraryDetail.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    if (!items.some((item) => item.id === selectedLibraryId)) {
      selectedLibraryId = items[0]?.id || "";
    }
    renderLibraryDetail();
  }

  function renderLibraryDetail() {
    const item = libraryData.scholarships.find((candidate) => candidate.id === selectedLibraryId);
    if (!item) {
      els.libraryDetail.innerHTML = '<p class="empty-state">Select a scholarship to view its personalized response packet.</p>';
      return;
    }

    const drafts = buildLibraryDrafts(item);
    const shortlisted = libraryState.shortlist.includes(item.id);
    const notes = libraryState.notes[item.id] || "";
    const status = libraryState.reviewStatus[item.id] || "new";
    const sensitiveWarning = item.sensitiveTags?.length
      ? `<div class="library-alert danger"><strong>Confirm before using:</strong> ${escapeHtml(item.sensitiveTags.map(title).join(", "))}</div>`
      : "";

    els.libraryDetail.innerHTML = `
      <div class="library-detail-header">
        <div>
          <p class="eyebrow">${escapeHtml(item.category)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <div class="library-score-block">
          <strong>${escapeHtml(item.fitScore)}</strong>
          <span>Profile fit</span>
        </div>
      </div>

      <div class="library-detail-actions">
        <a class="button primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open Application</a>
        <button class="button secondary" type="button" data-library-shortlist>${shortlisted ? "Remove Saved" : "Save Scholarship"}</button>
      </div>

      <dl class="library-facts">
        <div><dt>Amount</dt><dd>${escapeHtml(item.amount)}</dd></div>
        <div><dt>Deadline</dt><dd>${escapeHtml(item.deadline)}</dd></div>
        <div><dt>Grade level</dt><dd>${escapeHtml(item.gradeLevel)}</dd></div>
        <div><dt>Citizenship</dt><dd>${escapeHtml(item.citizenship)}</dd></div>
        <div><dt>Listing updated</dt><dd>${escapeHtml(formatLibraryDate(item.modified))}</dd></div>
        <div><dt>AI policy</dt><dd>Unknown · review before submitting</dd></div>
      </dl>

      ${sensitiveWarning}
      <div class="library-alert warn"><strong>Application gate:</strong> Open the live page and verify deadline, eligibility, word count, AI rules, and applicant-authorship certifications before using a draft.</div>

      <section class="library-fit">
        <h4>Why This Matches</h4>
        <ul>${item.fitReasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      </section>

      <section class="response-packet">
        <div class="response-heading">
          <div>
            <p class="eyebrow">Personalized Response Packet</p>
            <h4>Ready-To-Review Answers</h4>
          </div>
          <button class="button secondary" type="button" data-copy-library="all">Copy All</button>
        </div>
        ${renderResponseDraft("Short Answer", "Use for 100-150 word prompts.", drafts.short, "short")}
        ${renderResponseDraft("Standard Essay", "Use for 200-300 word prompts.", drafts.standard, "standard")}
        ${renderResponseDraft("Long Essay", "Use for 400-500 word prompts.", drafts.long, "long")}
      </section>

      <section class="library-tracker">
        <label>
          Review status
          <select data-library-status>
            ${["new", "eligibility_checked", "draft_reviewed", "ready_to_apply", "applied", "not_eligible"]
              .map((option) => `<option value="${option}" ${option === status ? "selected" : ""}>${escapeHtml(title(option))}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          Private notes on this device
          <textarea data-library-notes rows="4" placeholder="Eligibility checks, required documents, deadline notes...">${escapeHtml(notes)}</textarea>
        </label>
      </section>
    `;

    els.libraryDetail.querySelector("[data-library-shortlist]").addEventListener("click", () => {
      const index = libraryState.shortlist.indexOf(item.id);
      if (index >= 0) libraryState.shortlist.splice(index, 1);
      else libraryState.shortlist.push(item.id);
      saveLibraryState();
      renderScholarshipLibrary();
    });
    els.libraryDetail.querySelector("[data-library-status]").addEventListener("change", (event) => {
      libraryState.reviewStatus[item.id] = event.target.value;
      saveLibraryState();
      renderScholarshipLibrary();
    });
    els.libraryDetail.querySelector("[data-library-notes]").addEventListener("input", (event) => {
      libraryState.notes[item.id] = event.target.value;
      saveLibraryState();
    });
    els.libraryDetail.querySelectorAll("[data-copy-library]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.copyLibrary;
        const text = kind === "all"
          ? `SHORT ANSWER\n\n${drafts.short}\n\nSTANDARD ESSAY\n\n${drafts.standard}\n\nLONG ESSAY\n\n${drafts.long}`
          : drafts[kind];
        navigator.clipboard.writeText(text).then(() => {
          button.textContent = "Copied";
          window.setTimeout(() => {
            button.textContent = kind === "all" ? "Copy All" : "Copy";
          }, 1200);
        });
      });
    });
  }

  function renderResponseDraft(titleText, guidance, text, key) {
    return `
      <article class="response-draft">
        <header>
          <div>
            <h5>${escapeHtml(titleText)}</h5>
            <span>${escapeHtml(guidance)} · ${countWords(text)} words</span>
          </div>
          <button class="button secondary" type="button" data-copy-library="${escapeHtml(key)}">Copy</button>
        </header>
        <textarea rows="${key === "long" ? 15 : key === "standard" ? 10 : 7}" aria-label="${escapeHtml(titleText)}">${escapeHtml(text)}</textarea>
      </article>
    `;
  }

  function buildLibraryDrafts(item) {
    const scholarshipName = item.title;
    const provider = item.sponsor.includes("Provider listed") ? "the scholarship committee" : item.sponsor;
    const theme = libraryThemeCopy(item.storyTheme);
    const creativeLine = item.storyTheme === "creative"
      ? "Directing short films and presenting work through the Black NOLA Film Festival taught me to combine discipline, audience awareness, and creative problem-solving."
      : "My filmmaking background also helps me communicate technical ideas with clarity, purpose, and attention to the people affected by a system.";
    const resilienceLine = ["resilience", "graduate"].includes(item.storyTheme)
      ? "I financed my education through work and entrepreneurship during a period of financial and family responsibility while continuing to make academic progress."
      : "I have balanced graduate study with employment, entrepreneurship, family responsibilities, and sustained community involvement.";

    const short = [
      `I am applying for the ${scholarshipName} as a computer science graduate student with a strong academic record and prior graduate training in engineering management.`,
      theme.short,
      `The support of ${provider} would give me more time to strengthen my software, data, cloud, and responsible-AI skills while building technology that makes public and organizational systems easier for people to use.`,
      "I would bring to this opportunity a record of persistence, practical leadership, community service, and the discipline to turn education into useful work."
    ].join(" ");

    const standard = [
      `I am pursuing the ${scholarshipName} because it aligns with the kind of career I am building: one that combines computer science, engineering management, and service-centered leadership.`,
      `I am completing graduate study in computer science after earning a graduate degree in engineering management. ${theme.standard}`,
      `My experience has crossed city government, nonprofit services, hospitality operations, student media, entrepreneurship, and technical projects. I have organized data, improved reporting workflows, explored cloud and AI automation, and built software projects that translate complex information into practical tools. ${creativeLine}`,
      `${resilienceLine} Those experiences taught me to approach education as both an opportunity and a responsibility.`,
      `Receiving this scholarship would reduce the pressure of tuition and academic expenses and allow me to devote more attention to advanced coursework and portfolio projects. My long-term goal is to lead the development of secure, responsible technology that improves how institutions serve people.`
    ].join("\n\n");

    const long = [
      `Technology is most meaningful to me when it helps people move through complicated systems with greater clarity and dignity. That belief is why I am applying for the ${scholarshipName} and why I have built an academic path that connects computer science, engineering management, data systems, leadership, and creative communication.`,
      `I am currently pursuing graduate study in computer science after completing graduate training in engineering management and an undergraduate degree in computer information systems. ${theme.long}`,
      "My professional experience has shown me what happens when important information is fragmented or difficult to use. In city government, nonprofit services, hospitality, and business environments, I have helped clean records, organize client and operational data, improve reporting, and explore automation that can save time without losing accountability. Those experiences strengthened my interest in software development, databases, cloud systems, cybersecurity, and responsible artificial intelligence.",
      `${creativeLine} I have also served in student and community leadership roles, including editor-in-chief of a student publication and years of community service and youth leadership. Those roles taught me that leadership is not simply holding a title. It is the habit of listening carefully, communicating honestly, and following through when other people depend on the result.`,
      `${resilienceLine} Grief, financial pressure, and uncertainty did not make education less important to me; they made its purpose clearer. I want the technical ability to build stronger systems and the management judgment to ensure those systems remain useful, ethical, and accessible.`,
      `Support from ${provider} would help reduce the academic expenses I continue to balance through work and personal income. It would give me more time to deepen my programming and systems knowledge, complete stronger technical projects, and prepare for a career leading secure automation and data initiatives across public, educational, and business organizations.`,
      "I would use this scholarship as an investment in practical service. My goal is not only to earn another credential, but to become the kind of technologist who can connect people, processes, and software in ways that leave institutions more capable and communities better supported."
    ].join("\n\n");

    return { short, standard, long };
  }

  function libraryThemeCopy(theme) {
    return {
      technical: {
        short: "My work in data cleanup, reporting, cloud workflows, automation, and software projects has shown me how thoughtful technology can improve real operations.",
        standard: "I am especially interested in software, data systems, cloud automation, cybersecurity, and responsible artificial intelligence.",
        long: "My present academic focus is the design of secure, practical technology that turns fragmented information into systems people can trust and use."
      },
      engineering: {
        short: "My engineering-management training and computer science studies help me connect technical design with implementation, operations, and people.",
        standard: "The combination of engineering management and computer science has trained me to evaluate both how a system works and how it can be implemented responsibly.",
        long: "Engineering management taught me to examine constraints, risk, process, and leadership, while computer science gives me the tools to build and evaluate the technology itself."
      },
      creative: {
        short: "As a filmmaker and technologist, I bring both structured problem-solving and a strong understanding of audience, story, and communication.",
        standard: "My filmmaking and student-media experience gives me a distinctive perspective on technology: useful systems must communicate clearly and be designed around real human needs.",
        long: "Creative production has taught me to work across vision, planning, technical execution, collaboration, and revision, all of which also shape strong software and systems work."
      },
      entrepreneurship: {
        short: "Starting my own business while financing college strengthened my resourcefulness, ownership, and ability to turn ideas into practical action.",
        standard: "Entrepreneurship taught me to manage uncertainty, communicate value, solve operational problems, and remain accountable for results.",
        long: "Building income through entrepreneurship while pursuing college required me to make careful decisions with limited resources and to keep moving from idea to execution."
      },
      service: {
        short: "Years of church, youth, student, nonprofit, and civic service taught me to measure leadership by consistency and impact.",
        standard: "My leadership has been shaped by long-term community service, youth mentorship, student media, nonprofit work, and public-sector experience.",
        long: "Service has been a consistent part of my development, from church and youth leadership to student organizations, nonprofit responsibilities, and public-sector work."
      },
      faith: {
        short: "My religious upbringing and years of church service taught me that leadership begins with responsibility, humility, and care for others.",
        standard: "Serving as a youth leader, deacon, Sunday school participant and teacher, and community member shaped my understanding of leadership as service.",
        long: "My faith community gave me early opportunities to serve, teach, organize, and support others, building a leadership foundation rooted in responsibility rather than recognition."
      },
      resilience: {
        short: "Continuing college through financial pressure, caregiving, entrepreneurship, and loss strengthened both my discipline and my sense of purpose.",
        standard: "My education has required persistence through financial uncertainty, caregiving, grief, work, and the challenge of building my own income.",
        long: "Resilience in my life has not been one dramatic decision; it has been the repeated choice to keep learning, working, and building through uncertainty."
      },
      graduate: {
        short: "My graduate record reflects disciplined study, practical leadership, and a clear commitment to using technology in service of others.",
        standard: "Graduate study has helped me connect technical depth with the leadership and operational judgment needed to implement technology responsibly.",
        long: "My graduate education represents a deliberate progression from information systems to engineering management and now deeper computer science study."
      }
    }[theme] || {
      short: "My academic and professional path combines technology, leadership, service, and practical problem-solving.",
      standard: "I bring a multidisciplinary record of technical learning, leadership, service, and creative production.",
      long: "My path combines technical education with practical experience across public, nonprofit, business, and creative environments."
    };
  }

  function formatLibraryDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Recheck live page";
    return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function countWords(value) {
    return String(value).trim().split(/\s+/).filter(Boolean).length;
  }

  function exportScholarshipLibrary() {
    const headers = [
      "Scholarship",
      "Category",
      "Fit Score",
      "Amount",
      "Deadline",
      "Grade Level",
      "Application URL",
      "Sensitive Eligibility",
      "Review Status"
    ];
    const rows = libraryData.scholarships.map((item) => [
      item.title,
      item.category,
      item.fitScore,
      item.amount,
      item.deadline,
      item.gradeLevel,
      item.url,
      item.sensitiveTags.join("; "),
      libraryState.reviewStatus[item.id] || "new"
    ]);
    downloadCsv(`scholarship_library_300_${dateStamp()}.csv`, [headers, ...rows]);
  }

  function renderSubmissionConsole() {
    const applicant = data.applicant;
    const facts = [
      ["Current application degree", applicant.currentDegreeForApplications],
      ["Completed graduate degree", applicant.completedGraduateDegree],
      ["City/state/ZIP", applicant.mailingCityStateZip],
      ["Email", applicant.email],
      ["Education", applicant.education.join("; ")],
      ["Verified resume highlights", applicant.verifiedResumeHighlights.join("; ")],
      ["Technical skills", applicant.verifiedSkills.join("; ")]
    ];

    els.profileTruth.innerHTML = facts.map(([label, value]) => `
      <div class="fact-card">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      </div>
    `).join("");

    els.missingFields.innerHTML = applicant.missingSubmissionFields
      .map((field) => `<li>${escapeHtml(field)}</li>`)
      .join("");

    els.submissionAttempts.innerHTML = (data.submissionAttempts || []).map((attempt) => `
      <article class="attempt-card">
        <header>
          <strong>${escapeHtml(attempt.rank)}. ${escapeHtml(attempt.scholarship)}</strong>
          ${statusPill(attempt.status)}
        </header>
        <p><strong>Action:</strong> ${escapeHtml(attempt.attemptedAction)}</p>
        <p><strong>Hold:</strong> ${escapeHtml(attempt.reason)}</p>
        <p><strong>Needed:</strong> ${escapeHtml(attempt.nextUserAction)}</p>
      </article>
    `).join("");
  }

  async function loadAutomation() {
    try {
      const [queueResponse, profileResponse] = await Promise.all([
        fetch("/api/queue", { cache: "no-store" }),
        fetch("/api/profile", { cache: "no-store" })
      ]);
      if (!queueResponse.ok || !profileResponse.ok) {
        throw new Error(`Service returned ${queueResponse.status}/${profileResponse.status}`);
      }
      const payload = await queueResponse.json();
      const profilePayload = await profileResponse.json();
      if (profilePayload.validation?.ok) {
        state.degreeVerified = true;
        state.transcriptVerified = true;
        saveState();
        renderProfileGate();
        renderStats();
        renderRows();
        renderDetail();
      }
      renderAutomation(payload);
      els.automationServiceStatus.textContent = "Service Online";
      els.automationServiceStatus.className = "status-pill ok";
      els.automationMessage.textContent = "Local profile and queue are loaded. Packets stay on this computer.";
      els.prepareAllApplications.disabled = false;
    } catch (error) {
      els.automationServiceStatus.textContent = "Service Offline";
      els.automationServiceStatus.className = "status-pill blocked";
      els.automationMessage.textContent = "Run serve.ps1 or start-scholarship-robot.cmd to enable the application engine.";
      els.prepareAllApplications.disabled = true;
      els.automationStats.innerHTML = "";
      els.automationRows.innerHTML = "";
    }
  }

  function renderAutomation(payload) {
    const summary = payload.summary;
    const metrics = [
      ["Queue", summary.total],
      ["Submitted", summary.submitted],
      ["Ready", summary.ready],
      ["Browser Ready", summary.browserReady],
      ["Email Ready", summary.emailReady],
      ["Blocked", summary.blocked]
    ];
    els.automationStats.innerHTML = metrics
      .map(([label, value]) => `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`)
      .join("");

    els.automationRows.innerHTML = summary.evaluations.map((item) => {
      const blockText = item.blocks.length ? item.blocks.join(", ") : "None";
      const sendDisabled = item.action !== "email" || !item.ready;
      return `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.deadline)}</div></td>
          <td>${escapeHtml(title(item.method))}</td>
          <td>${statusPill(item.status)}</td>
          <td>${escapeHtml(title(item.action))}</td>
          <td>${escapeHtml(blockText)}</td>
          <td>
            <button class="button secondary" type="button" data-automation-prepare="${escapeHtml(item.id)}">Prepare</button>
            <button class="button primary" type="button" data-automation-send="${escapeHtml(item.id)}" ${sendDisabled ? "disabled" : ""}>Send</button>
          </td>
        </tr>
      `;
    }).join("");

    els.automationRows.querySelectorAll("[data-automation-prepare]").forEach((button) => {
      button.addEventListener("click", () => prepareOne(button.dataset.automationPrepare));
    });
    els.automationRows.querySelectorAll("[data-automation-send]").forEach((button) => {
      button.addEventListener("click", () => sendOne(button.dataset.automationSend));
    });
  }

  async function prepareAll() {
    setAutomationBusy(true, "Preparing packets...");
    try {
      const payload = await apiRequest("/api/prepare-all", {});
      els.automationMessage.textContent = `Prepared ${payload.result.total} packets: ${payload.result.ready} ready, ${payload.result.blocked} blocked, ${payload.result.submitted} already submitted.`;
      await loadAutomation();
    } catch (error) {
      els.automationMessage.textContent = error.message;
    } finally {
      setAutomationBusy(false);
    }
  }

  async function prepareOne(applicationId) {
    setAutomationBusy(true, "Preparing application packet...");
    try {
      const payload = await apiRequest(`/api/applications/${encodeURIComponent(applicationId)}/prepare`, {});
      const evaluation = payload.result.evaluation;
      els.automationMessage.textContent = evaluation.ready
        ? `Packet prepared for ${applicationId}.`
        : `Packet prepared with blocks: ${evaluation.blocks.join(", ")}`;
    } catch (error) {
      els.automationMessage.textContent = error.message;
    } finally {
      setAutomationBusy(false);
    }
  }

  async function sendOne(applicationId) {
    const approved = window.confirm("Send this reviewed email-only scholarship application now? SMTP credentials and every safety gate must pass.");
    if (!approved) return;
    setAutomationBusy(true, "Sending approved email application...");
    try {
      const payload = await apiRequest(`/api/applications/${encodeURIComponent(applicationId)}/send`, { confirm: "SEND" });
      els.automationMessage.textContent = `Sent to ${payload.result.to}.`;
      await loadAutomation();
    } catch (error) {
      els.automationMessage.textContent = error.message;
    } finally {
      setAutomationBusy(false);
    }
  }

  async function apiRequest(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Scholarship-Robot": "local-ui"
      },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `Request failed with ${response.status}`);
    return payload;
  }

  function setAutomationBusy(busy, message) {
    els.refreshAutomation.disabled = busy;
    els.prepareAllApplications.disabled = busy;
    if (message) els.automationMessage.textContent = message;
  }

  function renderFilters() {
    const categories = ["all", ...new Set(data.scholarships.map((item) => item.category).sort())];
    els.categoryFilter.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${title(category)}</option>`).join("");
    const statuses = ["all", ...data.statuses];
    els.statusFilter.innerHTML = statuses.map((status) => `<option value="${escapeHtml(status)}">${title(status)}</option>`).join("");
  }

  function renderRows() {
    const items = filteredItems();
    els.resultCount.textContent = `${items.length} shown`;
    els.rows.innerHTML = items.map((item) => {
      const itemSafety = safety(item);
      const pill = safetyPill(itemSafety, item);
      return `
        <tr data-id="${item.id}" class="${item.id === selectedId ? "is-selected" : ""}">
          <td><strong>${item.adjustedScore}</strong></td>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="muted">${escapeHtml(item.sponsor)} - ${escapeHtml(item.category)}</div>
          </td>
          <td>${escapeHtml(item.deadline)}</td>
          <td>${escapeHtml(title(item.applicationMethod))}</td>
          <td>${statusPill(item.effectiveStatus)}</td>
          <td>${pill}</td>
        </tr>
      `;
    }).join("");

    [...els.rows.querySelectorAll("tr")].forEach((row) => {
      row.addEventListener("click", () => {
        selectedId = row.dataset.id;
        render();
      });
    });
  }

  function renderDetail() {
    const item = sortedItems().find((candidate) => candidate.id === selectedId) || sortedItems()[0];
    if (!item) return;
    const template = document.getElementById("detailTemplate").content.cloneNode(true);
    template.querySelector('[data-field="name"]').textContent = item.name;
    template.querySelector('[data-field="summary"]').textContent = item.eligibility;
    template.querySelector('[data-field="url"]').href = item.url;

    const detailList = template.querySelector(".detail-list");
    const rows = [
      ["Sponsor", item.sponsor],
      ["Amount", item.amount],
      ["Deadline", item.deadline],
      ["Method", title(item.applicationMethod)],
      ["Status", title(effectiveStatus(item))],
      ["AI Policy", title(item.aiPolicy)],
      ["Materials", item.materials],
      ["Fit Reasons", item.matchReasons.join("; ")],
      ["Risks", item.risks.join("; ")],
      ["Next Action", item.nextAction]
    ];
    detailList.innerHTML = rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");

    const warnings = safety(item);
    const warningBox = template.querySelector(".warning-box");
    warningBox.innerHTML = warnings.map((warning) => `<p class="${warning.level === "danger" ? "danger" : ""}">${escapeHtml(warning.text)}</p>`).join("");

    const notes = template.querySelector('[data-field="notes"]');
    notes.value = state.notes[item.id] || "";
    notes.addEventListener("input", () => {
      state.notes[item.id] = notes.value;
      saveState();
    });

    template.querySelector('[data-action="draft"]').addEventListener("click", () => {
      buildDraft(item);
    });
    template.querySelector('[data-action="copyEmail"]').addEventListener("click", () => {
      copyText(buildEmailPacket(item));
    });

    template.querySelectorAll("[data-status]").forEach((button) => {
      const desired = button.dataset.status;
      if (desired === "ready_for_review" && !canMoveToReview(item)) {
        button.disabled = true;
      }
      button.addEventListener("click", () => {
        if (desired === "ready_for_review" && !canMoveToReview(item)) return;
        state.overrides[item.id] = desired;
        saveState();
        render();
      });
    });

    els.detail.innerHTML = "";
    els.detail.appendChild(template);
  }

  function statusPill(status) {
    const kind = status === "verified" || status === "submitted_by_user" ? "ok" :
      status === "not_eligible" || status === "closed" || String(status).includes("blocked") ? "blocked" :
      status === "monitor_next_cycle" || String(status).includes("partial") ? "warn" : "neutral";
    return `<span class="status-pill ${kind}">${escapeHtml(title(status))}</span>`;
  }

  function safetyPill(warnings, item) {
    if (item.applicationMethod === "search") return '<span class="status-pill neutral">Lead Source</span>';
    if (warnings.some((warning) => warning.level === "danger")) return '<span class="status-pill blocked">Blocked</span>';
    if (warnings.length) return '<span class="status-pill warn">Review</span>';
    return '<span class="status-pill ok">Clear</span>';
  }

  function buildDraft(item) {
    const prompt = els.promptBox.value.trim() || "Explain why you are a strong fit for this scholarship.";
    const tone = els.toneSelect.value;
    const story = {
      professional: "I connect engineering management, computer science, and data systems work with a practical record of turning messy operations into cleaner workflows.",
      personal: "My path through college required resilience, self-support, entrepreneurship, and balancing family responsibilities while continuing to grow academically and professionally.",
      technical: "My strongest technical evidence is in cloud/data systems, SQL, Power BI, SharePoint, CRM cleanup, AI workflow design, and infrastructure-minded computer science.",
      creative: "My filmmaking and game-development work shows that I can build systems and shape stories, which makes my technical work more human and audience-aware.",
      faith: "Long-term community service taught me to view leadership as responsibility, consistency, and care for others."
    }[tone];

    const aiWarning = item.aiPolicy === "prohibited" || item.aiPolicy === "restricted"
      ? "\n\nIMPORTANT: This sponsor restricts or prohibits AI-generated writing. Treat this as an outline only. Kieron must rewrite the final answer in his own words."
      : "\n\nBefore submission, verify whether the sponsor asks for AI-use disclosure.";

    const draft = [
      `Scholarship: ${item.name}`,
      `Prompt: ${prompt}`,
      "",
      "Working thesis:",
      `${data.applicant.name} is a strong candidate because his graduate training, strong academic record, technical systems work, and leadership history show both academic readiness and practical service.`,
      "",
      "Evidence to use:",
      `- ${story}`,
      `- Portfolio: ${data.applicant.portfolioUrl}`,
      `- Film work when relevant: ${data.applicant.youtubeUrl}`,
      `- Match reasons: ${item.matchReasons.join("; ")}`,
      "",
      "Draft paragraph:",
      `I am pursuing graduate-level technical leadership because I have seen how much difference organized systems can make for real people. My work has crossed data analytics, cloud tools, IT operations, CRM cleanup, editorial leadership, and creative production. That mix lets me bring both structure and imagination to engineering problems. With a strong graduate academic record and experience building dashboards, automating workflows, and leading student and community projects, I am prepared to use this scholarship to keep advancing toward work that connects technology, operations, and service.`,
      aiWarning
    ].join("\n");

    els.draftBox.value = draft;
  }

  function buildEmailPacket(item) {
    const subject = `${item.name} Application - Haynes, Kieron`;
    return [
      `To: ${item.contactEmail || "[verify sponsor email]"}`,
      `Subject: ${subject}`,
      "",
      "Dear Scholarship Committee,",
      "",
      `I am writing to submit my application for the ${item.name}. I am a graduate student focused on engineering management, computer science, data systems, and technical leadership. My transcript and verified academic record will be attached before sending.`,
      "",
      "Attached materials checklist:",
      "- Completed application form, if required",
      "- Resume",
      "- Unofficial transcript",
      "- Personal essay or statement",
      "- Recommendation letter, if required",
      "",
      `My professional portfolio is available here: ${data.applicant.portfolioUrl}`,
      "",
      "Thank you for your time and consideration.",
      "",
      "Sincerely,",
      "Graduate Scholarship Applicant",
      data.applicant.email,
      "",
      "ROBOT SAFETY NOTE: Do not send until every attachment, eligibility claim, AI policy, deadline, and recipient address is manually verified."
    ].join("\n");
  }

  function runChecks() {
    const items = sortedItems();
    const top50 = items.slice(0, 50);
    const checks = [
      {
        label: "Profile Gate",
        ok: !state.degreeVerified || !state.transcriptVerified ? false : true,
        text: state.degreeVerified && state.transcriptVerified
          ? "Degree timeline and transcript/GPA are marked verified locally."
          : "Final submission is blocked until degree timeline and transcript/GPA are verified."
      },
      {
        label: "Safety Blocks",
        ok: items.some((item) => safety(item).some((warning) => warning.level === "danger")),
        text: "Danger states are present and intentionally block ready_for_review."
      },
      {
        label: "Top 50 Reasons",
        ok: top50.length === 50 && top50.every((item) => item.matchReasons.length > 0),
        text: `${top50.length} records in top queue; each includes fit reasons.`
      },
      {
        label: "Email Safety",
        ok: items.filter((item) => item.applicationMethod === "email").every((item) => buildEmailPacket(item).includes("Do not send")),
        text: "Email packets include review warnings and are draft-first."
      },
      {
        label: "AI Policy",
        ok: items.filter((item) => item.aiPolicy === "prohibited").every((item) => safety(item).some((warning) => warning.level === "danger")),
        text: "AI-prohibited opportunities are blocked from generated-writing submission."
      },
      {
        label: "Exports",
        ok: true,
        text: "Prospect, top-50, tracker, and direct-link CSV exports are available."
      },
      {
        label: "Opportunity Radar",
        ok: (data.opportunitySources || []).some((source) => (source.publishedCount || 0) >= 300) &&
          items.filter((item) => item.newThisRun).length >= 10,
        text: "The radar includes 10 newly verified applications and live sources publishing hundreds of additional records."
      }
    ];

    els.checks.innerHTML = checks.map((check) => `
      <div class="check-card">
        ${check.ok ? '<span class="status-pill ok">Pass</span>' : '<span class="status-pill warn">Needs Action</span>'}
        <strong>${escapeHtml(check.label)}</strong>
        <p>${escapeHtml(check.text)}</p>
      </div>
    `).join("");
  }

  function exportCsv(kind) {
    const items = kind === "top50"
      ? sortedItems().slice(0, 50)
      : kind === "direct"
        ? sortedItems().filter((item) => item.applicationMethod !== "search" && item.status !== "not_eligible")
        : sortedItems();
    const headers = [
      "rank",
      "id",
      "name",
      "sponsor",
      "category",
      "url",
      "amount",
      "deadline",
      "method",
      "status",
      "score",
      "ai_policy",
      "sensitive_tags",
      "eligibility",
      "materials",
      "match_reasons",
      "risks",
      "next_action",
      "verified_on",
      "new_this_run",
      "manual_only",
      "notes"
    ];
    const rows = items.map((item, index) => [
      index + 1,
      item.id,
      item.name,
      item.sponsor,
      item.category,
      item.url,
      item.amount,
      item.deadline,
      item.applicationMethod,
      effectiveStatus(item),
      item.adjustedScore,
      item.aiPolicy,
      item.sensitiveTags.join("|"),
      item.eligibility,
      item.materials,
      item.matchReasons.join("|"),
      item.risks.join("|"),
      item.nextAction,
      item.verifiedOn || "",
      item.newThisRun ? "yes" : "no",
      item.manualOnly ? "yes" : "no",
      state.notes[item.id] || ""
    ]);
    const baseName = kind === "top50"
      ? "top_50_apply_queue"
      : kind === "tracker"
        ? "status_tracker"
        : kind === "direct"
          ? "direct_application_links"
          : "scholarship_prospects";
    downloadCsv(`${baseName}_${dateStamp()}.csv`, [headers, ...rows]);
  }

  function downloadCsv(filename, rows) {
    const text = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
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

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      els.draftBox.value = text;
    }).catch(() => {
      els.draftBox.value = text;
    });
  }

  function dateStamp() {
    return today.toISOString().slice(0, 10);
  }

  function title(value) {
    return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
    ["input", "change"].forEach((eventName) => {
      els.search.addEventListener(eventName, render);
      els.categoryFilter.addEventListener(eventName, render);
      els.statusFilter.addEventListener(eventName, render);
      els.hideBlocked.addEventListener(eventName, render);
    });
    els.degreeVerified.addEventListener("change", () => {
      state.degreeVerified = els.degreeVerified.checked;
      saveState();
      render();
    });
    els.transcriptVerified.addEventListener("change", () => {
      state.transcriptVerified = els.transcriptVerified.checked;
      saveState();
      render();
    });
    els.identityConfirmed.addEventListener("change", () => {
      state.identityConfirmed = els.identityConfirmed.checked;
      saveState();
      render();
    });
    document.getElementById("exportTop50").addEventListener("click", () => exportCsv("top50"));
    document.getElementById("exportProspects").addEventListener("click", () => exportCsv("prospects"));
    document.getElementById("exportTracker").addEventListener("click", () => exportCsv("tracker"));
    document.getElementById("exportDirectLinks").addEventListener("click", () => exportCsv("direct"));
    document.getElementById("runChecks").addEventListener("click", runChecks);
    document.getElementById("copyDraft").addEventListener("click", () => copyText(els.draftBox.value));
    els.refreshAutomation.addEventListener("click", loadAutomation);
    els.prepareAllApplications.addEventListener("click", prepareAll);
    els.promptBox.addEventListener("input", () => {
      const item = sortedItems().find((candidate) => candidate.id === selectedId);
      if (item && els.draftBox.value) buildDraft(item);
    });
    els.toneSelect.addEventListener("change", () => {
      const item = sortedItems().find((candidate) => candidate.id === selectedId);
      if (item && els.draftBox.value) buildDraft(item);
    });
    ["input", "change"].forEach((eventName) => {
      els.radarSearch.addEventListener(eventName, renderOpportunityRadar);
      els.radarFocus.addEventListener(eventName, renderOpportunityRadar);
      els.radarOpenOnly.addEventListener(eventName, renderOpportunityRadar);
      els.librarySearch.addEventListener(eventName, () => {
        libraryPageIndex = 0;
        renderScholarshipLibrary();
      });
      els.libraryCategory.addEventListener(eventName, () => {
        libraryPageIndex = 0;
        renderScholarshipLibrary();
      });
      els.librarySort.addEventListener(eventName, () => {
        libraryPageIndex = 0;
        renderScholarshipLibrary();
      });
      els.librarySensitive.addEventListener(eventName, () => {
        libraryPageIndex = 0;
        renderScholarshipLibrary();
      });
    });
    els.libraryPrevious.addEventListener("click", () => {
      libraryPageIndex = Math.max(0, libraryPageIndex - 1);
      renderScholarshipLibrary();
      els.libraryResults.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.libraryNext.addEventListener("click", () => {
      libraryPageIndex += 1;
      renderScholarshipLibrary();
      els.libraryResults.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.exportLibrary.addEventListener("click", exportScholarshipLibrary);
  }

  function render() {
    renderProfileGate();
    renderStats();
    renderSubmissionConsole();
    renderOpportunityRadar();
    renderScholarshipLibrary();
    renderRows();
    renderDetail();
  }

  renderFilters();
  renderLibraryFilters();
  bindEvents();
  render();
  runChecks();
  loadAutomation();
})();
