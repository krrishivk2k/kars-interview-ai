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
    UserCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/config/firebase-config'
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, query, getDocs, orderBy, deleteDoc } from 'firebase/firestore'

import { config } from '../../analysis/HACKRU/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(config.googleApiKey);

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

    // Create new chat
    const createNewChat = async () => {
        if (!user) return;
        
        // Save to Firestore first and get the document ID
        const firestoreId = await addChat(user.uid, 'New Chat', [])
        
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
        const model = genAI.getGenerativeModel({ model: config.geminiModel });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

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
            onMouseLeave={() => !sidebarPinned && setSidebarOpen(false)}
        >
            <div className="flex flex-col h-full p-4">
            {/* Header with Home and Pin buttons */}
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
                    onClick={() => setCurrentChat(chat)}
                    >
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 text-sm truncate">{chat.title}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation()
                            deleteChat(chat.id)
                        }}
                        >
                        <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
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
        </div>
    )
}
