import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import { Communicate, listVoices } from "edge-tts-universal";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedVoices: any[] = [];
let validVoiceNames = new Set<string>();

async function getAvailableVoices() {
  if (cachedVoices.length === 0) {
    try {
      cachedVoices = await listVoices();
      validVoiceNames = new Set(cachedVoices.map((v: any) => v.ShortName));
    } catch (e) {
      console.warn("Could not fetch listVoices initially:", e);
    }
  }
  return cachedVoices;
}

// Initial prefetch in background
getAvailableVoices().catch(() => {});

interface VoicePersonaConfig {
  engineVoice: string;
  pitchOffsetHz: number;
  rateOffsetPct: number;
}

// Maps regional/foreign character personas onto true Multilingual & Indonesian Neural engines
// so that every character reads Indonesian AND English seamlessly with ZERO "logat bule".
const VOICE_PERSONA_MAP: Record<string, VoicePersonaConfig> = {
  // Fitra -> Profiling Suara Rekaman Pengguna (Cowok muda santai storytelling)
  "id-ID-FitraCustomNeural": {
    engineVoice: "en-US-AndrewMultilingualNeural",
    pitchOffsetHz: -1,
    rateOffsetPct: 6,
  },
  // Kenzo -> Narator Recap Anime / Donghua / Manhua YouTube
  "id-ID-RecapAnimeNeural": {
    engineVoice: "en-US-BrianMultilingualNeural",
    pitchOffsetHz: -4,
    rateOffsetPct: 10,
  },
  // Christopher -> Deep Movie Trailer / Bariton Pria
  "en-US-ChristopherNeural": {
    engineVoice: "en-US-BrianMultilingualNeural",
    pitchOffsetHz: -15,
    rateOffsetPct: -4,
  },
  // Guy -> Santai Podcast Pria
  "en-US-GuyNeural": {
    engineVoice: "en-US-AndrewMultilingualNeural",
    pitchOffsetHz: -6,
    rateOffsetPct: 0,
  },
  // Jenny -> Vokal Wanita Ramah & Natural
  "en-US-JennyNeural": {
    engineVoice: "en-US-AvaMultilingualNeural",
    pitchOffsetHz: 0,
    rateOffsetPct: 0,
  },
  // Aria -> Storyteller Emosional & Hangat
  "en-US-AriaNeural": {
    engineVoice: "en-US-EmmaMultilingualNeural",
    pitchOffsetHz: 0,
    rateOffsetPct: 0,
  },
  // Ana -> Anak Kecil / Cewek Imut
  "en-US-AnaNeural": {
    engineVoice: "en-US-AvaMultilingualNeural",
    pitchOffsetHz: 20,
    rateOffsetPct: 4,
  },
  // Sonia -> Wanita Karismatik
  "en-GB-SoniaNeural": {
    engineVoice: "fr-FR-VivienneMultilingualNeural",
    pitchOffsetHz: 0,
    rateOffsetPct: 0,
  },
  // Ryan -> Pria Dokumenter / Formal
  "en-GB-RyanNeural": {
    engineVoice: "en-AU-WilliamMultilingualNeural",
    pitchOffsetHz: -5,
    rateOffsetPct: 0,
  },
  // Nanami -> Anime Girl Kawaii (Gadis Engine + High Pitch)
  "ja-JP-NanamiNeural": {
    engineVoice: "id-ID-GadisNeural",
    pitchOffsetHz: 18,
    rateOffsetPct: 4,
  },
  // Keita -> Anime Boy Shonen (Andrew Engine + Energetic Pitch)
  "ja-JP-KeitaNeural": {
    engineVoice: "en-US-AndrewMultilingualNeural",
    pitchOffsetHz: 10,
    rateOffsetPct: 5,
  },
  // Sun-Hi -> K-Drama Manis & Lembut
  "ko-KR-SunHiNeural": {
    engineVoice: "pt-BR-ThalitaMultilingualNeural",
    pitchOffsetHz: 8,
    rateOffsetPct: 0,
  },
  // In-Joon -> K-Pop Boy Modern
  "ko-KR-InJoonNeural": {
    engineVoice: "ko-KR-HyunsuMultilingualNeural",
    pitchOffsetHz: 0,
    rateOffsetPct: 0,
  },
  // Hamed -> Pria Berwibawa Khidmat
  "ar-SA-HamedNeural": {
    engineVoice: "it-IT-GiuseppeMultilingualNeural",
    pitchOffsetHz: -10,
    rateOffsetPct: -4,
  },
  // Zariyah -> Wanita Santun & Khidmat
  "ar-SA-ZariyahNeural": {
    engineVoice: "fr-FR-VivienneMultilingualNeural",
    pitchOffsetHz: 0,
    rateOffsetPct: 0,
  },
  // Xiaoxiao -> Cewek Ceria Asia
  "zh-CN-XiaoxiaoNeural": {
    engineVoice: "pt-BR-ThalitaMultilingualNeural",
    pitchOffsetHz: 12,
    rateOffsetPct: 3,
  },
  // Yunxi -> Cowok Muda Asia
  "zh-CN-YunxiNeural": {
    engineVoice: "ko-KR-HyunsuMultilingualNeural",
    pitchOffsetHz: -4,
    rateOffsetPct: 0,
  },
};

function parseNumeric(val: string, fallback: number = 0): number {
  const num = parseInt(val.replace(/[^0-9-]/g, ""), 10);
  return isNaN(num) ? fallback : num;
}

function formatRate(percent: number): string {
  const clamped = Math.max(-50, Math.min(100, Math.round(percent)));
  return `${clamped >= 0 ? "+" : ""}${clamped}%`;
}

function formatPitch(hz: number): string {
  const clamped = Math.max(-50, Math.min(50, Math.round(hz)));
  return `${clamped >= 0 ? "+" : ""}${clamped}Hz`;
}

async function streamAudioChunks(
  text: string, 
  voice: string, 
  rate: string = "+0%", 
  pitch: string = "+0Hz", 
  volume: string = "+0%"
): Promise<Buffer> {
  const communicate = new Communicate(text.trim(), {
    voice,
    rate,
    pitch,
    volume,
    connectionTimeout: 12000,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio" && chunk.data) {
      chunks.push(Buffer.from(chunk.data));
    }
  }

  if (chunks.length === 0) {
    throw new Error("No audio was received.");
  }

  return Buffer.concat(chunks);
}

async function synthesizeVoiceWithFallback(
  text: string,
  requestedVoice: string,
  rate: string = "+0%",
  pitch: string = "+0Hz",
  volume: string = "+0%"
): Promise<Buffer> {
  let targetVoice = requestedVoice;
  let userRateNum = parseNumeric(rate, 0);
  let userPitchNum = parseNumeric(pitch, 0);

  // Apply Smart Multilingual Persona mapping if the character needs zero "logat bule"
  if (VOICE_PERSONA_MAP[requestedVoice]) {
    const persona = VOICE_PERSONA_MAP[requestedVoice];
    targetVoice = persona.engineVoice;
    userRateNum += persona.rateOffsetPct;
    userPitchNum += persona.pitchOffsetHz;
  }

  const finalRate = formatRate(userRateNum);
  const finalPitch = formatPitch(userPitchNum);

  // Resolve unknown or deprecated voice IDs to safe valid equivalents
  if (validVoiceNames.size > 0 && !validVoiceNames.has(targetVoice)) {
    if (targetVoice.startsWith("ja-JP")) {
      targetVoice = "id-ID-GadisNeural";
    } else if (targetVoice.startsWith("ko-KR")) {
      targetVoice = "ko-KR-HyunsuMultilingualNeural";
    } else if (targetVoice.startsWith("id-ID") || targetVoice.startsWith("jv-ID") || targetVoice.startsWith("su-ID")) {
      targetVoice = "id-ID-GadisNeural";
    } else {
      targetVoice = "en-US-BrianMultilingualNeural";
    }
  }

  // Attempt 1: Try with mapped multilingual voice and adjusted persona prosody
  try {
    return await streamAudioChunks(text, targetVoice, finalRate, finalPitch, volume);
  } catch (err: any) {
    console.warn(`TTS Attempt 1 (${targetVoice}) failed: ${err.message}. Retrying...`);
  }

  // Attempt 2: Retry with default prosody
  try {
    return await streamAudioChunks(text, targetVoice, "+0%", "+0Hz", "+0%");
  } catch (err: any) {
    console.warn(`TTS Attempt 2 (${targetVoice} default) failed: ${err.message}. Falling back to reliable multilingual voice...`);
  }

  // Attempt 3: Fallback to high-reliability Multilingual Voice (Brian or Ava)
  const isFemale = targetVoice.includes("Female") || 
                   targetVoice.includes("Gadis") || 
                   targetVoice.includes("Nanami") || 
                   targetVoice.includes("Ava") || 
                   targetVoice.includes("Emma");
  const fallbackVoice = isFemale ? "en-US-AvaMultilingualNeural" : "en-US-BrianMultilingualNeural";

  return await streamAudioChunks(text, fallbackVoice, "+0%", "+0Hz", "+0%");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: List All Multilingual & Global Voices (Speechma Voice Library)
  app.get("/api/voices", async (req, res) => {
    try {
      const voices = await getAvailableVoices();
      return res.json({ voices });
    } catch (err: any) {
      console.error("List voices error:", err);
      return res.status(500).json({ error: "Gagal mengambil daftar suara" });
    }
  });

  // API Route: Speechma & Neural TTS Engine
  app.post("/api/tts", async (req, res) => {
    try {
      const { 
        text, 
        voice = "en-US-BrianMultilingualNeural", 
        rate = "+0%", 
        pitch = "+0Hz", 
        volume = "+0%",
        apiKey = ""
      } = req.body;

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Text tidak boleh kosong" });
      }

      const speechmaKey = apiKey || req.headers["x-speechma-key"] || process.env.SPEECHMA_API_KEY;

      // 1. If Speechma API key is provided, try Speechma Cloud API first
      if (speechmaKey) {
        try {
          const speechmaRes = await fetch("https://speechma.com/api/v1/tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": speechmaKey as string,
            },
            body: JSON.stringify({
              text: text.trim(),
              voice,
            }),
          });

          if (speechmaRes.ok) {
            const buffer = await speechmaRes.arrayBuffer();
            res.set({
              "Content-Type": "audio/mpeg",
              "Content-Length": buffer.byteLength.toString(),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=3600",
            });
            return res.end(Buffer.from(buffer));
          } else {
            console.warn("Speechma Cloud API returned non-200, falling back to Neural engine.");
          }
        } catch (speechmaErr) {
          console.warn("Speechma Cloud API error, falling back:", speechmaErr);
        }
      }

      // 2. Transform user-friendly pause tags to SSML break tags
      let processedText = text.trim()
        .replace(/\[jeda(?:\s*panjang|\s*1s)?\]/gi, '<break time="1000ms"/>')
        .replace(/\[jeda(?:\s*dramatis)?\]/gi, '<break time="800ms"/>')
        .replace(/\[jeda(?:\s*singkat|\s*0\.5s)?\]/gi, '<break time="500ms"/>')
        .replace(/\[napas\]/gi, ', ');

      // 3. High-Quality Neural TTS Engine with automatic retry and graceful fallback
      const combinedAudio = await synthesizeVoiceWithFallback(
        processedText,
        voice,
        rate,
        pitch,
        volume
      );

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": combinedAudio.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      });

      return res.end(combinedAudio);
    } catch (err: any) {
      console.error("TTS Server Error:", err);
      return res.status(500).json({ error: err.message || "Gagal membuat audio TTS" });
    }
  });

  // API Route: AI Script Generator
  app.post("/api/ai-script", async (req, res) => {
    try {
      const { topic = "cerita lucu singkat" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Buatkan naskah/script singkat yang santai, menarik, atau lucu untuk konten voiceover media sosial (TikTok / Reels / Shorts) dengan topik: "${topic}". Gunakan gaya bahasa Indonesia gaul/santai. Maksimal 3-4 kalimat (di bawah 300 karakter). Tulis langsung isi naskahnya saja tanpa pengantar atau tanda kutip.`,
        });
        const script = response.text?.trim() || "";
        return res.json({ script });
      }

      // Fallback script if no API key
      const fallbackScripts = [
        "Halo semuanya! Hari ini aku mau cerita sedikit tentang hal absurd yang baru aja kejadian. Kalian pernah nggak sih ngalamin hal yang sama?",
        "Tips simpel buat kalian yang suka overthinking: tarik napas dalam-dalam, hembuskan, lalu tidur. Jangan lupa minum air putih ya!",
        "Kenyataan hidup itu lucu ya: pas ada waktu nggak ada uang, pas ada uang nggak ada waktu, pas ada dua-duanya malah mager!",
      ];
      const random = fallbackScripts[Math.floor(Math.random() * fallbackScripts.length)];
      return res.json({ script: random });
    } catch (err: any) {
      console.error("AI Script Server Error:", err);
      return res.json({
        script: "Halo semuanya! Selamat datang di konten hari ini. Jangan lupa like, comment, dan share ya!",
      });
    }
  });

  // API Route: AI Intonation & Punctuation Enhancer
  app.post("/api/ai-intonate", async (req, res) => {
    try {
      const { text = "", style = "dramatic" } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Text tidak boleh kosong" });
      }

      const styleDescriptions: Record<string, string> = {
        dramatic: "Dramatis, menegangkan, ala narator alur cerita / recap anime & film. Berikan jeda menegangkan dan intonasi tegas.",
        casual: "Santai, luwes, dan mengalir natural ala percakapan sehari-hari atau podcast.",
        excited: "Antusias, energik, bersemangat tinggi ala konten kreator TikTok/Reels.",
        story: "Hangat, mendalam, dan emosional ala pembacaan novel atau dongeng.",
      };

      const selectedStyleDesc = styleDescriptions[style] || styleDescriptions.dramatic;
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Kamu adalah audio director dan voiceover script enhancer profesional.
Tugasmu: poles dan beri intonasi pada teks naskah berikut agar saat dibacakan oleh AI Text-to-Speech (TTS) suaranya terdengar HIDUP, BERINTONASI DINAMIS, TIDAK KAKU, dan TIDAK MONOTON.

GAYA: ${selectedStyleDesc}

Aturan polesan intonasi:
1. Sisipkan koma (,) pada jeda napas klausa agar tidak terbaca datar atau ngos-ngosan.
2. Sisipkan titik tiga (...) atau tag [jeda dramatis] sebelum kata kunci/plot twist penting.
3. Sisipkan tanda seru (!) pada kata seruan, aksi, atau kejutan.
4. Kamu boleh menyisipkan tag jeda: [jeda singkat] (0.5s) atau [jeda dramatis] (0.8s) di antara kalimat penting.
5. Pertahankan kalimat dan maksud asli dari penulis, jangan kurangi fakta atau mengubah inti cerita.
6. HANYA cetak hasil naskah yang sudah dipoles, TANPA pembuka/penutup, TANPA tanda kutip di awal/akhir.

Naskah Asli:
${text.trim()}`,
          });

          const enhanced = response.text?.trim();
          if (enhanced && enhanced.length > 5) {
            return res.json({ enhancedText: enhanced });
          }
        } catch (geminiErr) {
          console.warn("Gemini AI Intonation failed, using heuristic enhancer:", geminiErr);
        }
      }

      // Fallback: Intelligent heuristic intonation formatter
      let enhanced = text.trim();
      const connectors = [
        'tiba-tiba', 'namun', 'ketika', 'setelah itu', 'alhasil',
        'secara mengejutkan', 'padahal', 'ternyata', 'bahkan', 'sementara itu'
      ];
      for (const c of connectors) {
        const reg = new RegExp(`(\\s)(${c})(\\s)(?![,...])`, 'gi');
        enhanced = enhanced.replace(reg, '$1$2,$3');
      }

      if (style === 'dramatic') {
        enhanced = enhanced.replace(/\.\s+/g, '. [jeda dramatis] ');
        enhanced = enhanced.replace(/(\b)(mendadak|tiba-tiba|secara mengejutkan|terkejut|panik)(\b)/gi, '... $1$2$3');
      } else if (style === 'excited') {
        enhanced = enhanced.replace(/\.\s+/g, '! [jeda singkat] ');
        if (!enhanced.endsWith('!')) enhanced += '!';
      } else {
        enhanced = enhanced.replace(/\.\s+/g, '. [jeda singkat] ');
      }

      return res.json({ enhancedText: enhanced });
    } catch (err: any) {
      console.error("AI Intonate Error:", err);
      return res.status(500).json({ error: "Gagal memproses intonasi teks" });
    }
  });

  // Colab Pairing Storage (In-Memory with 24hr expiry)
  interface ColabPairingSession {
    code: string;
    colabUrl: string;
    createdAt: number;
    lastActive: number;
  }
  const colabPairings = new Map<string, ColabPairingSession>();

  // API Route: Register Colab URL and get 4-digit pairing code
  app.post("/api/colab/register", (req, res) => {
    try {
      const { url, code: customCode } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ ok: false, error: "URL Colab wajib disertakan" });
      }

      let cleanUrl = url.trim().replace(/\/+$/, "");
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
      }

      let code = customCode ? String(customCode).trim().toUpperCase() : "";
      if (!code) {
        // Generate random 4-digit code e.g. 7429
        let attempts = 0;
        do {
          code = Math.floor(1000 + Math.random() * 9000).toString();
          attempts++;
        } while (colabPairings.has(code) && attempts < 100);
      }

      const session: ColabPairingSession = {
        code,
        colabUrl: cleanUrl,
        createdAt: Date.now(),
        lastActive: Date.now(),
      };

      colabPairings.set(code, session);
      console.log(`[Colab Pairing] Registered code ${code} -> ${cleanUrl}`);

      return res.json({
        ok: true,
        code,
        colabUrl: cleanUrl,
        message: `Berhasil didaftarkan! Gunakan kode akses: ${code}`,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // API Route: Lookup Colab URL by Pairing Code
  app.post("/api/colab/lookup", (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ ok: false, error: "Kode akses wajib diisi" });
      }

      const cleanCode = String(code).trim().toUpperCase();
      const session = colabPairings.get(cleanCode);

      if (!session) {
        return res.status(404).json({
          ok: false,
          error: `Kode akses "${cleanCode}" tidak ditemukan atau Colab belum aktif. Pastikan sel Google Colab sudah dijalankan dan menampilkan kode tersebut.`,
        });
      }

      session.lastActive = Date.now();
      return res.json({
        ok: true,
        code: session.code,
        colabUrl: session.colabUrl,
        message: "Koneksi ke Google Colab berhasil terverifikasi!",
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // API Route: Check Colab GPU Health (Supports Gradio & REST)
  app.post("/api/colab/health", async (req, res) => {
    try {
      let { colabUrl } = req.body;
      if (!colabUrl || typeof colabUrl !== "string") {
        return res.status(400).json({ ok: false, error: "URL Colab wajib diisi" });
      }
      colabUrl = colabUrl.trim().replace(/\/+$/, "");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      try {
        // Check Gradio config first (standard for Gradio apps like OmniVoice)
        const checkConfig = await fetch(`${colabUrl}/config`, {
          method: "GET",
          signal: controller.signal,
        });

        if (checkConfig.ok) {
          clearTimeout(timeout);
          const configData = await checkConfig.json().catch(() => ({}));
          return res.json({ 
            ok: true, 
            message: "Colab OmniVoice (Gradio) Terhubung Aktif!", 
            type: "gradio",
            info: configData 
          });
        }

        // Check health endpoint
        const checkRes = await fetch(`${colabUrl}/health`, {
          method: "GET",
          signal: controller.signal,
        });

        if (checkRes.ok) {
          clearTimeout(timeout);
          const data = await checkRes.json().catch(() => ({}));
          return res.json({ ok: true, message: "Colab GPU terhubung!", info: data });
        }

        // Fallback to root /
        const checkRoot = await fetch(`${colabUrl}/`, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (checkRoot.ok || checkRoot.status === 200 || checkRoot.status === 404 || checkRoot.status === 405) {
          return res.json({ ok: true, message: "Colab Server terdeteksi aktif!" });
        }
      } catch (err: any) {
        clearTimeout(timeout);
        return res.status(502).json({ ok: false, error: "Gagal terhubung ke Colab: " + (err.message || "Timeout / Offline") });
      }

      return res.status(502).json({ ok: false, error: "Colab tidak merespons. Pastikan Colab sedang RUNNING dan URL benar." });
    } catch (err: any) {
      return res.status(502).json({ ok: false, error: "Gagal cek Colab: " + (err.message || "Error") });
    }
  });

  // API Route: Generate Voice via Colab OmniVoice / Gradio / REST
  app.post("/api/colab/generate", async (req, res) => {
    try {
      let { colabUrl, text, audioBase64, language = "id", speed = 1.0 } = req.body;
      if (!colabUrl || !text) {
        return res.status(400).json({ error: "colabUrl dan text wajib diisi" });
      }
      colabUrl = colabUrl.trim().replace(/\/+$/, "");

      let rawBuffer: Buffer | null = null;

      // Prepare audio buffer from base64 if available
      let audioBuffer: Buffer | null = null;
      if (audioBase64) {
        const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
        audioBuffer = Buffer.from(cleanBase64, "base64");
      }

      // 1. Try Direct REST endpoints if Colab has custom route (/api/custom_clone, /clone, /clone_voice)
      const restEndpoints = ["/api/custom_clone", "/clone", "/clone_voice"];
      for (const ep of restEndpoints) {
        if (rawBuffer) break;
        try {
          const colabRes = await fetch(`${colabUrl}${ep}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              audio_base64: audioBase64,
              language: language || "id",
              speed: Number(speed) || 1.0,
            }),
          });

          if (colabRes.ok) {
            rawBuffer = Buffer.from(await colabRes.arrayBuffer());
            break;
          }
        } catch (e) {
          // Try next endpoint
        }
      }

      // 2. If REST /clone wasn't available, use Gradio OmniVoice Protocol
      if (!rawBuffer) {
        if (!audioBuffer) {
          return res.status(400).json({ error: "File audio rekaman suara wajib disertakan untuk kloning suara." });
        }

        // Upload reference audio to Gradio /upload
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: "audio/wav" });
        formData.append("files", blob, "reference_voice.wav");

        const uploadRes = await fetch(`${colabUrl}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errUpload = await uploadRes.text().catch(() => "");
          return res.status(502).json({ error: `Gagal upload audio referensi ke Gradio: ${errUpload}` });
        }

        const uploadJson: any = await uploadRes.json();
        const uploadedPath = Array.isArray(uploadJson) ? uploadJson[0] : uploadJson?.files?.[0] || uploadJson;

        // Determine Gradio API details
        let apiName = "predict";
        let fnIndex = 0;
        try {
          const configRes = await fetch(`${colabUrl}/config`);
          if (configRes.ok) {
            const config = await configRes.json();
            if (config.dependencies && config.dependencies.length > 0) {
              fnIndex = config.dependencies[0].id ?? 0;
              apiName = config.dependencies[0].api_name ?? "predict";
            }
          }
        } catch (e) {}

        const payloadData = [
          text.trim(),
          { path: uploadedPath, orig_name: "reference_voice.wav", meta: { _type: "gradio.FileData" } },
          Number(speed) || 1.0
        ];

        let audioResultUrl: string | null = null;

        // Try /gradio_api/call/${apiName}
        try {
          const callRes = await fetch(`${colabUrl}/gradio_api/call/${apiName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: payloadData }),
          });

          if (callRes.ok) {
            const callData: any = await callRes.json();
            const eventId = callData.event_id;
            if (eventId) {
              const sseRes = await fetch(`${colabUrl}/gradio_api/call/${apiName}/${eventId}`);
              const sseText = await sseRes.text();
              const lines = sseText.split("\n");
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  try {
                    const parsed = JSON.parse(line.slice(5).trim());
                    if (Array.isArray(parsed) && parsed[0]) {
                      const outAudioObj = parsed[0];
                      audioResultUrl = typeof outAudioObj === "string" ? outAudioObj : outAudioObj.url || outAudioObj.path;
                    }
                  } catch (e) {}
                }
              }
            }
          }
        } catch (e) {}

        // Fallback to /api/predict or /run/predict
        if (!audioResultUrl) {
          const directRes = await fetch(`${colabUrl}/api/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fn_index: fnIndex,
              data: payloadData,
            }),
          });

          if (directRes.ok) {
            const directData: any = await directRes.json();
            if (directData.data && Array.isArray(directData.data) && directData.data[0]) {
              const outObj = directData.data[0];
              audioResultUrl = typeof outObj === "string" ? outObj : outObj.url || outObj.path;
            }
          }
        }

        if (!audioResultUrl) {
          return res.status(502).json({ error: "Model OmniVoice di Colab tidak mengembalikan file audio. Periksa log terminal di Colab." });
        }

        let finalFetchUrl = audioResultUrl;
        if (finalFetchUrl.startsWith("/")) {
          finalFetchUrl = `${colabUrl}${finalFetchUrl}`;
        } else if (!finalFetchUrl.startsWith("http")) {
          finalFetchUrl = `${colabUrl}/file=${finalFetchUrl}`;
        }

        const audioFetch = await fetch(finalFetchUrl);
        if (!audioFetch.ok) {
          return res.status(502).json({ error: `Gagal mengunduh audio hasil kloning dari Colab (${audioFetch.status})` });
        }

        rawBuffer = Buffer.from(await audioFetch.arrayBuffer());
      }

      if (!rawBuffer || rawBuffer.length === 0) {
        return res.status(500).json({ error: "Buffer audio kosong dari Colab" });
      }

      // Convert to standardized, crisp MP3 using ffmpeg
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aniclone-colab-"));
      const inAudio = path.join(tempDir, "input_audio");
      const outMp3 = path.join(tempDir, "output.mp3");

      fs.writeFileSync(inAudio, rawBuffer);

      await new Promise((resolve) => {
        execFile("ffmpeg", ["-y", "-i", inAudio, "-c:a", "libmp3lame", "-b:a", "192k", outMp3], (err) => {
          if (err) {
            console.warn("Colab MP3 conversion warning, returning raw buffer:", err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });

      let finalBuffer = rawBuffer;
      let contentType = "audio/wav";
      if (fs.existsSync(outMp3)) {
        finalBuffer = fs.readFileSync(outMp3);
        contentType = "audio/mpeg";
      }

      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}

      res.set({
        "Content-Type": contentType,
        "Content-Length": finalBuffer.length.toString(),
        "Content-Disposition": 'inline; filename="cloned_voice.mp3"',
      });
      return res.end(finalBuffer);
    } catch (err: any) {
      console.error("Colab Proxy Error:", err);
      return res.status(500).json({ error: "Gagal memproses ke Colab: " + err.message });
    }
  });

  // API Route: Merge Multiple Audio Segments into 1 Single Seamless MP3
  app.post("/api/audio/merge", async (req, res) => {
    try {
      const { audioSegments } = req.body;
      if (!audioSegments || !Array.isArray(audioSegments) || audioSegments.length === 0) {
        return res.status(400).json({ error: "audioSegments array wajib diisi minimal 1 segmen" });
      }

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aniclone-merge-"));
      const fileListPath = path.join(tempDir, "concat_list.txt");
      const outputMp3Path = path.join(tempDir, "merged_aniclone.mp3");

      const fileEntries: string[] = [];

      for (let i = 0; i < audioSegments.length; i++) {
        const segData = audioSegments[i];
        let buffer: Buffer;

        if (typeof segData === "string" && segData.startsWith("data:")) {
          const base64Data = segData.split(",")[1];
          buffer = Buffer.from(base64Data, "base64");
        } else if (typeof segData === "string" && segData.startsWith("http")) {
          const fetchRes = await fetch(segData);
          buffer = Buffer.from(await fetchRes.arrayBuffer());
        } else if (typeof segData === "string") {
          buffer = Buffer.from(segData, "base64");
        } else {
          continue;
        }

        const rawSegFile = path.join(tempDir, `raw_${i}.audio`);
        const stdWavFile = path.join(tempDir, `norm_${i}.wav`);
        fs.writeFileSync(rawSegFile, buffer);

        // Standardize each segment to 24000Hz mono WAV so concat is 100% glitch-free
        await new Promise((resolve, reject) => {
          execFile(
            "ffmpeg",
            ["-y", "-i", rawSegFile, "-ar", "24000", "-ac", "1", stdWavFile],
            (err) => {
              if (err) {
                console.error(`Failed to standardize segment ${i}:`, err);
                reject(err);
              } else {
                resolve(true);
              }
            }
          );
        });

        fileEntries.push(`file '${stdWavFile}'`);
      }

      if (fileEntries.length === 0) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return res.status(400).json({ error: "Tidak ada segmen audio valid yang dapat diproses" });
      }

      // Write concat list
      fs.writeFileSync(fileListPath, fileEntries.join("\n"));

      // Concatenate and re-encode to high quality MP3 (192kbps)
      await new Promise((resolve, reject) => {
        execFile(
          "ffmpeg",
          [
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", fileListPath,
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            outputMp3Path,
          ],
          (err) => {
            if (err) {
              console.error("FFmpeg concat error:", err);
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      });

      const mergedBuffer = fs.readFileSync(outputMp3Path);

      // Clean up temp dir
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": mergedBuffer.length.toString(),
        "Content-Disposition": 'attachment; filename="aniclone-gabungan-lengkap.mp3"',
      });
      return res.end(mergedBuffer);
    } catch (err: any) {
      console.error("Audio Merge API Error:", err);
      return res.status(500).json({ error: "Gagal menggabungkan audio: " + err.message });
    }
  });

  // API Route: MiniMax TTS & Voice Clone
  app.post("/api/minimax/tts", async (req, res) => {
    try {
      const { 
        apiKey, 
        groupId, 
        text, 
        voiceId = "male-qn-qingse", 
        speed = 1.0, 
        vol = 1.0, 
        pitch = 0 
      } = req.body;

      if (!apiKey || !groupId) {
        return res.status(400).json({ error: "MiniMax API Key dan Group ID wajib diisi" });
      }
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Teks tidak boleh kosong" });
      }

      const miniRes = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "speech-01-turbo",
          text: text.trim(),
          stream: false,
          voice_setting: {
            voice_id: voiceId,
            speed: Number(speed) || 1.0,
            vol: Number(vol) || 1.0,
            pitch: Number(pitch) || 0,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: "mp3",
            channel: 1,
          },
        }),
      });

      const data: any = await miniRes.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
        return res.status(400).json({ error: data.base_resp.status_msg || "MiniMax API error" });
      }

      if (data.data?.audio) {
        const audioBuffer = Buffer.from(data.data.audio, "hex");
        res.set({
          "Content-Type": "audio/mpeg",
          "Content-Length": audioBuffer.length.toString(),
        });
        return res.end(audioBuffer);
      }

      return res.status(500).json({ error: "Audio tidak ditemukan dari respons MiniMax" });
    } catch (err: any) {
      console.error("MiniMax TTS Error:", err);
      return res.status(500).json({ error: "Gagal memproses MiniMax TTS: " + err.message });
    }
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
