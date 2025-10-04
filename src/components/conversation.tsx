'use client';
import { useConversation } from '@elevenlabs/react';
import { useCallback } from 'react';
import {useState } from 'react';

export function Conversation() {
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
    2. What’s a challenging problem you’ve solved in the past year?
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
  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
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
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation]);
  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Start Conversation
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
        >
          Stop Conversation
        </button>
      </div>
      <div className="flex flex-col items-center">
        <p>Status: {conversation.status}</p>
        <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
      </div>
    </div>
  );
}