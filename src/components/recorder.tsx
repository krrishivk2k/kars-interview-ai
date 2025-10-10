"use client";


import { useConversation } from '@elevenlabs/react';
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '../config/firebase-config';
import { buildInterviewPrompt } from '../utils/interviewPrompt';




interface CameraRecorderProps {
onAnalysisComplete?: (result: any, transcript: { message: string; source: string }[]) => void;
roleInfo?: any;
}

export default function CameraRecorder({ onAnalysisComplete, roleInfo }: CameraRecorderProps) {
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
const [uploading, setUploading] = useState<boolean>(false);
const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const router = useRouter();


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


// Check authentication status
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
        
        if (!user) {
            // Redirect to login page if not authenticated
            router.push('/login');
        }
    });


    return () => unsubscribe();
}, [router]);


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
        chunksRef.current = [];
        setRecordedVideoUrl(null);
        setRecordedBlob(null);
        setPreviewUrl(null); // Clear preview URL
        setUploadSuccess(false);
        
        // Request microphone audio
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
        
        // Cross-platform MIME type detection (Windows, macOS, Linux)
        let mimeType = '';
        const userAgent = navigator.userAgent.toLowerCase();
        const isWindows = userAgent.includes('windows');
        const isChrome = userAgent.includes('chrome');
        const isEdge = userAgent.includes('edge');
        const isFirefox = userAgent.includes('firefox');
        
        // Windows-specific codec preferences
        if (isWindows) {
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')) {
                mimeType = 'video/mp4;codecs=h264,aac';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                mimeType = 'video/webm;codecs=vp8,opus';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
                mimeType = 'video/webm;codecs=vp9,opus';
            } else {
                mimeType = 'video/webm';
            }
        } else {
            // macOS/Linux preferences
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')) {
                mimeType = 'video/mp4;codecs=h264,aac';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
                mimeType = 'video/webm;codecs=vp9,opus';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                mimeType = 'video/webm;codecs=vp8,opus';
            } else {
                mimeType = 'video/webm';
            }
        }
        
        console.log(`Platform: ${isWindows ? 'Windows' : 'macOS/Linux'}`);
        console.log(`Browser: ${isChrome ? 'Chrome' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : 'Other'}`);
        console.log(`Selected MIME type: ${mimeType}`);


        const newRecorder = new MediaRecorder(recordingStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
            audioBitsPerSecond: 128000,  // 128 kbps for audio


        });




        newRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
                setChunks((prev) => [...prev, e.data]);
            }
        };




        newRecorder.onstop = () => {
            // Get all chunks from the ref
            const allChunks = [...chunksRef.current];
            const blob = new Blob(allChunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            console.log("Video with audio URL:", url);
            console.log("Recording format:", mimeType);
            setRecordedBlob(blob);
            setRecordedVideoUrl(url);
            setPreviewUrl(url); // Set preview URL for the video preview
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
            agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID as string, // Replace with your agent ID
            userId: 'YOUR_CUSTOMER_USER_ID', // Optional field for tracking your end user IDs
            connectionType: 'webrtc', // either "webrtc" or "websocket"
            overrides: {
                agent: {
                    prompt: {
                        prompt: buildInterviewPrompt(roleInfo?.jobDescription || "Software Engineer position") // Optional: override the system prompt.
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

const uploadToFirebase = useCallback(async () => {
    if (!recordedBlob) return;
    
    setUploading(true);
    setUploadSuccess(false);
    
    const user = auth.currentUser;


    if (!user) {
        alert("Please log in to upload videos");
        setUploading(false);
        return;
    }


    const storage = getStorage();
    const userId = user.uid;
    const timestamp = Date.now();
    
    // Determine file extension based on blob type
    const isMP4 = recordedBlob.type.includes('mp4');
    const fileName = `interview-recording-${timestamp}.${isMP4 ? 'mp4' : 'webm'}`;


    try {
        // If it's already MP4, upload as-is. If WebM, convert to MP4
        const uploadBlob = isMP4
            ? recordedBlob
            : new Blob([recordedBlob], { type: 'video/mp4' });
            
        const videoRef = ref(storage, `users/${userId}/interview_responses/${fileName}`);
        const snapshot = await uploadBytes(videoRef, uploadBlob);
        const videoUrl = await getDownloadURL(snapshot.ref);


        console.log("Video uploaded successfully:", videoUrl);
        setUploadSuccess(true);
        alert("Video uploaded successfully!");
        analyzeVideo(videoUrl)
        
    } catch (error) {
        console.error('Error uploading video:', error);
        alert('Error uploading video. Please try again.');
    } finally {
        setUploading(false);
    }
}, [recordedBlob]);


const analyzeVideo = async (videoUrl: any) => {
    
    const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, mode: 'mood' }),
        });
    
    if (!res.ok) {
        const error = await res.json();
        console.error('Error analyzing video:', error);
        return;
    }
    
    const result = await res.json();
    console.log('✅ Final Analysis Result:', result);
    
    // Pass result and transcript back to parent component
    if (onAnalysisComplete) {
        onAnalysisComplete(result, transcript);
    }
    

    };


// Show loading spinner while checking authentication
if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Checking authentication...</p>
        </div>
    );
}


// Show message if not authenticated (this shouldn't normally show due to redirect)
if (!user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground">You must be logged in to access this page.</p>
            <Button onClick={() => router.push('/login')}>
                Go to Login
            </Button>
        </div>
    );
}


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
        <p>Recording: {recording ? 'Yes' : 'No'}</p>
        <p>Has recorded video: {recordedBlob ? 'Yes' : 'No'}</p>
    </div>
    
    {/* Debug info */}
    {!recording && (
        <div className="text-xs text-gray-500">
            Debug: recording={recording.toString()}, hasBlob={!!recordedBlob}, hasPreview={!!previewUrl}
        </div>
    )}
    
    {/* Video preview and actions - only show when recording is stopped and we have a recorded blob */}
    {!recording && recordedBlob && previewUrl && (
        <div className="flex flex-col items-center gap-6 mt-6 p-6 bg-card border-2 border-dashed border-border rounded-lg ">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-card-foreground mb-2">🎉 Recording Complete!</h3>
                <p className="text-sm text-muted-foreground">Preview your interview recording below</p>
            </div>
            
            {/* Video preview */}
            <div className="relative">
                <video
                    src={previewUrl}
                    controls
                    className="w-full max-w-md rounded-lg shadow-lg border border-border"
                    style={{ maxHeight: '400px' }}
                    onLoadStart={() => console.log("Video load started")}
                    onLoadedData={() => console.log("Video data loaded")}
                    onError={(e) => console.error("Video error:", e)}
                    onCanPlay={() => console.log("Video can play")}
                >
                    Your browser does not support the video tag.
                </video>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button
                    onClick={convertToMp4}
                    className="flex-1"
                    size="default"
                >
                    📥 Download Video
                </Button>


                <Button
                    onClick={uploadToFirebase}
                    disabled={uploading}
                    variant="secondary"
                    className="flex-1"
                    size="default"
                >
                    {uploading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                        </>
                    ) : (
                        <>
                            ☁️ Upload to Cloud
                        </>
                    )}
                </Button>
            </div>


            {/* Upload success message */}
            {uploadSuccess && (
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md border border-border">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Video uploaded successfully!
                </div>
            )}


            {/* Recording info */}
            <div className="text-xs text-muted-foreground text-center">
                <p>File size: {recordedBlob ? `${(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</p>
                <p>Format: {recordedBlob?.type || 'N/A'}</p>
            </div>
        </div>
    )}
    </div>


    
);
}