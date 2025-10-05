# KARS Interview AI - Windows Setup Guide

## 🪟 Windows Compatibility

This guide will help you set up KARS Interview AI on Windows 10/11.

## 📋 Prerequisites

### Required Software:
1. **Node.js 18+** - [Download from nodejs.org](https://nodejs.org)
2. **Python 3.8+** - [Download from python.org](https://python.org)
3. **FFmpeg** - [Download from ffmpeg.org](https://ffmpeg.org/download.html)

### Browser Requirements:
- **Chrome 90+** (Recommended)
- **Edge 90+** (Recommended)
- **Firefox 88+** (Limited support)

## 🚀 Quick Setup

### Option 1: Automated Setup
```bash
# Run the Windows setup script
setup-windows.bat
```

### Option 2: Manual Setup

1. **Install Dependencies:**
```bash
# Install Python packages
pip install -r requirements-windows.txt

# Install Node.js packages
npm install
```

2. **Setup FFmpeg:**
   - Download FFmpeg from https://ffmpeg.org/download.html
   - Extract to `C:\ffmpeg`
   - Add `C:\ffmpeg\bin` to your PATH environment variable

3. **Start Development Server:**
```bash
npm run dev
```

## 🔧 Windows-Specific Features

### Audio/Video Recording:
- **MP4 Support**: Full H.264/AAC encoding support
- **WebM Fallback**: VP8/Opus codec for compatibility
- **Screen Capture**: Windows screen sharing API support

### Browser Compatibility:
- **Chrome**: Full feature support
- **Edge**: Full feature support  
- **Firefox**: Basic recording support

## 🐛 Troubleshooting

### Common Issues:

1. **"FFmpeg not found" error:**
   - Ensure FFmpeg is installed and in PATH
   - Restart command prompt after adding to PATH

2. **"Camera/microphone access denied":**
   - Check Windows privacy settings
   - Allow camera/microphone access for your browser

3. **"Recording not working":**
   - Try Chrome or Edge browser
   - Check browser permissions
   - Ensure HTTPS (required for media recording)

4. **Python analysis errors:**
   - Install Visual C++ Build Tools
   - Run: `pip install --upgrade pip`
   - Reinstall packages: `pip install -r requirements-windows.txt --force-reinstall`

### Performance Optimization:

1. **Disable Windows Defender real-time scanning** for project folder
2. **Use Chrome/Edge** for best performance
3. **Close unnecessary applications** during recording

## 📱 Windows-Specific Notes

- **File Paths**: Use forward slashes in code, Windows handles conversion
- **Audio Codecs**: Prefer AAC over Opus for better Windows compatibility
- **Screen Sharing**: Windows 10/11 screen capture API is fully supported
- **Performance**: Windows may require more RAM for video processing

## 🔍 Testing Your Setup

1. **Test Recording:**
   - Open the app in Chrome/Edge
   - Click "Start Recording"
   - Allow camera/microphone permissions
   - Record a short video
   - Check if download works

2. **Test Analysis:**
   - Record a video
   - Click "Analyze Interview Performance"
   - Check browser console for results

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify all dependencies are installed
3. Try different browsers
4. Check Windows privacy settings

## 🎯 Windows-Specific Optimizations

The app automatically detects Windows and applies:
- Windows-optimized codec selection
- Platform-specific audio processing
- Windows-compatible file handling
- Edge/Chrome browser optimizations
