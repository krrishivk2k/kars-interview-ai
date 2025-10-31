import json
import os
import sys
import tempfile
import ssl
import urllib.request
import urllib.error
import subprocess
import shutil
from pathlib import Path

from flask import Flask, request

# Import analysis functions from video.py
from video import mood, hand

# Suppress library logging to prevent invalid JSON output
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['GLOG_minloglevel'] = '2'
import logging
logging.getLogger().setLevel(logging.ERROR)

app = Flask(__name__)

def download_to_file(url: str, output_path: str) -> None:
    """Download a file from URL to local path."""
    try:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(url, context=context) as response:
            if response.status != 200:
                raise Exception(f"Failed to download file: {response.status}")
            
            with open(output_path, 'wb') as f:
                shutil.copyfileobj(response, f)
    except Exception as e:
        # Clean up partial file on error
        if os.path.exists(output_path):
            os.unlink(output_path)
        raise e

def convert_video_to_mp4(input_path: str, output_path: str) -> None:
    """Convert video to MP4 using ffmpeg if available."""
    try:
        # Try to find ffmpeg in common locations
        ffmpeg_paths = ['ffmpeg', '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']
        ffmpeg_cmd = None
        
        for path in ffmpeg_paths:
            if shutil.which(path):
                ffmpeg_cmd = path
                break
        
        if not ffmpeg_cmd:
            raise Exception("ffmpeg not found")
        
        # Run ffmpeg conversion
        cmd = [
            ffmpeg_cmd,
            '-i', input_path,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-y',  # Overwrite output file
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg conversion failed: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        raise Exception("FFmpeg conversion timed out")
    except Exception as e:
        raise Exception(f"Video conversion failed: {str(e)}")

def analyze_hand_motion(video_file: str) -> dict:
    """Analyze hand motion in video file using the video.py function."""
    import io
    import contextlib
    
    # Capture the output from the hand function
    captured_output = io.StringIO()
    with contextlib.redirect_stdout(captured_output):
        try:
            hand(video_file)
        except Exception as e:
            return {"hand": 0.0}
    
    # Parse the JSON output
    try:
        result = json.loads(captured_output.getvalue())
        return result
    except json.JSONDecodeError:
        return {"hand": 0.0}

def analyze_mood(video_path: str) -> dict:
    """Analyze mood and facial expressions in video file using the video.py function."""
    import io
    import contextlib
    
    # Capture the output from the mood function
    captured_output = io.StringIO()
    with contextlib.redirect_stdout(captured_output):
        try:
            mood(video_path)
        except Exception as e:
            return {
                "mood": "OVERALL: No Detection",
                "mood_score": 0.0,
                "expression": "No Detection",
                "smile_score": 0.0
            }
    
    # Parse the JSON output
    try:
        result = json.loads(captured_output.getvalue())
        return result
    except json.JSONDecodeError:
        return {
            "mood": "OVERALL: No Detection",
            "mood_score": 0.0,
            "expression": "No Detection",
            "smile_score": 0.0
        }

def analyze_video(video_path: str) -> dict:
    """Run both mood and hand analysis on a video file."""
    import concurrent.futures
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        mood_future = executor.submit(analyze_mood, video_path)
        hand_future = executor.submit(analyze_hand_motion, video_path)
        
        mood_result = mood_future.result()
        hand_result = hand_future.result()
    
    return {
        "mood": mood_result,
        "hand": hand_result
    }


@app.route('/api/analysis', methods=['GET'])
def index():
    return 'Hello, World!'

@app.route('/api/analysis', methods=['POST'])
def analyze():
    """Main handler function for the API."""
    print(request.get_json())
    print(request.get_json().get('videoUrl'))
    print(request.get_json().get('mode'))
    
    
    try:
        video_url = request.get_json().get('videoUrl')
        mode = request.get_json().get('mode', 'both')  # Default to both if not specified
        
        if not video_url:
            return {
                "error": "Missing videoUrl in request body"
            }, 400

        # Check if the file URL ends with .mp4
        if 'mp4' not in video_url.lower():
            # Try to convert non-MP4 videos
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_output:
                    temp_input_path = tempfile.mktemp()
                    temp_output_path = temp_output.name
                
                # Download the video
                download_to_file(video_url, temp_input_path)
                
                # Convert to MP4
                convert_video_to_mp4(temp_input_path, temp_output_path)
                
                # Analyze the converted video based on mode
                if mode == 'mood':
                    result = {"mood": analyze_mood(temp_output_path)}
                elif mode == 'hand':
                    result = {"hand": analyze_hand_motion(temp_output_path)}
                else:
                    result = analyze_video(temp_output_path)
                
                # Clean up temporary files
                try:
                    os.unlink(temp_input_path)
                    os.unlink(temp_output_path)
                except:
                    pass
                
                return result
                
            except Exception as e:
                return {
                    "error": "Conversion to MP4 failed",
                    "details": str(e)
                }, 500

        # For proper MP4s, analyze directly
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            temp_path = temp_file.name

        try:
            # Download the video
            download_to_file(video_url, temp_path)
            
            # Check if file was downloaded successfully
            if not os.path.exists(temp_path):
                return {
                    "error": "Video not downloaded"
                }, 500
            
            # Check if file is not empty
            if os.path.getsize(temp_path) == 0:
                return {
                    "error": "Video is empty"
                }, 500
            
            # Analyze the video based on mode
            if mode == 'mood':
                result = {"mood": analyze_mood(temp_path)}
            elif mode == 'hand':
                result = {"hand": analyze_hand_motion(temp_path)}
            else:
                result = analyze_video(temp_path)
            
            return result
            
        finally:
            # Clean up the downloaded file
            try:
                os.unlink(temp_path)
            except:
                pass
                
    except Exception as e:
        return {
            "error": "Analysis failed",
            "details": str(e)
        }, 500

# For Vercel serverless function
def handler_vercel(request):
    """Vercel Python serverless function handler."""
    try:
        # Handle CORS preflight requests
        if request.method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': ''
            }
        
        # Only handle POST requests
        if request.method != 'POST':
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
        
        # Parse the request body
        try:
            request_data = json.loads(request.body)
        except (json.JSONDecodeError, AttributeError):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }
        
        result, status_code = analyze(request_data)
        
        return {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }

# For direct testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python route.py <video_url>")
        sys.exit(1)
    
    video_url = sys.argv[1]
    request_data = {"videoUrl": video_url}
    
    result, status_code = analyze(request_data)
    print(f"Status: {status_code}")
    print(json.dumps(result, indent=2))
