// Utility to handle PCM audio decoding from Gemini API

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  base64Data: string,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const bytes = decode(base64Data);
  const dataInt16 = new Int16Array(bytes.buffer);
  
  // Create buffer
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class AudioPlayer {
  private context: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000
    });
  }

  async play(base64Audio: string) {
    if (!this.context) return;
    
    // Resume context if suspended (browser policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    // Stop previous if playing
    this.stop();

    try {
      const audioBuffer = await decodeAudioData(base64Audio, this.context);
      const source = this.context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.context.destination);
      
      this.currentSource = source;
      this.isPlaying = true;
      
      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
      };

      source.start();
    } catch (e) {
      console.error("Audio playback error:", e);
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors on stop
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }
}

export const audioPlayer = new AudioPlayer();
