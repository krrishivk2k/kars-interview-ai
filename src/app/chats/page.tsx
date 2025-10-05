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
        const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
        
        if (!user) {
            router.push('/login')
        }
        })

        return () => unsubscribe()
    }, [router])

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [currentChat?.messages])

    // Create new chat
    const createNewChat = () => {
        const newChat: Chat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date()
        }
        setChats(prev => [newChat, ...prev])
        setCurrentChat(newChat)
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
        
        setCurrentChat(updatedChat)
        setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? updatedChat : chat
        ))

        setInputMessage('')
        setIsTyping(true)

        // Simulate AI response (replace with actual AI integration)
        setTimeout(() => {
        const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `This is a simulated response to: "${inputMessage}". In a real implementation, this would connect to your AI service.`,
            role: 'assistant',
            timestamp: new Date()
        }

        const finalChat = {
            ...updatedChat,
            messages: [...updatedChat.messages, aiMessage]
        }

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
    const deleteChat = (chatId: string) => {
        setChats(prev => prev.filter(chat => chat.id !== chatId))
        if (currentChat?.id === chatId) {
        setCurrentChat(null)
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
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
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
