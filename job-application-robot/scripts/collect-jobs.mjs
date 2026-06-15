import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(moduleDir, "..");
const generatedAt = new Date().toISOString();

const applicant = {
  name: "Kieron Christopher Haynes",
  location: "New Orleans, Louisiana",
  currentDegree: "M.S. Computer Science, University of New Orleans, expected May 2027",
  completedDegrees: [
    "M.S. Engineering Management, University of New Orleans, May 2025",
    "B.S. Computer Information Systems, Southern University at New Orleans, May 2024"
  ],
  portfolio: "https://kieronhaynes38-king.github.io/Kieron-s-portfolio/",
  resumeHighlights: [
    "Analyzed occupancy and labor data with Excel and SQL for Hotel Management of New Orleans",
    "Built dashboards, reporting pipelines, and SharePoint document systems",
    "Cleaned CRM data and automated reporting for disaster-recovery nonprofit SBP",
    "Built Windows Server and Active Directory workflows, permissions, and documentation",
    "Digitized public-sector records and supported database development",
    "Led a student newsroom's transition from print to digital as Editor-in-Chief"
  ],
  skills: [
    "Python",
    "Java",
    "JavaScript",
    "SQL",
    "Excel",
    "Power BI",
    "SharePoint",
    "PowerShell",
    "Windows Server",
    "Active Directory",
    "AWS",
    "Azure",
    "Google Cloud",
    "Linux",
    "REST APIs",
    "CRM",
    "data modeling",
    "dashboards",
    "automation",
    "AI prompt engineering",
    "technical documentation",
    "digital publishing",
    "film production",
    "Godot"
  ]
};

const greenhouseBoards = [
  ["Samsara", "samsara"],
  ["Instacart", "instacart"],
  ["Affirm", "affirm"],
  ["Twilio", "twilio"],
  ["GitLab", "gitlab"],
  ["Stripe", "stripe"],
  ["Reddit", "reddit"],
  ["Coinbase", "coinbase"],
  ["Dropbox", "dropbox"],
  ["Grafana Labs", "grafanalabs"],
  ["LaunchDarkly", "launchdarkly"],
  ["Smartsheet", "smartsheet"],
  ["PagerDuty", "pagerduty"],
  ["Vercel", "vercel"],
  ["Airtable", "airtable"],
  ["Calendly", "calendly"],
  ["Mattermost", "mattermost"],
  ["Algolia", "algolia"],
  ["Mixpanel", "mixpanel"],
  ["Amplitude", "amplitude"],
  ["Databricks", "databricks"],
  ["Elastic", "elastic"]
];

const roleFamilies = [
  {
    name: "Data & Analytics",
    title: /\b(data|analytics|analyst|business intelligence|reporting|insights|research data|market intelligence)\b/i,
    terms: ["sql", "excel", "power bi", "dashboard", "reporting", "analytics", "data model", "database", "metrics", "insights"],
    evidence: "At Hotel Management of New Orleans, I analyzed occupancy and labor data with Excel and SQL, built reporting pipelines, and translated operational information into dashboards that leaders could use."
  },
  {
    name: "IT & Systems",
    title: /\b(it |information technology|systems?|application support|technical support|help desk|desktop support|identity|active directory|administrator|service desk)\b/i,
    terms: ["windows server", "active directory", "sharepoint", "permissions", "it operations", "support", "systems", "documentation", "troubleshoot", "microsoft 365"],
    evidence: "In IT operations work, I supported Windows Server and Active Directory environments, managed permissions, created repeatable documentation, and helped turn loosely defined business needs into dependable systems."
  },
  {
    name: "Cloud & Infrastructure",
    title: /\b(cloud|devops|infrastructure|platform|site reliability|network|systems engineer|security operations)\b/i,
    terms: ["aws", "azure", "google cloud", "linux", "powershell", "cloud", "infrastructure", "api", "monitoring", "security"],
    evidence: "My technical training spans AWS, Azure, Google Cloud, Linux, PowerShell, Windows Server, REST APIs, and identity management, supported by graduate study in computer science and engineering management."
  },
  {
    name: "Software & QA",
    title: /\b(software|developer|application developer|programmer|quality assurance|qa |test engineer|automation engineer|integration engineer)\b/i,
    terms: ["python", "java", "javascript", "sql", "rest api", "backend", "automation", "testing", "git", "software"],
    evidence: "I have built backend applications and data tools using Python, Java, JavaScript, SQL, REST concepts, and Git, while also developing interactive systems in Godot."
  },
  {
    name: "Project & Program",
    title: /\b(project|program|implementation|delivery|scrum|project controls|project coordinator|program coordinator)\b/i,
    terms: ["project", "program", "implementation", "stakeholder", "workflow", "process", "documentation", "coordination", "delivery", "timeline"],
    evidence: "My M.S. in Engineering Management strengthened my ability to connect technical execution, process improvement, stakeholder communication, and practical delivery."
  },
  {
    name: "Operations & Process",
    title: /\b(operations?|process|business operations|strategy and operations|procurement|category management|workforce|quality operations)\b/i,
    terms: ["operations", "process", "workflow", "efficiency", "documentation", "reporting", "quality", "coordination", "planning", "continuous improvement"],
    evidence: "Across hospitality, nonprofit, public-sector, and consulting environments, I have improved workflows, cleaned operational data, automated recurring reporting, and documented processes for other people to use."
  },
  {
    name: "Customer & Implementation",
    title: /\b(customer success|customer support|client|implementation|onboarding|solutions consultant|technical account|support specialist|access navigator)\b/i,
    terms: ["customer", "client", "implementation", "onboarding", "support", "communication", "crm", "training", "adoption", "service"],
    evidence: "My client-services experience includes managing CRM information, coordinating cases, communicating clearly across teams, and building tools that make service delivery faster and more consistent."
  },
  {
    name: "CRM & Business Systems",
    title: /\b(crm|business systems|sales operations|revenue operations|marketing operations|enterprise applications|business applications)\b/i,
    terms: ["crm", "salesforce", "hubspot", "business systems", "data quality", "automation", "workflow", "reporting", "integrations", "sharepoint"],
    evidence: "I have cleaned CRM datasets, automated recurring reports, designed SharePoint systems, and used data-quality work to improve how teams find and act on information."
  },
  {
    name: "Content & Creative Technology",
    title: /\b(content|editorial|video|media|communications|digital producer|creative|audience|community)\b/i,
    terms: ["content", "editorial", "digital", "video", "media", "communications", "audience", "storytelling", "publishing", "creative"],
    evidence: "As Editor-in-Chief of The SUNO Observer, I led a print-to-digital transition and built engagement tracking. My portfolio also includes directing, editing, and publishing short films and interactive creative work."
  },
  {
    name: "Administration & Coordination",
    title: /\b(coordinator|specialist|executive assistant|administrator|administrative|admissions|financial aid|compliance analyst|credentialing)\b/i,
    terms: ["coordination", "administration", "documentation", "records", "reporting", "stakeholder", "scheduling", "compliance", "data entry", "microsoft office"],
    evidence: "My background combines executive support, records management, data coordination, technical documentation, and leadership roles that required accuracy, follow-through, and clear communication."
  }
];

const hardExclusions = /\b(registered nurse|nurse practitioner|nurse|lpn|physician|surgeon|radiologic|radiology|pharmacist|pharmacy|therapist|psychiatrist|dentist|clinical veterinarian|clinical research|medical assistant|medical technologist|diagnostic specialist|ecmo|chemotherapy|infusion|respiratory|patient care|surgical|med surg|sterile compounding|attorney|counsel|lineworker|electrician|plumber|custodial|cook|food service|crna|account executive|sales development representative|mandarin|bilingual technical|spanish-speaking|japanese-speaking|latam)\b/i;
const seniorityPattern = /\b(senior|sr\.?|lead|manager|supervisor|staff|principal|director|head|vice president|vp|chief|architect)\b/i;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Kieron-Job-Application-Robot/1.0",
      Accept: "application/json"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 Kieron-Job-Application-Robot/1.0",
      Accept: "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function stripHtml(value) {
  const decoded = decodeEntities(String(value || ""));
  return decodeEntities(decoded
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalize(value) {
  return stripHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value) {
  return normalize(value).replace(/\s+/g, "-").slice(0, 110);
}

function isUsRemoteLocation(location) {
  const value = stripHtml(location).toLowerCase();
  if (/\b(remote|work from home)\b/.test(value) === false) return false;
  const usSignal = /\b(united states|usa|u\.s\.|us|north america|americas|worldwide)\b/.test(value);
  const foreignSignal = /\b(canada|cyprus|mexico|uk|united kingdom|india|poland|spain|germany|france|ireland|australia|japan|colombia|brazil|taiwan|singapore|netherlands|israel|emea|europe|apac)\b/.test(value);
  if (foreignSignal && !usSignal) return false;
  if (/\bmust reside in california\b|\bcalifornia residents? only\b|\bremote - ca\b/.test(value)) return false;
  if (/\bselect locations\b/.test(value) && !/\blouisiana\b/.test(value)) return false;
  return usSignal;
}

function classifyRole(title, description) {
  const text = `${title} ${description}`;
  const matches = roleFamilies.map((family) => {
    const titleMatch = family.title.test(title);
    const termMatches = family.terms.filter((term) => normalize(text).includes(normalize(term)));
    return {
      family,
      titleMatch,
      termMatches,
      score: (titleMatch ? 34 : 0) + Math.min(30, termMatches.length * 4)
    };
  }).sort((a, b) => b.score - a.score);
  return matches[0];
}

function extractYears(description) {
  const values = [...String(description || "").matchAll(/\b(\d{1,2})\+?\s+years?\b/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value < 25);
  return values.length ? Math.max(...values) : 0;
}

function scoreJob(raw) {
  const title = stripHtml(raw.title);
  const description = stripHtml(raw.description);
  const classification = classifyRole(title, description);
  let score = 40 + classification.score;
  const reasons = [];
  const gaps = [];

  if (classification.titleMatch) {
    reasons.push(`${classification.family.name} title aligns with the target job families.`);
  } else {
    reasons.push(`Responsibilities include transferable ${classification.family.name.toLowerCase()} work.`);
  }

  if (classification.termMatches.length) {
    reasons.push(`Resume overlap: ${classification.termMatches.slice(0, 5).join(", ")}.`);
  }

  const resumeMatches = applicant.skills.filter((skill) => normalize(description).includes(normalize(skill)));
  score += Math.min(18, resumeMatches.length * 2);
  if (resumeMatches.length) reasons.push(`Technical overlap: ${resumeMatches.slice(0, 6).join(", ")}.`);

  if (/\b(entry|junior|associate|coordinator|specialist|analyst i|level i|level 1)\b/i.test(title)) {
    score += 10;
    reasons.push("Seniority appears compatible with early-career graduate experience.");
  }

  if (/\bremote\b/i.test(raw.workMode)) {
    score += 3;
    reasons.push("Explicit USA-remote listing appears compatible with living in New Orleans.");
  } else {
    score += 4;
    reasons.push("In-person location is New Orleans.");
  }

  const years = extractYears(description);
  if (years >= 8) {
    score -= 24;
    gaps.push(`Posting references up to ${years} years of experience.`);
  } else if (years >= 5) {
    score -= 14;
    gaps.push(`Posting references up to ${years} years of experience.`);
  } else if (years >= 3) {
    score -= 5;
    gaps.push(`Posting references up to ${years} years of experience; compare the exact requirement.`);
  }

  if (/\b(vice president|vp|chief|head of)\b/i.test(title)) {
    score -= 42;
    score = Math.min(score, 45);
    gaps.push("Executive-level title is a substantial stretch.");
  } else if (/\b(director|principal|staff)\b/i.test(title)) {
    score -= 28;
    score = Math.min(score, 56);
    gaps.push("Advanced title may require deeper specialized experience.");
  } else if (/\b(manager|supervisor|architect)\b/i.test(title)) {
    score -= 19;
    score = Math.min(score, 64);
    gaps.push("Management or architecture scope may be a stretch.");
  } else if (/\b(senior|sr\.?|lead)\b/i.test(title)) {
    score -= 10;
    score = Math.min(score, 74);
    gaps.push("Senior or lead scope should be checked against the required years.");
  }

  if (hardExclusions.test(title)) {
    score -= 60;
    gaps.push("Role requires a substantially different professional background or license.");
  }

  if (raw.source === "Jobicy") score -= 2;
  if (!description) {
    score -= 4;
    gaps.push("Full qualifications must be reviewed on the employer page.");
  }

  score = Math.max(20, Math.min(99, score));
  const fitBand = score >= 82 ? "Strong" : score >= 70 ? "Good" : score >= 58 ? "Possible" : "Stretch";

  return {
    score,
    fitBand,
    roleFamily: classification.family.name,
    fitReasons: reasons.slice(0, 4),
    gaps: gaps.length ? gaps : ["Verify exact years, degree requirements, and state eligibility on the live application."],
    skillsMatched: [...new Set([...classification.termMatches, ...resumeMatches])].slice(0, 10),
    evidence: classification.family.evidence
  };
}

function buildCoverLetter(job, fit) {
  const locationSentence = job.workMode === "Remote"
    ? "I am based in New Orleans and am prepared to contribute effectively in a distributed U.S. work environment."
    : "As a New Orleans resident, I am especially interested in contributing my technical and operational experience to an organization serving this community.";
  const matched = fit.skillsMatched.length
    ? fit.skillsMatched.slice(0, 5).join(", ")
    : "data analysis, workflow improvement, technical documentation, and cross-functional communication";
  const roleInterest = roleInterestSentence(fit.roleFamily, job.title, job.company);

  return [
    "Dear Hiring Team,",
    "",
    `I am writing to apply for the ${job.title} position with ${job.company}. ${roleInterest} ${locationSentence}`,
    "",
    fit.evidence,
    "",
    `This opportunity stands out because it calls for capabilities that connect directly with my background, including ${matched}. I have worked across hospitality operations, nonprofit client services, student media, IT support, and public-sector data environments. Those experiences taught me how to enter an unfamiliar workflow, understand what the team needs, organize the underlying information, and build a practical improvement rather than stopping at analysis.`,
    "",
    `I hold an M.S. in Engineering Management and a B.S. in Computer Information Systems, and I am currently completing an M.S. in Computer Science at the University of New Orleans. That combination has strengthened both my technical foundation and my ability to communicate with operational stakeholders. My portfolio at ${applicant.portfolio} includes data, systems, software, game-development, and filmmaking work that demonstrates the range and follow-through I would bring to ${job.company}.`,
    "",
    `I would welcome the opportunity to discuss how my background in ${fit.roleFamily.toLowerCase()}, process improvement, and technical problem solving could support the ${job.title} team. Thank you for your time and consideration.`,
    "",
    "Sincerely,",
    applicant.name
  ].join("\n");
}

function roleInterestSentence(family, title, company) {
  const lines = {
    "Data & Analytics": `The role's focus on turning information into decisions closely matches the work I have done with operational datasets, dashboards, reporting, and database-supported workflows.`,
    "IT & Systems": `I am drawn to the opportunity to support dependable systems, users, permissions, documentation, and business operations in the ${title} role.`,
    "Cloud & Infrastructure": `The position aligns with my growing focus on cloud platforms, infrastructure, automation, identity, and reliable technical operations.`,
    "Software & QA": `I am interested in bringing my programming, backend, automation, and systems-thinking experience to software that people can depend on.`,
    "Project & Program": `I am interested in helping ${company} translate technical and operational goals into organized, documented, and measurable delivery.`,
    "Operations & Process": `The opportunity fits the pattern of my experience: finding friction in a workflow, using data to understand it, and creating a cleaner process for the team.`,
    "Customer & Implementation": `I value technical work that improves the experience of real customers and internal users, especially when it combines communication, data, and implementation.`,
    "CRM & Business Systems": `The role connects directly with my experience improving CRM data quality, automated reporting, SharePoint workflows, and business-facing systems.`,
    "Content & Creative Technology": `The role combines technology and audience awareness, which reflects my background in digital publishing, engagement tracking, filmmaking, and interactive media.`,
    "Administration & Coordination": `The position fits my experience coordinating records, technology, reporting, documentation, and communication across busy teams.`
  };
  return lines[family] || `The responsibilities connect with my background in technical problem solving, data, operations, and communication.`;
}

function buildApplicationAnswers(job, fit) {
  return {
    whyThisRole: `I am interested in the ${job.title} role because it combines ${fit.roleFamily.toLowerCase()} with the practical problem solving I have used across data, IT, operations, and client-service environments.`,
    strongestQualification: fit.evidence,
    remoteOrLocalReadiness: job.workMode === "Remote"
      ? "I live in New Orleans, Louisiana, maintain a reliable technology-focused work setup, and have experience collaborating through cloud tools, documentation, shared data, and structured workflows."
      : "I live in New Orleans and can work in person within the city. My local education and professional experience have made me familiar with the community and its institutions.",
    portfolioAnswer: `My portfolio is available at ${applicant.portfolio} and includes data systems, cloud and infrastructure concepts, backend/software projects, a Godot simulation game, and film work.`,
    salaryAnswer: "Open to a market-competitive offer based on the role's scope, total compensation, and growth opportunity."
  };
}

function finalizeJob(raw, index) {
  const fit = scoreJob(raw);
  const job = {
    id: raw.id || `job-${slug(raw.company)}-${slug(raw.title)}-${index}`,
    title: stripHtml(raw.title),
    company: stripHtml(raw.company),
    location: stripHtml(raw.location),
    workMode: raw.workMode,
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    applyUrl: raw.applyUrl,
    postedDate: raw.postedDate || "",
    updatedDate: raw.updatedDate || "",
    employmentType: stripHtml(raw.employmentType || "Check listing"),
    salary: stripHtml(raw.salary || "Not listed"),
    description: stripHtml(raw.description).slice(0, 1800),
    collectedAt: generatedAt,
    locationEligibility: raw.workMode === "Remote"
      ? "Listing explicitly indicates USA, U.S., North America, or worldwide remote eligibility. Recheck Louisiana eligibility before applying."
      : "Listing location is New Orleans, Louisiana.",
    applicationStatus: "prospect",
    ...fit
  };
  job.coverLetter = buildCoverLetter(job, fit);
  job.applicationAnswers = buildApplicationAnswers(job, fit);
  return job;
}

async function collectGreenhouse() {
  const results = [];
  for (const [company, token] of greenhouseBoards) {
    try {
      const sourceUrl = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
      const payload = await fetchJson(sourceUrl);
      for (const item of payload.jobs || []) {
        const location = item.location?.name || "";
        if (!isUsRemoteLocation(location)) continue;
        if (/\b(canada|germany|ireland|spain|bulgaria|costa rica|mexico|denmark|france|luxembourg|emea|europe|united kingdom|uk)\b/i.test(item.title) &&
            !/\b(usa|united states|u\.s\.)\b/i.test(item.title)) continue;
        results.push({
          id: `gh-${token}-${item.id}`,
          title: item.title,
          company,
          location,
          workMode: "Remote",
          source: "Employer Greenhouse board",
          sourceUrl,
          applyUrl: item.absolute_url,
          postedDate: item.updated_at?.slice(0, 10) || "",
          updatedDate: item.updated_at || "",
          employmentType: "Check listing",
          salary: extractSalary(stripHtml(item.content)),
          description: item.content || ""
        });
      }
    } catch (error) {
      console.warn(`Greenhouse source skipped: ${company}: ${error.message}`);
    }
  }
  return results;
}

async function collectJobicy() {
  const url = "https://jobicy.com/api/v2/remote-jobs?count=100&geo=usa";
  const payload = await fetchJson(url);
  return (payload.jobs || [])
    .filter((item) => isUsRemoteLocation(`Remote ${item.jobGeo}`))
    .filter((item) => !/\b(canada|germany|ireland|spain|bulgaria|costa rica|mexico|denmark|france|luxembourg|emea|europe|united kingdom|uk|latam)\b/i.test(item.jobTitle))
    .map((item) => ({
      id: `jobicy-${item.id}`,
      title: item.jobTitle,
      company: item.companyName,
      location: `${item.jobGeo} - Remote`,
      workMode: "Remote",
      source: "Jobicy",
      sourceUrl: "https://jobicy.com/",
      applyUrl: item.url,
      postedDate: item.pubDate?.slice(0, 10) || "",
      updatedDate: item.pubDate || "",
      employmentType: (item.jobType || []).join(", "),
      salary: item.salaryMin || item.salaryMax
        ? `${item.salaryCurrency || "USD"} ${item.salaryMin || "?"}-${item.salaryMax || "?"} ${item.salaryPeriod || ""}`.trim()
        : "Not listed",
      description: item.jobDescription || item.jobExcerpt || ""
    }));
}

async function collectRemotive() {
  const url = "https://remotive.com/api/remote-jobs";
  const payload = await fetchJson(url);
  return (payload.jobs || [])
    .filter((item) => /usa|united states|worldwide|north america|americas/i.test(item.candidate_required_location || ""))
    .map((item) => ({
      id: `remotive-${item.id}`,
      title: item.title,
      company: item.company_name,
      location: `${item.candidate_required_location} - Remote`,
      workMode: "Remote",
      source: "Remotive",
      sourceUrl: "https://remotive.com/",
      applyUrl: item.url,
      postedDate: item.publication_date?.slice(0, 10) || "",
      updatedDate: item.publication_date || "",
      employmentType: item.job_type || "Check listing",
      salary: item.salary || "Not listed",
      description: item.description || ""
    }));
}

async function collectTulane() {
  const base = "https://tulane-ibqejb.fa.ocs.oraclecloud.com";
  const url = `${base}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=CX_1,limit=200,offset=0`;
  const payload = await fetchJson(url);
  const jobs = payload.items?.[0]?.requisitionList || [];
  return jobs
    .filter((item) => /^New Orleans, LA/i.test(item.PrimaryLocation || ""))
    .map((item) => ({
      id: `tulane-${item.Id}`,
      title: item.Title,
      company: "Tulane University",
      location: item.PrimaryLocation,
      workMode: item.WorkplaceType === "Remote" ? "Remote" : "New Orleans",
      source: "Tulane University careers",
      sourceUrl: `${base}/hcmUI/CandidateExperience/en/sites/CX_1`,
      applyUrl: `${base}/hcmUI/CandidateExperience/en/sites/CX_1/job/${item.Id}`,
      postedDate: item.PostedDate || "",
      updatedDate: item.PostedDate || "",
      employmentType: item.WorkplaceType || "Check listing",
      salary: "Not listed",
      description: `${item.Title}. ${item.PrimaryLocation}. ${item.WorkplaceType || ""}.`
    }));
}

async function collectOchsner() {
  const base = "https://careers.ochsner.org";
  const searchBase = `${base}/search-jobs/New%20Orleans%2C%20LA/47519/4/6252001-4331987-4335045-4335045/29x95465/-90x07507/25/2`;
  const rows = [];
  for (let page = 1; page <= 10; page += 1) {
    try {
      const html = await fetchText(`${searchBase}?p=${page}`);
      const pattern = /<a href="(\/job\/new-orleans\/[^"]+)"[^>]*>[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<span class="job-facility job-info">([\s\S]*?)<\/span>[\s\S]*?<span class="job-location job-info"><strong>Location:<\/strong>\s*([\s\S]*?)<\/span>[\s\S]*?<span class="job-status job-info"><strong>Employment Status:<\/strong>\s*([\s\S]*?)<\/span>/gi;
      for (const match of html.matchAll(pattern)) {
        rows.push({
          id: `ochsner-${match[1].split("/").filter(Boolean).at(-1)}`,
          title: stripHtml(match[2]),
          company: "Ochsner Health",
          location: stripHtml(match[4]),
          workMode: /\bremote\b/i.test(stripHtml(match[2])) ? "Remote" : "New Orleans",
          source: "Ochsner Health careers",
          sourceUrl: searchBase,
          applyUrl: `${base}${decodeEntities(match[1])}`,
          postedDate: "",
          updatedDate: "",
          employmentType: stripHtml(match[5]),
          salary: "Not listed",
          description: `${stripHtml(match[2])}. Facility: ${stripHtml(match[3])}.`
        });
      }
    } catch (error) {
      console.warn(`Ochsner page ${page} skipped: ${error.message}`);
    }
  }
  return rows;
}

async function collectEntergy() {
  const base = "https://jobs.entergy.com";
  const searchUrl = `${base}/search/?q=&locationsearch=New+Orleans%2C+LA`;
  const html = await fetchText(searchUrl);
  const rows = [];
  const pattern = /<tr class="data-row">[\s\S]*?<a[^>]+href="(\/job\/[^"]+)"[^>]*class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span class="jobDepartment">([\s\S]*?)<\/span>[\s\S]*?<span class="jobLocation">\s*([\s\S]*?)\s*<\/span>/gi;
  for (const match of html.matchAll(pattern)) {
    const location = stripHtml(match[4]);
    if (!/New Orleans/i.test(location)) continue;
    rows.push({
      id: `entergy-${match[1].split("/").filter(Boolean).at(-1)}`,
      title: stripHtml(match[2]),
      company: "Entergy",
      location,
      workMode: "New Orleans",
      source: "Entergy careers",
      sourceUrl: searchUrl,
      applyUrl: `${base}${decodeEntities(match[1])}`,
      postedDate: "",
      updatedDate: "",
      employmentType: stripHtml(match[3]),
      salary: "Not listed",
      description: `${stripHtml(match[2])}. Department: ${stripHtml(match[3])}.`
    });
  }
  return rows;
}

function extractSalary(text) {
  const match = String(text || "").match(/\$\s?[\d,]{4,}(?:\.\d+)?\s*(?:-|to|–|—)\s*\$?\s?[\d,]{4,}(?:\.\d+)?/i);
  return match ? match[0].replace(/\s+/g, " ") : "Not listed";
}

function dedupe(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const key = `${normalize(row.company)}|${normalize(row.title)}|${row.workMode}`;
    if (!row.applyUrl || seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(jobs) {
  const headers = [
    "rank",
    "id",
    "title",
    "company",
    "location",
    "work_mode",
    "role_family",
    "fit_score",
    "fit_band",
    "source",
    "apply_url",
    "posted_date",
    "employment_type",
    "salary",
    "skills_matched",
    "fit_reasons",
    "gaps"
  ];
  const rows = jobs.map((job, index) => [
    index + 1,
    job.id,
    job.title,
    job.company,
    job.location,
    job.workMode,
    job.roleFamily,
    job.score,
    job.fitBand,
    job.source,
    job.applyUrl,
    job.postedDate,
    job.employmentType,
    job.salary,
    job.skillsMatched.join("|"),
    job.fitReasons.join("|"),
    job.gaps.join("|")
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

async function main() {
  console.log("Collecting current jobs...");
  const sourceResults = await Promise.allSettled([
    collectGreenhouse(),
    collectJobicy(),
    collectRemotive(),
    collectTulane(),
    collectOchsner(),
    collectEntergy()
  ]);

  const sourceNames = ["Greenhouse", "Jobicy", "Remotive", "Tulane", "Ochsner", "Entergy"];
  const collected = [];
  const sourceSummary = [];
  sourceResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      collected.push(...result.value);
      sourceSummary.push({ source: sourceNames[index], collected: result.value.length, status: "ok" });
    } else {
      sourceSummary.push({ source: sourceNames[index], collected: 0, status: result.reason?.message || "failed" });
    }
  });

  const unique = dedupe(collected);
  const finalized = unique
    .map(finalizeJob)
    .filter((job) => !hardExclusions.test(job.title))
    .sort((a, b) => b.score - a.score || String(b.postedDate).localeCompare(String(a.postedDate)) || a.title.localeCompare(b.title));

  const local = finalized.filter((job) => job.workMode === "New Orleans");
  const remote = finalized.filter((job) => job.workMode === "Remote");
  const localTarget = Math.min(80, local.length);
  const remoteTarget = 500 - localTarget;
  const remotePreferred = remote.filter((job) => !seniorityPattern.test(job.title));
  const remoteAdvanced = remote.filter((job) => seniorityPattern.test(job.title));
  const remoteAdvancedLimit = Math.min(110, remoteTarget);
  const selectedRemote = [
    ...remotePreferred.slice(0, remoteTarget - remoteAdvancedLimit),
    ...remoteAdvanced.slice(0, remoteAdvancedLimit)
  ];
  if (selectedRemote.length < remoteTarget) {
    const selectedIds = new Set(selectedRemote.map((job) => job.id));
    selectedRemote.push(...remote.filter((job) => !selectedIds.has(job.id)).slice(0, remoteTarget - selectedRemote.length));
  }

  const localPreferred = local.filter((job) => !seniorityPattern.test(job.title));
  const localAdvanced = local.filter((job) => seniorityPattern.test(job.title));
  const selectedLocal = [...localPreferred.slice(0, localTarget - 10), ...localAdvanced.slice(0, 10)];
  if (selectedLocal.length < localTarget) {
    const selectedIds = new Set(selectedLocal.map((job) => job.id));
    selectedLocal.push(...local.filter((job) => !selectedIds.has(job.id)).slice(0, localTarget - selectedLocal.length));
  }

  const selected = [...selectedRemote, ...selectedLocal]
    .sort((a, b) => b.score - a.score || a.company.localeCompare(b.company))
    .slice(0, 500)
    .map((job, index) => ({ ...job, rank: index + 1 }));

  if (selected.length < 500) {
    throw new Error(`Only ${selected.length} qualifying jobs were collected. Need 500.`);
  }

  const data = {
    generatedAt,
    verificationDate: generatedAt.slice(0, 10),
    disclaimer: "Live job prospect list. Recheck availability, Louisiana remote eligibility, required experience, salary, and application questions before applying.",
    sourceCredits: [
      { name: "Employer Greenhouse boards", url: "https://developers.greenhouse.io/job-board.html" },
      { name: "Jobicy", url: "https://jobicy.com/" },
      { name: "Remotive", url: "https://remotive.com/" },
      { name: "Tulane University careers", url: "https://jobs.tulane.edu/" },
      { name: "Ochsner Health careers", url: "https://careers.ochsner.org/" },
      { name: "Entergy careers", url: "https://jobs.entergy.com/" }
    ],
    applicant: {
      name: applicant.name,
      location: applicant.location,
      currentDegree: applicant.currentDegree,
      completedDegrees: applicant.completedDegrees,
      portfolio: applicant.portfolio,
      resumeHighlights: applicant.resumeHighlights,
      skills: applicant.skills
    },
    sourceSummary,
    stats: {
      rawCollected: collected.length,
      uniqueProspects: unique.length,
      selected: selected.length,
      remote: selected.filter((job) => job.workMode === "Remote").length,
      newOrleans: selected.filter((job) => job.workMode === "New Orleans").length,
      strong: selected.filter((job) => job.fitBand === "Strong").length,
      good: selected.filter((job) => job.fitBand === "Good").length,
      possible: selected.filter((job) => job.fitBand === "Possible").length,
      stretch: selected.filter((job) => job.fitBand === "Stretch").length
    },
    jobs: selected
  };

  const js = `window.JOB_APPLICATION_ROBOT_DATA = ${JSON.stringify(data, null, 2)};\n`;
  await fs.writeFile(path.join(appRoot, "jobs-data.js"), js, "utf8");
  await fs.writeFile(path.join(appRoot, "500_jobs.csv"), `${toCsv(selected)}\n`, "utf8");
  await fs.writeFile(path.join(appRoot, "collection-report.json"), `${JSON.stringify({
    generatedAt,
    sourceSummary,
    stats: data.stats
  }, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ ok: true, sourceSummary, stats: data.stats }, null, 2));
}

await main();
