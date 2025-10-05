import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(config.googleApiKey);

export async function initializeGemini() {
  try {
    console.log('🤖 Initializing Google Generative AI...\n');
    
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: config.geminiModel });
    
    return model;
  } catch (error) {
    console.error('❌ Initialization Error:', error.message);
    
    if (error.message.includes('API_KEY') || error.message.includes('your_api_key_here')) {
      console.log('\n💡 Make sure to:');
      console.log('1. Get your API key from: https://makersuite.google.com/app/apikey');
      console.log('2. Set the GOOGLE_API_KEY environment variable');
      console.log('3. Or update the config.js file with your API key');
    }
    throw error;
  }
}

export async function generateContent(model, prompt) {
  try {
    console.log('⏳ Generating response...\n');
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('❌ Generation Error:', error.message);
    throw error;
  }
}

export function displayResponse(text, title = 'Response') {
  console.log(`🤖 ${title}:`);
  console.log('─'.repeat(50));
  console.log(text);
  console.log('─'.repeat(50));
}
