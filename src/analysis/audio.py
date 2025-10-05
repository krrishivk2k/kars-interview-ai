from moviepy.editor import VideoFileClip

import librosa
import librosa.display

import parselmouth
from parselmouth.praat import call

# To view audio waveform
import matplotlib.pyplot as plt

# Extract audio from video (Update after recording can be extracted)
video = VideoFileClip("/content/drive/MyDrive/interview.mp4")
audio = video.audio
audio.write_audiofile("interview.wav", fps=16000)

# Load the audio file
y, sr = librosa.load("interview.wav", sr=None)

# Extract features
mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
rms = librosa.feature.rms(y=y)
pitch, mag = librosa.piptrack(y=y, sr=sr)

# Plot MFCCs
plt.figure(figsize=(10, 4))
librosa.display.specshow(mfccs, x_axis='time', sr=sr)
plt.colorbar()
plt.title('MFCCs')
plt.tight_layout()
plt.show()

# Load audio into Praat-parselmouth
snd = parselmouth.Sound("interview.wav")

# Extract pitch object
pitch = snd.to_pitch()

# Get mean and stdev of pitch (fundamental frequency)
mean_pitch = call(pitch, "Get mean", 0, 0, "Hertz")
stdev_pitch = call(pitch, "Get standard deviation", 0, 0, "Hertz")

# Get intensity (volume)
intensity = snd.to_intensity()
mean_intensity = call(intensity, "Get mean", 0, 0)

print(f"Mean pitch: {mean_pitch:.2f} Hz")
print(f"Pitch variability: {stdev_pitch:.2f} Hz")
print(f"Mean intensity: {mean_intensity:.2f} dB")

# Detect periodic points (glottal pulses)
point_process = call(snd, "To PointProcess (periodic, cc)", 75, 500)

# Compute jitter (uses only PointProcess)
jitter_local = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)

# Compute shimmer (uses both Sound and PointProcess)
shimmer_local = call([snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)

print(f"Jitter (local): {jitter_local:.4f}")
print(f"Shimmer (local): {shimmer_local:.4f}")