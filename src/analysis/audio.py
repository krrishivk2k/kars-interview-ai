from moviepy.editor import VideoFileClip

import librosa
import librosa.display

import parselmouth
from parselmouth.praat import call

# Temporary, to view audio waveform
import matplotlib.pyplot as plt

# Extract audio from video (Update after recording can be extracted)
# video = VideoFileClip("interview.mp4")
# audio = video.audio
# audio.write_audiofile("interview.wav", fps=16000)
