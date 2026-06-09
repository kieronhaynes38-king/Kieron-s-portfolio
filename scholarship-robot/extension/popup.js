const fileInput = document.getElementById("profileFile");
const fillButton = document.getElementById("fillPage");
const clearButton = document.getElementById("clearProfile");
const profileName = document.getElementById("profileName");
const statusBox = document.getElementById("status");

loadStoredProfile();

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const profile = JSON.parse(await file.text());
    const validation = validateProfile(profile);
    if (!validation.ok) throw new Error(`Missing fields: ${validation.missing.join(", ")}`);
    await chrome.storage.local.set({ scholarshipRobotProfile: profile });
    renderProfile(profile);
    setStatus("Private profile imported and stored in this browser profile.");
  } catch (error) {
    setStatus(error.message);
  } finally {
    fileInput.value = "";
  }
});

fillButton.addEventListener("click", async () => {
  const stored = await chrome.storage.local.get("scholarshipRobotProfile");
  const profile = stored.scholarshipRobotProfile;
  if (!profile) {
    setStatus("Import private-profile.json first.");
    return;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    setStatus("No active tab is available.");
    return;
  }

  try {
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "SCHOLARSHIP_ROBOT_FILL",
      profile
    });
    setStatus(`Filled ${result.filled} fields. Skipped ${result.skipped} protected or unmatched fields. Review the page before continuing.`);
  } catch (error) {
    setStatus("This page cannot be filled. Refresh it after installing the extension, then try again.");
  }
});

clearButton.addEventListener("click", async () => {
  await chrome.storage.local.remove("scholarshipRobotProfile");
  profileName.textContent = "No profile loaded";
  setStatus("Stored profile cleared.");
});

async function loadStoredProfile() {
  const stored = await chrome.storage.local.get("scholarshipRobotProfile");
  if (stored.scholarshipRobotProfile) {
    renderProfile(stored.scholarshipRobotProfile);
    setStatus("Profile ready.");
  }
}

function renderProfile(profile) {
  profileName.textContent = `${profile.identity.fullName} - ${profile.education.currentDegree}`;
}

function setStatus(message) {
  statusBox.textContent = message;
}

function validateProfile(profile) {
  const required = [
    ["identity.fullName", profile.identity?.fullName],
    ["identity.email", profile.identity?.email],
    ["identity.phone", profile.identity?.phone],
    ["identity.address.street", profile.identity?.address?.street],
    ["education.currentSchool", profile.education?.currentSchool],
    ["education.currentDegree", profile.education?.currentDegree]
  ];
  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  return { ok: missing.length === 0, missing };
}
