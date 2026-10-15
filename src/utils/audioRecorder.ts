// In-browser voice recorder producing clean 16kHz mono WAV or WebM audio
// for direct multimodal input to Google Gemini API.

export interface RecordedAudio {
  blob: Blob;
  base64: string;
  mimeType: string;
  duration: number; // in seconds
  audioUrl: string;
}

export class VoiceRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private pcmData: Float32Array[] = [];
  private recordingStartTime = 0;
  private isCurrentlyRecording = false;
  private animFrameId: number | null = null;
  private volumeCallback: ((volume: number) => void) | null = null;

  public isRecording(): boolean {
    return this.isCurrentlyRecording;
  }

  public async start(onVolumeChange?: (volume: number) => void): Promise<void> {
    if (this.isCurrentlyRecording) return;
    this.volumeCallback = onVolumeChange || null;
    this.pcmData = [];

    // Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Collect PCM chunks with ScriptProcessor (buffer size 4096 = ~0.25s at 16kHz)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isCurrentlyRecording) return;
      const channel = e.inputBuffer.getChannelData(0);
      this.pcmData.push(new Float32Array(channel));

      // Compute RMS volume for reactive UI
      if (this.volumeCallback) {
        let sum = 0;
        for (let i = 0; i < channel.length; i++) {
          sum += channel[i] * channel[i];
        }
        const rms = Math.sqrt(sum / channel.length);
        const normalized = Math.min(1, Math.max(0, rms * 5));
        this.volumeCallback(normalized);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.recordingStartTime = Date.now();
    this.isCurrentlyRecording = true;
  }

  public async stop(): Promise<RecordedAudio> {
    if (!this.isCurrentlyRecording) {
      throw new Error("Recording is not in progress");
    }

    const duration = Math.max(1, (Date.now() - this.recordingStartTime) / 1000);
    this.cleanup();

    // Flatten collected Float32 chunks
    let totalLength = 0;
    for (const chunk of this.pcmData) {
      totalLength += chunk.length;
    }

    const flattened = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmData) {
      flattened.set(chunk, offset);
      offset += chunk.length;
    }

    // Encode to 16kHz 16-bit mono WAV Blob
    const wavBlob = encodeWAV(flattened, 16000);
    const base64 = await blobToBase64(wavBlob);
    const audioUrl = URL.createObjectURL(wavBlob);

    return {
      blob: wavBlob,
      base64,
      mimeType: "audio/wav",
      duration: Math.round(duration),
      audioUrl,
    };
  }

  public cancel(): void {
    this.cleanup();
    this.pcmData = [];
  }

  private cleanup(): void {
    this.isCurrentlyRecording = false;
    if (this.volumeCallback) {
      this.volumeCallback(0);
      this.volumeCallback = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }
}

// Convert PCM samples to standard 16-bit mono WAV Blob
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF Chunk
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");

  // fmt subchunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bit)

  // data subchunk
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// Convert Blob to pure base64 string without data: prefix
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Format duration helper (e.g. 5 -> "0:05", 65 -> "1:05")
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
