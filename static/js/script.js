const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const vortex = document.getElementById("dotVortex");
const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");
const useCanvasStars = false;

let stars = [];
let milkyWay = [];
let meteors = [];
let animationFrame = null;

function applySavedTheme() {
    const savedTheme = localStorage.getItem("download-theme") || "dark";
    root.dataset.theme = savedTheme;
}

function toggleTheme() {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    localStorage.setItem("download-theme", nextTheme);
}

function buildDotVortex() {
    if (!vortex) {
        return;
    }

    const totalDots = 150;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < totalDots; index += 1) {
        const dot = document.createElement("span");
        const turn = index * 10.8;
        const radius = 12 + index * 1.03;
        const hue = (190 + index * 2.6) % 360;
        const wave = Math.sin(index * 0.42) * 14;

        dot.style.setProperty("--angle", `${turn}deg`);
        dot.style.setProperty("--radius", `${radius}px`);
        dot.style.setProperty("--hue", hue);
        dot.style.setProperty("--wave", wave.toFixed(2));
        dot.style.setProperty("--delay", `${(index % 24) * -0.08}s`);
        fragment.appendChild(dot);
    }

    vortex.replaceChildren(fragment);
}

function resizeCanvas() {
    if (!useCanvasStars) {
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * pixelRatio);
    canvas.height = Math.floor(window.innerHeight * pixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    createStars();
}

function createStars() {
    const area = window.innerWidth * window.innerHeight;
    const starCount = Math.min(820, Math.max(260, Math.floor(area / 1900)));
    const dustCount = Math.min(720, Math.max(220, Math.floor(area / 2400)));

    stars = Array.from({ length: starCount }, (_, index) => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 0.35 + Math.random() * 1.45,
        alpha: 0.35 + Math.random() * 0.62,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.45 + Math.random() * 1.4,
        tint: index % 23 === 0
            ? "191, 212, 255"
            : index % 17 === 0
                ? "114, 168, 255"
                : "236, 244, 255"
    }));

    milkyWay = Array.from({ length: dustCount }, () => {
        const y = Math.random() * window.innerHeight;
        const centerX = window.innerWidth * 0.48 + Math.sin(y * 0.012) * 46;
        const spread = 34 + Math.random() * 118;
        const side = Math.random() < 0.5 ? -1 : 1;

        return {
            x: centerX + side * Math.pow(Math.random(), 1.7) * spread,
            y,
            size: 0.45 + Math.random() * 1.55,
            alpha: 0.05 + Math.random() * 0.18,
            warmth: 160 + Math.random() * 70
        };
    });

    meteors = [];
}

function drawPoint(point, alpha, color) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(${color}, ${alpha})`;
    ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
    ctx.fill();
}

function maybeCreateMeteor(time) {
    if (meteors.length || Math.sin(time * 0.00022) < 0.998) {
        return;
    }

    meteors.push({
        x: window.innerWidth * (0.48 + Math.random() * 0.38),
        y: window.innerHeight * (0.08 + Math.random() * 0.18),
        length: 110 + Math.random() * 90,
        speed: 5.5 + Math.random() * 2.2,
        life: 1
    });
}

function drawStars(time) {
    if (!useCanvasStars) {
        return;
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (root.dataset.theme === "light") {
        animationFrame = requestAnimationFrame(drawStars);
        return;
    }

    const horizon = ctx.createLinearGradient(0, window.innerHeight * 0.48, 0, window.innerHeight);
    horizon.addColorStop(0, "rgba(0, 0, 0, 0)");
    horizon.addColorStop(0.5, "rgba(0, 185, 156, 0.08)");
    horizon.addColorStop(0.78, "rgba(34, 75, 149, 0.14)");
    horizon.addColorStop(1, "rgba(4, 9, 28, 0.38)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    milkyWay.forEach((dust) => {
        drawPoint(dust, dust.alpha, `${dust.warmth}, ${dust.warmth}, ${dust.warmth - 18}`);
    });
    ctx.restore();

    stars.forEach((star) => {
        const pulse = 0.72 + Math.sin(star.phase + time * 0.001 * star.twinkle) * 0.28;
        const alpha = Math.max(0.12, star.alpha * pulse);
        drawPoint(star, alpha, star.tint);
    });

    maybeCreateMeteor(time);
    meteors = meteors
        .map((meteor) => ({ ...meteor, x: meteor.x + meteor.speed, y: meteor.y + meteor.speed * 0.33, life: meteor.life - 0.018 }))
        .filter((meteor) => meteor.life > 0);

    meteors.forEach((meteor) => {
        const gradient = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.length, meteor.y - meteor.length * 0.18);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.life})`);
        gradient.addColorStop(0.34, `rgba(222, 230, 255, ${meteor.life * 0.48})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(meteor.x - meteor.length, meteor.y - meteor.length * 0.18);
        ctx.stroke();
    });

    ctx.shadowBlur = 0;
    animationFrame = requestAnimationFrame(drawStars);
}

function fetchVideoDetails() {
    const urlInput = document.getElementById("url");
    const url = urlInput.value.trim();

    const titleEl = document.getElementById("video-title");
    const thumbEl = document.getElementById("video-thumbnail");
    const spinner = document.getElementById("spinner");

    if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
        titleEl.classList.add("hidden");
        thumbEl.classList.add("hidden");
        spinner.classList.add("hidden");
        return;
    }

    titleEl.classList.add("hidden");
    thumbEl.classList.add("hidden");
    spinner.classList.remove("hidden");

    fetch("/fetch_details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    })
    .then(response => {
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(data.error || "Respuesta no valida del servidor");
            }
            return data;
        });
    })
    .then(data => {
        if (data.error) {
            titleEl.textContent = `Error: ${data.error}`;
            titleEl.classList.remove("hidden");
            spinner.classList.add("hidden");
            return;
        }

        titleEl.textContent = data.title;
        thumbEl.src = data.thumbnail;

        spinner.classList.add("hidden");
        titleEl.classList.remove("hidden");
        thumbEl.classList.remove("hidden");
    })
    .catch(error => {
        console.error("Error al obtener detalles:", error);
        spinner.classList.add("hidden");
        titleEl.textContent = error.message || "No se pudo obtener la informacion del video.";
        titleEl.classList.remove("hidden");
    });
}

applySavedTheme();
buildDotVortex();
resizeCanvas();
drawStars(0);

themeToggle.addEventListener("click", toggleTheme);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("beforeunload", () => {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
});
