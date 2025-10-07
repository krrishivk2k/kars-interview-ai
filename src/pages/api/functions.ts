import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import https from 'https';
import type { NextApiRequest, NextApiResponse } from 'next';
import { tmpdir } from 'os';
import { exec } from 'child_process'; // 👈 added for optional ffmpeg conversion
import ffmpegPath from 'ffmpeg-static';
// import ffmpeg from 'fluent-ffmpeg';

type AnalysisResult = {
  mood: any;
  hand: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalysisResult | { error: string; details?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing videoUrl in request body' });
  }

  // ✅ 1. Check that the file URL ends with .mp4
  if (!videoUrl.toLowerCase().endsWith('.mp4')) {
    console.warn(`[WARN] Non-MP4 video detected: ${videoUrl}`);

    // 👇 Option A: reject it
    // return res.status(400).json({ error: 'Only MP4 videos are supported' });

    // 👇 Option B: auto-convert it using ffmpeg (if available)
    try {
      const tempInputPath = path.join(tmpdir(), `video-${Date.now()}`);
      const tempOutputPath = tempInputPath + '.mp4';
      console.log('[DEBUG] Downloading and converting non-MP4 video...');

      await downloadToFile(videoUrl, tempInputPath);


      await new Promise((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpegPath!, [
          '-i', tempInputPath,
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-y', // Overwrite output file
          tempOutputPath
        ]);

        // ffmpegProcess.stdout.on('data', (data) => {
        //   console.log(`FFmpeg stdout: ${data}`);
        // });

        // ffmpegProcess.stderr.on('data', (data) => {
        //   console.log(`FFmpeg stderr: ${data}`);
        // });

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            console.log('[DEBUG] FFmpeg conversion complete');
            resolve(null);
          } else {
            console.error(`FFmpeg process exited with code ${code}`);
            reject(new Error(`FFmpeg conversion failed with code ${code}`));
          }
        });

        ffmpegProcess.on('error', (err) => {
          console.error('FFmpeg process error:', err);
          reject(err);
        });
      });
      console.log('[DEBUG] Converted video to MP4:', tempOutputPath);

      return await analyzeVideo(tempOutputPath, res);
    } catch (err: any) {
      console.error('Conversion failed:', err);
      return res.status(500).json({ error: 'Conversion to MP4 failed', details: err.message });
    }
  }

  // ✅ 2. For proper MP4s, just analyze directly
  try {
    const tempPath = path.join(tmpdir(), `video-${Date.now()}.mp4`);
    await downloadToFile(videoUrl, tempPath);

    if (!fs.existsSync(tempPath)) {
      console.error(`[ERROR] Video file not found at ${tempPath}`);
      return res.status(500).json({ error: 'Video not downloaded' });
    }

    const stats = fs.statSync(tempPath);
    if (stats.size === 0) {
      console.error(`[ERROR] Downloaded video is empty`);
      return res.status(500).json({ error: 'Video is empty' });
    }

    // Step 2: Run both Python scripts in parallel
    const [mood, hand] = await Promise.all([
      runPython('mood', tempPath),
      runPython('hand', tempPath),
    ]);

    // Step 3: Clean up the downloaded file
    fs.unlink(tempPath, () => {});

    return res.status(200).json({ mood, hand });
  } catch (err: any) {
    console.error('Analysis failed:', err);
    return res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
}

// --- Utility: shared function for analyzing a file ---
async function analyzeVideo(filePath: string, res: NextApiResponse) {
  const [mood, hand] = await Promise.all([
    runPython('mood', filePath),
    runPython('hand', filePath),
  ]);
  fs.unlink(filePath, () => {});
  return res.status(200).json({ mood, hand });
}

// --- Utility: Download video file to local disk ---
function downloadToFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download file: ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
  });
}

// --- Utility: Run Python script and parse JSON output ---
function runPython(mode: string, filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'src', 'pages', 'api', 'video.py');
    console.log('[DEBUG] Python script path:', scriptPath);

    const py = spawn('python3', [scriptPath, mode, filePath]);

    let output = '';

    py.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    py.stderr.on('data', (err: Buffer) => {
      const msg = err.toString().trim();
      // Ignore Mediapipe and TensorFlow logs
      if (!msg.startsWith('W0000') && !msg.startsWith('I0000') && !msg.includes('delegate')) {
        console.error(`[${mode} stderr]:`, msg);
      } else {
        console.log(`[${mode} log suppressed]:`, msg);
      }
    });
    
    py.on('close', (code: number) => {
      if (code !== 0) {
        return reject(new Error(`${mode} script exited with code ${code}`));
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (e) {
        reject(new Error(`${mode} output was not valid JSON`));
      }
    });
  });
}
