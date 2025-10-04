import React, { useRef, useState } from "react";
//import { Hands, HAND_CONNECTIONS, Results } from "@mediapipe/hands";
//import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

type GestureCountProps = {
    videoSrc: string; // .mp4 file path or URL
};

const MOVEMENT_THRESHOLD = 0.1; // Adjust as needed

const GestureCount: React.FC<GestureCountProps> = ({ videoSrc }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gestureCount, setGestureCount] = useState(0);
    const [processing, setProcessing] = useState(false);

    // Store starting positions for each hand
    const startingPositions = useRef<{ [handedness: string]: number[] | null }>({
        Left: null,
        Right: null,
    });
    // Track if hand has moved away and returned
    const handMoved = useRef<{ [handedness: string]: boolean }>({
        Left: false,
        Right: false,
    });

    /*
    const onResults = (results: Results) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandedness) {
            results.multiHandLandmarks.forEach((landmarks, idx) => {
                const handedness = results.multiHandedness?.[idx]?.label || "Unknown";
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
                drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 1 });

                // Use wrist as reference point (landmark 0)
                const wrist = landmarks[0];
                const pos = [wrist.x, wrist.y, wrist.z];

                if (!startingPositions.current[handedness]) {
                    startingPositions.current[handedness] = pos;
                } else {
                    const start = startingPositions.current[handedness]!;
                    const dist = Math.sqrt(
                        (pos[0] - start[0]) ** 2 +
                        (pos[1] - start[1]) ** 2 +
                        (pos[2] - start[2]) ** 2
                    );
                    if (dist > MOVEMENT_THRESHOLD && !handMoved.current[handedness]) {
                        setGestureCount((c) => c + 1);
                        handMoved.current[handedness] = true;
                    }
                    if (dist <= MOVEMENT_THRESHOLD && handMoved.current[handedness]) {
                        handMoved.current[handedness] = false;
                    }
                }
            });
        }
        ctx.restore();
    };
    */

    /*
    const startProcessing = async () => {
        if (processing) return;
        setProcessing(true);

        const video = videoRef.current;
        if (!video) return;

        // Set canvas size to video size
        video.onloadedmetadata = () => {
            if (canvasRef.current) {
                canvasRef.current.width = video.videoWidth;
                canvasRef.current.height = video.videoHeight;
            }
        };

        
        const hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
        });
        hands.onResults(onResults);

        // Process each frame
        const processFrame = async () => {
            if (!video.paused && !video.ended) {
                await hands.send({ image: video });
                requestAnimationFrame(processFrame);
            }
        };

        video.play();
        processFrame();
    };
    */

    return (
        <div>
            <video
                ref={videoRef}
                src={videoSrc}
                style={{ display: "none" }}
                controls
                onPlay={() => setProcessing(true)}
            />
            <canvas ref={canvasRef} style={{ width: "640px", height: "480px" }} />
            <div>
                <strong>Hand Gesture Count:</strong> {gestureCount}
            </div>
            <button onClick={() => videoRef.current?.play()}>Play Video & Analyze</button>
        </div>
    );
};

export default GestureCount;