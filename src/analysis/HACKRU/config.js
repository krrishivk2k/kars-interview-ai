// Configuration file for Google Generative AI
// Copy this file to .env and add your actual API key

export const config = {
    // Get your API key from: https://makersuite.google.com/app/apikey
    googleApiKey: process.env.GOOGLE_API_KEY || 'your-api-key-here',
    
    // Specify which model to use
    // Available models: gemini-pro, gemini-pro-vision, gemini-1.5-pro, etc.
    geminiModel: process.env.GEMINI_MODEL || 'gemini-pro'
};