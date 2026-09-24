import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  Zap, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Wand2, 
  PlayCircle, 
  Loader2, 
  Music, 
  Download,
  Sliders,
  RotateCcw,
  Trash2,
  Search,
  Globe,
  Users,
  Layers,
  FileText,
  Scissors,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  EDGE_VOICES, 
  VOICE_PRESETS,
  Voice
} from './constants';
import { PWAInstallButton } from './components/PWAInstallButton';
import { LongScriptSegmentManager } from './components/LongScriptSegmentManager';
import { VoiceCloneModal } from './components/VoiceCloneModal';
import { VoiceCloneStudioTab } from './components/VoiceCloneStudioTab';
import { generateEdgeTts, generateAiScript } from './services/ttsService';

interface HistoryItem {
  id: string;
  name: string;
  url: string;
  voiceName: string;
  timestamp: number;
}

export default function App() {
  // App State
  const [script, setScript] = useState('Halo bro! Kenalin, ini suara Brian yang biasa kamu denger di CapCut dan TikTok. Sekarang suaranya udah santai, ekspresif, dan asyik banget kan?');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(EDGE_VOICES[0].id); // Brian
  const [voiceCategory, setVoiceCategory] = useState<'Semua' | 'Multilingual' | 'Indonesia' | 'English' | 'Anime & Jepang' | 'Asia & Arab'>('Semua');
  const [genderFilter, setGenderFilter] = useState<'Semua' | 'Laki-laki' | 'Perempuan'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [speed, setSpeed] = useState<number>(0); // -30 to +50
  const [pitch, setPitch] = useState<number>(0); // -30 to +30
  const [speechmaApiKey, setSpeechmaApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [workspaceMode, setWorkspaceMode] = useState<'segments' | 'single'>('segments');
  const [showVoiceCloneModal, setShowVoiceCloneModal] = useState<boolean>(false);
  const [mainTab, setMainTab] = useState<'tts' | 'clone'>('tts');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAiWriting, setIsAiWriting] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleSaveItemToHistory = (item: { name: string; url: string; voiceName: string }) => {
    const newEntry: HistoryItem = {
      id: Date.now().toString(),
      name: item.name,
      url: item.url,
      voiceName: item.voiceName,
      timestamp: Date.now()
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('aniki_tts_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Gagal membaca riwayat simpan", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('aniki_tts_history', JSON.stringify(history));
  }, [history]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const selectedVoice = EDGE_VOICES.find(v => v.id === selectedVoiceId) || EDGE_VOICES[0];

  const filteredVoices = EDGE_VOICES.filter(v => {
    if (voiceCategory !== 'Semua' && v.category !== voiceCategory) {
      return false;
    }
    if (genderFilter !== 'Semua' && v.gender !== genderFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchDesc = v.description.toLowerCase().includes(q);
      const matchLang = v.language.toLowerCase().includes(q);
      const matchBadge = v.badge?.toLowerCase().includes(q) || false;
      if (!matchName && !matchDesc && !matchLang && !matchBadge) {
        return false;
      }
    }
    return true;
  });

  const handlePreviewVoice = async (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (previewingVoice) return;

    setPreviewingVoice(voice.id);
    try {
      let sampleText = `Halo! Kenalin ini karakter ${voice.name}. Suaraku fasih membaca bahasa Indonesia dan Inggris secara lancar tanpa logat kaku.`;
      
      if (voice.id.includes('Brian')) {
        sampleText = "Halo bro! Gue Brian. Suara gua sekarang udah santai, mantap, dan gak kaku lagi kan?";
      } else if (voice.id.includes('Andrew')) {
        sampleText = "Yo guys! Kenalin gue Alex. Suara gue energik dan renyah banget buat konten FYP kamu!";
      } else if (voice.id.includes('Ava')) {
        sampleText = "Hai semuanya! Kenalin aku Ava. Gaya bicara aku santai dan ekspresif seperti manusia asli.";
      } else if (voice.id.includes('Emma')) {
        sampleText = "Halo semuanya! Aku Emma. Suaraku hangat dan nyaman banget untuk narasi santai dan cerita.";
      } else if (voice.id.includes('Christopher')) {
        sampleText = "Halo! Saya Christopher. Vokal saya berat, sinematik, dan fasih membaca bahasa Indonesia maupun Inggris.";
      } else if (voice.id.includes('Jenny')) {
        sampleText = "Hai semuanya! Kenalin aku Jenny. Suaraku ramah, ceria, dan lancar membaca bahasa Indonesia.";
      } else if (voice.id.includes('Guy')) {
        sampleText = "Yo halo kawan! Gue Guy. Gaya bicara gue santai dan asyik buat podcast maupun konten casual.";
      } else if (voice.id.includes('Nanami')) {
        sampleText = "Konnichiwa! Kenalin aku Nanami. Suaraku imut ala anime, tapi tetap fasih dan jelas membaca bahasa Indonesia!";
      } else if (voice.id.includes('Keita')) {
        sampleText = "Semangat kawan! Gue Keita. Suara cowok anime shonen yang siap bikin konten kamu makin hidup!";
      } else if (voice.id.includes('Ana')) {
        sampleText = "Halo kakak-kakak! Aku Ana. Suaraku ceria dan imut banget buat dongeng dan video animasi!";
      } else if (voice.id.includes('Thalita')) {
        sampleText = "Hai! Aku Thalita. Suaraku ceria, segar, dan luwes banget buat membaca teks bahasa Indonesia maupun bahasa lainnya.";
      } else if (voice.id.includes('Giuseppe')) {
        sampleText = "Halo kawan! Kenalin saya Giuseppe. Vokal saya hangat dan karismatik untuk berbagai kebutuhan audio kamu.";
      } else if (voice.language === 'Jawa') {
        sampleText = `Sugeng rawuh sedherek sedaya, iki sworo ${voice.name}.`;
      } else if (voice.language === 'Sunda') {
        sampleText = `Sampurasun wargi sadaya, ieu sora ${voice.name}.`;
      }

      const url = await generateEdgeTts(sampleText, voice.id, speed, pitch, speechmaApiKey);
      
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPreviewingVoice(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPreviewingVoice(null);
      };
      await audio.play();
    } catch (err: any) {
      console.error("Preview voice error:", err);
      setError("Gagal memuat pratinjau suara: " + (err.message || "Koneksi terputus"));
      setPreviewingVoice(null);
    }
  };

  const handleAiAutoWrite = async () => {
    if (isAiWriting) return;
    setIsAiWriting(true);
    setError(null);
    try {
      const generated = await generateAiScript(script || "ide yapping lucu buat video tiktok");
      setScript(generated);
    } catch (err: any) {
      setError("Gagal membuat naskah AI: " + err.message);
    } finally {
      setIsAiWriting(false);
    }
  };

  const handleApplyPreset = (presetSpeed: number, presetPitch: number) => {
    setSpeed(presetSpeed);
    setPitch(presetPitch);
  };

  const handleResetControls = () => {
    setSpeed(0);
    setPitch(0);
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError("Naskah tidak boleh kosong! Ketik atau gunakan AI Auto-Write.");
      return;
    }

    if (script.length > 25000) {
      setError("Naskah terlalu panjang! Maksimal 25.000 karakter.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(false);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);

    try {
      const url = await generateEdgeTts(script, selectedVoiceId, speed, pitch, speechmaApiKey);
      setAudioUrl(url);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat generate audio.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToHistory = () => {
    if (!audioUrl) return;
    
    const newEntry: HistoryItem = {
      id: Date.now().toString(),
      name: fileName.trim() || `Audio ${selectedVoice.name} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      url: audioUrl,
      voiceName: selectedVoice.name,
      timestamp: Date.now()
    };
    
    setHistory([newEntry, ...history]);
    setFileName('');
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const charCount = script.length;
  const estimasiWaktu = Math.max(1, Math.ceil(charCount / 18)); // ~18 chars/sec

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Volume2 className="text-black w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                  VEO <span className="text-lime-600">PRO</span>
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  Speechma Multilingual Studio
                </span>
                <PWAInstallButton />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Banyak Karakter • Multilingual • 100% Gratis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-full text-[11px] font-bold text-neutral-300 transition-colors"
              title="Pengaturan Mesin Speechma"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>{speechmaApiKey ? 'Speechma Pro (API Key)' : 'Speechma Free Mode'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal (Optional Speechma API Key) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900 border-b border-blue-500/20 overflow-hidden"
          >
            <div className="max-w-5xl mx-auto px-6 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Konfigurasi Mesin Speechma (Opsional)
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Tutup ✕
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Aplikasi ini sudah otomatis menggunakan <strong>Speechma Neural Engine</strong> secara <strong>100% Gratis</strong> tanpa perlu login atau API key. Jika kamu punya akun Speechma berbayar dan ingin memakai API Key resmi milikmu, masukkan kuncinya di bawah:
              </p>
              <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
                <input
                  type="text"
                  placeholder="Masukkan Speechma API Key (contoh: sm_...)"
                  value={speechmaApiKey}
                  onChange={(e) => setSpeechmaApiKey(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none placeholder:text-slate-400"
                />
                {speechmaApiKey && (
                  <button
                    onClick={() => setSpeechmaApiKey('')}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Hapus Key
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setMainTab('tts')}
            className={`py-3.5 px-4 font-black text-xs transition-all flex items-center gap-2 border-b-2 shrink-0 ${
              mainTab === 'tts'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Studio Suara & Narator AI</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredVoices.length} Karakter
            </span>
          </button>

          <button
            onClick={() => setMainTab('clone')}
            className={`py-3.5 px-4 font-black text-xs transition-all flex items-center gap-2 border-b-2 shrink-0 ${
              mainTab === 'clone'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mic className="w-4 h-4 text-blue-600" />
            <span>Studio Kloning Suara (OmniVoice)</span>
            <span className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full font-bold shadow-xs">
              100% Suaramu
            </span>
          </button>
        </div>
      </div>

      <main className={`${mainTab === 'clone' ? 'max-w-7xl' : 'max-w-5xl'} mx-auto px-4 sm:px-6 py-8 space-y-8 transition-all`}>
        {mainTab === 'clone' ? (
          <div className="space-y-8">
            <VoiceCloneStudioTab onSaveToHistory={handleSaveItemToHistory} />

            {/* Riwayat Audio in Clone Tab */}
            {history.length > 0 && (
              <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg shadow-slate-300">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-blue-600" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">Riwayat Audio</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">{history.length} Item</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {history.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Volume2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {item.voiceName} &bull; {new Date(item.timestamp).toLocaleDateString('id-ID')} {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={item.url} 
                          download={`${item.name}.mp3`}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-all"
                          title="Download MP3"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => handleDeleteHistory(item.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <>
            {/* Cloning Suara Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 shadow-md hover:border-blue-400 transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-900">Kloning Suara AI (100% Suaramu)</p>
                    <span className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      OmniVoice GPU
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Gunakan rekaman suara aslimu untuk membaca naskah apa pun secara gratis lewat Google Colab.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setMainTab('clone')}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Buka Tab Studio Kloning</span>
                </button>

                <a
                  href="https://colab.research.google.com/drive/1ll6P5bU4ExOsdtd6KPetYh7umWnvT31G"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Buka Colab</span>
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                </a>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Suara & Penyesuaian Nada (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Box Pemilihan Suara */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-300 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Katalog Karakter Suara</h2>
                </div>
                <span className="text-[11px] text-blue-600 font-mono font-bold">{filteredVoices.length} Suara</span>
              </div>

              {/* Search Bar Karakter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari karakter, nama, atau bahasa (Brian, Jawa, Anime)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-900"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Multilingual Cross-Lingual Note */}
              <div className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span><strong className="text-slate-900">Semua karakter</strong> bisa membaca teks bahasa Indonesia, Inggris, atau bahasa apa pun secara cross-lingual!</span>
              </div>

              {/* Filter Kategori Suara */}
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                {(['Semua', 'Multilingual', 'Indonesia', 'English', 'Anime & Jepang', 'Asia & Arab'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setVoiceCategory(cat)}
                    className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      voiceCategory === cat 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Gender Filter Chips */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>Gender:</span>
                </div>
                <div className="flex gap-1">
                  {(['Semua', 'Laki-laki', 'Perempuan'] as const).map((gen) => (
                    <button
                      key={gen}
                      onClick={() => setGenderFilter(gen)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                        genderFilter === gen
                          ? 'bg-slate-200 text-blue-600 border border-slate-300'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {gen === 'Semua' ? 'Semua' : gen === 'Laki-laki' ? '👨 Pria' : '👩 Wanita'}
                    </button>
                  ))}
                </div>
              </div>

              {/* List Suara */}
              <div className="grid grid-cols-1 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredVoices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Tidak ada karakter yang cocok dengan pencarian "{searchQuery}".
                  </div>
                ) : (
                  filteredVoices.map((v) => {
                    const isSelected = selectedVoiceId === v.id;
                    const isPreviewing = previewingVoice === v.id;

                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVoiceId(v.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-400 shadow-md' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayCircle className="w-5 h-5 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-sm font-bold truncate ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>
                                {v.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">({v.gender})</span>
                              {v.badge && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 shrink-0">
                                  {v.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {v.description}
                            </p>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {v.language}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handlePreviewVoice(e, v)}
                            className={`p-2 rounded-xl transition-all ${
                              isPreviewing 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600'
                            }`}
                            title="Dengar Contoh Suara"
                          >
                            {isPreviewing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <PlayCircle className="w-4 h-4" />
                            )}
                          </button>
                          {isSelected && <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Box Presets & Sliders */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-300 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Gaya & Nada Bicara</h2>
                </div>
                {(speed !== 0 || pitch !== 0) && (
                  <button 
                    onClick={handleResetControls}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 font-bold transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Preset Gaya Cepat */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preset Siap Pakai</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VOICE_PRESETS.map((p) => {
                    const isActive = speed === p.speed && pitch === p.pitch;
                    return (
                      <button
                        key={p.name}
                        onClick={() => handleApplyPreset(p.speed, p.pitch)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isActive 
                            ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-md' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{p.icon}</span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className={`text-[9px] block mt-0.5 truncate ${isActive ? 'text-white/80 font-medium' : 'text-slate-500'}`}>
                          {p.speed >= 0 ? `+${p.speed}%` : `${p.speed}%`} / {p.pitch >= 0 ? `+${p.pitch}Hz` : `${p.pitch}Hz`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders Manual */}
              <div className="space-y-4 pt-2 border-t border-slate-200">
                {/* Speed Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-semibold">Kecepatan Bicara (Speed)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {speed > 0 ? `+${speed}%` : `${speed}%`}
                      {speed > 15 ? ' (Cepat)' : speed < -10 ? ' (Lambat)' : ' (Normal)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    step="5"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>-30%</span>
                    <span>0% (Standar)</span>
                    <span>+50%</span>
                  </div>
                </div>

                {/* Pitch Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-semibold">Tinggi Rendah Nada (Pitch)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {pitch > 0 ? `+${pitch}Hz` : `${pitch}Hz`}
                      {pitch > 10 ? ' (Tinggi/Imut)' : pitch < -10 ? ' (Bass/Deep)' : ' (Normal)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="5"
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>-30Hz (Deep)</span>
                    <span>0Hz (Normal)</span>
                    <span>+30Hz (Imut)</span>
                  </div>
                </div>
              </div>

            </section>
          </div>

          {/* Right Column: Text Input & Hasil Generate (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Mode Switcher Tabs */}
            <div className="p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300 flex items-center gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => setWorkspaceMode('segments')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  workspaceMode === 'segments'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Naskah Panjang &amp; Segmen</span>
                <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                  Maks 3rb Karakter • Gabung MP3
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceMode('single')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  workspaceMode === 'single'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Naskah Satuan (Single VO)</span>
              </button>
            </div>

            {workspaceMode === 'segments' ? (
              <LongScriptSegmentManager
                selectedVoiceId={selectedVoiceId}
                voices={EDGE_VOICES}
                speed={speed}
                pitch={pitch}
                speechmaApiKey={speechmaApiKey}
                onSaveToHistory={handleSaveItemToHistory}
              />
            ) : (
              <>
                {charCount > 2500 && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-800">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Naskah kamu panjang (<strong>{charCount.toLocaleString()}</strong> karakter). Ingin langsung dibagi jadi segmen &le; 3.000 karakter dan digabung jadi 1 file MP3?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('segments')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shrink-0 transition-colors"
                    >
                      Buka Mode Segmen
                    </button>
                  </div>
                )}

                {/* Script Editor */}
                <section className="bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-lg shadow-slate-300">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">Naskah Suara</h2>
                    </div>
                    <button 
                      onClick={handleAiAutoWrite}
                      disabled={isAiWriting}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
                      title="Buat ide naskah otomatis dengan bantuan AI"
                    >
                      {isAiWriting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      <span>{isAiWriting ? 'Menulis...' : 'Ide Naskah AI'}</span>
                    </button>
                  </div>

                  {/* Quick Template Chips */}
                  <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-col gap-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-slate-900 font-semibold">Uji Karakter dalam Berbagai Bahasa:</span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-mono hidden sm:inline">Semua karakter bisa baca bahasa apa pun</span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setScript('Halo bro! Ini contoh teks bahasa Indonesia gaul. Karakter apa pun yang kamu pilih bisa baca teks ini dengan luwes!');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 shrink-0 font-medium transition-colors"
                      >
                        🇮🇩 Indo Santai
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScript('Hello everyone! Listen to this, any character in this app can speak English clearly and expressively.');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 shrink-0 font-medium transition-colors"
                      >
                        🇺🇸 English
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScript('Jujurly ya guys, basically karakter suara di sini tuh versatile banget, bisa mix bahasa Indonesia sama English tanpa kaku!');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 shrink-0 font-medium transition-colors"
                      >
                        🇮🇩🇺🇸 Campur Jaksel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScript('Konnichiwa minna-san! Sugoi banget kan, suara ini bisa dipakai buat dubbing konten anime dan kartun!');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 shrink-0 font-medium transition-colors"
                      >
                        🇯🇵 Wibu / Anime
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScript('Suatu malam di sebuah jalanan kota yang sunyi, ada misteri tersembunyi yang belum terpecahkan...');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 shrink-0 font-medium transition-colors"
                      >
                        📖 Narasi Misteri
                      </button>
                    </div>
                  </div>

                  <div className="relative min-h-[300px]">
                    <textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="Ketik teks yang mau kamu jadikan suara di sini... Karakter multilingual bisa membaca bahasa apa pun secara luwes dan alami..."
                      className="w-full h-full min-h-[300px] bg-transparent p-6 text-base md:text-lg outline-none resize-none placeholder:text-slate-400 text-slate-900 font-medium leading-relaxed"
                    />
                  </div>

                  {/* Status Info Bar */}
                  <div className="px-6 py-3 bg-slate-950 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-3">
                      <span>Panjang: <strong className={charCount > 25000 ? 'text-red-400' : 'text-white'}>{charCount}</strong> / 25000</span>
                      <span>&bull;</span>
                      <span>Estimasi: <strong className="text-white">~{estimasiWaktu} dtk</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <PlayCircle className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-blue-400">{selectedVoice.name}</span>
                      <span className="text-[10px] text-slate-500">({selectedVoice.language})</span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="p-6 bg-slate-900 border-t border-white/5 space-y-4">
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm"
                        >
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          {error}
                        </motion.div>
                      )}
                      {success && !error && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 text-sm"
                        >
                          <CheckCircle className="w-5 h-5 shrink-0" />
                          Audio berhasil dibuat! Suara jernih siap diputar atau di-download.
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-base tracking-tight transition-all duration-300 group relative shadow-lg ${
                        isGenerating 
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-400 hover:scale-[1.01] active:scale-[0.99] shadow-blue-500/20'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Sedang Membuat Audio Natural...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Buat Suara Sekarang (Gratis)
                        </>
                      )}
                    </button>
                  </div>
                </section>

                {/* Audio Player Card (Hasil) */}
                <AnimatePresence>
                  {audioUrl && (
                    <motion.section 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-white rounded-3xl border border-blue-100 p-6 flex flex-col items-center text-center space-y-5 shadow-lg shadow-slate-300 relative overflow-hidden"
                    >
                      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-blue-600" />
                          <h3 className="text-sm font-bold text-slate-900">Hasil Audio Siap Pakai</h3>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">
                          Format MP3 • 24kHz
                        </span>
                      </div>

                      <audio 
                        src={audioUrl} 
                        controls 
                        autoPlay
                        className="w-full h-12 rounded-full" 
                      />

                      <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <input 
                          type="text"
                          placeholder="Beri nama file (opsional)..."
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          className="w-full sm:flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none text-slate-900 placeholder:text-slate-400"
                        />

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={handleSaveToHistory}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold transition-all border border-slate-200"
                            title="Simpan ke daftar riwayat lokal"
                          >
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            Simpan
                          </button>

                          <a 
                            href={audioUrl} 
                            download={`${fileName.trim() || `speechma-${selectedVoice.name.toLowerCase().replace(/\s+/g, '-')}`}.mp3`}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                          >
                            <Download className="w-4 h-4" />
                            Download MP3
                          </a>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Riwayat Simpan Audio */}
            {history.length > 0 && (
              <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg shadow-slate-300">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-blue-600" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">Riwayat Audio</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">{history.length} Item</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {history.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Volume2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {item.voiceName} &bull; {new Date(item.timestamp).toLocaleDateString('id-ID')} {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={item.url} 
                          download={`${item.name}.mp3`}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-all"
                          title="Download MP3"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => handleDeleteHistory(item.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

        </div>
          </>
        )}
      </main>

      {/* Voice Clone Studio Modal */}
      <VoiceCloneModal 
        isOpen={showVoiceCloneModal}
        onClose={() => setShowVoiceCloneModal(false)}
        onSaveToHistory={handleSaveItemToHistory}
      />
    </div>
  );
}
