'use client'
import React, { useState, useEffect } from 'react'
import { SendHorizonal, Upload, Play, CheckCircle, Star, Users, TrendingUp, Clock, MessageCircle, Video, FileText, Target, Zap, Shield, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextEffect } from '@/components/ui/text-effect'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from './header'

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring',
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

const features = [
    {
        icon: Video,
        title: "AI-Powered Mock Interviews",
        description: "Practice with realistic interview scenarios tailored to your specific role and industry."
    },
    {
        icon: FileText,
        title: "Resume & Job Analysis",
        description: "Upload your resume and job description for personalized interview preparation."
    },
    {
        icon: Target,
        title: "Performance Analytics",
        description: "Get detailed feedback on your answers, body language, and overall performance."
    },
    {
        icon: Zap,
        title: "Real-time Coaching",
        description: "Receive instant suggestions and improvements during your practice sessions."
    },
    {
        icon: Shield,
        title: "Confidential & Secure",
        description: "Your interview data is protected with enterprise-grade security measures."
    },
    {
        icon: Award,
        title: "Proven Results",
        description: "Join thousands of successful candidates who landed their dream jobs."
    }
]

const stats = [
    { number: "50%", label: "Success Rate", icon: TrendingUp },
    { number: "10+", label: "Interviews Practiced", icon: Users },
    { number: "2x", label: "Faster Preparation", icon: Clock },
    { number: "4.8/5", label: "User Rating", icon: Star }
]

export default function LandingPage() {
    const [email, setEmail] = useState('')
    const [isPlaying, setIsPlaying] = useState(false)
    const [activeTestimonial, setActiveTestimonial] = useState(0)

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Add your email handling logic here
        console.log('Email submitted:', email)
        // You could integrate with your existing auth system
    }

    const handleGetStarted = () => {
        // Navigate to signup or login
        window.location.href = '/signup'
    }

    return (
        <>
            <Header />
            
            <main className="overflow-hidden [--color-primary-foreground:var(--color-white)] [--color-primary:var(--color-green-600)]">
                {/* Hero Section */}
                <section className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-background to-green-50/50 dark:from-gray-900/50 dark:via-background dark:to-gray-800/50"></div>
                    <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 lg:pt-48">
                        <div className="relative z-10 mx-auto max-w-4xl text-center">
                            <TextEffect
                                preset="fade-in-blur"
                                speedSegment={0.3}
                                as="h1"
                                className="text-balance text-5xl font-bold md:text-6xl lg:text-7xl">
                                Land Your Dream Job with AI-Powered Interview Coaching
                            </TextEffect>
                            
                            <TextEffect
                                per="line"
                                preset="fade-in-blur"
                                speedSegment={0.3}
                                delay={0.5}
                                as="p"
                                className="mx-auto mt-6 max-w-3xl text-pretty text-lg md:text-xl text-muted-foreground">
                                Transform your interview performance with personalized AI coaching. Upload your resume, practice with realistic scenarios, and get detailed feedback to ace any interview.
                            </TextEffect>

                            <AnimatedGroup
                                className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center"
                                variants={{
                                    container: {
                                        visible: {
                                            transition: {
                                                staggerChildren: 0.1,
                                                delayChildren: 0.75,
                                            },
                                        },
                                    },
                                    item: transitionVariants,
                                }}
                            >
                                <Button
                                    onClick={handleGetStarted}
                                    size="lg"
                                    className="px-8 py-3 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Start Free Trial
                                    <Zap className="ml-2 h-5 w-5" />
                                </Button>
                                
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="px-8 py-3 text-lg border-2 hover:bg-accent/50"
                                    onClick={() => setIsPlaying(!isPlaying)}
                                >
                                    <Play className="mr-2 h-5 w-5" />
                                    Watch Demo
                                </Button>
                            </AnimatedGroup>

                            {/* Email Signup Form */}
                            <AnimatedGroup
                                className="mt-8"
                                variants={{
                                    container: {
                                        visible: {
                                            transition: {
                                                staggerChildren: 0.05,
                                                delayChildren: 1,
                                            },
                                        },
                                    },
                                    item: transitionVariants,
                                }}
                            >
                                <form onSubmit={handleEmailSubmit} className="mx-auto max-w-md">
                                    <div className="bg-background has-[input:focus]:ring-muted relative grid grid-cols-[1fr_auto] items-center rounded-[calc(var(--radius)+0.5rem)] border pr-2 shadow shadow-zinc-950/5 has-[input:focus]:ring-2">
                                        <Upload className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4" />
                                        <input
                                            placeholder="Enter your email for early access"
                                            className="h-12 w-full bg-transparent pl-12 focus:outline-none"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <div className="md:pr-1.5 lg:pr-0">
                                            <Button
                                                type="submit"
                                                aria-label="submit"
                                                size="sm"
                                                className="rounded-(--radius)"
                                            >
                                                <span className="hidden sm:block">Get Early Access</span>
                                                <SendHorizonal
                                                    className="relative mx-auto size-5 md:hidden"
                                                    strokeWidth={2}
                                                />
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </AnimatedGroup>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-16 bg-muted/30">
                    <div className="mx-auto max-w-6xl px-6">
                        <AnimatedGroup
                            className="grid grid-cols-2 md:grid-cols-4 gap-8"
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.1,
                                        },
                                    },
                                },
                                item: transitionVariants,
                            }}
                        >
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <stat.icon className="h-6 w-6 text-primary mr-2" />
                                        <span className="text-3xl font-bold text-primary">{stat.number}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                </div>
                            ))}
                        </AnimatedGroup>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="text-center mb-16">
                            <TextEffect
                                preset="fade-in-blur"
                                as="h2"
                                className="text-3xl md:text-4xl font-bold mb-4"
                            >
                                Everything You Need to Succeed
                            </TextEffect>
                            <TextEffect
                                preset="fade-in-blur"
                                delay={0.3}
                                as="p"
                                className="text-lg text-muted-foreground max-w-2xl mx-auto"
                            >
                                Our comprehensive platform provides all the tools and insights you need to excel in any interview.
                            </TextEffect>
                        </div>

                        <AnimatedGroup
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.1,
                                        },
                                    },
                                },
                                item: transitionVariants,
                            }}
                        >
                            {features.map((feature, index) => (
                                <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:scale-105">
                                    <CardHeader>
                                        <feature.icon className="h-12 w-12 text-primary mb-4" />
                                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-base">
                                            {feature.description}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            ))}
                        </AnimatedGroup>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-20">
                    <div className="mx-auto max-w-4xl px-6 text-center">
                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.1,
                                        },
                                    },
                                },
                                item: transitionVariants,
                            }}
                        >
                            <TextEffect
                                preset="fade-in-blur"
                                as="h2"
                                className="text-3xl md:text-4xl font-bold mb-6"
                            >
                                Ready to Ace Your Next Interview?
                            </TextEffect>
                            
                            <TextEffect
                                preset="fade-in-blur"
                                delay={0.3}
                                as="p"
                                className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
                            >
                                Join thousands of successful candidates who have transformed their interview performance with our AI-powered coaching platform.
                            </TextEffect>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Button
                                    onClick={handleGetStarted}
                                    size="lg"
                                    className="px-8 py-3 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Start Your Free Trial
                                    <CheckCircle className="ml-2 h-5 w-5" />
                                </Button>
                                
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="px-8 py-3 text-lg"
                                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    Learn More
                                </Button>
                            </div>

                            <p className="text-sm text-muted-foreground mt-4">
                                No credit card required • 7-day free trial • Cancel anytime
                            </p>
                        </AnimatedGroup>
                    </div>
                </section>
            </main>
        </>
    )
}
