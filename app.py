import os
from flask import Flask, render_template, request, send_from_directory
import yt_dlp

app = Flask(__name__)
DOWNLOAD_FOLDER = os.path.join(os.getcwd(), 'downloads')
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        url = request.form['url']
        format_type = request.form['format']

        options = {
    'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s'),
    'ffmpeg_location': 'C:/Users/Arthur07/Documents/FFmpeg-doc/ffmpeg-master-latest-win64-gpl-shared/bin'
}


        if format_type == 'audio':
            options.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
            })
        elif format_type == 'video':
            options.update({
                'format': 'bestvideo+bestaudio/best',
                'merge_output_format': 'mp4',
            })

        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            final_filename = os.path.splitext(filename)[0] + ('.mp3' if format_type == 'audio' else '.mp4')

        return send_from_directory(DOWNLOAD_FOLDER, os.path.basename(final_filename), as_attachment=True)

    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
