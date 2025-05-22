document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('video-url');
    const infoDiv = document.getElementById('video-info');
    const titleElem = document.getElementById('video-title');
    const thumbElem = document.getElementById('video-thumbnail');
    const downloadBtn = document.getElementById('download-btn');
    const messageDiv = document.getElementById('message');

    let currentURL = "";

    urlInput.addEventListener('change', async () => {
        const url = urlInput.value.trim();
        if (!url) return;

        try {
            const res = await fetch('/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            currentURL = data.url;
            titleElem.textContent = data.title;
            thumbElem.src = data.thumbnail;
            infoDiv.style.display = 'block';
        } catch (err) {
            messageDiv.textContent = 'Error: ' + err.message;
            infoDiv.style.display = 'none';
        }
    });

    downloadBtn.addEventListener('click', async () => {
        const format = document.querySelector('input[name="format"]:checked').value;

        try {
            const res = await fetch('/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: currentURL, format })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            messageDiv.textContent = '✅ ' + data.message;
        } catch (err) {
            messageDiv.textContent = '❌ ' + err.message;
        }
    });
});
