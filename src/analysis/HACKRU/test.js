import { initializeGemini, generateContent, displayResponse } from './shared.js';

async function runTests() {
  console.log('🧪 Running Google Gen AI Tests...\n');
  
  const model = await initializeGemini();
  
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
      const text = await generateContent(model, testCase.prompt);
      displayResponse(text, `✅ Test ${i + 1} Response`);
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error.message);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n🎉 All tests completed!');
}

// Run the tests
runTests();