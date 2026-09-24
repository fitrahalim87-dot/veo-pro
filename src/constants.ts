export interface Voice {
  id: string;
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
  category: 'Multilingual' | 'Indonesia' | 'English' | 'Anime & Jepang' | 'Asia & Arab';
  language: string;
  badge?: string;
  description: string;
}

export const EDGE_VOICES: Voice[] = [
  // 1. Multilingual Characters (Bisa baca semua bahasa, termasuk Indonesia, tanpa kaku)
  { 
    id: 'en-US-BrianMultilingualNeural', 
    name: 'Brian (CapCut Viral)', 
    gender: 'Laki-laki', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'CapCut Viral',
    description: 'Karakter favorit CapCut & TikTok: santai, maskulin, sangat luwes baca bahasa Indonesia' 
  },
  { 
    id: 'en-US-AndrewMultilingualNeural', 
    name: 'Alex / Andrew', 
    gender: 'Laki-laki', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Favorit Shorts',
    description: 'Cowok muda energik, vokal renyah, ekspresif, dan asyik untuk konten FYP' 
  },
  { 
    id: 'en-US-AvaMultilingualNeural', 
    name: 'Ava', 
    gender: 'Perempuan', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Modern',
    description: 'Cewek cerdas, santai, vokal jernih dengan artikulasi natural manusia asli' 
  },
  { 
    id: 'en-US-EmmaMultilingualNeural', 
    name: 'Emma', 
    gender: 'Perempuan', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Storyteller',
    description: 'Cewek bersahabat dan hangat, sangat cocok untuk narasi santai dan cerita' 
  },
  { 
    id: 'en-AU-WilliamMultilingualNeural', 
    name: 'William', 
    gender: 'Laki-laki', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Aussie Chill',
    description: 'Pria kasual santai, gaya bicara rileks dengan artikulasi yang jernih' 
  },
  { 
    id: 'fr-FR-VivienneMultilingualNeural', 
    name: 'Vivienne', 
    gender: 'Perempuan', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Elegan',
    description: 'Vokal wanita anggun, berkelas, fasih berbagai bahasa dengan gaya halus' 
  },
  { 
    id: 'fr-FR-RemyMultilingualNeural', 
    name: 'Remy', 
    gender: 'Laki-laki', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Artisik',
    description: 'Vokal pria bersahabat dengan nada bicara hangat dan komunikatif' 
  },
  { 
    id: 'de-DE-SeraphinaMultilingualNeural', 
    name: 'Seraphina', 
    gender: 'Perempuan', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Cerdas',
    description: 'Vokal wanita berpendidikan tinggi, artikulasi sempurna dan tenang' 
  },
  { 
    id: 'de-DE-FlorianMultilingualNeural', 
    name: 'Florian', 
    gender: 'Laki-laki', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Bariton',
    description: 'Vokal pria tegap, percaya diri, dan berkarakter kuat' 
  },
  { 
    id: 'ko-KR-HyunsuMultilingualNeural', 
    name: 'Hyunsu', 
    gender: 'Laki-laki', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'K-Star',
    description: 'Vokal cowok Korea muda, ekspresif dan fasih berbagai bahasa' 
  },
  { 
    id: 'pt-BR-ThalitaMultilingualNeural', 
    name: 'Thalita', 
    gender: 'Perempuan', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Ceria & Luwes',
    description: 'Vokal cewek ceria, berjiwa muda, artikulasi ekspresif bisa semua bahasa' 
  },
  { 
    id: 'it-IT-GiuseppeMultilingualNeural', 
    name: 'Giuseppe', 
    gender: 'Laki-laki', 
    category: 'Multilingual',
    language: 'Multilingual (Bisa Semua Bahasa)',
    badge: 'Karismatik',
    description: 'Vokal pria karismatik, hangat, luwes membaca berbagai bahasa' 
  },

  // 2. Indonesia & Bahasa Daerah
  { 
    id: 'id-ID-GadisNeural', 
    name: 'Gadis', 
    gender: 'Perempuan', 
    category: 'Indonesia',
    language: 'Indonesia',
    badge: 'Favorit TikTok',
    description: 'Suara cewek paling populer dan sering dipakai video TikTok di Indonesia' 
  },
  { 
    id: 'id-ID-ArdiNeural', 
    name: 'Ardi', 
    gender: 'Laki-laki', 
    category: 'Indonesia',
    language: 'Indonesia',
    badge: 'Narator Podcast',
    description: 'Suara cowok berwibawa, rapi, dan artikulasi bahasa Indonesia sangat jelas' 
  },
  { 
    id: 'jv-ID-SitiNeural', 
    name: 'Siti (Jawa)', 
    gender: 'Perempuan', 
    category: 'Indonesia',
    language: 'Jawa',
    description: 'Aksen bahasa Jawa halus dan merdu' 
  },
  { 
    id: 'jv-ID-DimasNeural', 
    name: 'Dimas (Jawa)', 
    gender: 'Laki-laki', 
    category: 'Indonesia',
    language: 'Jawa',
    description: 'Aksen bahasa Jawa medok dan santai' 
  },
  { 
    id: 'su-ID-TutiNeural', 
    name: 'Tuti (Sunda)', 
    gender: 'Perempuan', 
    category: 'Indonesia',
    language: 'Sunda',
    description: 'Aksen bahasa Sunda ramah dan lembut' 
  },
  { 
    id: 'su-ID-JajangNeural', 
    name: 'Jajang (Sunda)', 
    gender: 'Laki-laki', 
    category: 'Indonesia',
    language: 'Sunda',
    description: 'Aksen bahasa Sunda khas dan berkarakter' 
  },

  // 3. Karakter Populer (Fasih Indo & English Bebas Logat Bule)
  { 
    id: 'en-US-JennyNeural', 
    name: 'Jenny (Ramah)', 
    gender: 'Perempuan', 
    category: 'English',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Ramah & Luwes',
    description: 'Vokal cewek ramah dan ceria untuk vlog/tutorial. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'en-US-GuyNeural', 
    name: 'Guy (Podcast)', 
    gender: 'Laki-laki', 
    category: 'English',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Podcast Santai',
    description: 'Pria kasual santai ala obrolan podcast. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'en-US-AriaNeural', 
    name: 'Aria (Story)', 
    gender: 'Perempuan', 
    category: 'English',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Storyteller',
    description: 'Narasi cewek hangat & emosional untuk cerita/novel. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'en-US-ChristopherNeural', 
    name: 'Christopher (Deep Movie)', 
    gender: 'Laki-laki', 
    category: 'English',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Sinematik Bass',
    description: 'Bariton berat, gagah, dan sinematik untuk trailer film. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'en-US-AnaNeural', 
    name: 'Ana (Bocil / Imut)', 
    gender: 'Perempuan', 
    category: 'English',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Imut Lucu',
    description: 'Vokal anak-anak/bocil ceria menggemaskan. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'en-GB-SoniaNeural', 
    name: 'Sonia (Elegan)', 
    gender: 'Perempuan', 
    category: 'English',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Elegan',
    description: 'Wanita elegan dan berkelas untuk narasi mewah. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'en-GB-RyanNeural', 
    name: 'Ryan (Dokumenter)', 
    gender: 'Laki-laki', 
    category: 'English',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Dokumenter',
    description: 'Pria karismatik khas dokumenter sejarah dan sains. 100% fasih Indo & Inggris tanpa logat bule' 
  },

  // 4. Anime & Jepang
  { 
    id: 'ja-JP-NanamiNeural', 
    name: 'Nanami (Anime Waifu)', 
    gender: 'Perempuan', 
    category: 'Anime & Jepang',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Anime Girl',
    description: 'Suara cewek anime manis dan ceria ala waifu Jepang. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'ja-JP-KeitaNeural', 
    name: 'Keita (Anime Hero)', 
    gender: 'Laki-laki', 
    category: 'Anime & Jepang',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Anime Boy',
    description: 'Suara cowok energik ala protagonis serial anime. 100% fasih Indo & Inggris tanpa logat bule' 
  },

  // 5. Asia & Arab
  { 
    id: 'ko-KR-SunHiNeural', 
    name: 'Sun-Hi (K-Drama)', 
    gender: 'Perempuan', 
    category: 'Asia & Arab',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'K-Drama',
    description: 'Suara cewek emosional dan manis ala drakor. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'ko-KR-InJoonNeural', 
    name: 'In-Joon (K-Pop)', 
    gender: 'Laki-laki', 
    category: 'Asia & Arab',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'K-Pop',
    description: 'Suara cowok bersemangat dan modern. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'ar-SA-HamedNeural', 
    name: 'Hamed (Arab)', 
    gender: 'Laki-laki', 
    category: 'Asia & Arab',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Berwibawa',
    description: 'Suara pria Arab fasih dengan intonasi jelas. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'ar-SA-ZariyahNeural', 
    name: 'Zariyah (Arab)', 
    gender: 'Perempuan', 
    category: 'Asia & Arab',
    language: 'Indo & English (Bebas Logat Bule)',
    description: 'Suara wanita Arab anggun dan lembut. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'zh-CN-XiaoxiaoNeural', 
    name: 'Xiaoxiao (Mandarin)', 
    gender: 'Perempuan', 
    category: 'Asia & Arab',
    language: 'Indo & English (Bebas Logat Bule)',
    badge: 'Mandarin Host',
    description: 'Suara cewek Mandarin jernih dan santai. 100% fasih Indo & Inggris tanpa logat bule' 
  },
  { 
    id: 'zh-CN-YunxiNeural', 
    name: 'Yunxi (Mandarin)', 
    gender: 'Laki-laki', 
    category: 'Asia & Arab',
    language: 'Indo & English (Bebas Logat Bule)',
    description: 'Suara cowok Mandarin muda yang energik. 100% fasih Indo & Inggris tanpa logat bule' 
  },
];

export interface VoicePreset {
  name: string;
  icon: string;
  speed: number; // percentage offset e.g. 0 = normal, 20 = +20%
  pitch: number; // Hz offset e.g. 0 = normal, 15 = +15Hz
  description: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { name: 'Normal / Santai', icon: '☕', speed: 0, pitch: 0, description: 'Kecepatan dan nada alami' },
  { name: 'Narator TikTok', icon: '⚡', speed: 20, pitch: 2, description: 'Cepat & energik untuk video FYP' },
  { name: 'Storytelling', icon: '📖', speed: -10, pitch: -3, description: 'Tenang & emosional untuk cerita' },
  { name: 'Ceria / Antusias', icon: '✨', speed: 15, pitch: 12, description: 'Semangat tinggi & bernada riang' },
  { name: 'Sinematik / Deep', icon: '🎬', speed: -15, pitch: -15, description: 'Berat & berwibawa ala trailer' },
  { name: 'Imut / Kartun', icon: '🐣', speed: 25, pitch: 25, description: 'Nada tinggi & lucu' },
];
