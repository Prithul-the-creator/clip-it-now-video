import yt_dlp
import whisper
import tempfile
import os
import re
import ast
import subprocess
from openai import OpenAI
from moviepy import *

# Create a temp folder that works locally and online
save_folder = tempfile.mkdtemp()
video_path = os.path.join(save_folder, "final.mp4")
output_path = os.path.join(save_folder, "return.mp4")

def download_youtube_video(youtube_url, path):
    try:
        ydl_opts = {
            'format': 'bestvideo+bestaudio/best',
            'outtmpl': path,
            'merge_output_format': 'mp4'
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        print(f"Video downloaded successfully to {path}")
    except Exception as e:
        print(f"An error occurred: {e}")

def transcribe(path):
    print("Transcribing the video...")
    model = whisper.load_model("base")
    result = model.transcribe(path, language="en")

    transcript = []
    for segment in result['segments']:
        transcript.append((segment['text'], segment['start'], segment['end']))

    print("Transcription completed.")
    return transcript

youtube_url = input("Enter the YouTube video URL: ")
download_youtube_video(youtube_url, video_path)
transcript = transcribe(video_path)

def request():# GPT-4o request
    key = "key here"
    user_prompt = input("What part of the video do you want to find?")

    prompt = f"""
    Here is the transcript of the video: {transcript}, follow the instructions given here: {user_prompt}
    """

    client = OpenAI(api_key=key)
    MODEL = "gpt-4o"
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": (
                "You are a video clipping assistant. "
                "Given a transcript and a user request, identify the most relevant time intervals in the video. "
                "Return only the timestamps in this format: [{'start': 12.4, 'end': 54.6}, ...]"
            )},
            {"role": "user", "content": prompt}
        ]
    )

    # Extract timestamps
    match = re.search(r"\[\s*{.*?}\s*\]", completion.choices[0].message.content, re.DOTALL)
    if not match:
        raise ValueError("No valid timestamp list found in GPT response. GPT said:\n" + completion.choices[0].message.content)

    timestamps = ast.literal_eval(match.group(0))
    print(f"Clipping timestamps: {timestamps}")

    # Clip and generate output video
    with VideoFileClip(video_path) as clip:
        subclips = [clip.subclipped(t['start'], t['end']) for t in timestamps]
        final_clip = concatenate_videoclips(subclips, method="chain")
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac")

    # Optionally open video
    subprocess.run(["open", output_path])  # Mac only; skip or replace for web

    # Optional: remove the original video file if needed
    os.remove(video_path)

    return output_path

output_video = request()
