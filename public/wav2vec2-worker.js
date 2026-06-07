// Web Worker for Wav2Vec2 ASR
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Disable local model loading, fetch from Hugging Face hub
env.allowLocalModels = false;

let transcriber = null;

// Load the model
async function initTranscriber() {
  try {
    self.postMessage({ status: 'loading', message: 'Loading Wav2Vec2 model (~90MB)...' });
    
    // We use a small, quantized version of Meta's Wav2Vec2: Xenova/wav2vec2-base-960h
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/wav2vec2-base-960h', {
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

    self.postMessage({ status: 'ready', message: 'Wav2Vec2 model loaded successfully!' });
  } catch (err) {
    console.error('Failed to load Wav2Vec2 model:', err);
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
    // Wav2Vec2 expects a Float32Array of 16kHz audio sample values
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
