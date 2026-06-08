// Web Worker for OpenAI Whisper ASR
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Disable local model loading, fetch from Hugging Face hub
env.allowLocalModels = false;

// Force browser caching of model files
env.useBrowserCache = true;

// Enable multi-threaded WebAssembly execution
env.backends.onnx.wasm.numThreads = self.navigator.hardwareConcurrency || 4;

let transcriber = null;

// Load the model
async function initTranscriber() {
  try {
    self.postMessage({ status: 'loading', message: 'Loading Whisper model (~75MB)...' });
    
    // We use a small, quantized version of OpenAI's Whisper: Xenova/whisper-tiny.en
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      quantized: true,
      progress_callback: (data) => {
        if (data.status === 'progress') {
          self.postMessage({ 
            status: 'progress', 
            progress: data.progress, 
            file: data.file 
          });
        }
      }
    });

    self.postMessage({ status: 'ready', message: 'Whisper model loaded successfully!' });
  } catch (err) {
    console.error('Failed to load Whisper model:', err);
    self.postMessage({ status: 'error', message: 'Failed to load model: ' + err.message });
  }
}

// Start loading immediately when worker starts
initTranscriber();

// Listen for messages from the main thread
self.onmessage = async (e) => {
  const { audioData, isFinal } = e.data;
  if (!audioData) return;

  if (!transcriber) {
    self.postMessage({ status: 'error', message: 'Transcriber model is not loaded yet.' });
    return;
  }

  try {
    // Run speech-to-text inference
    // Whisper expects a Float32Array of 16kHz audio sample values
    const output = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    self.postMessage({ 
      status: isFinal ? 'final-result' : 'result', 
      text: output.text 
    });
  } catch (err) {
    console.error('Transcription inference error:', err);
    self.postMessage({ status: 'error', message: 'Inference failed: ' + err.message });
  }
};
