// whisper-worker.js — Classic Web Worker for in-browser Whisper STT
// Uses @xenova/transformers via importScripts (compatible with all browsers)
importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');

// Configure the Transformers.js environment
const { pipeline, env } = self.Transformers;

// Use the browser cache to avoid re-downloading the model
env.allowLocalModels = false;
env.useBrowserCache = true;

// Enable multi-threaded WASM if available
if (self.navigator && self.navigator.hardwareConcurrency) {
  env.backends.onnx.wasm.numThreads = Math.min(self.navigator.hardwareConcurrency, 4);
}

let transcriber = null;
let isLoaded = false;
let isBusy = false;

// Load the Whisper tiny model immediately when worker starts
async function initTranscriber() {
  try {
    self.postMessage({ status: 'loading', message: 'Loading Whisper model (~75MB)...' });

    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      quantized: true,
      progress_callback: (data) => {
        if (data.status === 'progress' && data.progress != null) {
          self.postMessage({
            status: 'progress',
            progress: Math.round(data.progress),
            file: data.file || '',
          });
        }
      },
    });

    isLoaded = true;
    self.postMessage({ status: 'ready', message: 'Whisper model loaded!' });
  } catch (err) {
    console.error('[Whisper Worker] Failed to load model:', err);
    self.postMessage({ status: 'error', message: 'Failed to load model: ' + err.message });
  }
}

// Start loading immediately
initTranscriber();

// Handle transcription requests from the main thread
self.onmessage = async (e) => {
  const { audioData, isFinal } = e.data;
  if (!audioData || audioData.length === 0) return;

  if (!isLoaded) {
    self.postMessage({ status: 'not-ready', message: 'Model is still loading, please wait.' });
    return;
  }

  // Skip interim requests if a transcription is already running to avoid piling up
  if (isBusy && !isFinal) return;

  isBusy = true;

  try {
    // Whisper expects Float32Array at 16 kHz
    const output = await transcriber(audioData, {
      // No chunking needed for short clips — set to the length of clip (max 30s)
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    const text = (output.text || '').trim();

    if (text) {
      self.postMessage({
        status: isFinal ? 'final-result' : 'result',
        text,
      });
    }
  } catch (err) {
    console.error('[Whisper Worker] Inference error:', err);
    self.postMessage({ status: 'error', message: 'Inference failed: ' + err.message });
  } finally {
    isBusy = false;
  }
};
