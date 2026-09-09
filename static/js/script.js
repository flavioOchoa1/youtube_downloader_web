const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const form = document.getElementById("downloadForm");
const urlInput = document.getElementById("url");
const videoInfo = document.getElementById("video-info");
const titleEl = document.getElementById("video-title");
const thumbEl = document.getElementById("video-thumbnail");
const spinner = document.getElementById("spinner");
const previewLabel = document.getElementById("preview-label");
const downloadStatus = document.getElementById("download-status");
let fetchAbortController = null;
let debounceTimer = null;
let toastTimer = null;
let downloadTimer = null;
let detailsVersion = 0;

function updateThemeLabel() {
    themeToggle?.setAttribute("aria-label", root.dataset.theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
}

function toggleTheme() {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("download-theme", root.dataset.theme); } catch (_) { /* Theme still works when storage is unavailable. */ }
    updateThemeLabel();
}

function showToast(message) {
    const toast = document.getElementById("toast");
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 4500);
}

function isYouTubeUrl(value) {
    try {
        const parsed = new URL(value);
        return ["https:", "http:"].includes(parsed.protocol) &&
            (parsed.hostname === "youtube.com" || parsed.hostname.endsWith(".youtube.com") || parsed.hostname === "youtu.be");
    } catch (_) { return false; }
}

async function fetchVideoDetails() {
    const url = urlInput.value.trim();
    if (!isYouTubeUrl(url)) return;
    const version = detailsVersion;
    fetchAbortController = new AbortController();
    videoInfo.classList.remove("hidden", "error");
    videoInfo.setAttribute("aria-busy", "true");
    spinner.classList.remove("hidden");
    previewLabel.textContent = "BUSCANDO TU VIDEO…";
    try {
        const response = await fetch("/fetch_details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
            signal: fetchAbortController.signal
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || "No se pudo obtener la información del video.");
        if (version !== detailsVersion) return;
        previewLabel.textContent = "TU VIDEO · LISTO PARA DESCARGAR";
        titleEl.textContent = data.title || "Video de YouTube";
        titleEl.classList.remove("hidden");
        if (data.thumbnail) {
            thumbEl.src = data.thumbnail;
            thumbEl.alt = data.title || "Miniatura del video";
            thumbEl.classList.remove("hidden");
        }
    } catch (error) {
        if (error.name === "AbortError" || version !== detailsVersion) return;
        videoInfo.classList.add("error");
        previewLabel.textContent = "NO PUDIMOS OBTENER LA VISTA PREVIA";
        titleEl.textContent = error.message;
        titleEl.classList.remove("hidden");
    } finally {
        if (version === detailsVersion) {
            spinner.classList.add("hidden");
            videoInfo.setAttribute("aria-busy", "false");
        }
    }
}

function handleUrlInput() {
    clearTimeout(debounceTimer);
    fetchAbortController?.abort();
    detailsVersion += 1;
    urlInput.setCustomValidity("");
    videoInfo.classList.add("hidden");
    videoInfo.setAttribute("aria-busy", "false");
    titleEl.classList.add("hidden");
    thumbEl.classList.add("hidden");
    spinner.classList.add("hidden");
    if (isYouTubeUrl(urlInput.value.trim())) debounceTimer = setTimeout(fetchVideoDetails, 400);
}

function updateDownloadLabel() {
    const button = document.querySelector(".download-button");
    if (!button.classList.contains("loading")) {
        document.getElementById("download-label").textContent = `Descargar ${form.elements.format.value.toUpperCase()}`;
    }
}

function resetDownloadButton() {
    clearTimeout(downloadTimer);
    const button = document.querySelector(".download-button");
    button.classList.remove("loading");
    button.disabled = false;
    button.setAttribute("aria-busy", "false");
    updateDownloadLabel();
}

function handleDownload(event) {
    if (!isYouTubeUrl(urlInput.value.trim())) {
        event.preventDefault();
        urlInput.setCustomValidity("Pega un enlace válido de YouTube (youtube.com o youtu.be).");
        urlInput.reportValidity();
        return;
    }
    const button = document.querySelector(".download-button");
    button.classList.add("loading");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    document.getElementById("download-label").textContent = "Preparando…";
    downloadStatus.textContent = "Preparando tu archivo. La descarga aparecerá en tu navegador; puede tardar según la duración del video.";
    downloadStatus.classList.remove("hidden");
    // Attachment responses do not reliably fire iframe load. Allow retry without claiming completion.
    downloadTimer = setTimeout(() => {
        resetDownloadButton();
        downloadStatus.textContent = "Solicitud enviada. Si tu archivo aún no aparece, espera mientras se procesa y revisa las descargas del navegador.";
    }, 8000);
}

async function pasteUrl() {
    try {
        if (!navigator.clipboard?.readText) throw new Error("Clipboard unavailable");
        urlInput.value = (await navigator.clipboard.readText()).trim();
        handleUrlInput();
        urlInput.focus();
    } catch (_) {
        urlInput.focus();
        showToast("Pega el enlace con Ctrl + V o mantén pulsado el campo y elige Pegar.");
    }
}

// Errors from the existing download endpoint arrive as JSON in the hidden frame.
document.getElementById("downloadFrame").addEventListener("load", (event) => {
    try {
        const content = event.target.contentDocument?.body?.textContent;
        if (!content?.trim()) return;
        let data;
        try { data = JSON.parse(content); } catch (_) { data = { error: "No se pudo preparar el archivo. Inténtalo de nuevo más tarde." }; }
        if (data.error) {
            resetDownloadButton();
            downloadStatus.textContent = data.error;
            downloadStatus.classList.remove("hidden");
        }
    } catch (_) { /* The browser owns attachment handling. */ }
});

thumbEl.addEventListener("error", () => thumbEl.classList.add("hidden"));
urlInput.addEventListener("input", handleUrlInput);
form.addEventListener("submit", handleDownload);
form.querySelectorAll('input[name="format"]').forEach(input => input.addEventListener("change", updateDownloadLabel));
document.getElementById("pasteButton").addEventListener("click", pasteUrl);
themeToggle.addEventListener("click", toggleTheme);
updateThemeLabel();
