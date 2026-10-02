import { blobToBase64 } from './ttsService';

export interface VideoTemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  gradient: [string, string, string];
  accentColor: string;
  waveformColor: string;
  iconType: 'mic' | 'sparkles' | 'moon' | 'flame' | 'music' | 'cpu';
}

export const VIDEO_PRESETS: VideoTemplatePreset[] = [
  {
    id: 'podcast_emerald',
    name: 'Studio Podcast',
    category: 'Podcast & Talkshow',
    description: 'Nuansa gelap elegan dengan aksen hijau emerald neon khas podcast modern.',
    gradient: ['#091316', '#0f2b26', '#061a15'],
    accentColor: '#10b981',
    waveformColor: '#10b981',
    iconType: 'mic',
  },
  {
    id: 'tiktok_neon',
    name: 'TikTok & Reels Neon',
    category: 'Shorts & Reels',
    description: 'Gradien ungu dan magenta menyala, sangat kontras untuk FYP TikTok & Reels.',
    gradient: ['#180b2c', '#2d0e52', '#0f051d'],
    accentColor: '#ec4899',
    waveformColor: '#ec4899',
    iconType: 'sparkles',
  },
  {
    id: 'mystery_dark',
    name: 'Kisah Misteri & Horor',
    category: 'Storytelling',
    description: 'Latar gelap pekat sinematik dengan kabut dan aksen merah darah membara.',
    gradient: ['#12080a', '#240d12', '#080304'],
    accentColor: '#f43f5e',
    waveformColor: '#ef4444',
    iconType: 'moon',
  },
  {
    id: 'motivation_gold',
    name: 'Motivasi & Bisnis Gold',
    category: 'Edukasi & Bisnis',
    description: 'Dominasi obsidian mewah dengan sentuhan emas brushed gold eksklusif.',
    gradient: ['#121316', '#1c1b17', '#0c0c0e'],
    accentColor: '#eab308',
    waveformColor: '#f59e0b',
    iconType: 'flame',
  },
  {
    id: 'anime_lofi',
    name: 'Anime & Lo-Fi Sunset',
    category: 'Anime & Santai',
    description: 'Pemandangan senja ungu jingga pastel yang syahdu untuk dubbing & kartun.',
    gradient: ['#1e112a', '#391c49', '#150a21'],
    accentColor: '#8b5cf6',
    waveformColor: '#a78bfa',
    iconType: 'music',
  },
  {
    id: 'tech_cyber',
    name: 'AI Cyber Matrix',
    category: 'Teknologi & AI',
    description: 'Grid futuristik dengan nuansa biru cyan menyala khas kecerdasan buatan.',
    gradient: ['#041426', '#08253f', '#020b14'],
    accentColor: '#06b6d4',
    waveformColor: '#06b6d4',
    iconType: 'cpu',
  }
];

export interface GenerateVideoOptions {
  audioBlobOrUrl: Blob | string;
  presetId?: string;
  customImageBase64?: string | null;
  aspectRatio: '9:16' | '16:9' | '1:1';
  title?: string;
  subtitle?: string;
  includeWaveform?: boolean;
  onProgress?: (msg: string) => void;
}

/**
 * Draws a high-definition static poster/placeholder image on a Canvas
 */
export async function renderCompositePoster(
  aspectRatio: '9:16' | '16:9' | '1:1',
  preset: VideoTemplatePreset,
  customImageBase64: string | null | undefined,
  title: string,
  subtitle: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  let width = 1080;
  let height = 1920;

  if (aspectRatio === '16:9') {
    width = 1920;
    height = 1080;
  } else if (aspectRatio === '1:1') {
    width = 1080;
    height = 1080;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  // 1. Draw Background (Custom Image or Gradient Preset)
  if (customImageBase64) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = customImageBase64;
    });

    // Fill background with subtle blur or cover
    const scale = Math.max(width / img.width, height / img.height);
    const x = (width - img.width * scale) / 2;
    const y = (height - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // Apply dark aesthetic overlay so text pops
    const darkGrad = ctx.createLinearGradient(0, 0, 0, height);
    darkGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
    darkGrad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    darkGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Beautiful Multi-stop Mesh/Linear Gradient
    const grad = ctx.createLinearGradient(0, 0, width * 0.4, height);
    grad.addColorStop(0, preset.gradient[0]);
    grad.addColorStop(0.5, preset.gradient[1]);
    grad.addColorStop(1, preset.gradient[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add glowing radial ambient orbs
    const radial = ctx.createRadialGradient(
      width * 0.5,
      height * 0.4,
      50,
      width * 0.5,
      height * 0.4,
      width * 0.6
    );
    radial.addColorStop(0, `${preset.accentColor}33`);
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Grid pattern background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const step = 60;
    for (let lx = 0; lx < width; lx += step) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }
    for (let ly = 0; ly < height; ly += step) {
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(width, ly);
      ctx.stroke();
    }
  }

  // 2. Draw Top Branding Badge
  const topY = height * 0.12;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = `${preset.accentColor}66`;
  ctx.lineWidth = 2;
  const badgeW = 280;
  const badgeH = 48;
  const badgeX = (width - badgeW) / 2;
  roundRect(ctx, badgeX, topY, badgeW, badgeH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = preset.accentColor;
  ctx.font = 'bold 18px "Inter", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎙️ VEO PRO AUDIO VISUALIZER', width / 2, topY + badgeH / 2);
  ctx.restore();

  // 3. Central Icon / Visual Core
  const centerY = height * 0.38;
  ctx.save();
  const iconRadius = Math.min(width, height) * 0.13;

  // Outer glowing pulse ring
  ctx.beginPath();
  ctx.arc(width / 2, centerY, iconRadius * 1.25, 0, Math.PI * 2);
  ctx.strokeStyle = `${preset.accentColor}33`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner gradient circle
  const circleGrad = ctx.createLinearGradient(
    width / 2 - iconRadius,
    centerY - iconRadius,
    width / 2 + iconRadius,
    centerY + iconRadius
  );
  circleGrad.addColorStop(0, `${preset.accentColor}dd`);
  circleGrad.addColorStop(1, `${preset.accentColor}44`);
  ctx.fillStyle = circleGrad;
  ctx.beginPath();
  ctx.arc(width / 2, centerY, iconRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${preset.accentColor}ee`;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Center Emoji / Symbol
  ctx.font = `${Math.round(iconRadius * 0.9)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbol = preset.iconType === 'mic' ? '🎙️' :
    preset.iconType === 'sparkles' ? '✨' :
    preset.iconType === 'moon' ? '🌙' :
    preset.iconType === 'flame' ? '🔥' :
    preset.iconType === 'music' ? '🎧' : '🤖';
  ctx.fillText(symbol, width / 2, centerY + 4);
  ctx.restore();

  // 4. Title Text
  const titleY = height * 0.58;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 46px "Inter", -apple-system, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 12;

  // Wrap text nicely to max width
  const maxTitleW = width * 0.85;
  const cleanTitle = title.trim() || 'Audio Voice Over';
  wrapText(ctx, cleanTitle, width / 2, titleY, maxTitleW, 58, 3);
  ctx.restore();

  // 5. Subtitle Text
  const subY = height * 0.72;
  ctx.save();
  ctx.fillStyle = preset.accentColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 24px "Inter", -apple-system, sans-serif';
  const cleanSub = subtitle.trim() || 'Voice Over by VEO Pro';
  ctx.fillText(cleanSub, width / 2, subY);
  ctx.restore();

  // 6. Visual Soundwave Placeholder Bar Line (Under subtitle)
  const waveY = height * 0.82;
  const waveBarW = width * 0.82;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, (width - waveBarW) / 2, waveY + 28, waveBarW, 4, 2);
  ctx.fill();
  ctx.restore();

  return canvas.toDataURL('image/png', 0.95);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
) {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        line = line + '...';
        break;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

/**
 * Combines Audio + Image into MP4 Video using FFmpeg
 */
export async function createMp4Video(options: GenerateVideoOptions): Promise<{ url: string; blob: Blob }> {
  const {
    audioBlobOrUrl,
    presetId = 'podcast_emerald',
    customImageBase64,
    aspectRatio = '9:16',
    title = 'Audio Voice Over',
    subtitle = 'VEO Pro Multilingual',
    includeWaveform = true,
    onProgress
  } = options;

  onProgress?.('Sedang merancang tampilan poster video HD...');

  const preset = VIDEO_PRESETS.find(p => p.id === presetId) || VIDEO_PRESETS[0];

  // 1. Render high-res composite poster image
  const posterBase64 = await renderCompositePoster(
    aspectRatio,
    preset,
    customImageBase64,
    title,
    subtitle
  );

  // 2. Prepare audio base64
  onProgress?.('Mempersiapkan audio track...');
  let audioBase64 = '';
  if (typeof audioBlobOrUrl === 'string') {
    if (audioBlobOrUrl.startsWith('data:')) {
      audioBase64 = audioBlobOrUrl;
    } else {
      const res = await fetch(audioBlobOrUrl);
      const blob = await res.blob();
      audioBase64 = await blobToBase64(blob);
    }
  } else {
    audioBase64 = await blobToBase64(audioBlobOrUrl);
  }

  // 3. Request server-side FFmpeg MP4 generation
  onProgress?.('FFmpeg sedang me-render video MP4 H.264 + AAC...');

  const response = await fetch('/api/video/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      imageBase64: posterBase64,
      aspectRatio,
      includeWaveform,
      waveformColor: preset.waveformColor.replace('#', '0x'),
      title,
      subtitle
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Gagal membuat video MP4';
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) errorMsg = text.slice(0, 150);
    }
    throw new Error(errorMsg);
  }

  onProgress?.('Menyelesaikan encoding video MP4...');
  const videoBlob = await response.blob();
  const typedBlob = new Blob([videoBlob], { type: 'video/mp4' });
  const url = URL.createObjectURL(typedBlob);

  return { url, blob: typedBlob };
}
