export class WakeWordDetector {
  private recognition: any = null;
  private onWakeWord: () => void;
  private wakePhrases: string[] = ['hey nexus', 'nexus'];
  private isRunning: boolean = false;

  constructor(onWakeWord: () => void, wakePhrases?: string[]) {
    this.onWakeWord = onWakeWord;
    if (wakePhrases && wakePhrases.length > 0) {
      this.wakePhrases = wakePhrases.map(p => p.toLowerCase());
    }
  }

  start() {
    if (typeof window === 'undefined') return;
    if (this.isRunning) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[WakeWordDetector] Native SpeechRecognition not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.isRunning = true;

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0].transcript.toLowerCase();

          // We check both final and interim results for immediate low-latency response
          for (const phrase of this.wakePhrases) {
            if (transcript.includes(phrase)) {
              console.log(`[WakeWordDetector] Wake phrase "${phrase}" detected!`);
              
              // Trigger callback
              this.onWakeWord();

              // Temporarily stop detection to prevent duplicate activations
              this.stop();
              setTimeout(() => {
                this.start();
              }, 4000);
              return;
            }
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        // Safe check for aborted or no-speech events which are expected in quiet rooms
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        console.error('[WakeWordDetector] Error:', event.error);
        this.stop();
        setTimeout(() => this.start(), 2000);
      };

      this.recognition.onend = () => {
        if (this.isRunning) {
          try {
            this.recognition.start();
          } catch (e) {
            // ignore if already running
          }
        }
      };

      this.recognition.start();
      console.log('[WakeWordDetector] Dormant background wake word listener started.');
    } catch (err) {
      console.error('[WakeWordDetector] Failed to start:', err);
      this.isRunning = false;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.stop();
      } catch (e) {
        // ignore errors on stopping
      }
      this.recognition = null;
      console.log('[WakeWordDetector] Dormant background wake word listener stopped.');
    }
  }
}
