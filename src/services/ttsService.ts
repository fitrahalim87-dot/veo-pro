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
      // response might be raw text
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

export async function mergeAudioSegments(audioSegments: string[]): Promise<{ url: string; blob: Blob }> {
  const response = await fetch("/api/audio/merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audioSegments }),
  });

  if (!response.ok) {
    let errMsg = "Gagal menggabungkan audio";
    try {
      const data = await response.json();
      errMsg = data.error || errMsg;
    } catch {
      // response might be raw text
    }
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  return { url, blob };
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

