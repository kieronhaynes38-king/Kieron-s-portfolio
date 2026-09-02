(() => {
  const pageIds = [...document.querySelectorAll("[data-page]")].map((page) => page.dataset.page);
  const menu = document.querySelector(".side-menu");
  const menuButton = document.querySelector(".mobile-menu");

  function showPage(requested) {
    const target = pageIds.includes(requested) ? requested : "home";
    document.querySelectorAll("[data-page]").forEach((page) => { page.hidden = page.dataset.page !== target; });
    document.querySelectorAll("[data-page-link]").forEach((link) => {
      const active = link.dataset.pageLink === target;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    menu?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-page-link], [data-page-button]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      const target = control.dataset.pageLink || control.dataset.pageButton;
      history.pushState(null, "", target === "home" ? location.pathname : `#${target}`);
      showPage(target);
    });
  });
  menuButton?.addEventListener("click", () => {
    const open = menu?.classList.toggle("open") ?? false;
    menuButton.setAttribute("aria-expanded", String(open));
  });
  window.addEventListener("hashchange", () => showPage(location.hash.slice(1)));

  const cards = [...document.querySelectorAll(".experience-card")];
  const tabs = [...document.querySelectorAll("[data-experience]")];
  const meter = document.querySelector(".experience-meter span");
  const counter = document.querySelector(".experience-counter span");
  let active = 0;
  function showExperience(index) {
    active = (index + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => { card.hidden = cardIndex !== active; });
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === active;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    if (meter) meter.style.width = `${((active + 1) / cards.length) * 100}%`;
    if (counter) counter.textContent = String(active + 1).padStart(2, "0");
  }
  document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => showExperience(active + Number(button.dataset.direction))));
  tabs.forEach((tab) => tab.addEventListener("click", () => showExperience(Number(tab.dataset.experience))));
  document.querySelector(".experience-stage")?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showExperience(active - 1);
    if (event.key === "ArrowRight") showExperience(active + 1);
  });
  showPage(location.hash.slice(1));
})();
