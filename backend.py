from flask import Flask, request, send_file, jsonify
import yt_dlp, whisper, tempfile, os, re, ast
from openai import OpenAI
from moviepy import *
from flask_cors import CORS

app = Flask(__name__)



CORS(app)



@app.route('/clip', methods=['POST'])
def clip_video():
    print("✅ /clip endpoint was called!")
    data = request.get_json()
    youtube_url = data.get('youtube_url')
    user_prompt = data.get('user_prompt')
    
    if not youtube_url or not user_prompt:
        return jsonify({"error": "Missing required fields"}), 400

    save_folder = tempfile.mkdtemp()
    video_path = os.path.join(save_folder, "final.mp4")
    output_path = os.path.join(save_folder, "return.mp4")

    # Download YouTube video
    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'outtmpl': video_path,
        'merge_output_format': 'mp4'
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])

    # Transcribe
    model = whisper.load_model("base")
    result = model.transcribe(video_path, language="en")
    transcript = [(seg['text'], seg['start'], seg['end']) for seg in result['segments']]

    # GPT Prompt
    prompt = f"""
    Here is the transcript of the video: {transcript}, follow the instructions given here: {user_prompt}
    """
    client = OpenAI(api_key="sk-proj-...")
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": (
                "You are a video clipping assistant. "
                "Given a transcript and a user request, identify the most relevant time intervals in the video. "
                "Return only the timestamps in this format: [{'start': 12.4, 'end': 54.6}, ...]"
            )},
            {"role": "user", "content": prompt}
        ]
    )

    match = re.search(r"\[\s*{.*?}\s*\]", completion.choices[0].message.content, re.DOTALL)
    if not match:
        return jsonify({"error": "Invalid GPT response"}), 500

    timestamps = ast.literal_eval(match.group(0))

    # Clip video
    with VideoFileClip(video_path) as clip:
        subclips = [clip.subclipped(t['start'], t['end']) for t in timestamps]
        final_clip = concatenate_videoclips(subclips, method="chain")
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac")

    return send_file(output_path, as_attachment=True)
