import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/config/firebase-config';

export async function POST(req: NextRequest) {
try {
    // Get the request body from the client
    const body = await req.json();

    const userToken = body.userToken;
    const videoUrl = body.videoUrl;
    const mode = body.mode;
    
    // Your external backend API URL (keep this as a server-side environment variable)
    const externalApiUrl = process.env.BACKEND_API_URL; 
    
    if (!externalApiUrl) {
        return NextResponse.json(
            { error: 'Backend API URL not configured' },
            { status: 500 }
        );
    }

    if (!userToken) {
        return NextResponse.json(
            { error: 'User not authenticated' },
            { status: 401 }
        );
    }

    const token = userToken;
    
    // Forward the request to your external backend API
    const response = await fetch(`${externalApiUrl}/api/analysis`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ videoUrl, mode }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('External API error:', errorData);
        
        return NextResponse.json(
            { 
                error: 'External API request failed',
                details: errorData 
            },
            { status: response.status }
        );
    }

    // Get the response data from the external API
    const data = await response.json();
    
    // Return the data to the client
    return NextResponse.json(data);

} catch (error) {
    console.error('Proxy API error:', error);
    return NextResponse.json(
        { 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
    );
}
}
