import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Mic, 
  Square, 
  Upload, 
  Download, 
  RefreshCw,
  Cpu,
  FileAudio,
  Maximize2,
  Minimize2,
  Tv,
  HelpCircle,
  FolderDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { checkColabHealth, generateColabVoiceClone, blobToBase64 } from '../services/ttsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveToHistory: (item: { name: string; url: string; voiceName: string }) => void;
}

const COLAB_NOTEBOOK_URL = "https://colab.research.google.com/drive/1ll6P5bU4ExOsdtd6KPetYh7umWnvT31G";

export const VoiceCloneModal: React.FC<Props> = ({ isOpen, onClose, onSaveToHistory }) => {
  const [activeTab, setActiveTab] = useState<'embed' | 'api'>('embed');
  const [colabUrl, setColabUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [iframeKey, setIframeKey] = useState<number>(0);

  // Quick save from embed
  const [importedAudioUrl, setImportedAudioUrl] = useState<string | null>(null);
  const [importedAudioName, setImportedAudioName] = useState<string>('Suara Kloning Colab');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form tab states (REST API mode)
  const [cloneText, setCloneText] = useState('Halo semuanya! Ini adalah suara hasil kloning AI saya sendiri yang diproses langsung lewat Google Colab OmniVoice.');
  const [speed, setSpeed] = useState<number>(1.0);
  const [referenceAudioBase64, setReferenceAudioBase64] = useState<string | null>(null);
  const [referenceAudioName, setReferenceAudioName] = useState<string>('');
  const [referenceAudioPreview, setReferenceAudioPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('suara-kloning-saya');

  // Load saved Colab URL on mount
  useEffect(() => {
    const saved = localStorage.getItem('aniki_colab_url');
    if (saved) {
      setColabUrl(saved);
      setInputUrl(saved);
      testConnection(saved);
    }
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (referenceAudioPreview) URL.revokeObjectURL(referenceAudioPreview);
      if (generatedAudioUrl) URL.revokeObjectURL(generatedAudioUrl);
      if (importedAudioUrl) URL.revokeObjectURL(importedAudioUrl);
    };
  }, []);

  const formatUrl = (url: string) => {
    let clean = url.trim();
    if (!clean) return '';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean.replace(/\/+$/, '');
  };

  const handleApplyUrl = (targetRaw?: string) => {
    const formatted = formatUrl(targetRaw ?? inputUrl);
    if (!formatted) return;
    setColabUrl(formatted);
    setInputUrl(formatted);
    localStorage.setItem('aniki_colab_url', formatted);
    setIframeKey(prev => prev + 1);
    testConnection(formatted);
  };

  const testConnection = async (urlToTest?: string) => {
    const targetUrl = formatUrl(urlToTest ?? inputUrl);
    if (!targetUrl) return;

    setIsCheckingHealth(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const res = await checkColabHealth(targetUrl);
      setConnectionStatus('connected');
      setConnectionMessage(res.message || "Colab OmniVoice Terhubung Aktif!");
      setColabUrl(targetUrl);
      localStorage.setItem('aniki_colab_url', targetUrl);
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMessage(err.message || "Gagal menghubungi Colab. Pastikan Colab sedang running.");
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Handle importing audio from user's machine to save to app history
  const handleImportAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (importedAudioUrl) URL.revokeObjectURL(importedAudioUrl);
    const url = URL.createObjectURL(file);
    setImportedAudioUrl(url);
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
    setImportedAudioName(cleanBaseName || 'Suara Kloning Colab');
    setSaveSuccessMsg(null);
  };

  const handleSaveImportedToHistory = () => {
    if (!importedAudioUrl) return;
    onSaveToHistory({
      name: importedAudioName.trim() || 'Suara Kloning AI (OmniVoice)',
      url: importedAudioUrl,
      voiceName: 'Kloning Pribadi (Colab OmniVoice)'
    });
    setSaveSuccessMsg('Audio berhasil tersimpan di Riwayat!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // API Mode audio handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (referenceAudioPreview) {
      URL.revokeObjectURL(referenceAudioPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setReferenceAudioPreview(previewUrl);
    setReferenceAudioName(file.name);

    const base64 = await blobToBase64(file);
    setReferenceAudioBase64(base64);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        if (referenceAudioPreview) URL.revokeObjectURL(referenceAudioPreview);
        const url = URL.createObjectURL(audioBlob);
        setReferenceAudioPreview(url);
        setReferenceAudioName(`Rekaman Mic (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);

        const base64 = await blobToBase64(audioBlob);
        setReferenceAudioBase64(base64);

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      alert("Tidak dapat mengakses mikrofon. Pastikan izin mikrofon telah diberikan pada browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleGenerateClone = async () => {
    if (!colabUrl.trim()) {
      setGenerateError("Masukkan URL Colab / Cloudflare terlebih dahulu.");
      return;
    }
    if (!referenceAudioBase64) {
      setGenerateError("Silakan upload rekaman suara referensi atau rekam suara lewat mic.");
      return;
    }
    if (!cloneText.trim()) {
      setGenerateError("Silakan ketik naskah teks yang ingin dibacakan.");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await generateColabVoiceClone(colabUrl.trim(), cloneText.trim(), referenceAudioBase64, speed);
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
      setGeneratedAudioUrl(res.url);
    } catch (err: any) {
      setGenerateError(err.message || "Gagal membuat suara kloning.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className={`w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto transition-all duration-300 ${
          isFullscreen 
            ? 'fixed inset-2 z-50 h-[calc(100vh-16px)] max-w-none' 
            : 'max-w-5xl max-h-[92vh]'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight">Studio Kloning Suara AI (OmniVoice Colab)</h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                  100% Suaramu Asli
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">
                Ditenagai GPU Google Colab &bull; Kloning suara dengan emosi dan intonasi presisi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isFullscreen ? "Kecilkan Tampilan" : "Perbesar Layar Penuh"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setActiveTab('embed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'embed'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Studio Gradio Langsung (Embed)</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-700 font-bold">100% Lancar</span>
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'api'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Mode Form Cepat (REST API)</span>
            </button>
          </div>

          {/* Quick Colab Link Button */}
          <a
            href={COLAB_NOTEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Buka Google Colab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Top Bar: Cloudflare URL Input & Connection Status */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:flex-1">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyUrl()}
                placeholder="Tempel link Cloudflare Colab (contoh: https://xxxx.trycloudflare.com)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleApplyUrl()}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Sambungkan</span>
              </button>

              <button
                type="button"
                onClick={() => testConnection()}
                disabled={isCheckingHealth || !inputUrl.trim()}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl transition-colors"
                title="Cek Status Koneksi"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingHealth ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {colabUrl && (
                <a
                  href={colabUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Buka Gradio di Tab Baru Browser"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick status bar */}
          <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {connectionMessage || 'Colab GPU Terhubung Aktif!'}
                </span>
              ) : connectionStatus === 'error' ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  {connectionMessage}
                </span>
              ) : (
                <span className="text-slate-500 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                  Klik Run (▶️) di Colab &rarr; copy link trycloudflare.com &rarr; klik Sambungkan
                </span>
              )}
            </div>

            {colabUrl && (
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                Active: {colabUrl}
              </span>
            )}
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-50/50">

          {/* TAB 1: EMBEDDED GRADIO STUDIO (Option 1) */}
          {activeTab === 'embed' && (
            <div className="space-y-4">
              {colabUrl ? (
                <div className="space-y-4">
                  {/* Gradio Controls Banner */}
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">
                        Studio Gradio OmniVoice Live Tersemat (Embedded)
                      </span>
                      <span className="text-[10px] text-slate-500 hidden md:inline">
                        &bull; Upload/rekam suara &amp; klik Generate langsung di bawah
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIframeKey(k => k + 1)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        title="Muat ulang iframe jika terjadi gangguan"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reload Studio</span>
                      </button>

                      <a
                        href={colabUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Tab Baru</span>
                      </a>
                    </div>
                  </div>

                  {/* Interactive Gradio Iframe */}
                  <div className="relative rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden bg-white">
                    <iframe
                      key={iframeKey}
                      src={colabUrl}
                      title="Gradio OmniVoice Studio"
                      className={`w-full bg-white transition-all ${
                        isFullscreen ? 'h-[calc(100vh-230px)]' : 'h-[620px]'
                      }`}
                      allow="microphone; camera; autoplay; clipboard-write; display-capture"
                    />
                  </div>

                  {/* Post-Generation: Easy Audio Saver to History */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FolderDown className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Simpan Hasil Audio dari Colab ke Riwayat Aplikasi
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Download audio hasil dari frame di atas, lalu upload di sini untuk disimpan ke daftar Riwayat
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Pilih File Hasil Audio</span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleImportAudio}
                          className="hidden"
                        />
                      </label>

                      {importedAudioUrl && (
                        <>
                          <input
                            type="text"
                            value={importedAudioName}
                            onChange={(e) => setImportedAudioName(e.target.value)}
                            placeholder="Beri nama audio..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                          />

                          <audio src={importedAudioUrl} controls className="h-8 w-44 shrink-0" />

                          <button
                            type="button"
                            onClick={handleSaveImportedToHistory}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Simpan ke Riwayat</span>
                          </button>
                        </>
                      )}
                    </div>

                    {saveSuccessMsg && (
                      <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{saveSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Empty state: Guided walkthrough to launch Colab */
                <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-6 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                    <Tv className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Studio Gradio Live Belum Terhubung
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
                      Jalankan notebook Google Colab kamu sekali saja untuk mendapatkan URL Cloudflare. Setelah dimasukkan, tampilan web UI Gradio resmi akan langsung muncul di dalam aplikasi ini!
                    </p>
                  </div>

                  {/* 3 Step Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                        1
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">Buka Colab</h4>
                      <p className="text-[11px] text-slate-500">
                        Klik tombol <strong>Buka Google Colab</strong> di kanan atas, lalu klik <strong>Play (▶️)</strong> pada sel script.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                        2
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">Salin URL Cloudflare</h4>
                      <p className="text-[11px] text-slate-500">
                        Tunggu ~1 menit sampai muncul link seperti <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">https://xxxx.trycloudflare.com</code>.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                        3
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">Tempel &amp; Nikmati</h4>
                      <p className="text-[11px] text-slate-500">
                        Tempel link di kolom atas lalu klik <strong>Sambungkan</strong>. Studio Gradio siap dipakai!
                      </p>
                    </div>
                  </div>

                  <a
                    href={COLAB_NOTEBOOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Buka Notebook Google Colab Sekarang</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REST API FORM MODE */}
          {activeTab === 'api' && (
            <div className="space-y-5">
              {/* Form Input Container */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Upload Rekaman Suara &amp; Naskah
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">Mode REST API Langsung</span>
                </div>

                {/* Audio Source: Upload or Record */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Upload Box */}
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition-all text-center group">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-1.5 transition-colors" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                      Upload File Audio (WAV / MP3)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Durasi 5-20 detik jernih tanpa musik</span>
                  </label>

                  {/* Record Mic Box */}
                  <div className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-2xl bg-slate-50 text-center space-y-2">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Rekam Suara Sekarang</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 animate-pulse shadow-md shadow-red-500/20"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        <span>Hentikan Rekaman (Stop)</span>
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400">Ucapkan kalimat pendek dan jelas</span>
                  </div>
                </div>

                {/* Reference Audio Preview */}
                {referenceAudioPreview && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileAudio className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {referenceAudioName || 'Audio Referensi'}
                      </span>
                    </div>
                    <audio src={referenceAudioPreview} controls className="w-full sm:w-64 h-8" />
                  </div>
                )}

                {/* Text Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Naskah yang Ingin Diucapkan Suara Kloning:</label>
                  <textarea
                    value={cloneText}
                    onChange={(e) => setCloneText(e.target.value)}
                    rows={3}
                    placeholder="Ketik naskah di sini..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white resize-y"
                  />
                </div>

                {/* Speed Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-semibold">Kecepatan Bicara</span>
                    <span className="font-mono font-bold text-blue-600">{speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Error Message */}
                {generateError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{generateError}</span>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateClone}
                  disabled={isGenerating || !referenceAudioBase64 || !cloneText.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.99]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang Mengkloning Suara via GPU Colab... (~15-30 detik)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Voice Clone 🚀</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Result Card */}
              <AnimatePresence>
                {generatedAudioUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                            Hasil Suara Kloning Selesai!
                          </h4>
                          <p className="text-[11px] text-emerald-700">Audio MP3 192kbps jernih berhasil diproses.</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                        MP3
                      </span>
                    </div>

                    <audio src={generatedAudioUrl} controls autoPlay className="w-full h-11 rounded-full bg-white shadow-sm" />

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Nama file audio..."
                        className="w-full sm:flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            onSaveToHistory({
                              name: fileName.trim() || 'Suara Kloning AI',
                              url: generatedAudioUrl,
                              voiceName: 'Kloning Suara Pribadi (OmniVoice)'
                            });
                            alert('Audio kloning berhasil disimpan ke Riwayat!');
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Simpan ke Riwayat
                        </button>

                        <a
                          href={generatedAudioUrl}
                          download={`${fileName.trim() || 'suara-kloning'}.mp3`}
                          className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          <Download className="w-4 h-4" />
                          Download MP3
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
