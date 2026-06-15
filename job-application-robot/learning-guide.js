(function () {
  const progressBar = document.getElementById("readingProgress");
  const progressText = document.getElementById("progressText");
  const chapterLinks = [...document.querySelectorAll("[data-chapter-link]")];
  const chapters = [...document.querySelectorAll(".guide-chapter")];
  const completedKey = "jobRobotLearningGuideCompleted.v1";
  const completed = new Set(JSON.parse(localStorage.getItem(completedKey) || "[]"));

  function updateReadingProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    progressText.textContent = `${percent}% read`;
  }

  function updateCompletedDisplay() {
    document.querySelectorAll("[data-complete-chapter]").forEach((button) => {
      const chapterId = button.dataset.completeChapter;
      const isComplete = completed.has(chapterId);
      button.textContent = isComplete ? "Completed" : "Mark Complete";
      button.classList.toggle("completed", isComplete);
    });
    document.getElementById("completedCount").textContent = `${completed.size} of ${chapters.length} chapters completed`;
  }

  document.querySelectorAll("[data-copy-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.closest(".code-example").querySelector("code").textContent;
      try {
        await navigator.clipboard.writeText(code);
      } catch (error) {
        const temporary = document.createElement("textarea");
        temporary.value = code;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.appendChild(temporary);
        temporary.select();
        document.execCommand("copy");
        temporary.remove();
      }
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    });
  });

  document.querySelectorAll("[data-complete-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const chapterId = button.dataset.completeChapter;
      if (completed.has(chapterId)) completed.delete(chapterId);
      else completed.add(chapterId);
      localStorage.setItem(completedKey, JSON.stringify([...completed]));
      updateCompletedDisplay();
    });
  });

  const chapterObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    chapterLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.25, 0.5] });

  chapters.forEach((chapter) => chapterObserver.observe(chapter));
  window.addEventListener("scroll", updateReadingProgress, { passive: true });
  updateReadingProgress();
  updateCompletedDisplay();
})();
