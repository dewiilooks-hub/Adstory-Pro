
export interface SceneRow {
  no: number;
  visualScene: string;
  imagePrompt: string;
  videoPrompt: string;
  audioScript: string;
  textOverlay: string;
}

export interface AdPlanResponse {
  contentTitle: string; // Judul Konten
  killerHook: string; // Emosi: FOMO/Curiosity/Solusi
  productDescription: string; // Deskripsi Produk Inti (Visual/Bahan/Warna)
  scenes: SceneRow[];
}

export enum VoiceCharacter {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export const SUPPORTED_LANGUAGES = [
  { code: 'id-ID', label: 'Indonesia' },
  { code: 'ms-MY', label: 'Malaysia' },
  { code: 'th-TH', label: 'Thailand' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'vi-VN', label: 'Vietnamese' },
  { code: 'zh-CN', label: 'Mandarin (Simplified)' },
  { code: 'ar-XA', label: 'Arabic' },
  { code: 'es-ES', label: 'Spanish' },
];

export enum ContentStyle {
  Cinematic = 'Cinematic',
  UGC = 'UGC (TikTok/Reels)',
  Faceless = 'Faceless (POV/ASMR)',
  Model = 'Lifestyle Model',
}

export interface GeneratedAsset {
  type: 'image' | 'audio' | 'video';
  data: string; // Base64, Blob URL, or Raw Data
  loading: boolean;
  error?: string;
}

export interface AssetMap {
  [rowIndex: number]: {
    image?: GeneratedAsset;
    audio?: GeneratedAsset;
    video?: GeneratedAsset;
  };
}
