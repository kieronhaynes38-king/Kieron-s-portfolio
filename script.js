const codeSamples = {
  game: `extends Node3D

@export var move_speed := 2.4
@export var turn_speed := 1.8
@export var room_min := Vector2(-3.35, -2.65)
@export var room_max := Vector2(2.05, 2.25)

func _handle_movement(delta: float) -> void:
    var input_dir := Vector2.ZERO
    if Input.is_action_pressed("ui_up"):
        input_dir.y -= 1.0
    var move := (right * input_dir.x) + (forward * -input_dir.y)
    global_position += move.normalized() * move_speed * delta
    global_position.x = clamp(global_position.x, room_min.x, room_max.x)`,

  data: `pipeline hotel_ops_reporting:
  source: Oracle Opera PMS + labor workbooks
  clean: normalize dates, occupancy, hours, department tags
  model: SQL views for trend and exception reporting
  publish: Excel dashboards + SharePoint document system
  result: faster operational visibility for managers`,

  systems: `stack enterprise_support:
  identity: Active Directory permissions
  server: Windows Server configuration
  automation: PowerShell workflows
  cloud: AWS, Azure, Google Cloud concepts
  collaboration: SharePoint, Git/GitHub, documentation`
};

const codeOutput = document.querySelector("#codeSample");
const codeTabs = document.querySelectorAll(".code-tab");

function setCodeSample(name) {
  if (!codeOutput || !codeSamples[name]) return;
  codeOutput.textContent = codeSamples[name];

  codeTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.code === name);
  });
}

codeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setCodeSample(tab.dataset.code));
});

setCodeSample("game");

const modal = document.querySelector("#videoModal");
const videoFrame = document.querySelector("#videoFrame");
const playButtons = document.querySelectorAll(".play-button");
const closeVideoButtons = document.querySelectorAll("[data-close-video]");

function openVideo(videoId) {
  if (!modal || !videoFrame) return;
  videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeVideo() {
  if (!modal || !videoFrame) return;
  videoFrame.src = "";
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

playButtons.forEach((button) => {
  button.addEventListener("click", () => openVideo(button.dataset.video));
});

closeVideoButtons.forEach((button) => {
  button.addEventListener("click", closeVideo);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeVideo();
});

const canvas = document.querySelector("#signalCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;
let width = 0;
let height = 0;
let dpr = 1;
let nodes = [];

function resizeCanvas() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = width < 720 ? 26 : 54;
  nodes = Array.from({ length: count }, (_, index) => ({
    x: (width / count) * index + Math.random() * 36,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.26,
    vy: 0.18 + Math.random() * 0.42,
    tone: index % 3
  }));
}

function drawSignal() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1;

  nodes.forEach((node, index) => {
    node.x += node.vx;
    node.y += node.vy;

    if (node.y > height + 18) node.y = -18;
    if (node.x < -18) node.x = width + 18;
    if (node.x > width + 18) node.x = -18;

    const next = nodes[(index + 5) % nodes.length];
    const dx = node.x - next.x;
    const dy = node.y - next.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 220) {
      ctx.strokeStyle = node.tone === 0
        ? "rgba(255, 224, 138, 0.2)"
        : node.tone === 1
          ? "rgba(85, 214, 190, 0.16)"
          : "rgba(143, 183, 204, 0.16)";
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }

    ctx.fillStyle = node.tone === 0
      ? "rgba(255, 224, 138, 0.65)"
      : node.tone === 1
        ? "rgba(85, 214, 190, 0.55)"
        : "rgba(143, 183, 204, 0.55)";
    ctx.fillRect(node.x - 1, node.y - 1, 2, 2);
  });

  window.requestAnimationFrame(drawSignal);
}

if (canvas && ctx && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  resizeCanvas();
  drawSignal();
  window.addEventListener("resize", resizeCanvas);
}
