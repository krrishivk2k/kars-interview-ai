"use client";

import { useConversation } from '@elevenlabs/react';
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export default function CameraRecorder() {
    const videoRef = useRef<HTMLVideoElement>(null);
    // const audioRef = useRef<HTMLAudioElement>(null);
    const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
    const [recording, setRecording] = useState<boolean>(false);
    const [chunks, setChunks] = useState<Blob[]>([]);
    const chunksRef = useRef<Blob[]>([]);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);;
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // agent states and variables
    const [selectedCompany, setSelectedCompany] = useState('Google');
    const [selectedRole, setSelectedRole] = useState('Data Analytics');
    const [transcript, setTranscript] = useState<{ message: string; source: string }[]>([]);
    const conversation = useConversation({
        
        onConnect: () => {
        console.log('Connected');
        // Send initial message after connections
        },
        onDisconnect: () => console.log('Disconnected'),
        onMessage: (message) => {
            setTranscript(prev => [...prev, message]);
            console.log("New message:", message);
        },
        
        onError: (error) => console.error('Error:', error),
    });
    const buildInterviewPrompt = (company: any, role: any) => `
        You are acting as a calm and professional AI interviewer conducting a mock interview for a candidate applying to the position of "${role}" at "${company}".

        Use the following exact questions in order, asking one at a time:

        1. Tell me about yourself.
        2. What's a challenging problem you've solved in the past year?
        3. How do you approach working in a team?
        4. Describe a time you received critical feedback and how you handled it.
        5. Why do you want to work at ${company}?

        Instructions:
        - Ask one question at a time.
        - Do not move to the next question until the candidate finishes speaking.
        - Wait silently after each question.
        - Do not change or rephrase the questions.
        - Do not offer feedback between questions.
    `;


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
            // Clean up URLs
            if (downloadUrl) {
                URL.revokeObjectURL(downloadUrl);
            }
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, []);

    useEffect(() => {
        // The cleanup function runs before the next effect or when unmounting.
        return () => {
            if (recordedVideoUrl) {
                URL.revokeObjectURL(recordedVideoUrl);
                console.log("Revoked old Blob URL:", recordedVideoUrl);
            }
        };
    }, [recordedVideoUrl]);


    const startRecording = useCallback(async () => {
        try {
            // Clear previous recording chunks when starting new recording
            setChunks([]);
            setRecordedVideoUrl(null);
            setRecordedBlob(null);
            
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
            const videoTrack = previewStream?.getVideoTracks()[0];
            const audioTrack = audioStream.getAudioTracks()[0];
            
            if (!videoTrack) {
                throw new Error("No video track available");
            }
            
            // Create a new stream with both video and audio
            const recordingStream = new MediaStream([videoTrack, audioTrack]);
            

            // Try to find a supported MIME type
            let mimeType = "video/webm;codecs=vp9,opus";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = "video/webm;codecs=vp8,opus";
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = "video/webm";
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = ""; // Let browser choose
                    }
                }
            }
            
            console.log("Using MIME type:", mimeType);
            
            const newRecorder = new MediaRecorder(recordingStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
                audioBitsPerSecond: 128000,  // 128 kbps for audio

            });


            newRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    console.log("Data chunk received:", e.data.size, "bytes");
                    chunksRef.current.push(e.data);
                    setChunks((prev) => {
                        const newChunks = [...prev, e.data];
                        console.log("Total chunks so far:", newChunks.length);
                        return newChunks;
                    });
                }
            };


            newRecorder.onstop = () => {

                console.log("Recording stopped, processing chunks...");
                
                // Get all chunks from the ref
                const allChunks = [...chunksRef.current];
                console.log("Creating blob with chunks:", allChunks.length);
                
                if (allChunks.length === 0) {
                    console.error("No chunks recorded!");
                    return;
                }
                
                const blob = new Blob(allChunks, { type: mimeType || "video/webm" });
                const url = URL.createObjectURL(blob);
                console.log("Video with audio URL:", url);
                console.log("Total chunks recorded:", allChunks.length);
                console.log("Blob size:", blob.size, "bytes");
                
                // Store the blob and URLs for preview and download
                setRecordedBlob(blob);
                setDownloadUrl(url);
                setPreviewUrl(url); // Same URL for preview
                setChunks([]);
                chunksRef.current = []; // Clear the ref

                
                // Stop the audio stream when recording stops
                audioStream.getTracks().forEach(track => track.stop());
                
                // Stop audio playback
                // if (audioRef.current) {
                //     audioRef.current.pause();
                //     audioRef.current.srcObject = null;
                // }
            };


            // Start recording with 1-second intervals to ensure data is captured frequently
            newRecorder.start(1000);
            setRecorder(newRecorder);
            setRecording(true);



            // Start the conversation with your agent
            await conversation.startSession({
                agentId: 'agent_5801k6r2p237f0j9qm82jkk1bcmq', // Replace with your agent ID
                userId: 'YOUR_CUSTOMER_USER_ID', // Optional field for tracking your end user IDs
                connectionType: 'webrtc', // either "webrtc" or "websocket"
                overrides: {
                    agent: {
                        prompt: {
                            prompt: buildInterviewPrompt(selectedCompany, selectedRole) // Optional: override the system prompt.
                        },
                        language: "en" // Optional: override the language.
                    },
                },
            });
        } catch (err) {
            console.error("Could not access microphone:", err);
            alert("Microphone access is required for recording. Please allow microphone permission.");
        }
    }, [conversation, recorder]);


    const stopRecording = useCallback(async () => {
        await conversation.endSession();
        if (recorder) {
            recorder.stop();
        }
        setRecording(false);
    }, [conversation, recorder]);

    const convertToMp4 = useCallback(async () => {
        if (!recordedBlob) return;
        
        // Note: This is a simplified approach. For production, you might want to use a library like FFmpeg.js
        // or send the blob to a server for conversion
        try {
            // Create a new blob with MP4 MIME type (this is a basic approach)
            const mp4Blob = new Blob([recordedBlob], { type: 'video/mp4' });
            const mp4Url = URL.createObjectURL(mp4Blob);
            
            const link = document.createElement('a');
            link.href = mp4Url;
            link.download = `interview-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL
            URL.revokeObjectURL(mp4Url);
        } catch (error) {
            console.error('Error converting to MP4:', error);
            alert('Error converting to MP4. The file will be downloaded as WebM format.');
        }
    }, [recordedBlob]);


    return (
        
        <div className="flex flex-col items-center gap-4">
        <video ref={videoRef} autoPlay playsInline className="w-96 rounded-xl shadow" />
        {/* Hidden audio element for monitoring */}
        {/* <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} /> */}
        {(!recording && conversation.status !== 'connected') ? (
            <Button onClick={startRecording} className="px-4 py-2 bg-green-600 text-white rounded-(--radius)" size="lg">
                🎥 Start Recording
            </Button>
        ) : (
            <Button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded-(--radius)" size="lg" disabled={conversation.status !== 'connected'}>
            ⏹️ Stop Recording
            </Button>
        )}
        <div className="flex flex-col items-center">
            <p>Status: {conversation.status}</p>
            <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
        </div>
        
        {/* Debug info */}
        {!recording && (
            <div className="text-xs text-gray-500">
                Debug: recording={recording.toString()}, hasBlob={!!recordedBlob}, hasPreview={!!previewUrl}
            </div>
        )}
        
        {/* Video preview and download - only show when recording is stopped and we have a recorded blob */}
        {!recording && recordedBlob && previewUrl && (
            <div className="flex flex-col items-center gap-4 mt-4">
                <p className="text-sm text-gray-600">Recording completed! Preview your video:</p>
                
                {/* Video preview */}
                <video 
                    src={previewUrl} 
                    controls 
                    className="w-96 rounded-xl shadow"
                    style={{ maxHeight: '300px' }}
                    onLoadStart={() => console.log("Video load started")}
                    onLoadedData={() => console.log("Video data loaded")}
                    onError={(e) => console.error("Video error:", e)}
                    onCanPlay={() => console.log("Video can play")}
                >
                    Your browser does not support the video tag.
                </video>
                
                {/* Download button */}
                <Button 
                    onClick={convertToMp4} 
                    className="px-4 py-2 bg-purple-600 text-white rounded"
                    size="default"
                >
                    🎬 Download MP4
                </Button>
            </div>
        )}
        </div>

        
    );
}
