"use client";


import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";


export default function CameraRecorder() {
    const videoRef = useRef(null);
    // const audioRef = useRef(null);
    const [recorder, setRecorder] = useState(null);
    const [recording, setRecording] = useState(false);
    const [chunks, setChunks] = useState([]);
    const [previewStream, setPreviewStream] = useState(null);


    useEffect(() => {
        async function initMedia() {
        try {
            // Only request video for preview, no audio yet
            const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
            });
            if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setPreviewStream(stream);
            }
        } catch (err) {
            console.error("Could not access camera:", err);
        }
        }
        initMedia();
        
        // Cleanup function to stop streams when component unmounts
        return () => {
            if (previewStream) {
                previewStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    const startRecording = async () => {
        try {
            // Request audio permission only when starting to record
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            
            // Play the audio for monitoring
            // if (audioRef.current) {
            //     audioRef.current.srcObject = audioStream;
            //     audioRef.current.play();
            // }
            
            // Get the video track from preview stream
            const videoTrack = previewStream.getVideoTracks()[0];
            const audioTrack = audioStream.getAudioTracks()[0];
            
            // Create a new stream with both video and audio
            const recordingStream = new MediaStream([videoTrack, audioTrack]);
            
            const newRecorder = new MediaRecorder(recordingStream, {
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
                
                // Stop the audio stream when recording stops
                audioStream.getTracks().forEach(track => track.stop());
                
                // Stop audio playback
                // if (audioRef.current) {
                //     audioRef.current.pause();
                //     audioRef.current.srcObject = null;
                // }
            };


            newRecorder.start();
            setRecorder(newRecorder);
            setRecording(true);
        } catch (err) {
            console.error("Could not access microphone:", err);
            alert("Microphone access is required for recording. Please allow microphone permission.");
        }
    };


    const stopRecording = () => {
        recorder?.stop();
        setRecording(false);
    };


    return (
        <div className="flex flex-col items-center gap-4">
        <video ref={videoRef} autoPlay playsInline className="w-96 rounded-xl shadow" />
        {/* Hidden audio element for monitoring */}
        {/* <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} /> */}
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
