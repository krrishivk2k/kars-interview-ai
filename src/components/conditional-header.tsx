'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'

export function ConditionalHeader() {
    const pathname = usePathname()
    
    // Hide header on chats page
    if (pathname === '/chats') {
        return null
    }
    
    return <Header />
}
