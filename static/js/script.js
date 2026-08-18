const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const vortex = document.getElementById("dotVortex");

let fetchAbortController = null;
let debounceTimer = null;

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

function showToast(message, type) {
    const toast = document.getElementById("toast");
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.className = "toast " + (type || "");
    requestAnimationFrame(() => {
        toast.classList.add("visible");
    });
    setTimeout(() => {
        toast.classList.remove("visible");
    }, 3000);
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

    if (fetchAbortController) {
        fetchAbortController.abort();
    }
    fetchAbortController = new AbortController();

    titleEl.classList.add("hidden");
    thumbEl.classList.add("hidden");
    spinner.classList.remove("hidden");

    fetch("/fetch_details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: fetchAbortController.signal
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
        thumbEl.alt = data.title || "Miniatura del video";

        spinner.classList.add("hidden");
        titleEl.classList.remove("hidden");
        thumbEl.classList.remove("hidden");
    })
    .catch(error => {
        if (error.name === "AbortError") {
            return;
        }
        console.error("Error al obtener detalles:", error);
        spinner.classList.add("hidden");
        titleEl.textContent = error.message || "No se pudo obtener la informacion del video.";
        titleEl.classList.remove("hidden");
    });
}

function handleUrlInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchVideoDetails, 300);
}

function resetDownloadButton() {
    const btn = document.querySelector(".download-button");
    if (btn) {
        btn.classList.remove("loading");
        btn.disabled = false;
    }
}

function handleDownload() {
    const btn = document.querySelector(".download-button");
    if (btn) {
        btn.classList.add("loading");
        btn.disabled = true;
        setTimeout(resetDownloadButton, 4000);
    }
}

applySavedTheme();
buildDotVortex();

themeToggle.addEventListener("click", toggleTheme);
