const progressKey = "kieron-portfolio-guide-progress";
const progressBoxes = Array.from(document.querySelectorAll("[data-progress]"));
const lessonLinks = Array.from(document.querySelectorAll(".lesson-nav a"));
const sidebar = document.querySelector("#guide-sidebar");
const menuButton = document.querySelector(".menu-button");
const completedCount = document.querySelector("#completedCount");
const lessonProgress = document.querySelector("#lessonProgress");
const readingProgress = document.querySelector("#readingProgress");
const resetButton = document.querySelector("#resetProgress");

function readSavedProgress() {
  try {
    return JSON.parse(localStorage.getItem(progressKey) || "[]");
  } catch {
    return [];
  }
}

function updateLessonProgress() {
  const completed = progressBoxes
    .filter((box) => box.checked)
    .map((box) => box.dataset.progress);

  localStorage.setItem(progressKey, JSON.stringify(completed));

  if (completedCount) {
    completedCount.textContent = String(completed.length);
  }

  if (lessonProgress) {
    const percent = progressBoxes.length
      ? (completed.length / progressBoxes.length) * 100
      : 0;
    lessonProgress.style.width = `${percent}%`;
  }
}

const savedProgress = readSavedProgress();
progressBoxes.forEach((box) => {
  box.checked = savedProgress.includes(box.dataset.progress);
  box.addEventListener("change", updateLessonProgress);
});
updateLessonProgress();

resetButton?.addEventListener("click", () => {
  progressBoxes.forEach((box) => {
    box.checked = false;
  });
  updateLessonProgress();
});

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", async () => {
    const code = button.closest(".code-block")?.querySelector("code");
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.textContent);
      const originalText = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1300);
    } catch {
      button.textContent = "Select code";
    }
  });
});

function setMenu(open) {
  sidebar?.classList.toggle("is-open", open);
  menuButton?.setAttribute("aria-expanded", String(open));
}

menuButton?.addEventListener("click", () => {
  setMenu(!sidebar?.classList.contains("is-open"));
});

lessonLinks.forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

function updateReadingProgress() {
  if (!readingProgress) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  readingProgress.style.width = `${Math.min(percent, 100)}%`;
}

window.addEventListener("scroll", updateReadingProgress, { passive: true });
updateReadingProgress();

const lessonSections = Array.from(document.querySelectorAll("main section[id]"));
const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    lessonLinks.forEach((link) => {
      link.classList.toggle(
        "is-current",
        link.getAttribute("href") === `#${visible.target.id}`,
      );
    });
  },
  {
    rootMargin: "-20% 0px -68% 0px",
    threshold: [0.05, 0.2, 0.5],
  },
);

lessonSections.forEach((section) => sectionObserver.observe(section));
