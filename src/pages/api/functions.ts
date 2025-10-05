import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import https from 'https';
import type { NextApiRequest, NextApiResponse } from 'next';
import { tmpdir } from 'os';

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

  try {
    // Step 1: Download video to temporary file
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
      runPython('hand', tempPath)
    ]);

    // Step 3: Clean up the downloaded file
    fs.unlink(tempPath, () => {});

    // Return both results
    return res.status(200).json({ mood, hand });
  } catch (err: any) {
    console.error('Analysis failed:', err);
    return res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
}

// --- Utility: Download video file to local disk ---
function downloadToFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download file: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
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
      console.error(`[${mode} stderr]:`, err.toString());
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
