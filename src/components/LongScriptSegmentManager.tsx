import React, { useState, useRef, useEffect } from 'react';
import { 
  Scissors, 
  Play, 
  Pause, 
  Square, 
  Download, 
  RefreshCw, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Music, 
  Sliders, 
  Sparkles,
  Layers,
  ChevronDown,
  Volume2,
  FileAudio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Voice } from '../constants';
import { splitTextIntoSmartSegments } from '../utils/textSplitter';
import { generateEdgeTtsDetailed, mergeAudioSegments } from '../services/ttsService';

export interface ScriptSegment {
  id: string;
  text: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
  audioUrl?: string;
  audioBase64?: string;
  voiceId?: string;
  error?: string;
}

interface Props {
  selectedVoiceId: string;
  voices: Voice[];
  speed: number;
  pitch: number;
  speechmaApiKey: string;
  onSaveToHistory: (item: { name: string; url: string; voiceName: string }) => void;
}

export const LongScriptSegmentManager: React.FC<Props> = ({
  selectedVoiceId,
  voices,
  speed,
  pitch,
  speechmaApiKey,
  onSaveToHistory,
}) => {
  const [masterScript, setMasterScript] = useState('');
  const [maxCharsPerSegment, setMaxCharsPerSegment] = useState<number>(3000);
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  
  // Batch generation state
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number | null>(null);
  const stopBatchRef = useRef(false);

  // Merge state
  const [isMerging, setIsMerging] = useState(false);
  const [mergedAudioUrl, setMergedAudioUrl] = useState<string | null>(null);
  const [mergedFileName, setMergedFileName] = useState('vo-gabungan-lengkap');
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeSuccess, setMergeSuccess] = useState(false);

  // Active playing segment
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const activeVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
  const [voiceSyncMessage, setVoiceSyncMessage] = useState<string | null>(null);

  // Automatically sync newly selected voice from Katalog Karakter Suara to existing segments
  const prevVoiceRef = useRef(selectedVoiceId);
  useEffect(() => {
    if (prevVoiceRef.current !== selectedVoiceId) {
      const prevVoiceId = prevVoiceRef.current;
      prevVoiceRef.current = selectedVoiceId;

      // Automatically sync segments that have not been generated yet or were using the previous default voice
      setSegments(prev => prev.map(s => {
        if (!s.voiceId || s.voiceId === prevVoiceId || s.status === 'idle') {
          return { ...s, voiceId: selectedVoiceId };
        }
        return s;
      }));

      setVoiceSyncMessage(`Karakter segmen otomatis disesuaikan ke: ${activeVoice.name} (${activeVoice.gender})`);
      const timer = setTimeout(() => setVoiceSyncMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedVoiceId, activeVoice.name, activeVoice.gender]);

  // Apply current active voice to ALL segments
  const handleApplyVoiceToAll = () => {
    setSegments(prev => prev.map(s => ({
      ...s,
      voiceId: selectedVoiceId,
    })));
    setVoiceSyncMessage(`Suara "${activeVoice.name}" berhasil diterapkan ke seluruh ${segments.length} segmen!`);
    setTimeout(() => setVoiceSyncMessage(null), 3500);
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      segments.forEach(s => {
        if (s.audioUrl) URL.revokeObjectURL(s.audioUrl);
      });
      if (mergedAudioUrl) URL.revokeObjectURL(mergedAudioUrl);
    };
  }, []);

  // Split master script into segments
  const handleSplitScript = () => {
    if (!masterScript.trim()) return;

    const chunks = splitTextIntoSmartSegments(masterScript, maxCharsPerSegment);
    const newSegments: ScriptSegment[] = chunks.map((chunk, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
      text: chunk,
      status: 'idle',
      voiceId: selectedVoiceId,
    }));

    // Cleanup previous urls
    segments.forEach(s => {
      if (s.audioUrl) URL.revokeObjectURL(s.audioUrl);
    });
    if (mergedAudioUrl) {
      URL.revokeObjectURL(mergedAudioUrl);
      setMergedAudioUrl(null);
    }

    setSegments(newSegments);
  };

  // Add empty segment
  const handleAddSegment = () => {
    const newSeg: ScriptSegment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      text: '',
      status: 'idle',
      voiceId: selectedVoiceId,
    };
    setSegments(prev => [...prev, newSeg]);
  };

  // Delete segment
  const handleDeleteSegment = (id: string) => {
    const target = segments.find(s => s.id === id);
    if (target?.audioUrl) {
      URL.revokeObjectURL(target.audioUrl);
    }
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  // Move segment up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSegments(prev => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  // Move segment down
  const handleMoveDown = (index: number) => {
    if (index === segments.length - 1) return;
    setSegments(prev => {
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  // Update text of segment
  const handleUpdateText = (id: string, newText: string) => {
    setSegments(prev => prev.map(s => {
      if (s.id === id) {
        // Invalidate previous audio if text changed
        if (s.audioUrl && s.text !== newText) {
          URL.revokeObjectURL(s.audioUrl);
        }
        return {
          ...s,
          text: newText,
          status: s.text !== newText ? 'idle' : s.status,
          audioUrl: s.text !== newText ? undefined : s.audioUrl,
          audioBase64: s.text !== newText ? undefined : s.audioBase64,
        };
      }
      return s;
    }));
  };

  // Update voice of segment
  const handleUpdateVoice = (id: string, voiceId: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, voiceId } : s));
  };

  // Generate a single segment
  const handleGenerateSingle = async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !segment.text.trim()) return;

    setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, status: 'generating', error: undefined } : s));

    try {
      const voiceToUse = segment.voiceId || selectedVoiceId;
      const res = await generateEdgeTtsDetailed(
        segment.text,
        voiceToUse,
        speed,
        pitch,
        speechmaApiKey
      );

      setSegments(prev => prev.map(s => {
        if (s.id === segmentId) {
          if (s.audioUrl) URL.revokeObjectURL(s.audioUrl);
          return {
            ...s,
            status: 'completed',
            audioUrl: res.url,
            audioBase64: res.base64,
            error: undefined
          };
        }
        return s;
      }));
    } catch (err: any) {
      console.error("Single generate error:", err);
      setSegments(prev => prev.map(s => s.id === segmentId ? { 
        ...s, 
        status: 'error', 
        error: err.message || "Gagal membuat audio segmen" 
      } : s));
    }
  };

  // Batch generate all segments from top to bottom
  const handleGenerateAll = async () => {
    if (isBatchGenerating || segments.length === 0) return;
    
    // Check if there are segments with text
    const validSegments = segments.filter(s => s.text.trim().length > 0);
    if (validSegments.length === 0) {
      alert("Tidak ada teks pada segmen untuk di-generate.");
      return;
    }

    setIsBatchGenerating(true);
    stopBatchRef.current = false;

    for (let i = 0; i < segments.length; i++) {
      if (stopBatchRef.current) break;

      const seg = segments[i];
      if (!seg.text.trim()) continue;

      setCurrentBatchIndex(i);
      setSegments(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'generating', error: undefined } : s
      ));

      try {
        const voiceToUse = seg.voiceId || selectedVoiceId;
        const res = await generateEdgeTtsDetailed(
          seg.text,
          voiceToUse,
          speed,
          pitch,
          speechmaApiKey
        );

        if (stopBatchRef.current) {
          URL.revokeObjectURL(res.url);
          break;
        }

        setSegments(prev => prev.map((s, idx) => {
          if (idx === i) {
            if (s.audioUrl) URL.revokeObjectURL(s.audioUrl);
            return {
              ...s,
              status: 'completed',
              audioUrl: res.url,
              audioBase64: res.base64,
              error: undefined
            };
          }
          return s;
        }));
      } catch (err: any) {
        console.error(`Error on segment ${i + 1}:`, err);
        setSegments(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'error', error: err.message || "Gagal memproses" } : s
        ));
      }

      // Small polite delay between requests to keep connection healthy
      await new Promise(r => setTimeout(r, 450));
    }

    setIsBatchGenerating(false);
    setCurrentBatchIndex(null);
  };

  // Stop batch generation
  const handleStopBatch = () => {
    stopBatchRef.current = true;
    setIsBatchGenerating(false);
    setCurrentBatchIndex(null);
  };

  // Merge all completed audio segments in sequential order
  const handleMergeAll = async () => {
    const completedSegments = segments.filter(s => s.status === 'completed' && s.audioBase64);
    
    if (completedSegments.length === 0) {
      setMergeError("Belum ada segmen yang selesai di-generate. Silakan generate segmen terlebih dahulu.");
      return;
    }

    if (completedSegments.length < segments.length) {
      const confirmIncomplete = window.confirm(
        `Baru ${completedSegments.length} dari ${segments.length} segmen yang selesai di-generate. Tetap ingin menggabungkan segmen yang sudah ada?`
      );
      if (!confirmIncomplete) return;
    }

    setIsMerging(true);
    setMergeError(null);
    setMergeSuccess(false);

    try {
      // Preserve sequential order: map all completed segments in sequence
      const audioPayload = completedSegments.map(s => s.audioBase64!);
      
      const { url } = await mergeAudioSegments(audioPayload);

      if (mergedAudioUrl) {
        URL.revokeObjectURL(mergedAudioUrl);
      }
      setMergedAudioUrl(url);
      setMergeSuccess(true);
    } catch (err: any) {
      console.error("Audio merge error:", err);
      setMergeError(err.message || "Gagal menggabungkan file audio.");
    } finally {
      setIsMerging(false);
    }
  };

  // Reset everything
  const handleResetAll = () => {
    if (segments.length > 0 && !window.confirm("Yakin ingin menghapus semua segmen?")) {
      return;
    }
    segments.forEach(s => {
      if (s.audioUrl) URL.revokeObjectURL(s.audioUrl);
    });
    if (mergedAudioUrl) URL.revokeObjectURL(mergedAudioUrl);

    setSegments([]);
    setMergedAudioUrl(null);
    setMergeError(null);
    setMergeSuccess(false);
  };

  const completedCount = segments.filter(s => s.status === 'completed').length;
  const totalCount = segments.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const masterLength = masterScript.length;

  return (
    <div className="space-y-6">
      
      {/* Input Naskah Panjang */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-300 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
              Naskah Panjang & Otomatis Bagi Segmen
            </h2>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Maks 3.000 Karakter / Segmen
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <textarea
              value={masterScript}
              onChange={(e) => setMasterScript(e.target.value)}
              placeholder="Tempel naskah panjang kamu di sini (recap anime, alur film, cerita novel, dongeng 3.000 - 50.000+ karakter)... Teks akan otomatis dipotong secara rapi berdasarkan tanda titik/paragraf tanpa memotong kalimat atau kata!"
              className="w-full min-h-[180px] bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all resize-y leading-relaxed font-normal"
            />
          </div>

          {/* Pengaturan Batas Segmen & Tombol Eksekusi */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-blue-600" />
                Maksimal per segmen:
              </span>
              <div className="flex items-center gap-1">
                {[2000, 2500, 2900, 3000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMaxCharsPerSegment(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      maxCharsPerSegment === val 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {val.toLocaleString()} Karakter
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-mono">
                Total: <strong className="text-slate-900">{masterLength.toLocaleString()}</strong> karakter
                {masterLength > 0 && (
                  <span className="text-blue-600 font-bold ml-1.5">
                    (~{Math.ceil(masterLength / maxCharsPerSegment)} segmen)
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={handleSplitScript}
                disabled={!masterScript.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Scissors className="w-4 h-4" />
                Bagi Jadi Segmen
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Segments Workspace */}
      {segments.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-300 p-6 space-y-6">
          
          {/* Header Batch Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Daftar Segmen VO ({segments.length} Segmen)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap segmen di bawah ini &le; {maxCharsPerSegment.toLocaleString()} karakter dan siap di-generate berurutan.
              </p>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              {!isBatchGenerating ? (
                <button
                  type="button"
                  onClick={handleGenerateAll}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95"
                  title="Generate semua segmen dari nomor 1 sampai selesai secara berurutan"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Mulai Generate Semua (Atas ke Bawah)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopBatch}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-red-500/20 animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Hentikan Proses (Segmen {(currentBatchIndex ?? 0) + 1})
                </button>
              )}

              <button
                type="button"
                onClick={handleMergeAll}
                disabled={completedCount === 0 || isMerging}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95"
                title="Gabungkan semua hasil audio segmen berurutan menjadi 1 file MP3 utuh"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sedang Menggabungkan...
                  </>
                ) : (
                  <>
                    <FileAudio className="w-4 h-4" />
                    Gabung Semua VO (MP3)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleAddSegment}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                title="Tambah segmen manual"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="p-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-xl text-xs font-bold transition-all"
                title="Kosongkan semua segmen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                Progres Segmen: <span className="text-blue-600">{completedCount}</span> / {totalCount} Selesai ({progressPct}%)
              </span>
              {isBatchGenerating && currentBatchIndex !== null && (
                <span className="text-blue-600 font-mono font-bold animate-pulse flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sedang memproses Segmen #{currentBatchIndex + 1}...
                </span>
              )}
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Merged Audio Alert / Player Section */}
          <AnimatePresence>
            {mergedAudioUrl && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-black text-emerald-950">
                        🎉 Seluruh VO Berhasil Digabungkan Menjadi 1 File MP3!
                      </h4>
                      <p className="text-xs text-emerald-700">
                        Audio telah distandardisasi &amp; disambung mulus berurutan dengan format MP3 192kbps.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                    MP3 Utuh
                  </span>
                </div>

                <audio 
                  src={mergedAudioUrl} 
                  controls 
                  className="w-full h-11 rounded-full bg-white shadow-sm" 
                />

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={mergedFileName}
                    onChange={(e) => setMergedFileName(e.target.value)}
                    placeholder="Nama file gabungan..."
                    className="w-full sm:flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        onSaveToHistory({
                          name: mergedFileName || 'VO Lengkap Gabungan',
                          url: mergedAudioUrl,
                          voiceName: activeVoice.name + ' (Gabungan)'
                        });
                        alert('Audio gabungan berhasil disimpan ke Riwayat!');
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Simpan ke Riwayat
                    </button>
                    <a
                      href={mergedAudioUrl}
                      download={`${mergedFileName.trim() || 'vo-gabungan-lengkap'}.mp3`}
                      className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Download className="w-4 h-4" />
                      Download MP3 Lengkap
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {mergeError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mergeError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Voice Synchronization Control Bar */}
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 rounded-2xl flex-wrap gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Karakter Suara Aktif:</span>
                  <span className="text-xs font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                    {activeVoice.name} ({activeVoice.gender})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Setiap kamu memilih karakter di katalog kiri, semua segmen otomatis sinkron mengikuti pilihanmu.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyVoiceToAll}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs"
              title="Terapkan karakter suara ini ke semua segmen sekaligus"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Terapkan {activeVoice.name} ke Semua Segmen</span>
            </button>
          </div>

          {/* Voice Sync Toast / Alert */}
          <AnimatePresence>
            {voiceSyncMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{voiceSyncMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List of Segments */}
          <div className="space-y-4">
            {segments.map((seg, idx) => {
              const segLength = seg.text.length;
              const isOverLimit = segLength > 3000;
              const segVoice = voices.find(v => v.id === (seg.voiceId || selectedVoiceId)) || activeVoice;
              const isCurrentlyProcessing = isBatchGenerating && currentBatchIndex === idx;

              return (
                <div
                  key={seg.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 space-y-3 ${
                    isCurrentlyProcessing
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md'
                      : seg.status === 'completed'
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : seg.status === 'error'
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Segment Card Header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        Segmen #{idx + 1}
                      </span>

                      {/* Status Badges */}
                      {seg.status === 'idle' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Menunggu
                        </span>
                      )}
                      {seg.status === 'generating' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Sedang Generate...
                        </span>
                      )}
                      {seg.status === 'completed' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Selesai
                        </span>
                      )}
                      {seg.status === 'error' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Gagal
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Character Count */}
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isOverLimit 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {segLength.toLocaleString()} / 3,000 karakter
                      </span>

                      {/* Voice selector override */}
                      <select
                        value={seg.voiceId || selectedVoiceId}
                        onChange={(e) => handleUpdateVoice(seg.id, e.target.value)}
                        className="bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:border-blue-500 cursor-pointer max-w-[140px] truncate"
                        title="Pilih karakter suara untuk segmen ini"
                      >
                        {voices.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.gender})
                          </option>
                        ))}
                      </select>

                      {/* Reorder / Delete */}
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                        title="Geser ke atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === segments.length - 1}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                        title="Geser ke bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 transition-colors"
                        title="Hapus segmen ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Textarea for Segment */}
                  <textarea
                    value={seg.text}
                    onChange={(e) => handleUpdateText(seg.id, e.target.value)}
                    rows={4}
                    placeholder="Teks segmen ini..."
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-xs leading-relaxed text-slate-900 outline-none transition-all resize-y ${
                      isOverLimit ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />

                  {/* Error Notification */}
                  {seg.error && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{seg.error}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateSingle(seg.id)}
                        className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  )}

                  {/* Per Segment Audio Player & Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    {seg.audioUrl ? (
                      <div className="w-full sm:flex-1 flex items-center gap-3">
                        <audio 
                          src={seg.audioUrl} 
                          controls 
                          className="w-full h-9 rounded-full" 
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        {seg.status === 'generating' ? 'Membuat audio...' : 'Audio belum dibuat'}
                      </div>
                    )}

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleGenerateSingle(seg.id)}
                        disabled={seg.status === 'generating' || !seg.text.trim()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        {seg.status === 'generating' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 text-blue-600" />
                        )}
                        <span>{seg.audioUrl ? 'Generate Ulang' : 'Generate Segmen Ini'}</span>
                      </button>

                      {seg.audioUrl && (
                        <a
                          href={seg.audioUrl}
                          download={`segmen-${idx + 1}-${segVoice.name.toLowerCase().replace(/\s+/g, '-')}.mp3`}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200"
                          title="Download MP3 segmen ini"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Bottom Summary & Actions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Total {segments.length} segmen &bull; {completedCount} selesai &bull; Suara utama:{' '}
              <strong className="text-slate-900">{activeVoice.name}</strong>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isBatchGenerating ? (
                <button
                  type="button"
                  onClick={handleGenerateAll}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Mulai Generate Semua
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopBatch}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black transition-all"
                >
                  Hentikan
                </button>
              )}

              <button
                type="button"
                onClick={handleMergeAll}
                disabled={completedCount === 0 || isMerging}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
              >
                <FileAudio className="w-3.5 h-3.5" />
                Gabung Semua VO (MP3)
              </button>
            </div>
          </div>

        </section>
      )}

    </div>
  );
};
