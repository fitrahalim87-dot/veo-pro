import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ExternalLink, 
  Code, 
  Copy, 
  Check, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  FolderDown, 
  Upload, 
  Cpu, 
  ArrowRight,
  ClipboardPaste,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  KeyRound,
  X,
  Play,
  Volume2,
  Mic,
  AlertCircle,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onSaveToHistory: (item: { name: string; url: string; voiceName: string }) => void;
}

const COLAB_NOTEBOOK_URL = "https://colab.research.google.com/drive/1ll6P5bU4ExOsdtd6KPetYh7umWnvT31G";

export const ORIGINAL_COLAB_CODE = `#@title 🎙️ Voice Gen (Klik Play di Sini) { display-mode: "form" }
import sys
import os
import warnings
import logging
import io
import re
import random
import time
import requests
import numpy as np
import torch

warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

# 1. Install library
get_ipython().system('pip install -q omnivoice pycloudflared requests > /dev/null 2>&1')

from omnivoice import OmniVoice, OmniVoiceGenerationConfig
from omnivoice.utils.common import get_best_device
from omnivoice.utils.lang_map import LANG_NAMES, lang_display_name
import gradio as gr

print("\\n⏳ Sedang memuat model OmniVoice ke GPU Colab (~1 menit)...")

# 2. Muat Model AI
device = get_best_device()
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=device, dtype=torch.float16, load_asr=True)
sampling_rate = model.sampling_rate

# 3. Buat Tunnel Cloudflare (jika tersedia)
public_url = None
try:
    from pycloudflared import try_cloudflare
    tunnel = try_cloudflare(port=7860)
    public_url = getattr(tunnel, 'tunnel', getattr(tunnel, 'tunnel_url', getattr(tunnel, 'url', str(tunnel))))
except Exception as e:
    public_url = None

# 4. TAMPILKAN LINK DI LAYAR
print("\\n" + "="*60)
print("🎉 BERHASIL DIAKTIFKAN! SALIN LINK BERIKUT:")
if public_url:
    print(f"👉 Link Cloudflare: {public_url}")
print("👉 Link Gradio Live: (lihat 'Running on public URL' di bawah)")
print("="*60 + "\\n")

# 5. Core Generator
def clone_voice(text, ref_audio, speed=1.0):
    if not text or not text.strip():
        return None, "Silakan ketik naskah teks."
    if not ref_audio:
        return None, "Silakan upload rekaman suaramu."

    gen_config = OmniVoiceGenerationConfig(
        num_step=32,
        guidance_scale=2.0,
        denoise=True,
        preprocess_prompt=True,
        postprocess_output=True
    )
    prompt = model.create_voice_clone_prompt(ref_audio=ref_audio)
    audio = model.generate(text=text.strip(), voice_clone_prompt=prompt, generation_config=gen_config, speed=float(speed))
    waveform = (audio[0] * 32767).astype(np.int16)
    return (sampling_rate, waveform), "Selesai!"

with gr.Blocks(title="Voice Gen Gratis - 100% Suaramu") as demo:
    gr.Markdown("## 🎙️ Voice Clone Studio (100% Suara Aslimu)")
    with gr.Row():
        with gr.Column():
            txt = gr.Textbox(label="Naskah Teks", lines=4, placeholder="Ketik naskah di sini...")
            aud = gr.Audio(label="Rekaman Suaramu (Upload File Audio)", type="filepath")
            spd = gr.Slider(0.5, 1.5, value=1.0, step=0.05, label="Kecepatan")
            btn = gr.Button("Generate Voice Clone 🚀", variant="primary")
        with gr.Column():
            out_aud = gr.Audio(label="Hasil Kloning Suaramu")
            out_status = gr.Textbox(label="Status", value="Siap memproses.")

    btn.click(clone_voice, inputs=[txt, aud, spd], outputs=[out_aud, out_status])

# Aktifkan share=True agar menghasilkan link resmi Gradio yang lancar di embed maupun mobile
demo.queue().launch(server_name="0.0.0.0", server_port=7860, share=True, inline=False)`;

export const VoiceCloneStudioTab: React.FC<Props> = ({ onSaveToHistory }) => {
  // Connection state
  const [colabUrl, setColabUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Foreground modal visibility ("Selamat Datang!")
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  
  // Iframe states
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [iframeTimeoutWarning, setIframeTimeoutWarning] = useState(false);
  
  // Code & helpers
  const [showCodeDetails, setShowCodeDetails] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Audio history save helper
  const [importedAudioUrl, setImportedAudioUrl] = useState<string | null>(null);
  const [importedAudioName, setImportedAudioName] = useState('Hasil Kloning OmniVoice');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load last saved url on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aniki_colab_url');
      if (saved) {
        setSavedUrl(saved);
        setInputUrl(saved);
        setColabUrl(saved);
        // Show welcome modal initially so user sees it right away as requested
        setShowWelcomeModal(true);
      }
    } catch {
      // ignore localStorage restriction
    }
  }, []);

  // Timer to check if iframe is taking too long
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isIframeLoading && colabUrl) {
      setIframeTimeoutWarning(false);
      timer = setTimeout(() => {
        setIframeTimeoutWarning(true);
      }, 7000);
    } else {
      setIframeTimeoutWarning(false);
    }
    return () => clearTimeout(timer);
  }, [isIframeLoading, colabUrl]);

  // Clean URL parser that handles emojis, copy-paste prefixes, and spaces
  const formatUrl = (raw: string) => {
    if (!raw) return '';
    const trimmed = raw.trim();
    // Regex extract http or https URL
    const match = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
    let clean = match ? match[0] : trimmed;
    
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean.replace(/\/+$/, '');
  };

  const handleConnect = (targetUrl?: string) => {
    const rawToUse = targetUrl || inputUrl;
    const formatted = formatUrl(rawToUse);

    if (!formatted) {
      setUrlError('Silakan masukkan link Gradio atau Cloudflare dari Google Colab.');
      return;
    }

    // Check if user accidentally pasted the Google Colab Notebook URL
    if (formatted.includes('colab.research.google.com')) {
      setUrlError('Perhatian: Ini adalah link lembar Google Colab. Buka tab Colab, jalankan sel notebook-nya, lalu salin link berakhiran .gradio.live atau .trycloudflare.com yang muncul di teks output.');
      return;
    }

    setUrlError(null);
    setColabUrl(formatted);
    try {
      localStorage.setItem('aniki_colab_url', formatted);
    } catch {
      // ignore
    }
    setSavedUrl(formatted);
    setShowWelcomeModal(false);
    setIsIframeLoading(true);
    setIframeKey(k => k + 1);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const parsed = formatUrl(text);
          setInputUrl(parsed || text.trim());
          setUrlError(null);
        }
      }
    } catch {
      // Clipboard permission denied
    }
  };

  const handleCopyOriginalCode = () => {
    navigator.clipboard.writeText(ORIGINAL_COLAB_CODE);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleImportAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (importedAudioUrl) URL.revokeObjectURL(importedAudioUrl);
    const url = URL.createObjectURL(file);
    setImportedAudioUrl(url);
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    setImportedAudioName(cleanName || 'Hasil Kloning OmniVoice');
    setSaveSuccessMsg(null);
  };

  const handleSaveToHistory = () => {
    if (!importedAudioUrl) return;
    onSaveToHistory({
      name: importedAudioName.trim() || 'Hasil Kloning OmniVoice',
      url: importedAudioUrl,
      voiceName: 'Kloning Pribadi (Colab OmniVoice)'
    });
    setSaveSuccessMsg('Audio berhasil disimpan ke Riwayat!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Top Bar Controls (Status & Actions) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowWelcomeModal(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 border border-emerald-200 shadow-xs"
            title="Buka kembali popup input link akses"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>{colabUrl ? 'Ganti Link Akses' : 'Masukkan Link Akses'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colabUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs font-black text-slate-800 hidden sm:inline">
              {colabUrl ? 'Colab Gradio Terhubung' : 'Menunggu Link Akses'}
            </span>
            {colabUrl && (
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-xs sm:max-w-md">
                {colabUrl}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {colabUrl && (
            <button
              type="button"
              onClick={() => {
                setIsIframeLoading(true);
                setIframeKey(k => k + 1);
              }}
              className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              title="Muat ulang tampilan Gradio"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isIframeLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reload</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            title={isFullscreen ? "Keluar dari Layar Penuh" : "Tampilan Layar Penuh"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Kecilkan" : "Layar Penuh"}</span>
          </button>

          <a
            href={colabUrl || COLAB_NOTEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            title="Buka link langsung di tab peramban baru"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{colabUrl ? "Buka Tab Baru 🚀" : "Buka Google Colab"}</span>
          </a>
        </div>
      </div>

      {/* Helper Banner jika Iframe memakan waktu lama atau ditolak oleh browser */}
      {iframeTimeoutWarning && colabUrl && !showWelcomeModal && (
        <motion.div 
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Tampilan Gradio belum muncul atau menolak terhubung?</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Sebagian peramban/jaringan Cloudflare membatasi tampilan di dalam frame. Anda bisa membuka studio langsung tanpa hambatan:
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={colabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 text-xs shadow-xs"
            >
              <span>Buka di Tab Baru (100% Lancar)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => {
                setIsIframeLoading(true);
                setIframeKey(k => k + 1);
              }}
              className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 font-bold rounded-xl transition-colors shrink-0 text-xs"
            >
              Muat Ulang
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: LATAR BELAKANG (COLAB GRADIO) + LATAR DEPAN (MODAL CARD) */}
      {/* ========================================================================= */}
      <div 
        className={`rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden bg-white relative transition-all ${
          isFullscreen 
            ? 'fixed inset-2 z-50 h-[calc(100vh-16px)] rounded-2xl border-emerald-500' 
            : 'relative w-full min-h-[750px] sm:min-h-[820px]'
        }`}
      >
        {isFullscreen && (
          <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-lg"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Keluar Layar Penuh</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 1. LATAR BELAKANG: COLAB GRADIO (LIVE ATAU SIMULASI) */}
        {/* ---------------------------------------------------- */}
        <div className="w-full h-full min-h-[750px] sm:min-h-[820px] bg-slate-50 flex flex-col">
          {colabUrl ? (
            <div className="relative w-full h-full min-h-[750px] sm:min-h-[820px]">
              {isIframeLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                    <span className="text-xs font-bold text-slate-700">Memuat Gradio OmniVoice...</span>
                  </div>
                </div>
              )}
              <iframe
                key={iframeKey}
                src={colabUrl}
                title="Studio Gradio OmniVoice Colab"
                onLoad={() => setIsIframeLoading(false)}
                className="w-full h-full min-h-[750px] sm:min-h-[820px] border-none bg-white"
                allow="microphone; camera; autoplay; clipboard-write; display-capture; fullscreen"
              />
            </div>
          ) : (
            /* Gradio OmniVoice Background Mockup (menampilkan interface Gradio asli di latar belakang) */
            <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full select-none pointer-events-none opacity-80">
              {/* Gradio Top Header */}
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <span>🎙️</span>
                    <span>Voice Clone Studio (100% Suara Aslimu)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Powered by OmniVoice k2-fsa &bull; Gradio 4.x Python Interface
                  </p>
                </div>
                <div className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg border border-orange-200">
                  Gradio Server
                </div>
              </div>

              {/* 2-Column Gradio Block Interface */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolom Kiri: Input */}
                <div className="space-y-5 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Naskah Teks</label>
                    <div className="w-full h-28 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-400 font-mono">
                      Ketik naskah di sini...
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Rekaman Suaramu (Upload File Audio)</label>
                    <div className="w-full h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                      <Mic className="w-6 h-6 text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium">Drop Audio Here or Click to Upload</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Kecepatan</span>
                      <span className="font-mono text-emerald-600">1.0</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-lg relative">
                      <div className="w-1/2 h-2 bg-emerald-500 rounded-lg" />
                      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-600 rounded-full shadow-md" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.5</span>
                      <span>1.0</span>
                      <span>1.5</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-3 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Generate Voice Clone 🚀</span>
                  </button>
                </div>

                {/* Kolom Kanan: Output */}
                <div className="space-y-5 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Hasil Kloning Suaramu</label>
                    <div className="w-full h-32 bg-slate-100 rounded-xl p-4 flex flex-col justify-center gap-2 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center">
                          <Play className="w-4 h-4 text-slate-600 ml-0.5" />
                        </div>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full" />
                        <span className="text-[11px] font-mono text-slate-500">0:00 / 0:00</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    <label className="text-xs font-bold text-slate-700">Status</label>
                    <div className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600">
                      Siap memproses.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* 2. LATAR DEPAN: MODAL CARD DARI GAMBAR PERTAMA ("Selamat Datang!")       */}
        {/* ----------------------------------------------------------------------- */}
        <AnimatePresence>
          {showWelcomeModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 backdrop-blur-[2px]"
            >
              <motion.div 
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-emerald-500/40 p-6 sm:p-8 space-y-5 relative overflow-hidden"
              >
                {/* Decorative Subtle Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />
                
                {/* Tombol Tutup jika sudah pernah connect */}
                {colabUrl && (
                  <button
                    type="button"
                    onClick={() => setShowWelcomeModal(false)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
                    title="Tutup & Kembali ke Studio Gradio"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Judul: Selamat Datang! */}
                <div className="text-center space-y-1.5 pt-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-1 border border-emerald-200/60 shadow-xs">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                    Selamat Datang!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Masukkan Link Gradio dari Google Colab untuk mengakses Studio Kloning Suara
                  </p>
                </div>

                {/* Kolom Input dengan Border Hijau Menonjol & Tombol TEMPEL LINK (Sesuai Gambar User) */}
                <div className="space-y-2 pt-2">
                  <div className="relative rounded-2xl border-2 border-emerald-500 bg-white shadow-xs focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all">
                    <div className="flex items-center px-3 py-2">
                      <div className="pl-1 pr-2 text-emerald-600 shrink-0">
                        <KeyRound className="w-5 h-5" />
                      </div>

                      <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => {
                          setInputUrl(e.target.value);
                          setUrlError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                        placeholder="https://xxxx.trycloudflare.com atau .gradio.live"
                        className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none font-mono py-2"
                        autoFocus
                      />

                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-[11px] sm:text-xs rounded-xl uppercase tracking-wider transition-all shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Tempel Link</span>
                      </button>
                    </div>
                  </div>

                  {urlError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div className="leading-relaxed">{urlError}</div>
                    </motion.div>
                  )}

                  {/* Pintasan Link Tersimpan */}
                  {savedUrl && savedUrl !== inputUrl && (
                    <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                      <span className="text-slate-500">Pernah dipakai:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setInputUrl(savedUrl);
                          handleConnect(savedUrl);
                        }}
                        className="text-emerald-700 hover:text-emerald-900 font-mono font-bold underline truncate max-w-[240px]"
                      >
                        {savedUrl} &rarr; Pakai
                      </button>
                    </div>
                  )}
                </div>

                {/* Tombol Utama: Masuk ke Tool (Sesuai Gambar User) */}
                <button
                  type="button"
                  onClick={() => handleConnect()}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-sm sm:text-base font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Masuk ke Tool</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Tautan Pembantu Sesuai Gambar: "Tidak muncul tab baru? Klik Disini" & Salin Script */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <a
                    href={COLAB_NOTEBOOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-emerald-700 font-medium flex items-center gap-1.5 group transition-colors"
                  >
                    <span>Tidak muncul tab baru?</span>
                    <span className="text-emerald-600 font-bold underline group-hover:text-emerald-800 flex items-center gap-0.5">
                      Klik Disini
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyOriginalCode}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center gap-1.5 text-[11px]"
                  >
                    {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{codeCopied ? 'Script Disalin!' : 'Salin Kode Colab'}</span>
                  </button>
                </div>

                {/* Accordion Lihat Kode Python Asli */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCodeDetails(!showCodeDetails)}
                    className="w-full py-2 px-3 text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showCodeDetails ? 'Sembunyikan Kode Python Colab' : 'Lihat Kode Python Colab Lengkap'}</span>
                    {showCodeDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showCodeDetails && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-2 p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl overflow-hidden border border-slate-800 space-y-2"
                    >
                      <div className="flex justify-between items-center text-slate-400 pb-1 border-b border-slate-800">
                        <span>Script OmniVoice Colab:</span>
                        <button 
                          type="button" 
                          onClick={handleCopyOriginalCode}
                          className="text-emerald-400 hover:underline font-bold"
                        >
                          Salin
                        </button>
                      </div>
                      <pre className="max-h-40 overflow-y-auto leading-relaxed select-all">
                        {ORIGINAL_COLAB_CODE}
                      </pre>
                    </motion.div>
                  )}
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. SIMPAN HASIL KE RIWAYAT AUDIO APLIKASI            */}
      {/* ---------------------------------------------------- */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FolderDown className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Simpan Hasil Kloning ke Riwayat Aplikasi
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Download file dari studio Gradio di atas &rarr; unggah di sini agar tersimpan rapi di tab Riwayat.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="relative">
            <input
              type="file"
              accept="audio/*"
              onChange={handleImportAudio}
              id="colab-import-audio"
              className="hidden"
            />
            <label
              htmlFor="colab-import-audio"
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{importedAudioUrl ? 'Ganti File Audio' : 'Pilih File Hasil Gradio (.wav/.mp3)'}</span>
            </label>
          </div>

          <div>
            <input
              type="text"
              value={importedAudioName}
              onChange={(e) => setImportedAudioName(e.target.value)}
              placeholder="Nama rekaman/kloning..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-500 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveToHistory}
            disabled={!importedAudioUrl}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              importedAudioUrl
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span>Simpan ke Riwayat</span>
          </button>
        </div>

        {saveSuccessMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </motion.div>
        )}
      </div>

    </div>
  );
};
