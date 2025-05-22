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

    // Mostrar spinner y ocultar contenido anterior
    titleEl.classList.add("hidden");
    thumbEl.classList.add("hidden");
    spinner.classList.remove("hidden");

    fetch("/fetch_details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Respuesta no válida del servidor");
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            titleEl.textContent = "Error: " + data.error;
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
        titleEl.textContent = "No se pudo obtener la información del video.";
        titleEl.classList.remove("hidden");
    });
}
