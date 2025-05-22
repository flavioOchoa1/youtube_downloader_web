from flask import Flask, render_template, request, jsonify
from yt_dlp import YoutubeDL
import configparser

app = Flask(__name__)

# Cargar configuración
config = configparser.ConfigParser()
config.read('config.properties')
ffmpeg_location = config['DEFAULT'].get('ffmpeg_location', '')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fetch', methods=['POST'])
def fetch_video_data():
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'ffmpeg_location': ffmpeg_location,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return jsonify({
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'url': url
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url')
    format_type = data.get('format')

    if not url or format_type not in ['mp3', 'mp4']:
        return jsonify({'error': 'Datos inválidos'}), 400

    ydl_opts = {
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'ffmpeg_location': ffmpeg_location,
    }

    if format_type == 'mp3':
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        })
    else:  # mp4
        ydl_opts['format'] = 'bestvideo+bestaudio/best'

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url)
            return jsonify({'message': 'Descarga completada', 'filename': info.get('title')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
