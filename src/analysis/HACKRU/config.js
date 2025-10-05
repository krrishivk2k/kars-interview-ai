// Configuration file for Google Generative AI
// Copy this file to .env and add your actual API key

export const config = {
  // Get your API key from: https://makersuite.google.com/app/apikey
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  
  // Optional: Specify which model to use
  // Available models: gemini-pro, gemini-pro-vision, etc.
  geminiModel: process.env.GEMINI_MODEL || ''

};
