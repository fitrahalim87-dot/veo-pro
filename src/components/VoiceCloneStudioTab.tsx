import React from 'react';

interface Props {
  onSaveToHistory: (item: { name: string; url: string; voiceName: string }) => void;
}

export const COLAB_NOTEBOOK_URL = "https://colab.research.google.com/drive/1C6iGmtFtesHJCysx3hQgvmqWPa3GdqeG";

export const VoiceCloneStudioTab: React.FC<Props> = () => {
  return (
    <div className="space-y-3.5 w-full">
      {/* Floating Slim Info Helper Bar */}
      <div className="bg-amber-50/90 backdrop-blur-md border border-amber-200 text-amber-950 text-[11px] sm:text-xs rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0 mt-1 sm:mt-0" />
          <p className="font-bold leading-normal">
            Penting: browser seluler sering memblokir tombol "Masuk" di dalam bingkai (iframe). Jika macet, klik tombol di kanan:
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <a
            href="https://aniki.vibecoder.co.id/voicegen/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-initial px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm text-center"
          >
            <span>Buka Tab Baru 🚀</span>
          </a>
          <a
            href={COLAB_NOTEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-initial px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm text-center"
          >
            <span>Buka Colab ⚡</span>
          </a>
        </div>
      </div>

      <div className="w-full h-[calc(100vh-210px)] sm:h-[calc(100vh-250px)] min-h-[620px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
        <iframe
          src="https://aniki.vibecoder.co.id/voicegen/dashboard"
          title="VONIGEN by AniKi"
          className="w-full h-full border-none bg-white"
          allow="microphone; camera; autoplay; clipboard-write; display-capture; fullscreen"
        />
      </div>
    </div>
  );
};
