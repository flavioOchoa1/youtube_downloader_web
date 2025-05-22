from flask import Flask, render_template, request, jsonify, send_file
from yt_dlp import YoutubeDL
import configparser
import os

app = Flask(__name__)

# Leer configuración segura
config = configparser.ConfigParser()
config.read('config.properties')
ffmpeg_path = config['DEFAULT']['FFMPEG_PATH']

# Configuración YT-DLP
ydl_opts_common = {
    'ffmpeg_location': ffmpeg_path,
    'quiet': True,
    'no_warnings': True,
    'noplaylist': True,
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fetch_details', methods=['POST'])
def fetch_details():
    data = request.get_json()
    video_url = data.get('url')

    try:
        with YoutubeDL(ydl_opts_common) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return jsonify({
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail')
            })
    except Exception as e:
        print(f"Error al obtener detalles: {e}")
        return jsonify({'error': 'No se pudo obtener la información del video.'}), 500

@app.route('/download', methods=['POST'])
def download():
    url = request.form.get('url')
    format_type = request.form.get('format')

    if not url or not format_type:
        return "URL o formato no válido", 400

    download_opts = {
        'ffmpeg_location': ffmpeg_path,
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'quiet': True,
        'format': 'bestaudio/best' if format_type == 'mp3' else 'best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio' if format_type == 'mp3' else 'FFmpegVideoConvertor',
            'preferredcodec': 'mp3' if format_type == 'mp3' else 'mp4',
            'preferredquality': '192',
        }]
    }

    with YoutubeDL(download_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        if format_type == 'mp3':
            filename = filename.rsplit('.', 1)[0] + '.mp3'
        else:
            filename = filename.rsplit('.', 1)[0] + '.mp4'

    return send_file(filename, as_attachment=True)

if __name__ == '__main__':
    os.makedirs('downloads', exist_ok=True)
    app.run(debug=True)
