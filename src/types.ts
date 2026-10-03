export interface ActorItem {
  id: string;
  name: string;
  characterName: string;
  famousMovie: string;
  bioSnippet: string;
  searchKeywords: string[];
  visualStyle: string;
  tagColor: string;
  selected?: boolean; // Controls whether this actor is included in stitching
  originalVideoStart?: number; // Start timestamp in user's AI video (e.g. 0.0s)
  originalVideoEnd?: number; // End timestamp in user's AI video (e.g. 8.0s)
  clipDuration: number; // default 5 seconds for web clip
  trimStartTime?: number; // Start time for 5s cut (default 0)
  trimEndTime?: number; // End time for 5s cut (default 5)
  selectedClip?: VideoClip;
  customCaption?: string;
  seriesTitle?: string; // e.g. "' Full House '"
}

export interface VideoClip {
  clipId: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number; // in seconds
  source: string;
  genre?: string;
  isCustomUpload?: boolean;
  isYoutube?: boolean;
  youtubeId?: string;
  isInstagram?: boolean;
  instagramId?: string;
  webSearchQuery?: string;
  directStreamUrl?: string;
}

export interface AIDetectionResult {
  title: string;
  summary: string;
  genre: string;
  suggestedBgm: string;
  actors: ActorItem[];
}

export type AspectRatio = '9:16' | '16:9' | '1:1';
export type TransitionType = 'flash' | 'crossfade' | 'zoom-blur' | 'fade-black' | 'wipe';
export type BgmTrack = 'custom' | 'none' | 'epic' | 'action' | 'emotional' | 'synth';
export type VerticalFitMode = 'full-cover' | 'blur-fill' | 'smart-crop' | 'cinema-frame';
export type StitchMode = 'interleaved' | 'intro-compilation' | 'compilation-only';
export type CaptionStyle = 'green-glow' | 'cinema-badge' | 'minimal';

export interface LogoSettings {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  imageUrl?: string;
  textStyle?: 'white-badge' | 'green-glow' | 'gold-neon';
  opacity: number; // 0.2 to 1.0
  size: 'small' | 'medium' | 'large';
  position: 'top-right' | 'top-left' | 'bottom-right';
}

export interface StitchSettings {
  aspectRatio: AspectRatio;
  verticalFitMode?: VerticalFitMode; // for 9:16
  stitchMode?: StitchMode; // 'interleaved' (Đan xen AI + Clip thật 5s theo mẫu người dùng)
  captionStyle?: CaptionStyle; // 'green-glow' (Chữ xanh lá viền đen chuẩn video mẫu)
  transition: TransitionType;
  transitionDuration: number; // e.g. 0.5s
  bgm: BgmTrack;
  bgmVolume: number;
  customBgmUrl?: string;
  customBgmName?: string;
  showLowerThird: boolean;
  showActorBadge: boolean;
  resolutionQuality: '1080p' | '720p';
  includeOriginalIntro?: boolean;
  introDuration?: number;
  logo?: LogoSettings;
}

