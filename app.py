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
cookies_file = config['DEFAULT'].get('COOKIES_FILE', fallback='').strip()
cookies_from_browser = config['DEFAULT'].get('COOKIES_FROM_BROWSER', fallback='').strip()
youtube_player_client = config['DEFAULT'].get('YOUTUBE_PLAYER_CLIENT', fallback='android').strip()

def parse_cookies_from_browser(value):
    if not value:
        return None

    browser, _, profile = value.partition(':')
    browser = browser.strip().lower()
    profile = profile.strip()
    return (browser, profile, None, None) if profile else (browser,)

def build_ydl_opts(**extra_opts):
    opts = {
        'ffmpeg_location': ffmpeg_path,
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
    }

    if youtube_player_client:
        opts['extractor_args'] = {'youtube': {'player_client': [youtube_player_client]}}

    cookiefile_path = cookies_file if os.path.isabs(cookies_file) else os.path.abspath(cookies_file)
    if cookies_file and os.path.exists(cookiefile_path):
        opts['cookiefile'] = cookiefile_path

    browser_cookies = parse_cookies_from_browser(cookies_from_browser)
    if browser_cookies:
        opts['cookiesfrombrowser'] = browser_cookies

    opts.update(extra_opts)
    return opts

def explain_download_error(error):
    message = str(error)
    if 'Sign in to confirm' in message and 'not a bot' in message:
        return (
            'YouTube esta pidiendo verificar que no eres un bot. '
            'La app esta usando el cliente android de yt-dlp para evitar ese bloqueo. '
            'Si persiste, exporta cookies a cookies.txt y configura COOKIES_FILE=cookies.txt.'
        )
    if 'Could not copy Chrome cookie database' in message:
        return (
            'No se pudieron leer las cookies del navegador porque el perfil esta abierto o bloqueado. '
            'Cierra Brave/Chrome por completo o usa COOKIES_FILE=cookies.txt.'
        )
    if 'Failed to decrypt with DPAPI' in message:
        return (
            'No se pudieron desencriptar las cookies del navegador en Windows. '
            'Usa cookies.txt exportado desde el navegador y configura COOKIES_FILE=cookies.txt.'
        )
    return 'No se pudo obtener o descargar el video. Revisa el enlace o la salida de consola.'

# Configuración YT-DLP
ydl_opts_common = build_ydl_opts()

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
        return jsonify({'error': explain_download_error(e)}), 500

@app.route('/download', methods=['POST'])
def download():
    url = request.form.get('url')
    format_type = request.form.get('format')

    if not url or not format_type or not is_valid_url(url):
        return "URL o formato no válido o no soportado", 400

    # Limpiar el enlace si es de YouTube con lista
    url = clean_youtube_url(url)

    download_opts = build_ydl_opts(
        outtmpl='downloads/%(title)s.%(ext)s',
        format='bestaudio/best' if format_type == 'mp3' else 'best',
    )

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
    except DownloadError as e:
        print(f"Error de descarga: {e}")
        return explain_download_error(e), 400
    except Exception as e:
        print(f"Error inesperado: {e}")
        return "Ocurrió un error inesperado al procesar la descarga.", 500

if __name__ == '__main__':
    os.makedirs('downloads', exist_ok=True)
    app.run(debug=False, use_reloader=False)
