"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function CameraRecorder() {
    const videoRef = useRef(null);
    const [recorder, setRecorder] = useState(null);
    const [recording, setRecording] = useState(false);
    const [chunks, setChunks] = useState([]);

    useEffect(() => {
        async function initMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true, 
            });
            if (videoRef.current) {
            videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Could not access camera/mic:", err);
        }
        }
        initMedia();
    }, []);

    const startRecording = () => {
        if (!videoRef.current || !(videoRef.current.srcObject instanceof MediaStream)) return;

        const newRecorder = new MediaRecorder(videoRef.current.srcObject, {
        mimeType: "video/webm;codecs=vp9,opus", 
        });

        newRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            setChunks((prev) => [...prev, e.data]);
        }
        };

        newRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        console.log("Video with audio URL:", url);
        setChunks([]);
        };

        newRecorder.start();
        setRecorder(newRecorder);
        setRecording(true);
    };

    const stopRecording = () => {
        recorder?.stop();
        setRecording(false);
    };

    return (
        <div className="flex flex-col items-center gap-4">
        <video ref={videoRef} autoPlay playsInline className="w-96 rounded-xl shadow" />
        {!recording ? (
            <Button onClick={startRecording} className="px-4 py-2 bg-green-600 text-white rounded" size="md">
                🎥 Start Recording
            </Button>
        ) : (
            <Button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded" size="md">
            ⏹️ Stop Recording
            </Button>
        )}
        </div>
    );
}
