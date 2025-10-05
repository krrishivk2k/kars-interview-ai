from moviepy.editor import VideoFileClip

import librosa
import librosa.display
import pandas as pd

import parselmouth
from parselmouth.praat import call

# # To view audio waveform
# import matplotlib.pyplot as plt

# # Extract audio from video (Update after recording can be extracted)
# video = VideoFileClip("interview.webm")
# audio = video.audio
# audio.write_audiofile("interview.wav", fps=16000)

# # Load the audio file
# y, sr = librosa.load("interview.wav", sr=None)

# # Extract features
# mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
# rms = librosa.feature.rms(y=y)
# pitch, mag = librosa.piptrack(y=y, sr=sr)

# # Plot MFCCs
# plt.figure(figsize=(10, 4))
# librosa.display.specshow(mfccs, x_axis='time', sr=sr)
# plt.colorbar()
# plt.title('MFCCs')
# plt.tight_layout()
# plt.show()

# # Load audio into Praat-parselmouth
# snd = parselmouth.Sound("interview.wav")

# # Extract pitch object
# pitch = snd.to_pitch()

# # Get mean and stdev of pitch (fundamental frequency)
# mean_pitch = call(pitch, "Get mean", 0, 0, "Hertz")
# stdev_pitch = call(pitch, "Get standard deviation", 0, 0, "Hertz")

# # Get intensity (volume)
# intensity = snd.to_intensity()
# mean_intensity = call(intensity, "Get mean", 0, 0)

# print(f"Mean pitch: {mean_pitch:.2f} Hz")
# print(f"Pitch variability: {stdev_pitch:.2f} Hz")
# print(f"Mean intensity: {mean_intensity:.2f} dB")

# # Detect periodic points (glottal pulses)
# point_process = call(snd, "To PointProcess (periodic, cc)", 75, 500)

# # Compute jitter (uses only PointProcess)
# jitter_local = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)

# # Compute shimmer (uses both Sound and PointProcess)
# shimmer_local = call([snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)

# print(f"Jitter (local): {jitter_local:.4f}")
# print(f"Shimmer (local): {shimmer_local:.4f}")

def analyze_audio_from_mp4(video_path):
    """
    Comprehensive audio analysis function for MP4 files.
    Extracts audio features including MFCCs, pitch, intensity, jitter, and shimmer.
    
    Args:
        video_path (str): Path to the MP4 video file
        
    Returns:
        dict: Dictionary containing all audio analysis results
    """
    import os
    import tempfile
    
    # Create temporary directory for intermediate files
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract audio from video
        print(f"Extracting audio from {video_path}...")
        video = VideoFileClip(video_path)
        audio = video.audio
        
        if audio is None:
            raise ValueError("No audio track found in the video file")
        
        # Save audio as WAV file
        audio_path = os.path.join(temp_dir, "extracted_audio.wav")
        audio.write_audiofile(audio_path, fps=16000, verbose=False, logger=None)
        
        # Load the audio file
        print("Loading audio file...")
        y, sr = librosa.load(audio_path, sr=None)
        
        # Extract MFCCs
        print("Extracting MFCCs...")
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Extract RMS energy
        print("Extracting RMS energy...")
        rms = librosa.feature.rms(y=y)
        
        # Extract pitch using piptrack
        print("Extracting pitch...")
        pitch, mag = librosa.piptrack(y=y, sr=sr)
        
        # Load audio into Praat-parselmouth for advanced analysis
        print("Loading audio into Praat...")
        snd = parselmouth.Sound(audio_path)
        
        # Extract pitch object
        pitch_obj = snd.to_pitch()
        
        # Get mean and standard deviation of pitch (fundamental frequency)
        mean_pitch = call(pitch_obj, "Get mean", 0, 0, "Hertz")
        stdev_pitch = call(pitch_obj, "Get standard deviation", 0, 0, "Hertz")
        
        # Get intensity (volume)
        intensity = snd.to_intensity()
        mean_intensity = call(intensity, "Get mean", 0, 0)
        
        # Detect periodic points (glottal pulses)
        point_process = call(snd, "To PointProcess (periodic, cc)", 75, 500)
        
        # Compute jitter (uses only PointProcess)
        jitter_local = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        
        # Compute shimmer (uses both Sound and PointProcess)
        shimmer_local = call([snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        
        # Additional audio features
        print("Computing additional features...")
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y)
        
        # Tempo and rhythm
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        
        # Compile results
        analysis_results = {
            # Basic audio properties
            "duration": len(y) / sr,
            "sample_rate": sr,
            "audio_length_samples": len(y),
            
            # MFCC features
            "mfccs": {
                "mean": float(mfccs.mean()),
                "std": float(mfccs.std()),
                "shape": mfccs.shape,
                "coefficients": mfccs.tolist()  # Convert to list for JSON serialization
            },
            
            # RMS energy
            "rms_energy": {
                "mean": float(rms.mean()),
                "std": float(rms.std()),
                "max": float(rms.max()),
                "min": float(rms.min())
            },
            
            # Pitch analysis
            "pitch": {
                "mean_f0": float(mean_pitch),
                "f0_std": float(stdev_pitch),
                "f0_range": float(mean_pitch + stdev_pitch) - float(mean_pitch - stdev_pitch)
            },
            
            # Intensity analysis
            "intensity": {
                "mean_db": float(mean_intensity),
                "mean_linear": float(10 ** (mean_intensity / 10))  # Convert dB to linear
            },
            
            # Voice quality measures
            "voice_quality": {
                "jitter_local": float(jitter_local),
                "shimmer_local": float(shimmer_local)
            },
            
            # Spectral features
            "spectral_features": {
                "spectral_centroid_mean": float(spectral_centroids.mean()),
                "spectral_rolloff_mean": float(spectral_rolloff.mean()),
                "zero_crossing_rate_mean": float(zero_crossing_rate.mean())
            },
            
            # Rhythm and tempo
            "rhythm": {
                "tempo_bpm": float(tempo),
                "beat_count": len(beats)
            },
            
            # Analysis metadata
            "analysis_info": {
                "video_file": video_path,
                "audio_extracted_to": audio_path,
                "analysis_timestamp": str(pd.Timestamp.now()),
                "libraries_used": ["librosa", "parselmouth", "moviepy"]
            }
        }
        
        print("Audio analysis completed successfully!")
        return analysis_results

# Example usage:
# results = analyze_audio_from_mp4("path/to/your/video.mp4")
# print(f"Mean pitch: {results['pitch']['mean_f0']:.2f} Hz")
# print(f"Jitter: {results['voice_quality']['jitter_local']:.4f}")
# print(f"Shimmer: {results['voice_quality']['shimmer_local']:.4f}")

