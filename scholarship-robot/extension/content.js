const PROTECTED_PATTERN = /\b(password|passcode|social security|ssn|bank|routing|account number|tax|fafsa|fsa id|signature|certif|recommendation|date of birth|dob|driver.?s license|passport)\b/i;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SCHOLARSHIP_ROBOT_FILL") return false;
  const result = fillPage(message.profile);
  sendResponse(result);
  return true;
});

function fillPage(profile) {
  const fields = buildFields(profile);
  let filled = 0;
  let skipped = 0;

  const controls = Array.from(document.querySelectorAll("input, select, textarea"));
  for (const control of controls) {
    if (!isEligibleControl(control)) {
      skipped += 1;
      continue;
    }

    const descriptor = describeControl(control);
    if (PROTECTED_PATTERN.test(descriptor)) {
      skipped += 1;
      continue;
    }

    const match = fields.find((field) => field.patterns.some((pattern) => pattern.test(descriptor)));
    if (!match || match.value === undefined || match.value === null || String(match.value).trim() === "") {
      skipped += 1;
      continue;
    }

    if (control.tagName === "SELECT") {
      if (selectBestOption(control, String(match.value), match.alternatives || [])) filled += 1;
      else skipped += 1;
      continue;
    }

    setNativeValue(control, String(match.value));
    filled += 1;
  }

  return { filled, skipped };
}

function buildFields(profile) {
  const identity = profile.identity;
  const address = identity.address;
  const education = profile.education;
  const expectedYear = String(education.expectedGraduation || "").match(/\b20\d{2}\b/)?.[0] || "";
  return [
    { value: identity.firstName, patterns: [/\bfirst.?name\b/, /\bgiven.?name\b/] },
    { value: identity.lastName, patterns: [/\blast.?name\b/, /\bsurname\b/, /\bfamily.?name\b/] },
    { value: identity.fullName, patterns: [/\bfull.?name\b/, /^name\b/] },
    { value: identity.email, patterns: [/\be-?mail\b/] },
    { value: identity.phone, patterns: [/\bphone\b/, /\bmobile\b/, /\btelephone\b/] },
    { value: address.street, patterns: [/\bstreet.?address\b/, /\baddress.?1\b/, /^address\b/] },
    { value: address.city, patterns: [/\bcity\b/] },
    { value: address.state, alternatives: ["Louisiana"], patterns: [/\bstate\b/, /\bprovince\b/] },
    { value: address.postalCode, patterns: [/\bzip\b/, /\bpostal\b/] },
    { value: address.country, patterns: [/\bcountry\b/] },
    { value: education.currentSchool, patterns: [/\bcollege\b/, /\buniversity\b/, /\bschool\b/, /\binstitution\b/] },
    {
      value: education.currentDegree,
      alternatives: ["Master of Science", "MS", "Graduate student"],
      patterns: [/\bdegree\b/, /\beducation.?level\b/, /\bstudent.?level\b/]
    },
    {
      value: education.currentMajor,
      alternatives: ["Computer & Information Sciences", "Computer Science", "Data Science & Analytics"],
      patterns: [/\bmajor\b/, /\bfield.?of.?study\b/, /\bprogram\b/]
    },
    {
      value: expectedYear,
      alternatives: [education.expectedGraduation],
      patterns: [/\bgraduation.?year\b/, /\bexpected.?graduation\b/]
    },
    { value: education.graduateGpa, patterns: [/\bgpa\b/, /\bgrade.?point\b/] },
    { value: profile.publicLinks?.portfolio, patterns: [/\bportfolio\b/, /\bwebsite\b/, /\bpersonal.?site\b/] },
    { value: profile.publicLinks?.youtube, patterns: [/\byoutube\b/, /\bvideo.?portfolio\b/] },
    { value: profile.publicLinks?.instagram, patterns: [/\binstagram\b/] }
  ];
}

function isEligibleControl(control) {
  if (control.disabled || control.readOnly) return false;
  if (control.type === "hidden" || control.type === "password" || control.type === "file") return false;
  if (control.type === "checkbox" || control.type === "radio" || control.type === "submit" || control.type === "button") return false;
  return ["INPUT", "SELECT", "TEXTAREA"].includes(control.tagName);
}

function describeControl(control) {
  const labels = [];
  if (control.labels) labels.push(...Array.from(control.labels).map((label) => label.textContent || ""));
  if (control.id) {
    const explicit = document.querySelector(`label[for="${cssEscape(control.id)}"]`);
    if (explicit) labels.push(explicit.textContent || "");
  }
  labels.push(
    control.getAttribute("aria-label") || "",
    control.getAttribute("placeholder") || "",
    control.getAttribute("name") || "",
    control.getAttribute("id") || ""
  );
  return labels.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
}

function selectBestOption(select, value, alternatives) {
  const candidates = [value, ...alternatives].map(normalize).filter(Boolean);
  const options = Array.from(select.options);
  for (const candidate of candidates) {
    const exact = options.find((option) => normalize(option.value) === candidate || normalize(option.textContent) === candidate);
    if (exact) return selectOption(select, exact);
  }
  for (const candidate of candidates) {
    const partial = options.find((option) => {
      const optionText = normalize(`${option.value} ${option.textContent}`);
      return optionText.includes(candidate) || candidate.includes(optionText);
    });
    if (partial) return selectOption(select, partial);
  }
  return false;
}

function selectOption(select, option) {
  select.value = option.value;
  dispatchChanges(select);
  return true;
}

function setNativeValue(control, value) {
  const prototype = control.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor?.set) descriptor.set.call(control, value);
  else control.value = value;
  dispatchChanges(control);
}

function dispatchChanges(control) {
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}
