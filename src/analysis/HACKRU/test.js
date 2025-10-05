import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(config.googleApiKey);

async function runTests() {
  console.log('🧪 Running Google Gen AI Tests...\n');
  
  const model = genAI.getGenerativeModel({ model: config.geminiModel });
  
  const testCases = [
    {
      name: "Simple Greeting",
      prompt: "Say hello and introduce yourself briefly."
    },
    {
      name: "Code Explanation",
      prompt: "Explain what this JavaScript code does: function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }"
    },
    {
      name: "Creative Writing",
      prompt: "Write a short haiku about artificial intelligence."
    },
    {
      name: "Problem Solving",
      prompt: "How would you debug a Node.js application that's running out of memory?"
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test ${i + 1}: ${testCase.name}`);
    console.log('─'.repeat(60));
    console.log(`Prompt: ${testCase.prompt}\n`);
    
    try {
      console.log('⏳ Generating response...');
      const result = await model.generateContent(testCase.prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Response:');
      console.log(text);
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error.message);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n🎉 All tests completed!');
}

// Run the tests
runTests();
