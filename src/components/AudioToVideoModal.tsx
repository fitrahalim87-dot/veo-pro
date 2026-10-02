import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Video, 
  Film, 
  Sparkles, 
  Download, 
  Upload, 
  Play, 
  Pause, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Image as ImageIcon,
  Sliders,
  Layers,
  CheckCircle,
  ExternalLink,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  VIDEO_PRESETS, 
  VideoTemplatePreset, 
  renderCompositePoster, 
  createMp4Video 
} from '../services/videoService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  audioBlobOrUrl: Blob | string | null;
  audioTitle?: string;
  voiceName?: string;
}

export const AudioToVideoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  audioBlobOrUrl,
  audioTitle = 'Hasil Suara Voice Over',
  voiceName = 'VEO Pro Multilingual'
}) => {
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('podcast_emerald');
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const [customImageName, setCustomImageName] = useState<string>('');
  
  const [videoTitle, setVideoTitle] = useState<string>(audioTitle);
  const [videoSubtitle, setVideoSubtitle] = useState<string>(voiceName);
  const [includeWaveform, setIncludeWaveform] = useState<boolean>(true);

  // Preview state
  const [previewPosterUrl, setPreviewPosterUrl] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoSize, setGeneratedVideoSize] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPreset = VIDEO_PRESETS.find(p => p.id === selectedPresetId) || VIDEO_PRESETS[0];

  // Update title when audioTitle prop changes
  useEffect(() => {
    if (audioTitle) setVideoTitle(audioTitle);
    if (voiceName) setVideoSubtitle(`Voice Over by ${voiceName}`);
  }, [audioTitle, voiceName]);

  // Update live canvas preview whenever options change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    renderCompositePoster(
      aspectRatio,
      selectedPreset,
      customImageBase64,
      videoTitle,
      videoSubtitle
    ).then((url) => {
      if (!isCancelled) {
        setPreviewPosterUrl(url);
      }
    }).catch(err => {
      console.error("Preview render error:", err);
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, aspectRatio, selectedPresetId, customImageBase64, videoTitle, videoSubtitle]);

  // Handle custom image upload
  const handleCustomImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCustomImageBase64(reader.result as string);
      setCustomImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomImage = () => {
    setCustomImageBase64(null);
    setCustomImageName('');
  };

  // Generate MP4 Video
  const handleGenerateVideo = async () => {
    if (!audioBlobOrUrl) {
      setErrorMessage('Audio belum tersedia untuk diubah menjadi video.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationProgress('Menyiapkan generator video FFmpeg...');

    try {
      const res = await createMp4Video({
        audioBlobOrUrl,
        presetId: selectedPresetId,
        customImageBase64,
        aspectRatio,
        title: videoTitle,
        subtitle: videoSubtitle,
        includeWaveform,
        onProgress: (msg) => setGenerationProgress(msg)
      });

      if (generatedVideoUrl) {
        URL.revokeObjectURL(generatedVideoUrl);
      }

      setGeneratedVideoUrl(res.url);
      const sizeMB = (res.blob.size / (1024 * 1024)).toFixed(2);
      setGeneratedVideoSize(`${sizeMB} MB`);
      setGenerationProgress('');
    } catch (err: any) {
      console.error("Video creation failed:", err);
      setErrorMessage(err.message || 'Gagal membuat video MP4.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Studio Video MP4</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  Audio + Gambar HD
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ubah audio voice over menjadi video MP4 dengan gambar statis &amp; gelombang suara untuk TikTok, YouTube, &amp; IG.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left Column: Real-time Live Video Preview (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center space-y-3">
            <div className="text-xs font-bold text-slate-400 self-start flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{generatedVideoUrl ? 'Hasil Video MP4 Siap Putar' : 'Pratinjau Tampilan (Live Preview)'}</span>
            </div>

            {/* Video / Poster Canvas Box */}
            <div 
              className={`w-full bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl flex items-center justify-center relative transition-all ${
                aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[460px]' :
                aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'
              }`}
            >
              {generatedVideoUrl ? (
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              ) : previewPosterUrl ? (
                <img
                  src={previewPosterUrl}
                  alt="Video Poster Preview"
                  className="w-full h-full object-cover select-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="text-xs">Memuat pratinjau...</span>
                </div>
              )}

              {/* Status Badge Over Preview */}
              {!generatedVideoUrl && includeWaveform && (
                <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1.5 shadow-md">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Gelombang suara FFmpeg akan di-render saat generate</span>
                </div>
              )}
            </div>

            {/* Quick Dimension Specs */}
            <div className="text-[11px] font-mono text-slate-500 text-center">
              Resolusi: {aspectRatio === '9:16' ? '1080x1920 (Vertikal HD)' : aspectRatio === '16:9' ? '1920x1080 (Landscape HD)' : '1080x1080 (Persegi HD)'}
            </div>
          </div>

          {/* Right Column: Customization Controls (7 cols) */}
          <div className="md:col-span-7 space-y-5">

            {/* 1. Aspek Rasio (Ukuran Video) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>1. Pilih Ukuran Video (Platform Target)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '9:16', label: '9:16 Vertikal', desc: 'TikTok, Reels, Shorts' },
                  { id: '16:9', label: '16:9 Landscape', desc: 'YouTube, Web' },
                  { id: '1:1', label: '1:1 Persegi', desc: 'Instagram Post' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAspectRatio(item.id as any);
                      setGeneratedVideoUrl(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      aspectRatio === item.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pilihan Gambar Placeholder / Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span>2. Gambar Latar (Template / Upload Foto)</span>
                </label>
                {customImageBase64 && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomImage}
                    className="text-[11px] text-rose-400 hover:underline font-bold"
                  >
                    Hapus Foto Kustom
                  </button>
                )}
              </div>

              {/* Grid 6 Built-in Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VIDEO_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id && !customImageBase64;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setCustomImageBase64(null);
                        setGeneratedVideoUrl(null);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-emerald-500 bg-slate-800 ring-2 ring-emerald-500/30 shadow-md'
                          : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs" 
                          style={{ backgroundColor: preset.accentColor }} 
                        />
                        <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">{preset.category}</p>
                    </button>
                  );
                })}
              </div>

              {/* Upload Custom Image Button */}
              <div className="pt-1">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleCustomImageFile}
                  id="custom-video-image-upload"
                  className="hidden"
                />
                <label
                  htmlFor="custom-video-image-upload"
                  className={`w-full py-2.5 px-3.5 rounded-xl border border-dashed text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    customImageBase64
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:border-emerald-500/60'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {customImageName ? `Foto Kustom: ${customImageName}` : 'Atau Upload Gambar Sendiri (JPG/PNG)'}
                  </span>
                </label>
              </div>
            </div>

            {/* 3. Teks Judul & Subtitle */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>3. Teks Tulisan pada Video</span>
              </label>

              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400">Judul Utama:</span>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => {
                      setVideoTitle(e.target.value);
                      setGeneratedVideoUrl(null);
                    }}
                    placeholder="Judul voice over..."
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400">Subtitle / Pengisi Suara:</span>
                  <input
                    type="text"
                    value={videoSubtitle}
                    onChange={(e) => {
                      setVideoSubtitle(e.target.value);
                      setGeneratedVideoUrl(null);
                    }}
                    placeholder="Contoh: Voice Over by Brian AI"
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Opsi Gelombang Suara (Waveform) */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-white">Visualizer Gelombang Suara (FFmpeg Showwaves)</h5>
                <p className="text-[10px] text-slate-400">Animasi gelombang suara bergerak otomatis mengikuti audio</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIncludeWaveform(!includeWaveform);
                  setGeneratedVideoUrl(null);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  includeWaveform ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <div 
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    includeWaveform ? 'left-5.5' : 'left-0.5'
                  }`} 
                />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {!generatedVideoUrl ? (
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={isGenerating || !audioBlobOrUrl}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    isGenerating || !audioBlobOrUrl
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 active:scale-[0.99]'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{generationProgress || 'Sedang Me-render Video MP4...'}</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      <span>Render Video MP4 (Audio + Gambar) 🎬</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <a
                    href={generatedVideoUrl}
                    download={`${videoTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'video-vo'}.mp4`}
                    className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Video MP4 ({generatedVideoSize}) 🚀</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setGeneratedVideoUrl(null)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Ubah Pengaturan / Render Ulang
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
};
