import json
import mediapipe as mp
import numpy as np
import cv2
import time
import threading
from queue import Queue
import sys
import os

# --- CRITICAL FIX: SUPPRESS LIBRARY LOGGING TO PREVENT INVALID JSON OUTPUT ---
# Suppresses all but FATAL errors from TensorFlow/MediaPipe C++
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
# Suppresses Google logging (MediaPipe)
os.environ['GLOG_minloglevel'] = '2'
# Suppress Python logging
import logging
logging.getLogger().setLevel(logging.ERROR)
# -----------------------------------------------------------------------------

def hand(video_file):
    VIDEO_FILE = video_file
    PROCESS_WIDTH = 240
    CALIBRATION_DURATION = 3.0  # Increased for leniency
    FRAME_SKIP_RATE = 10        # Reduced for better sample collection
    MOVEMENT_THRESHOLD = 0.05
    WRIST_LANDMARK = 0

    class VideoStream:
        def __init__(self, src, queue_size=128):
            self.stream = cv2.VideoCapture(src)
            if not self.stream.isOpened():
                print(f"[ERROR] Could not open video file: {src}", file=sys.stderr)
                raise IOError
            self.stopped = False
            self.Q = Queue(maxsize=queue_size)
            self.t = threading.Thread(target=self.update, args=())
            self.t.daemon = True

        def start(self):
            if not self.t.is_alive():
                self.t.start()
            return self

        def update(self):
            while not self.stopped:
                success, frame = self.stream.read()
                if not success:
                    self.stopped = True
                    break
                if frame is not None:
                    frame_resized = cv2.resize(frame, (PROCESS_WIDTH, int(frame.shape[0] * PROCESS_WIDTH / frame.shape[1])))
                    self.Q.put(frame_resized)
                else:
                    self.stopped = True
                    break
            self.stream.release()

        def read(self):
            return self.Q.get()

        def more(self):
            return self.Q.qsize() > 0 or not self.stopped

        def stop(self):
            self.stopped = True
            if threading.current_thread() != self.t and self.t.is_alive():
                self.t.join()

    def analyze_hand_position(frame, hands_model):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hands_model.process(rgb)
        wrist_y = None
        if res.multi_hand_landmarks:
            hand_landmarks = res.multi_hand_landmarks[0]
            wrist = hand_landmarks.landmark[WRIST_LANDMARK]
            wrist_y = wrist.y
        return wrist_y

    mp_hands = mp.solutions.hands

    try:
        vs = VideoStream(VIDEO_FILE).start()
    except IOError as e:
        sys.exit(1)

    with mp_hands.Hands(
            model_complexity=0, 
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5) as hands: # Tracking confidence slightly increased

        baseline_samples = []
        start_time = time.time()
        calibration_frame_count = 0 


        while time.time() - start_time < CALIBRATION_DURATION and vs.more():
            frame = vs.read()
            if calibration_frame_count % FRAME_SKIP_RATE == 0:
                wrist_y = analyze_hand_position(frame, hands)
                if wrist_y is not None:
                    baseline_samples.append(wrist_y)
            calibration_frame_count += 1
            
        # --- GRACEFUL FAILURE CHECK FOR HANDS ---
        if not baseline_samples:
            vs.stop()
            # Log a warning to stderr
            print("[WARNING] Hand calibration failed: No samples collected. Returning 0.0.", file=sys.stderr)
            final_goodness = 0.0
            
        else:
            baseline_y = np.mean(baseline_samples)
            total_frames = 0
            tracking_frame_count = 0
            start_tracking = time.time()
            good_movement_frames = 0 

            while vs.more():
                frame = vs.read()
                total_frames += 1
                if tracking_frame_count % FRAME_SKIP_RATE == 0:
                    wrist_y = analyze_hand_position(frame, hands)
                    if wrist_y is not None:
                        diff = wrist_y - baseline_y
                        if abs(diff) > MOVEMENT_THRESHOLD:
                            good_movement_frames += 1
                tracking_frame_count += 1

            vs.stop()
            final_goodness = (good_movement_frames / total_frames) * 100 if total_frames > 0 else 0.0
        # ----------------------------------------

    # Ensure final JSON print happens successfully
    result = {"hand": final_goodness}
    print(json.dumps(result))


def mood(video_path):
    VIDEO_FILE = video_path
    PROCESS_WIDTH = 240
    FRAME_SKIP_RATE = 10

    class VideoStream:
        def __init__(self, src, queue_size=128):
            self.stream = cv2.VideoCapture(src)
            if not self.stream.isOpened():
                print(f"[ERROR] Could not open video file: {src}", file=sys.stderr)
                raise IOError
            self.stopped = False
            self.Q = Queue(maxsize=queue_size)
            self.t = threading.Thread(target=self.update, args=())
            self.t.daemon = True

        def start(self):
            self.t.start()
            return self

        def update(self):
            while not self.stopped:
                success, frame = self.stream.read()
                if not success:
                    self.stopped = True
                    break
                if frame is not None:
                    frame = cv2.resize(frame, (PROCESS_WIDTH, int(frame.shape[0] * PROCESS_WIDTH / frame.shape[1])))
                    self.Q.put(frame)
                else:
                    self.stopped = True
                    break
            self.stream.release()
            
        def read(self):
            return self.Q.get()

        def more(self):
            return self.Q.qsize() > 0 or not self.stopped

        def stop(self):
            self.stopped = True
            if threading.current_thread() != self.t and self.t.is_alive():
                self.t.join()

    def analyze_mood(frame, face_mesh_model):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = face_mesh_model.process(rgb)
        mood_score = None
        if res.multi_face_landmarks:
            lm = res.multi_face_landmarks[0].landmark
            mouth_right = np.array([lm[61].x, lm[61].y])
            mouth_left = np.array([lm[291].x, lm[291].y])
            left_eye_inner = np.array([lm[33].x, lm[33].y])
            right_eye_inner = np.array([lm[263].x, lm[263].y])
            eye_distance = np.linalg.norm(left_eye_inner - right_eye_inner)
            mouth_width = np.linalg.norm(mouth_left - mouth_right)
            if eye_distance > 0:
                mood_score = mouth_width / eye_distance
        return mood_score

    mp_face_mesh = mp.solutions.face_mesh

    try:
        vs = VideoStream(VIDEO_FILE).start()
    except IOError as e:
        sys.exit(1)

    with mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.3) as face_mesh:

        all_mood_scores = []
        total_frames = 0
        tracking_frame_count = 0
        start_tracking = time.time()

        
        while vs.more():
            frame = vs.read()
            total_frames += 1
            if tracking_frame_count % FRAME_SKIP_RATE == 0:
                score = analyze_mood(frame, face_mesh)
                if score is not None:
                    all_mood_scores.append(score)
            tracking_frame_count += 1

    vs.stop()
    
    # --- GRACEFUL FAILURE CHECK FOR MOOD ---
    if all_mood_scores:
        overall_avg_score = np.mean(all_mood_scores)
        if overall_avg_score > 0.75:
            overall_mood = "OVERALL: Positive"
        elif overall_avg_score < 0.45:
            overall_mood = "OVERALL: Negative"
        else:
            overall_mood = "OVERALL: Neutral"
    else:
        # Log a warning to stderr
        print("[WARNING] Mood analysis failed: No face detected. Returning No Detection.", file=sys.stderr)
        overall_mood = "OVERALL: No Detection"
        overall_avg_score = 0.0
    # ---------------------------------------

    # Ensure final JSON print happens successfully
    result = {"mood": overall_mood, "score": overall_avg_score}
    print(json.dumps(result))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"[ERROR] Insufficient args: {sys.argv}", file=sys.stderr)
        print("Usage: python analyze.py [mood|hand] path/to/video.mp4", file=sys.stderr)
        sys.exit(1)

    mode = sys.argv[1]
    video_path = sys.argv[2]

    if mode == "hand":
        hand(video_path)
    elif mode == "mood":
        mood(video_path)
    else:
        print(f"[ERROR] Invalid mode: {mode}", file=sys.stderr)
        sys.exit(1)