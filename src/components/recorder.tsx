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
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

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
            
            // Check for MP4 support first, fallback to WebM
            const mimeType = MediaRecorder.isTypeSupported('video/mp4') 
                ? 'video/mp4' 
                : 'video/webm;codecs=vp9,opus';
            
            const newRecorder = new MediaRecorder(recordingStream, {
                mimeType: mimeType,
            });


            newRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    setChunks((prev) => [...prev, e.data]);
                }
            };


            newRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                console.log("Video with audio URL:", url);
                setRecordedBlob(blob);
                setRecordedVideoUrl(url);
                // Keep chunks for now - they'll be cleared when starting new recording
                
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
        recorder?.stop();
        setRecording(false);
    }, [conversation, recorder]);


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
        
        {recordedVideoUrl && recordedBlob && (
            <div className="flex flex-col items-center gap-2">
                <h3 className="text-lg font-semibold">Recorded Video:</h3>
                <video 
                    src={recordedVideoUrl} 
                    controls 
                    className="w-96 rounded-xl shadow"
                />
                <div className="flex gap-2">
                    <a 
                        href={recordedVideoUrl} 
                        download={`interview-recording.${recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        📥 Download Video
                    </a>
                    <button 
                        onClick={() => {
                            setRecordedVideoUrl(null);
                            setRecordedBlob(null);
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        🗑️ Clear
                    </button>
                </div>
            </div>
        )}
        </div>

        
    );
}
