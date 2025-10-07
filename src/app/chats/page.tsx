'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth'
import { auth } from '../../config/firebase-config'
import { useRouter } from 'next/navigation'
import { 
    Plus, 
    MessageSquare, 
    Trash2, 
    ChevronLeft,
    Send,
    Bot,
    User,
    Home,
    Pin,
    PinOff,
    LogOut,
    UserCircle,
    Edit2,
    Check,
    X,
    Video
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/config/firebase-config'
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, query, getDocs, orderBy, deleteDoc } from 'firebase/firestore'
import { ModeToggle } from '@/components/ui/theme-toggle'
import Recorder from '@/components/recorder'

import { config } from '../../analysis/HACKRU/config'
import { analyzeJobDescription } from '../../utils/jobAnalysis'

// Helper function to call server-side Google AI API
const generateContent = async (prompt: string, model: string = config.geminiModel, history: any[] = []) => {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model, history }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
};

// Function to build interview prompt based on job description
export const buildInterviewPrompt = (jobDescription: string) => `
    You are acting as a calm and professional AI interviewer conducting an interview for a candidate applying to a position.

    Job Description:
    ${jobDescription}

    Use the following exact questions in order, asking one at a time. Tailor these questions to be relevant to the specific role and requirements mentioned in the job description:

    1. Tell me about yourself and how your background aligns with this role.
    2. What's a challenging problem you've solved in the past year that's relevant to this position?
    3. How do you approach working in a team, especially in the context of this type of work?
    4. Describe a time you received critical feedback and how you handled it, particularly in a professional setting.
    5. Why are you interested in this specific role and what value do you think you can bring?

    Instructions:
    - Ask one question at a time.
    - Tailor the 5 preset questions to be relevant to the specific job description and role requirements.
    - Do not move to the next question until the candidate finishes speaking.
    - Wait silently after each question.
    - Do not change or rephrase the questions, but make them relevant to the job.
    - Do not offer feedback between questions.
    - If applicable, ask follow-up questions to the candidate's response that relate to the job requirements.
    - After the 5 preset questions, ask 2-3 additional questions that are specific to the job description, role requirements, and technical skills mentioned.
    - Focus on skills, experience, and qualities that are specifically mentioned in the job description.
    - If the job description mentions specific technologies, tools, or methodologies, incorporate questions about those.
`;

// Function to format message content with markdown-like syntax
function formatMessageContent(content: string) {
    return content
        .split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|```[\s\S]*?```)/)
        .map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                return <em key={index}>{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('`') && part.endsWith('`') && !part.startsWith('```')) {
                return <code key={index} className="bg-muted px-1 py-0.5 rounded text-xs">{part.slice(1, -1)}</code>;
            }
            if (part.startsWith('```') && part.endsWith('```')) {
                const code = part.slice(3, -3).trim();
                return <pre key={index} className="bg-muted p-2 rounded text-xs overflow-x-auto"><code>{code}</code></pre>;
            }
            return part;
        });
}

interface Chat {
    id: string
    title: string
    messages: Message[]
    createdAt: Date
}

interface Message {
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
}


interface ChatDataForFirestore {
    title: string;
    messages: { content: string; role: 'user' | 'assistant'; timestamp: ReturnType<typeof serverTimestamp> }[];
    createdAt: ReturnType<typeof serverTimestamp>;
}


interface MessageForFirestore {
    id: string; // Or generate client-side, or simply let Firestore manage document updates
    content: string;
    role: 'user' | 'assistant';
    timestamp: ReturnType<typeof Date>; // Use serverTimestamp for consistency
}


async function addChat(userId: string, title: string, initialMessages: { content: string; role: 'user' | 'assistant' }[]): Promise<string | null> {
    try {
        // Prepare messages with server timestamps
        const messagesWithTimestamps = initialMessages.map(msg => ({
            ...msg,
            timestamp: serverTimestamp()
        }));
        
        const newChatData: ChatDataForFirestore = {
            title: title,
            messages: messagesWithTimestamps,
            createdAt: serverTimestamp(), // Use serverTimestamp for consistent creation times
        };
        
        // Add chat to user's subcollection: chats/{userId}/userChats/{chatId}
        const docRef = await addDoc(collection(db, 'chats', userId, 'userChats'), newChatData);
        console.log("New chat added with ID:", docRef.id);
        return docRef.id; // Return the ID of the newly created chat document
    } catch (error) {
        console.error("Error adding chat:", error);
        return null;
    }
}

/**
 * Adds a new message to an existing chat document.
 * @param chatId The ID of the chat document to update.
 * @param content The text content of the message.
 * @param role The role of the sender ('user' or 'assistant').
 */
async function addMessageToChat(userId: string, chatId: string, content: string, role: 'user' | 'assistant'): Promise<void> {
    try {
        // Reference to the chat document in user's subcollection
        const chatRef = doc(db, 'chats', userId, 'userChats', chatId);

        const newMessage : MessageForFirestore = {
            id: Date.now().toString(),
            content: content,
            role: role,
            timestamp: Date.now().toString(), // Ensures consistent server-side timestamp
        };

        // Use arrayUnion to atomically add the new message to the 'messages' array
        await updateDoc(chatRef, {
            messages: arrayUnion(newMessage)
        });

        console.log(`Message added to chat: ${chatId}`);
    } catch (error) {
        console.error("Error adding message to chat:", error);
        throw error;
    }
}


// Function to load user's chats from Firestore
async function loadUserChats(userId: string): Promise<Chat[]> {
    try {
        const chatsRef = collection(db, 'chats', userId, 'userChats');
        const q = query(chatsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const chats: Chat[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Convert message timestamps to Date objects
            const messages = (data.messages || []).map((msg: any) => ({
                ...msg,
                timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp || Date.now())
            }));
            
            chats.push({
                id: doc.id,
                title: data.title,
                messages: messages,
                createdAt: data.createdAt?.toDate() || new Date()
            });
        });
        
        console.log(`Loaded ${chats.length} chats for user ${userId}`);
        return chats;
    } catch (error) {
        console.error("Error loading chats:", error);
        return [];
    }
}


export default function ChatsPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarPinned, setSidebarPinned] = useState(false)
    const [chats, setChats] = useState<Chat[]>([])
    const [currentChat, setCurrentChat] = useState<Chat | null>(null)
    const [inputMessage, setInputMessage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [showInterviewModal, setShowInterviewModal] = useState(false)
    const [interviewResult, setInterviewResult] = useState<any>(null)
    const [interviewTranscript, setInterviewTranscript] = useState<{ message: string; source: string }[]>([])
    const [jobDescription, setJobDescription] = useState<string>('')
    const [showJobDescriptionPrompt, setShowJobDescriptionPrompt] = useState(false)
    const [roleInfo, setRoleInfo] = useState<any>(null)
    const [isAnalyzingInterview, setIsAnalyzingInterview] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Check authentication
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user)
            setLoading(false)
            
            if (!user) {
                router.push('/login')
            } else {
                // Load user's chats when authenticated
                const userChats = await loadUserChats(user.uid)
                setChats(userChats)
            }
        })

        return () => unsubscribe()
    }, [router])

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [currentChat?.messages])

    // Show job description prompt for new chats
    useEffect(() => {
        if (currentChat && currentChat.messages.length === 0) {
            setShowJobDescriptionPrompt(true)
        }
    }, [currentChat])

    // Create new chat
    const createNewChat = async () => {
        if (!user) return;
        
        // Save to Firestore first and get the document ID
        const firestoreId = await addChat(user.uid, 'Chat ' + Date.now().toString(), [])
        
        if (!firestoreId) {
            console.error('Failed to create chat in Firestore')
            return
        }

        // Reload chats from Firestore to get the latest data
        const userChats = await loadUserChats(user.uid)
        setChats(userChats)
        
        // Set the newly created chat as current
        const newChat = userChats.find(chat => chat.id === firestoreId)
        if (newChat) {
            setCurrentChat(newChat)
        }
    }

    // Send message
    const sendMessage = async () => {
        if (!inputMessage.trim() || !currentChat) return

        const userMessage: Message = {
        id: Date.now().toString(),
        content: inputMessage,
        role: 'user',
        timestamp: new Date()
    }
    
        // Update current chat with user message
        const updatedChat = {
            ...currentChat,
            messages: [...currentChat.messages, userMessage]
        }
        addMessageToChat(user!.uid, currentChat.id, userMessage.content, userMessage.role)
        
        setCurrentChat(updatedChat)
        setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? updatedChat : chat
        ))

        setInputMessage('')
        setIsTyping(true)

        const prompt = userMessage.content;
        const text = await generateContent(inputMessage, config.geminiModel, currentChat.messages);

        // Simulate AI response (replace with actual AI integration)
        setTimeout(() => {
        const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: text,
            role: 'assistant',
            timestamp: new Date()
        }

        const finalChat = {
            ...updatedChat,
            messages: [...updatedChat.messages, aiMessage]
        }

        addMessageToChat(user!.uid, currentChat.id, aiMessage.content, aiMessage.role)

        setCurrentChat(finalChat)
        setChats(prev => prev.map(chat => 
            chat.id === currentChat.id ? finalChat : chat
        ))
        setIsTyping(false)
        }, 1500)
    }

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
        }
    }

    // Delete chat
    const deleteChat = async (chatId: string) => {
        if (!user) return;
        
        try {
            // Delete from Firestore
            await deleteDoc(doc(db, 'chats', user.uid, 'userChats', chatId));
            
            // Update local state
            setChats(prev => prev.filter(chat => chat.id !== chatId));
            if (currentChat?.id === chatId) {
                setCurrentChat(null);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    }

    // Sign out function
    const handleSignOut = async () => {
        try {
        await signOut(auth)
        router.push('/')
        } catch (error) {
        console.error('Error signing out:', error)
        }
    }

    // Start editing chat title
    const startEditingChat = (chatId: string, currentTitle: string) => {
        setEditingChatId(chatId)
        setEditingTitle(currentTitle)
        // Temporarily pin sidebar while editing
        setSidebarPinned(true)
    }

    // Cancel editing chat title
    const cancelEditingChat = () => {
        setEditingChatId(null)
        setEditingTitle('')
        // Restore previous sidebar state (unpin if it was temporarily pinned)
        setSidebarPinned(false)
    }

    // Save chat title
    const saveChatTitle = async (chatId: string) => {
        if (!user || !editingTitle.trim()) return

        try {
            // Update in Firestore
            await updateDoc(doc(db, 'chats', user.uid, 'userChats', chatId), {
                title: editingTitle.trim()
            })

            // Update local state
            setChats(prev => prev.map(chat => 
                chat.id === chatId ? { ...chat, title: editingTitle.trim() } : chat
            ))

            // Update current chat if it's the one being edited
            if (currentChat?.id === chatId) {
                setCurrentChat(prev => prev ? { ...prev, title: editingTitle.trim() } : null)
            }

            setEditingChatId(null)
            setEditingTitle('')
            // Restore previous sidebar state (unpin if it was temporarily pinned)
            setSidebarPinned(false)
        } catch (error) {
            console.error('Error updating chat title:', error)
        }
    }

    // Handle interview analysis result
    const handleAnalysisComplete = async (result: any, transcript: { message: string; source: string }[]) => {
        setInterviewResult(result)
        setInterviewTranscript(transcript)
        setIsAnalyzingInterview(true)
        // Add both result and transcript as messages to the current chat
        if (currentChat && user) {

            // Find job description from chat messages
            const jobDescMessage = currentChat.messages.find(msg => 
                msg.content.includes('Job Description Added')
            )
            const jobDesc = jobDescMessage ? 
                jobDescMessage.content.replace('**Job Description Added:**\n\n', '') : 
                'No job description provided'

            const prompt = `You are an honest hiring manager at a top firm with 15+ years of experience. Your job is to listen to an interview by a rookie and critique their response to help them improve. Your feedback should be specific, quantifiable, and actionable. Here is the job description for the role:\n\n${jobDesc}\n\n
            Here is the interview transcript:\n${transcript.map(t => `**${t.source}:** ${t.message}`).join('\n\n')}\n\n
            Here is the analysis of the interview in json format(Make sure to include this mood analysis in your response): ${JSON.stringify(result, null, 2)}\n\n
            Please provide detailed feedback on the candidate's performance, strengths, areas for improvement, and specific recommendations based on the job requirements.`;

            const text = await generateContent(prompt, config.geminiModel, currentChat.messages);

            // Create transcript message
            const transcriptMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: `**Interview Transcript:**\n\n${transcript.map(t => `**${t.source}:** ${t.message}`).join('\n\n')}`,
                role: 'assistant',
                timestamp: new Date()
            }
            
            // Create analysis result message
            const analysisMessage: Message = {
                id: Date.now().toString(),
                content: `**Interview Analysis Complete!**\n\n${text}`,
                role: 'assistant',
                timestamp: new Date()
            }

            const finalMessage: Message = {
                id: Date.now().toString(),
                content: `**Interview Analysis Complete!**\n\n${text}`,
                role: 'assistant',
                timestamp: new Date()
            }
            
            // Update current chat with both messages
            const updatedChat = {
                ...currentChat,
                messages: [...currentChat.messages, transcriptMessage, analysisMessage]
            }
            
            // Save both messages to Firestore
            // addMessageToChat(user.uid, currentChat.id, transcriptMessage.content, transcriptMessage.role)
            // addMessageToChat(user.uid, currentChat.id, analysisMessage.content, analysisMessage.role)
            addMessageToChat(user.uid, currentChat.id, finalMessage.content, finalMessage.role)
            
            // Update local state
            setCurrentChat(updatedChat)
            setChats(prev => prev.map(chat => 
                chat.id === currentChat.id ? updatedChat : chat
            ))
        }
        setIsAnalyzingInterview(false)
        // Close the modal
        setShowInterviewModal(false)
    }

    // Handle job description submission
    const handleJobDescriptionSubmit = async () => {
        if (!jobDescription.trim() || !currentChat || !user) return

        const jobDescMessage: Message = {
            id: Date.now().toString(),
            content: `**Job Description Added:**\n\n${jobDescription}`,
            role: 'user',
            timestamp: new Date()
        }

        // Update current chat with job description message
        const updatedChat = {
            ...currentChat,
            messages: [...currentChat.messages, jobDescMessage]
        }

        // Save to Firestore
        addMessageToChat(user.uid, currentChat.id, jobDescMessage.content, jobDescMessage.role)

        // Update local state
        setCurrentChat(updatedChat)
        setChats(prev => prev.map(chat => 
            chat.id === currentChat.id ? updatedChat : chat
        ))

        // Close the prompt
        setShowJobDescriptionPrompt(false)

        // Set role info with job description for the recorder
        setRoleInfo({ jobDescription: jobDescription })

        // Show typing indicator
        setIsTyping(true)

        // Generate AI response to job description
        try {
            const prompt = `I've received the job description for this interview. Please provide a brief acknowledgment and overview of what we'll be focusing on during the interview based on this role. Keep it concise and encouraging.`;
            
            const text = await generateContent(prompt, config.geminiModel, updatedChat.messages);

            // Add AI response
            const aiResponseMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: text,
                role: 'assistant',
                timestamp: new Date()
            }

            const chatWithAIResponse = {
                ...updatedChat,
                messages: [...updatedChat.messages, aiResponseMessage]
            }

            // Save AI response to Firestore
            addMessageToChat(user.uid, currentChat.id, aiResponseMessage.content, aiResponseMessage.role)

            // Update local state
            setCurrentChat(chatWithAIResponse)
            setChats(prev => prev.map(chat => 
                chat.id === currentChat.id ? chatWithAIResponse : chat
            ))

            setIsTyping(false)

            // After a delay, prompt to start the interview with context-aware message
            setTimeout(async () => {
                try {
                    // Generate a tailored interview prompt based on chat context
                    const contextPrompt = `Based on our conversation so far, create a personalized interview prompt that references specific details from the job description and any other relevant context from our chat. The prompt should be encouraging and mention key aspects of the role that we'll be focusing on during the interview. Keep it concise but personalized.`;
                    
                    const contextText = await generateContent(contextPrompt, config.geminiModel, chatWithAIResponse.messages);

                    const interviewPromptMessage: Message = {
                        id: (Date.now() + 2).toString(),
                        content: `**Ready to start your interview?** 🎤\n\n${contextText}\n\nClick the 'Enter Interview' button above when you're ready to begin!\n\n*Make sure you have a good internet connection and your camera/microphone are working properly.*`,
                        role: 'assistant',
                        timestamp: new Date()
                    }

                    const finalChat = {
                        ...chatWithAIResponse,
                        messages: [...chatWithAIResponse.messages, interviewPromptMessage]
                    }

                    // Save interview prompt to Firestore
                    addMessageToChat(user.uid, currentChat.id, interviewPromptMessage.content, interviewPromptMessage.role)

                    // Update local state
                    setCurrentChat(finalChat)
                    setChats(prev => prev.map(chat => 
                        chat.id === currentChat.id ? finalChat : chat
                    ))
                } catch (error) {
                    console.error('Error generating context-aware interview prompt:', error)
                    
                    // Fallback to generic prompt if context generation fails
                    const fallbackPromptMessage: Message = {
                        id: (Date.now() + 2).toString(),
                        content: "**Ready to start your interview?** 🎤\n\nI'm ready to conduct your interview based on the job description you provided. Click the 'Enter Interview' button above when you're ready to begin!\n\n*Make sure you have a good internet connection and your camera/microphone are working properly.*",
                        role: 'assistant',
                        timestamp: new Date()
                    }

                    const finalChat = {
                        ...chatWithAIResponse,
                        messages: [...chatWithAIResponse.messages, fallbackPromptMessage]
                    }

                    // Save fallback prompt to Firestore
                    addMessageToChat(user.uid, currentChat.id, fallbackPromptMessage.content, fallbackPromptMessage.role)

                    // Update local state
                    setCurrentChat(finalChat)
                    setChats(prev => prev.map(chat => 
                        chat.id === currentChat.id ? finalChat : chat
                    ))
                }
            }, 3000) // 3 second delay

        } catch (error) {
            console.error('Error generating AI response:', error)
            setIsTyping(false)
        }
    }

    if (loading) {
        return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        )
    }

    if (!user) {
        return null // Will redirect to login
    }

    return (
        <div className={cn("flex h-screen bg-background transition-all duration-300", sidebarPinned && "ml-80")}>
      {/* Sidebar */}
        <div 
            className={cn(
            "fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-10",
            (sidebarOpen || sidebarPinned) ? "w-80" : "w-0 overflow-hidden"
            )}
            onMouseEnter={() => !sidebarPinned && setSidebarOpen(true)}
            onMouseLeave={(e) => {
                // Only close if we're actually leaving the sidebar area
                if (!sidebarPinned && !e.currentTarget.contains(e.relatedTarget as Node)) {
                    setSidebarOpen(false)
                }
            }}
        >
            <div className="flex flex-col h-full p-4">
            {/* Header with Home, Pin, and Theme toggle buttons */}
            <div className="flex items-center justify-between mb-4">
                <Button 
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
                className="gap-2"
                >
                <Home className="w-4 h-4" />
                Home
                </Button>
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <Button 
                    onClick={() => setSidebarPinned(!sidebarPinned)}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    >
                    {sidebarPinned ? (
                        <>
                        <PinOff className="w-4 h-4" />
                        Unpin
                        </>
                    ) : (
                        <>
                        <Pin className="w-4 h-4" />
                        Pin
                        </>
                    )}
                    </Button>
                </div>
            </div>

            {/* New Chat Button */}
            <Button 
                onClick={createNewChat}
                className="w-full justify-start gap-2 mb-4"
                variant="outline"
            >
                <Plus className="w-4 h-4" />
                New Chat
            </Button>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                {chats.map((chat) => (
                    <div
                    key={chat.id}
                    className={cn(
                        "group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                        currentChat?.id === chat.id && "bg-accent"
                    )}
                    onClick={() => !editingChatId && setCurrentChat(chat)}
                    >
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    
                    {editingChatId === chat.id ? (
                        <div className="flex-1 flex items-center gap-1">
                            <Input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        saveChatTitle(chat.id)
                                    } else if (e.key === 'Escape') {
                                        cancelEditingChat()
                                    }
                                }}
                                className="text-sm h-6"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    saveChatTitle(chat.id)
                                }}
                                className="h-6 w-6 p-0"
                            >
                                <Check className="w-3 h-3" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    cancelEditingChat()
                                }}
                                className="h-6 w-6 p-0"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <span className="flex-1 text-sm truncate">{chat.title}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        startEditingChat(chat.id, chat.title)
                                    }}
                                    className="h-6 w-6 p-0"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteChat(chat.id)
                                    }}
                                    className="h-6 w-6 p-0"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </>
                    )}
                    </div>
                ))}
                </div>
            </div>

            {/* User Info Section */}
            <div className="border-t border-border pt-4">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground">Online</p>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSignOut}
                        className="gap-1"
                    >
                        <LogOut className="w-3 h-3" />
                    </Button>
                </div>
            </div>
            </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                    <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h1 className="text-lg font-semibold">
                    {currentChat?.title || 'Select a chat to start'}
                    </h1>
                </div>
                {currentChat && (
                    <Button
                    onClick={() => setShowInterviewModal(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    >
                    <Video className="w-4 h-4" />
                    Enter Interview
                    </Button>
                )}
            </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4">
            {currentChat ? (
                <div className="max-w-4xl mx-auto space-y-4">
                {currentChat.messages.map((message) => (
                    <div
                    key={message.id}
                    className={cn(
                        "flex gap-3",
                        message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                    >
                    {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                        </div>
                    )}
                    
                    <div
                        className={cn(
                        "max-w-[70%] rounded-lg p-3",
                        message.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                    >
                        <div className="text-sm whitespace-pre-wrap">
                            {formatMessageContent(message.content)}
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toTimeString()}
                        </p>
                    </div>

                    {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-secondary-foreground" />
                        </div>
                    )}
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                        <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
                </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Start a new conversation</h2>
                    <p className="text-muted-foreground mb-4">
                    Create a new chat to begin talking with the AI
                    </p>
                    <Button onClick={createNewChat}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                    </Button>
                </div>
                </div>
            )}
            </div>

            {/* Input Area */}
            {currentChat && (
            <div className="border-t border-border p-4">
                <div className="max-w-4xl mx-auto">
                <div className="flex gap-2">
                    <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isTyping}
                    />
                    <Button 
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    size="sm"
                    >
                    <Send className="w-4 h-4" />
                    </Button>
                </div>
                </div>
            </div>
            )}
        </div>

        {/* Sidebar Trigger Area */}
        {!sidebarPinned && (
            <div 
            className="fixed left-0 top-0 w-4 h-full z-20"
            onMouseEnter={() => setSidebarOpen(true)}
            />
        )}

        {/* Interview Modal */}
        {showInterviewModal && (
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowInterviewModal(false)
                    }
                }}
            >
                <div 
                    className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-semibold">Interview Recording</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowInterviewModal(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    
                    {isAnalyzingInterview ? (
                        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
                            <h3 className="text-xl font-semibold mb-2">Analyzing Interview</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                Our AI is grading your interview performance and generating detailed feedback. 
                                This may take a few moments...
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                <span>Processing video analysis...</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                <span>Generating AI feedback...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                            <Recorder onAnalysisComplete={handleAnalysisComplete} roleInfo={roleInfo} />
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Job Description Prompt Modal */}
        {showJobDescriptionPrompt && (
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowJobDescriptionPrompt(false)
                    }
                }}
            >
                <div 
                    className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-semibold">Add Job Description</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowJobDescriptionPrompt(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="p-4">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Please paste the job description for the role you&apos;re interviewing for. This will help the AI provide more targeted feedback.
                            </p>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste the job description here..."
                                className="w-full h-64 p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowJobDescriptionPrompt(false)}
                                >
                                    Skip
                                </Button>
                                <Button
                                    onClick={handleJobDescriptionSubmit}
                                    disabled={!jobDescription.trim()}
                                >
                                    Add Job Description
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </div>
    )
}
