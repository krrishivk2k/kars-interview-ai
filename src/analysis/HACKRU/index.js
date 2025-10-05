import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(config.googleApiKey);

async function testGemini() {
  try {
    console.log('🤖 Testing Google Generative AI...\n');
    
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: config.geminiModel });
    
    // Test prompt
  const prompt = "You are an AI interview coach."
  +"\n\nHere is the job description for the role:\n\nWe are hiring a Frontend Software Engineer to build high-quality user interfaces for our analytics platform. The ideal candidate has experience with modern JavaScript frameworks (React or Vue), a strong design sense, and the ability to work closely with product managers and designers. Strong communication skills and attention to detail are essential. Bonus for experience with performance optimization and accessibility."+
  "\n\nHere is the candidate’s transcript from answering the question: “Tell me about a time you worked on a team project.”\n\n\"Um, yeah so, one time I worked with like a team of developers on this thing where we had to like fix this bug and it was pretty tricky. I kind of like took the lead and, uh, coordinated with others to, you know, fix it. And in the end we solved it, which was cool."+
  "\"\n\nHere are automatically measured delivery features:\n\n{\n  \"speech_rate\": \"190 words per minute\",\n  \"filler_words\": 9,\n  \"pitch_variation\": \"low\",\n  \"eye_contact\": \"52%\",\n  \"smiles\": 0,\n  \"gesture_count\": 22\n}\n\nPlease provide feedback that:\n1. Evaluates how well the candidate’s answer aligns with the job description.\n2. Comments on communication skills and delivery based on the measured features.\n3. Offers 2–3 actionable tips to improve both content and delivery.\nBe concise but constructive.";


    
    console.log(`📝 Prompt: ${prompt}\n`);
    console.log('⏳ Generating response...\n');
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Gemini Response:');
    console.log('─'.repeat(50));
    console.log(text);
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API_KEY')) {
      console.log('\n💡 Make sure to:');
      console.log('1. Get your API key from: https://makersuite.google.com/app/apikey');
      console.log('2. Set the GOOGLE_API_KEY environment variable');
      console.log('3. Or update the config.js file with your API key');
    }
  }
}
async function testEleven() {
  const eleven = new ElevenLabs(config.elevenAPIKEY);
  
}

// Run the test
testGemini();
