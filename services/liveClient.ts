import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export class LiveClient {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  
  public onStatusChange: (status: string) => void = () => {};
  public onError: (error: string) => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async connect() {
    try {
      this.onStatusChange('CONNECTING');
      
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onerror: (e: ErrorEvent) => {
            console.error('Live API Error:', e);
            this.onError('Connection error occurred.');
            this.onStatusChange('ERROR');
          },
          onclose: () => {
            this.onStatusChange('DISCONNECTED');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: 'You are AstroAudio, an expert music theory assistant and creative partner. You help musicians with scales, chords, and production tips. Keep responses concise and musical.',
        },
      };

      this.sessionPromise = this.client.live.connect(config);
    } catch (err) {
      console.error(err);
      this.onError('Failed to access microphone or connect.');
      this.onStatusChange('ERROR');
    }
  }

  private handleOpen() {
    this.onStatusChange('CONNECTED');
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
        }
        this.onAudioLevel(Math.sqrt(sum / inputData.length));

        const pcmBlob = this.createBlob(inputData);
        if (this.sessionPromise) {
            this.sessionPromise.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        }
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio && this.outputAudioContext && this.outputNode) {
        // Interruption handling
        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
            this.sources.forEach(s => {
                try { s.stop(); } catch(e){}
            });
            this.sources.clear();
            this.nextStartTime = 0;
        }

        try {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            const audioBuffer = await this.decodeAudioData(
                this.decode(base64Audio),
                this.outputAudioContext,
                24000,
                1
            );
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            source.addEventListener('ended', () => this.sources.delete(source));
            
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
        } catch (err) {
            console.error('Audio decode error', err);
        }
    }
  }

  disconnect() {
    if (this.sessionPromise) {
        this.sessionPromise.then((session: any) => {
            // session.close() might not be exposed on the type properly in all versions, 
            // but we can at least stop our local processing.
            // In the official SDK, we just stop sending data and let it timeout or close if supported.
            // Ideally we call session.close() if available.
        });
    }
    this.stream?.getTracks().forEach(t => t.stop());
    this.scriptProcessor?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sessionPromise = null;
    this.onStatusChange('DISCONNECTED');
  }

  // --- Helpers ---

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
