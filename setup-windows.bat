@echo off
echo Setting up KARS Interview AI for Windows...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo Installing Python dependencies...
pip install -r requirements-windows.txt

echo Installing FFmpeg for Windows...
echo Please download FFmpeg from https://ffmpeg.org/download.html
echo and add it to your PATH environment variable

echo Installing Node.js dependencies...
npm install

echo Setting up Windows-specific configurations...

REM Create Windows-specific environment file
echo NODE_ENV=development > .env.local
echo PLATFORM=windows >> .env.local

echo Setup complete! Run 'npm run dev' to start the development server.
pause
