# Google Generative AI Test Project

A Node.js project for testing and experimenting with Google's Generative AI (Gemini) models.

## 🚀 Quick Start

### Prerequisites

- Node.js (version 16 or higher)
- A Google AI API key

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get your API key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

3. **Configure your API key:**
   
   **Option A: Environment Variable (Recommended)**
   ```bash
   export GOOGLE_API_KEY="your_api_key_here"
   ```
   
   **Option B: Update config.js**
   - Open `config.js`
   - Replace `'your_api_key_here'` with your actual API key

### Usage

**Run the basic test:**
```bash
npm start
```

**Run comprehensive tests:**
```bash
npm test
```

**Run in development mode (auto-restart on changes):**
```bash
npm run dev
```

## 📁 Project Structure

```
├── package.json          # Project configuration and dependencies
├── config.js            # Configuration file for API settings
├── index.js             # Basic test script
├── test.js              # Comprehensive test suite
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🧪 Test Examples

The project includes several test scenarios:

1. **Simple Greeting** - Basic conversation test
2. **Code Explanation** - Technical analysis capabilities
3. **Creative Writing** - Creative content generation
4. **Problem Solving** - Debugging and technical assistance

## 🔧 Configuration

You can customize the following in `config.js`:

- **API Key**: Your Google AI API key
- **Model**: Choose between different Gemini models:
  - `gemini-pro` (default) - Text generation
  - `gemini-pro-vision` - Text and image analysis

## 📚 Available Models

- **gemini-pro**: Best for text generation tasks
- **gemini-pro-vision**: Supports both text and image inputs
- **gemini-1.5-pro**: Latest model with improved capabilities

## 🛠️ Development

### Adding New Tests

1. Edit `test.js` to add new test cases
2. Follow the existing pattern:
   ```javascript
   {
     name: "Your Test Name",
     prompt: "Your test prompt here"
   }
   ```

### Custom Prompts

You can modify the prompts in either:
- `index.js` for basic testing
- `test.js` for comprehensive testing

## 🔒 Security

- Never commit your API key to version control
- Use environment variables for production
- The `.gitignore` file excludes sensitive files

## 📖 Documentation

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Node.js SDK Reference](https://ai.google.dev/docs/sdk_nodejs)

## 🤝 Contributing

Feel free to add more test cases or improve the existing code!

## 📄 License

MIT License - feel free to use this project for learning and experimentation.
