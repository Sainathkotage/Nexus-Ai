export class DeepgramTranscriber {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioStream: MediaStream | null = null;
  private audioInputSource: MediaStreamAudioSourceNode | null = null;

  private onTranscript: (text: string, isFinal: boolean) => void;
  private onError: (err: string) => void;
  private onStatusChange: (status: 'idle' | 'connecting' | 'listening' | 'error') => void;

  constructor(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (err: string) => void,
    onStatusChange: (status: 'idle' | 'connecting' | 'listening' | 'error') => void
  ) {
    this.onTranscript = onTranscript;
    this.onError = onError;
    this.onStatusChange = onStatusChange;
  }

  async start() {
    if (typeof window === 'undefined') return;
    this.onStatusChange('connecting');

    try {
      // 1. Fetch Deepgram API Key
      const keyRes = await fetch('/api/deepgram-key');
      if (!keyRes.ok) {
        throw new Error(`Failed to fetch Deepgram key: ${keyRes.statusText}`);
      }
      const { key } = await keyRes.json();
      if (!key) {
        throw new Error('Deepgram API key is empty');
      }

      // 2. Establish WebSocket to Deepgram
      const url = 'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&interim_results=true&smart_format=true&model=nova-2';
      this.ws = new WebSocket(url, ['token', key]);

      this.ws.onopen = async () => {
        console.log('[DeepgramTranscriber] WebSocket connected');
        this.onStatusChange('listening');

        // Start capturing microphone input
        try {
          this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          this.audioInputSource = this.audioContext.createMediaStreamSource(this.audioStream);

          // Buffer size 4096 gives ~256ms chunks
          this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
          this.audioInputSource.connect(this.audioProcessor);
          this.audioProcessor.connect(this.audioContext.destination);

          this.audioProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              const pcmBuffer = this.convertFloat32ToInt16(inputData);
              this.ws.send(pcmBuffer);
            }
          };
        } catch (err: any) {
          console.error('[DeepgramTranscriber] Mic access error:', err);
          this.onError('Microphone access denied or failed.');
          this.stop();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const received = JSON.parse(event.data);
          const transcript = received.channel?.alternatives?.[0]?.transcript || '';
          const isFinal = received.is_final;

          if (transcript.trim()) {
            this.onTranscript(transcript, isFinal);
          }
        } catch (err: any) {
          console.error('[DeepgramTranscriber] Parsing error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[DeepgramTranscriber] WS error:', err);
        this.onError('Connection to Deepgram transcription service failed.');
        this.onStatusChange('error');
      };

      this.ws.onclose = () => {
        console.log('[DeepgramTranscriber] WebSocket closed');
        this.onStatusChange('idle');
      };

    } catch (err: any) {
      console.error('[DeepgramTranscriber] Setup error:', err);
      this.onError(err.message || 'Failed to initialize transcription.');
      this.onStatusChange('error');
    }
  }

  stop() {
    this.onStatusChange('idle');

    if (this.audioProcessor) {
      try {
        this.audioProcessor.disconnect();
      } catch (e) {}
      this.audioProcessor = null;
    }

    if (this.audioInputSource) {
      try {
        this.audioInputSource.disconnect();
      } catch (e) {}
      this.audioInputSource = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.close();
        } catch (e) {}
      }
      this.ws = null;
    }
  }

  private convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, Math.max(-1, buffer[l])) * 0x7FFF;
    }
    return buf.buffer;
  }
}
