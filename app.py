from flask import Flask, render_template, request, jsonify, send_file
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError
import configparser
import os
import re
import urllib.parse

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

URL_REGEX = re.compile(
    r'^(https?://)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(/.*)?$'
)

def is_valid_url(url):
    return bool(url and URL_REGEX.match(url))

def clean_youtube_url(url):
    """
    Si el enlace es de YouTube y tiene parámetros de lista, lo limpia para dejar solo el video.
    """
    parsed = urllib.parse.urlparse(url)
    if 'youtube.com' in parsed.netloc and 'v=' in parsed.query:
        qs = urllib.parse.parse_qs(parsed.query)
        video_id = qs.get('v', [None])[0]
        if video_id:
            return f"https://www.youtube.com/watch?v={video_id}"
    return url

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fetch_details', methods=['POST'])
def fetch_details():
    data = request.get_json()
    url = data.get('url')
    
    if not url or not is_valid_url(url):
        return jsonify({'error': 'URL no válida o no soportada'}), 400

    try:
        with YoutubeDL(ydl_opts_common) as ydl:
            info = ydl.extract_info(url, download=False)
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

    if not url or not format_type or not is_valid_url(url):
        return "URL o formato no válido o no soportado", 400

    # Limpiar el enlace si es de YouTube con lista
    url = clean_youtube_url(url)

    download_opts = {
        'ffmpeg_location': ffmpeg_path,
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'quiet': True,
        'format': 'bestaudio/best' if format_type == 'mp3' else 'best',
    }

    if format_type == 'mp3':
        download_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    elif format_type == 'mp4':
        download_opts['postprocessors'] = [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }]

    try:
        with YoutubeDL(download_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            if format_type == 'mp3':
                filename = filename.rsplit('.', 1)[0] + '.mp3'
            else:
                filename = filename.rsplit('.', 1)[0] + '.mp4'
        return send_file(filename, as_attachment=True)
    except DownloadError:
        return "No se pudo descargar el video. El enlace no es válido, no existe o no es soportado.", 400
    except Exception as e:
        print(f"Error inesperado: {e}")
        return "Ocurrió un error inesperado al procesar la descarga.", 500

if __name__ == '__main__':
    os.makedirs('downloads', exist_ok=True)
    app.run(debug=True)
