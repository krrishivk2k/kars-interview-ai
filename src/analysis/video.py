
import mediapipe as mp
import numpy as np
import cv2
import time
import threading
from queue import Queue

def hand(video_file):
    VIDEO_FILE = video_file
    PROCESS_WIDTH = 240           # Keep low for maximum speed
    CALIBRATION_DURATION = 2.0    # seconds
    FRAME_SKIP_RATE = 30         # Process 1 frame out of every 30 for high FPS
    FPS_TARGET_WAITKEY = 10     # Stable 30 FPS display
    MOVEMENT_THRESHOLD = 0.05     # Normalized distance threshold (5% of frame height)
                                # Adjusted from 0.1 to 0.05 for more sensitive detection.

    # Landmark Index for the Wrist (used for tracking position)
    WRIST_LANDMARK = 0

    # --- 1. THREADED VIDEO STREAM CLASS ---
    class VideoStream:
        """Class that continuously gets frames from a VideoCapture object in a dedicated thread."""
        def __init__(self, src, queue_size=128):
            self.stream = cv2.VideoCapture(src)
            if not self.stream.isOpened():
                raise IOError(f"Cannot open video source: {src}")
            self.stopped = False
            self.Q = Queue(maxsize=queue_size)
            self.t = threading.Thread(target=self.update, args=())
            self.t.daemon = True

        def start(self):
            self.t.start()
            # Wait for the first frame to be put into the queue
            self.Q.join() 
            return self

        def update(self):
            while not self.stopped:
                success, frame = self.stream.read()
                if not success:
                    self.stopped = True
                    break
                
                # Perform initial resize in the reading thread
                frame_resized = cv2.resize(frame, (PROCESS_WIDTH, int(frame.shape[0] * PROCESS_WIDTH / frame.shape[1])))
                
                # Use blocking put to queue the frame (prioritizes processing over discarding)
                # Since we are prioritizing high FPS/display, we'll keep the non-blocking check:
                
                self.Q.put(frame_resized)
                self.Q.task_done()
                # If Q is full, the frame is skipped for display speed.

            self.stream.release()

        def read(self):
            return self.Q.get()

        def more(self):
            return self.Q.qsize() > 0 or not self.stopped

        def stop(self):
            self.stopped = True
            if threading.current_thread() != self.t and self.t.is_alive():
                self.t.join()

    # --- 2. HAND TRACKING ANALYSIS FUNCTION ---
    def analyze_hand_position(frame, hands_model):
        """Detects hand and returns the normalized Y-coordinate of the wrist."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hands_model.process(rgb)
        
        wrist_y = None # Normalized Y-coordinate
        
        if res.multi_hand_landmarks:
            hand_landmarks = res.multi_hand_landmarks[0]
            wrist = hand_landmarks.landmark[WRIST_LANDMARK]
            wrist_y = wrist.y 
            
        return wrist_y, res.multi_hand_landmarks

    # -------------------- MAIN --------------------
    mp_hands = mp.solutions.hands

    try:
        vs = VideoStream(VIDEO_FILE).start()
    except IOError as e:
        print(f"Error: {e}")
        exit()

    # Initialize the Hands model (Model 0 for max speed)
    with mp_hands.Hands(
            model_complexity=0, 
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.3) as hands:

        cv2.startWindowThread() 

        # --- Calibration phase ---
        baseline_samples = []
        start_time = time.time()
        calibration_frame_count = 0 
        print(f"Calibrating... Hold hand steady for {CALIBRATION_DURATION}s.")

        while time.time() - start_time < CALIBRATION_DURATION and vs.more():
            frame = vs.read()
            
            if calibration_frame_count % FRAME_SKIP_RATE == 0:
                wrist_y, _ = analyze_hand_position(frame, hands)
                if wrist_y is not None:
                    baseline_samples.append(wrist_y)
                
            calibration_frame_count += 1
            
            cv2.imshow("Hand Tracking", frame)
            if cv2.waitKey(FPS_TARGET_WAITKEY) & 0xFF == ord('q'):
                break

        if not baseline_samples:
            print("Calibration failed. No hand detected.")
            vs.stop(); cv2.destroyAllWindows(); exit()

        baseline_y = np.mean(baseline_samples)
        print(f"Baseline Y-position set at: {baseline_y:.3f}")

        # --- Tracking phase: Movement Analysis ---
        current_position_label = "No Hand"
        current_color = (200, 200, 200)

        total_frames = 0
        tracking_frame_count = 0
        start_tracking = time.time()
        
        # METRIC FOR OVERALL GOODNESS: Frames where significant movement was detected
        good_movement_frames = 0 

        while vs.more():
            frame = vs.read()
            total_frames += 1

            is_moving_now = False
            
            if tracking_frame_count % FRAME_SKIP_RATE == 0:
                # --- RUN THE EXPENSIVE PROCESSING ---
                wrist_y, landmarks = analyze_hand_position(frame, hands)
                
                if wrist_y is not None:
                    # Calculate the vertical difference from the baseline
                    diff = wrist_y - baseline_y
                    
                    if diff < -MOVEMENT_THRESHOLD:
                        current_position_label = "High Movement (UP)"
                        current_color = (0, 255, 0)
                        is_moving_now = True
                    elif diff > MOVEMENT_THRESHOLD:
                        current_position_label = "Low Movement (DOWN)"
                        current_color = (0, 0, 255)
                        is_moving_now = True
                    else:
                        current_position_label = "Neutral (Steady)"
                        current_color = (255, 255, 0)
                else:
                    current_position_label = "No Hand"
                    current_color = (200, 200, 200)

            # Increment counter based on the result of the last processed frame
            if "Movement" in current_position_label:
                good_movement_frames += 1
            
            tracking_frame_count += 1

            # Calculate Overall Goodness Score for display
            goodness_score = (good_movement_frames / total_frames) * 100 if total_frames > 0 else 0.0

            # Display the result
            cv2.putText(frame, f"POS: {current_position_label}",
                        (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, current_color, 2)
            cv2.putText(frame, f"Goodness Score: {goodness_score:.1f}%",
                        (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            
            cv2.imshow("Hand Tracking", frame)
            if cv2.waitKey(FPS_TARGET_WAITKEY) & 0xFF == ord('q'):
                break

        # --- Cleanup and Overall Results ---
        duration = time.time() - start_tracking
        final_goodness = (good_movement_frames / total_frames) * 100 if total_frames > 0 else 0.0

        print(f"\n--- Overall Hand Movement Summary ---")
        print(f"Total tracking time: {duration:.1f} seconds")
        print(f"Total frames analyzed: {total_frames}")
        print(f"Frames with significant movement: {good_movement_frames}")
        print(f"Overall Goodness Score (Movement Time %): {final_goodness:.1f}%")

    vs.stop()
    cv2.destroyAllWindows()

def mood(video_path):
# Check true video duration

    VIDEO_FILE = video_path
    PROCESS_WIDTH = 240
    FRAME_SKIP_RATE = 10
    FPS_TARGET_WAITKEY = 10

    class VideoStream:
        def __init__(self, src, queue_size=128):
            self.stream = cv2.VideoCapture(src)
            if not self.stream.isOpened():
                raise IOError(f"Cannot open video source: {src}")
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
                    self.stopped = True  # just flag and exit
                    break

                frame = cv2.resize(frame, (PROCESS_WIDTH, int(frame.shape[0] * PROCESS_WIDTH / frame.shape[1])))

                self.Q.put(frame)

            self.stream.release()
            

        def read(self):
            return self.Q.get()

        def more(self):
            return self.Q.qsize() > 0 or not self.stopped

        def stop(self):
            self.stopped = True
            if threading.current_thread() != self.t and self.t.is_alive():
                self.t.join()


    # --- 2. MOOD ANALYSIS FUNCTION (MODIFIED) ---

    # Key landmarks for a simple mood analysis:
    # Eyes (Inner corners for stable reference): 33, 263 (No longer used for the score)
    # Mouth Corners: 61 (Right side), 291 (Left side) 

    def analyze_mood(frame, face_mesh_model):
        """Analyzes a single frame for mood based on the horizontal mouth stretch."""
        
        frame_h, frame_w, _ = frame.shape
        scale_factor = PROCESS_WIDTH / frame_w
        small_frame = cv2.resize(frame, (PROCESS_WIDTH, int(frame_h * scale_factor)))
        
        rgb = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        res = face_mesh_model.process(rgb)
        
        mood_score = None # Higher score = wider mouth stretch (positive mood)
        
        if res.multi_face_landmarks:
            lm = res.multi_face_landmarks[0].landmark
            
            # 1. Get Mouth Corner points (Normalized coordinates [0, 1])
            mouth_right = np.array([lm[61].x, lm[61].y])
            mouth_left = np.array([lm[291].x, lm[291].y])
            
            # 2. Calculate the horizontal distance (the width)
            # We use the Euclidean distance for robustness, but since we're measuring smile, 
            # the horizontal component (x-distance) is the most critical.
            
            # We'll normalize this width by the distance between the two eye landmarks 
            # (33 and 263) to account for face size/distance from the camera.
            
            left_eye_inner = np.array([lm[33].x, lm[33].y])
            right_eye_inner = np.array([lm[263].x, lm[263].y])
            
            # Calculate eye-to-eye distance (as a normalization factor)
            eye_distance = np.linalg.norm(left_eye_inner - right_eye_inner)
            
            # Calculate mouth width (distance between mouth corners)
            mouth_width = np.linalg.norm(mouth_left - mouth_right)
            
            # 3. Final Mood Score: Ratio of Mouth Width to Eye Distance
            # This ratio will be relatively constant when neutral, and increase when smiling.
            if eye_distance > 0:
                mood_score = mouth_width / eye_distance
            
        return mood_score

    # -------------------- MAIN --------------------
    mp_face_mesh = mp.solutions.face_mesh

    try:
        vs = VideoStream(VIDEO_FILE).start()
    except IOError as e:
        print(f"Error: {e}")
        exit()

    with mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.3) as face_mesh:

        cv2.startWindowThread()
        all_mood_scores = []
        current_mood_score = 0.0
        total_frames = 0
        tracking_frame_count = 0
        start_tracking = time.time()

        print(f"Analyzing mood... (Processing 1 in {FRAME_SKIP_RATE} frames)")

        while vs.more():
            frame = vs.read()
            total_frames += 1

            if tracking_frame_count % FRAME_SKIP_RATE == 0:
                score = analyze_mood(frame, face_mesh)
                if score is not None:
                    current_mood_score = score
                    all_mood_scores.append(score)

                if current_mood_score > 0.75:
                    mood_label = "Positive (Smiling)"
                    color = (0, 255, 0)
                elif current_mood_score < 0.55:
                    mood_label = "Negative (Frowning)"
                    color = (0, 0, 255)
                else:
                    mood_label = "Neutral"
                    color = (255, 255, 0)

                cv2.putText(frame, f"Current Mood: {mood_label}",
                            (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                cv2.putText(frame, f"Score: {current_mood_score:.3f}",
                            (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.imshow("Mood Analysis", frame)

            tracking_frame_count += 1

            if cv2.waitKey(FPS_TARGET_WAITKEY) & 0xFF == ord('q'):
                break

        duration = time.time() - start_tracking
        if all_mood_scores:
            overall_avg_score = np.mean(all_mood_scores)
            if overall_avg_score > 0.75:
                overall_mood = "OVERALL: Positive"
            elif overall_avg_score < 0.45:
                overall_mood = "OVERALL: Negative"
            else:
                overall_mood = "OVERALL: Neutral"
            print("\n--- Mood Analysis Summary ---")
            print(f"Total processed frames: {len(all_mood_scores)}")
            print(f"Overall Average Mood Score: {overall_avg_score:.3f}")
            print(overall_mood)
            print(f"Duration: {duration:.1f} s")
        else:
            print("Analysis failed: No faces detected or processed.")

    vs.stop()
    cv2.destroyAllWindows()
    cv2.waitKey(1)
