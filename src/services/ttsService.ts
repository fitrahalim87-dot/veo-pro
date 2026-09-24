export interface TtsOptions {
  voice: string;
  speed?: number; // e.g. -20 to +50
  pitch?: number; // e.g. -30 to +30
}

export interface TtsDetailedResult {
  url: string;
  blob: Blob;
  base64: string;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateEdgeTtsDetailed(
  text: string, 
  voice: string = "en-US-BrianMultilingualNeural", 
  speed: number = 0, 
  pitch: number = 0,
  apiKey: string = ""
): Promise<TtsDetailedResult> {
  const rateStr = `${speed >= 0 ? '+' : ''}${Math.round(speed)}%`;
  const pitchStr = `${pitch >= 0 ? '+' : ''}${Math.round(pitch)}Hz`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-speechma-key"] = apiKey;
  }

  const response = await fetch("/api/tts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      voice,
      rate: rateStr,
      pitch: pitchStr,
      apiKey,
    }),
  });

  if (!response.ok) {
    let errMsg = "Gagal membuat audio";
    try {
      const data = await response.json();
      errMsg = data.error || errMsg;
    } catch {
      if (response.status === 404) {
        errMsg = "Server API (/api/tts) tidak ditemukan (404). Di Vercel, pastikan file 'api/index.ts' dan 'vercel.json' sudah di-deploy dengan menekan tombol 'Redeploy' di Vercel Dashboard.";
      }
    }
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const base64 = await blobToBase64(blob);

  return { url, blob, base64 };
}

export async function generateEdgeTts(
  text: string, 
  voice: string = "en-US-BrianMultilingualNeural", 
  speed: number = 0, 
  pitch: number = 0,
  apiKey: string = ""
): Promise<string> {
  const res = await generateEdgeTtsDetailed(text, voice, speed, pitch, apiKey);
  return res.url;
}

// Convert AudioBuffer to standard WAV Blob in pure browser JS
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  writeString("RIFF");
  setUint32(length - 8);
  writeString("WAVE");
  writeString("fmt ");
  setUint32(16); // subchunk1 size (16 for PCM)
  setUint16(1); // audio format (1 = PCM)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // data chunk
  writeString("data");
  setUint32(length - pos - 4);

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: "audio/wav" });
}

// Fast browser-based audio concatenation using Web Audio API
export async function mergeAudioSegmentsClientSide(audioSegments: string[]): Promise<{ url: string; blob: Blob }> {
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtxClass();

  const audioBuffers: AudioBuffer[] = [];

  for (const seg of audioSegments) {
    let arrayBuffer: ArrayBuffer;
    if (seg.startsWith("data:")) {
      const base64 = seg.split(",")[1];
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      const res = await fetch(seg);
      arrayBuffer = await res.arrayBuffer();
    }

    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    audioBuffers.push(decoded);
  }

  if (audioBuffers.length === 0) {
    throw new Error("Tidak ada segmen audio untuk digabungkan.");
  }

  const numberOfChannels = Math.max(...audioBuffers.map(b => b.numberOfChannels));
  const sampleRate = audioBuffers[0].sampleRate;
  const totalLength = audioBuffers.reduce((sum, b) => sum + b.length, 0);

  const mergedBuffer = audioCtx.createBuffer(numberOfChannels, totalLength, sampleRate);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const channelData = mergedBuffer.getChannelData(ch);
    let offset = 0;
    for (const b of audioBuffers) {
      const srcData = ch < b.numberOfChannels ? b.getChannelData(ch) : b.getChannelData(0);
      channelData.set(srcData, offset);
      offset += b.length;
    }
  }

  const wavBlob = audioBufferToWavBlob(mergedBuffer);
  const url = URL.createObjectURL(wavBlob);
  return { url, blob: wavBlob };
}

export async function mergeAudioSegments(audioSegments: string[]): Promise<{ url: string; blob: Blob }> {
  try {
    const response = await fetch("/api/audio/merge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audioSegments }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      return { url, blob };
    }
  } catch (e) {
    console.warn("Server merge error, falling back to client-side Web Audio merge:", e);
  }

  // Graceful client-side fallback (100% works on Vercel without ffmpeg)
  return await mergeAudioSegmentsClientSide(audioSegments);
}

export async function lookupColabCode(code: string): Promise<{ ok: boolean; colabUrl: string; code: string; message: string }> {
  const res = await fetch("/api/colab/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Kode akses tidak valid atau Colab belum aktif.");
  }
  return data;
}

export async function checkColabHealth(colabUrl: string): Promise<{ ok: boolean; message: string; type?: string }> {
  const res = await fetch("/api/colab/health", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ colabUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Gagal terhubung ke Colab GPU.");
  }
  return data;
}

export async function generateColabVoiceClone(
  colabUrl: string,
  text: string,
  audioBase64: string,
  speed: number = 1.0
): Promise<{ url: string; blob: Blob }> {
  const res = await fetch("/api/colab/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      colabUrl,
      text,
      audioBase64,
      speed,
    }),
  });

  if (!res.ok) {
    let errMsg = "Gagal memproses kloning suara di Colab";
    try {
      const data = await res.json();
      errMsg = data.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return { url, blob };
}

export async function generateAiScript(topic: string): Promise<string> {
  try {
    const res = await fetch("/api/ai-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic }),
    });

    if (!res.ok) {
      throw new Error("Gagal membuat naskah");
    }

    const data = await res.json();
    return data.script || "";
  } catch (err: any) {
    console.error("AI Script Error:", err);
    throw err;
  }
}

export async function fetchAvailableVoices(): Promise<any[]> {
  try {
    const res = await fetch("/api/voices");
    if (!res.ok) return [];
    const data = await res.json();
    return data.voices || [];
  } catch (e) {
    console.error("Fetch voices error:", e);
    return [];
  }
}
