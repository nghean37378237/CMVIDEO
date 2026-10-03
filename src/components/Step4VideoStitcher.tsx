import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Play,
  Pause,
  Download,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Scissors,
  Check,
  Smartphone,
  Tv,
  Wand2,
  Sliders,
  Image as ImageIcon,
  Type,
  Upload,
  Music,
  Trash2,
} from 'lucide-react';
import { ActorItem, StitchSettings, TransitionType } from '../types';
import { stitchActorVideos, StitchProgress } from '../utils/videoStitcher';
import { CinematicMotionPlayer } from './CinematicMotionPlayer';
import { getBestHighlightForActor, autoOptimizeAllActors } from '../utils/highlightHelper';

interface Step4VideoStitcherProps {
  actors: ActorItem[];
  originalVideoUrl?: string;
  onBack: () => void;
  onRestart: () => void;
  onActorsChange?: (actors: ActorItem[]) => void;
}

export const Step4VideoStitcher: React.FC<Step4VideoStitcherProps> = ({
  actors,
  originalVideoUrl,
  onBack,
  onRestart,
  onActorsChange,
}) => {
  const [settings, setSettings] = useState<StitchSettings>({
    aspectRatio: '9:16', // Always Fixed 9:16 as requested by user
    verticalFitMode: 'full-cover', // Default Full Screen 9:16 (Tràn viền 100%)
    stitchMode: originalVideoUrl ? 'interleaved' : 'compilation-only', // Interleaved mode (AI -> Added Clip -> AI -> Added Clip)
    captionStyle: 'green-glow', // Green neon name overlay matching user's video
    transition: 'flash', // Film Flash transition by default (Cinematic & viral)
    transitionDuration: 0.5,
    bgm: 'none', // ALL DEFAULT SYNTH BGM TURNED OFF 100% AS REQUESTED!
    bgmVolume: 0.8,
    showLowerThird: true,
    showActorBadge: true,
    resolutionQuality: '1080p',
    includeOriginalIntro: !!originalVideoUrl,
    logo: {
      enabled: true,
      type: 'text',
      text: 'AI CINEMA', // Default brand logo in top-right corner
      opacity: 0.9,
      size: 'medium',
      position: 'top-right',
    },
  });

  // Current playing actor and subphase
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentActorIndex, setCurrentActorIndex] = useState<number>(0);
  const [currentSubPhase, setCurrentSubPhase] = useState<'original' | 'clip'>('original');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [highlightToast, setHighlightToast] = useState<string>('');
  const [transitionFlash, setTransitionFlash] = useState<boolean>(false);

  // Custom User Audio Upload state
  const [customAudioPlaying, setCustomAudioPlaying] = useState<boolean>(false);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<StitchProgress | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);

  const aiVideoRef = useRef<HTMLVideoElement>(null);
  const clipVideoRef = useRef<HTMLVideoElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  const currentActor = actors[currentActorIndex] || actors[0];

  // Calculate approximate total duration
  const totalDuration = actors.reduce((acc, curr) => {
    const aiDur = curr.originalVideoEnd ? curr.originalVideoEnd - (curr.originalVideoStart || 0) : 7;
    return acc + (originalVideoUrl ? aiDur : 0) + (curr.clipDuration || 5);
  }, 0);

  // Sequential Playback Controller (Auto-transitions between AI video and Added Clip with Cinematic Flash)
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(timerRef.current);
      aiVideoRef.current?.pause();
      clipVideoRef.current?.pause();
      if (customAudioRef.current) customAudioRef.current.pause();
      setCustomAudioPlaying(false);
      return;
    }

    // Play user custom audio in preview if uploaded
    if (customAudioRef.current && settings.customBgmUrl && settings.bgm === 'custom') {
      customAudioRef.current.play().catch(() => {});
      setCustomAudioPlaying(true);
    }

    // Trigger visual cinematic transition flash on screen
    setTransitionFlash(true);
    const flashTimer = setTimeout(() => setTransitionFlash(false), 450);

    // Determine current duration for this phase
    let phaseDuration = 5;
    if (currentSubPhase === 'original') {
      const segStart = currentActor?.originalVideoStart ?? currentActorIndex * 7;
      const segEnd = currentActor?.originalVideoEnd ?? segStart + 7;
      phaseDuration = Math.max(3, segEnd - segStart);

      if (aiVideoRef.current) {
        aiVideoRef.current.currentTime = segStart;
        aiVideoRef.current.play().catch(() => {});
      }
    } else {
      phaseDuration = currentActor?.clipDuration || 5;
      if (clipVideoRef.current && currentActor?.selectedClip?.url) {
        clipVideoRef.current.currentTime = currentActor.trimStartTime || 0;
        clipVideoRef.current.play().catch(() => {});
      }
    }

    setPhaseSecondsLeft(phaseDuration);
    let remaining = phaseDuration;

    timerRef.current = setInterval(() => {
      remaining -= 0.5;
      setPhaseSecondsLeft(Math.max(0, Math.round(remaining * 10) / 10));

      if (remaining <= 0) {
        clearInterval(timerRef.current);

        // Transition: if in 'original' phase, go to 'clip' phase
        if (currentSubPhase === 'original') {
          setCurrentSubPhase('clip');
        } else {
          // If in 'clip' phase, go to next actor's 'original' phase
          if (currentActorIndex < actors.length - 1) {
            setCurrentActorIndex((prev) => prev + 1);
            setCurrentSubPhase('original');
          } else {
            // Finished all actors, loop back to start
            setCurrentActorIndex(0);
            setCurrentSubPhase('original');
          }
        }
      }
    }, 500);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(flashTimer);
    };
  }, [isPlaying, currentActorIndex, currentSubPhase]);

  // Jump to specific actor and phase
  const handleJumpToSegment = (actorIdx: number, phase: 'original' | 'clip') => {
    setCurrentActorIndex(actorIdx);
    setCurrentSubPhase(phase);
    setIsPlaying(true);
  };

  // Toggle play/pause
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Set 5s trim start for current actor
  const handleSetTrimStart = (newStart: number) => {
    const updated = actors.map((a, idx) =>
      idx === currentActorIndex ? { ...a, trimStartTime: Math.max(0, newStart) } : a
    );
    onActorsChange?.(updated);

    if (clipVideoRef.current) {
      clipVideoRef.current.currentTime = newStart;
    }
  };

  // Auto pick best 5s highlight for current actor
  const handleAutoPickBestForCurrent = () => {
    const highlight = getBestHighlightForActor(currentActor);
    handleSetTrimStart(highlight.start);
    setHighlightToast(`Đã chọn 5s đẹp nhất cho ${currentActor.name}: ${highlight.label}`);
    setTimeout(() => setHighlightToast(''), 3500);
  };

  // Auto optimize best 5s for ALL actors
  const handleAutoOptimizeAll = () => {
    const optimized = autoOptimizeAllActors(actors);
    onActorsChange?.(optimized);
    setHighlightToast(`⚡ Đã tự động cắt 5s đẹp nhất cho toàn bộ ${actors.length} diễn viên!`);
    setTimeout(() => setHighlightToast(''), 4000);
  };

  // Handle Logo Image Upload
  const handleLogoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings((prev) => ({
      ...prev,
      logo: {
        ...(prev.logo || {
          enabled: true,
          type: 'image',
          text: '',
          opacity: 0.9,
          size: 'medium',
          position: 'top-right',
        }),
        enabled: true,
        type: 'image',
        imageUrl: url,
      },
    }));
    setHighlightToast('Đã tải ảnh Logo lên góc Phải thành công!');
    setTimeout(() => setHighlightToast(''), 3000);
  };

  // Handle User Custom Audio File Upload
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings((prev) => ({
      ...prev,
      bgm: 'custom',
      customBgmUrl: url,
      customBgmName: file.name,
    }));
    setHighlightToast(`🎵 Đã nạp file nhạc nền: ${file.name}`);
    setTimeout(() => setHighlightToast(''), 4000);
  };

  // Toggle listening to custom audio preview
  const handleToggleCustomAudioPreview = () => {
    if (!customAudioRef.current) return;
    if (customAudioPlaying) {
      customAudioRef.current.pause();
      setCustomAudioPlaying(false);
    } else {
      customAudioRef.current.play().catch(() => {});
      setCustomAudioPlaying(true);
    }
  };

  // Remove custom audio
  const handleRemoveCustomAudio = () => {
    if (customAudioRef.current) {
      customAudioRef.current.pause();
    }
    setCustomAudioPlaying(false);
    setSettings((prev) => ({
      ...prev,
      bgm: 'none',
      customBgmUrl: undefined,
      customBgmName: undefined,
    }));
    setHighlightToast('Đã xóa nhạc nền (video xuất ra sẽ không có nhạc nền)');
    setTimeout(() => setHighlightToast(''), 3500);
  };

  // Start real video stitching and export
  const handleStartExport = async () => {
    setIsPlaying(false);
    clearInterval(timerRef.current);
    aiVideoRef.current?.pause();
    clipVideoRef.current?.pause();
    if (customAudioRef.current) customAudioRef.current.pause();
    setCustomAudioPlaying(false);

    setIsExporting(true);
    setExportProgress({
      currentActorIndex: 0,
      totalActors: actors.length,
      actorName: 'Bắt đầu',
      percent: 0,
      stage: 'Chuẩn bị dữ liệu và khung hình canvas 9:16...',
    });

    try {
      const blob = await stitchActorVideos(
        actors,
        settings,
        (p) => {
          setExportProgress(p);
        },
        originalVideoUrl
      );

      setExportedBlob(blob);
      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
    } catch (err: any) {
      console.error('Lỗi ghép video:', err);
      alert('Có lỗi xảy ra trong quá trình ghép video: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsExporting(false);
    }
  };

  // Download exported video
  const handleDownload = () => {
    if (!exportedVideoUrl && !exportedBlob) return;
    const a = document.createElement('a');
    a.href = exportedVideoUrl || URL.createObjectURL(exportedBlob!);
    a.download = `video_ghep_dan_xen_9_16_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const clip = currentActor?.selectedClip;
  const trimStart = currentActor?.trimStartTime || 0;
  const trimEnd = trimStart + (currentActor?.clipDuration || 5);
  const bestHighlight = getBestHighlightForActor(currentActor);

  const isFullCover = settings.verticalFitMode === 'full-cover';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <Smartphone className="w-3.5 h-3.5" />
              Bước 4: Xem trước &amp; Xuất video đan xen (Cố định khung 9:16)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Ghép đan xen: [Đoạn AI Gốc] &rarr; [Video Thêm Vào 5s]
            </h2>
            <p className="mt-1 text-slate-300 text-xs sm:text-sm">
              Nhạc nền mặc định đã <strong>tắt hoàn toàn</strong>. Bạn có thể <strong>tải file nhạc riêng của mình lên</strong> trước khi bấm ghép và xuất video!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleStartExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-rose-600 via-rose-500 to-emerald-600 hover:from-rose-500 hover:to-emerald-500 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isExporting ? 'Đang xuất video...' : 'Bắt đầu ghép video 9:16'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {highlightToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2 shadow-lg animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{highlightToast}</span>
        </div>
      )}

      {/* Export Result Notification Banner */}
      {exportedVideoUrl && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Video 9:16 đã ghép hoàn tất!</h4>
              <p className="text-xs text-slate-300">
                Toàn bộ {actors.length} diễn viên đã được ghép đan xen chuẩn 9:16 dọc {isFullCover ? 'Full màn tràn viền' : 'Vừa vặn'}.
                {settings.customBgmName ? ` (Đã lồng nhạc: ${settings.customBgmName})` : ' (Không có nhạc nền tự động)'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition shrink-0"
          >
            <Download className="w-4 h-4" />
            Tải video 9:16 về máy
          </button>
        </div>
      )}

      {/* Main Visual Display: Fixed 9:16 Center Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Fixed 9:16 Screen & Controls */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col items-center">
          {/* Phase Badge & Status */}
          <div className="w-full flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full shadow flex items-center gap-1.5 ${
                  currentSubPhase === 'original'
                    ? 'bg-rose-600 text-white ring-2 ring-rose-500/50'
                    : 'bg-emerald-600 text-white ring-2 ring-emerald-500/50'
                }`}
              >
                {currentSubPhase === 'original'
                  ? `[1/2] ĐOẠN AI GỐC (#${currentActorIndex + 1})`
                  : `[2/2] VIDEO THẬT 5S (#${currentActorIndex + 1})`}
              </span>
              <span className="text-xs text-slate-300 font-semibold truncate max-w-[130px]">
                {currentActor?.name}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400">Tự chuyển sau: </span>
              <span className="font-mono text-xs font-bold text-amber-400">{phaseSecondsLeft}s</span>
            </div>
          </div>

          {/* MODE SELECTOR: Full Màn 9:16 vs Vừa vặn */}
          <div className="w-full flex items-center justify-between bg-slate-950 p-1.5 rounded-xl border border-slate-800 mb-3">
            <span className="text-[11px] font-bold text-slate-400 ml-1">Kiểu hiển thị 9:16:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSettings((prev) => ({ ...prev, verticalFitMode: 'full-cover' }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  isFullCover
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
                title="Zoom tràn viền 100% không để lại viền đen"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Full Màn 9:16 (Tràn viền 100%)
              </button>
              <button
                onClick={() => setSettings((prev) => ({ ...prev, verticalFitMode: 'blur-fill' }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  !isFullCover
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
                title="Thu nhỏ vừa vặn và phủ nền mờ xung quanh"
              >
                <Tv className="w-3.5 h-3.5" />
                Vừa vặn (Nền mờ)
              </button>
            </div>
          </div>

          {/* FIXED 9:16 CONTAINER (Always Vertical 9:16, Clean Phone Ratio) */}
          <div className="relative aspect-[9/16] w-full max-w-[280px] sm:max-w-[310px] bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
            {/* SUBPHASE 1: Original AI Video */}
            {currentSubPhase === 'original' ? (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                {originalVideoUrl ? (
                  <video
                    ref={aiVideoRef}
                    src={originalVideoUrl}
                    className="w-full h-full object-cover"
                    playsInline
                    muted={true}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-950">
                    <Film className="w-8 h-8 text-rose-500 mb-2" />
                    <p className="text-xs font-bold text-white">Đoạn video AI gốc</p>
                    <p className="text-[11px] text-slate-400 mt-1">{currentActor?.name}</p>
                  </div>
                )}
                {/* Overlay Tag for AI phase */}
                <div className="absolute top-3 left-3 z-30 pointer-events-none bg-black/80 text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">
                  AI Gốc ({currentActor?.originalVideoStart ?? currentActorIndex * 7}s &rarr; {currentActor?.originalVideoEnd ?? (currentActorIndex + 1) * 7}s)
                </div>
              </div>
            ) : (
              /* SUBPHASE 2: Added 5-Second Real Video Clip with Green Neon Overlay */
              <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
                {clip?.isYoutube && clip.youtubeId ? (
                  <iframe
                    key={`clip_${clip.youtubeId}`}
                    src={`https://www.youtube-nocookie.com/embed/${clip.youtubeId}?start=${Math.round(trimStart)}&end=${Math.round(trimEnd)}&autoplay=1&controls=0&mute=1&modestbranding=1`}
                    title={clip.title}
                    className={`w-full h-full border-0 transition-transform ${
                      isFullCover ? 'scale-[1.35] object-cover' : 'object-contain'
                    }`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : clip?.isInstagram && clip.instagramId && !clip.url.endsWith('.mp4') ? (
                  <iframe
                    key={`clip_${clip.instagramId}`}
                    src={`https://www.instagram.com/reel/${clip.instagramId}/embed/`}
                    title={clip.title}
                    className={`w-full h-full border-0 transition-transform ${
                      isFullCover ? 'scale-[1.3] object-cover' : 'object-contain'
                    }`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : clip?.url ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    {/* Background blur when in blur-fill mode */}
                    {!isFullCover && (
                      <div
                        className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-40 scale-125 pointer-events-none"
                        style={{
                          backgroundImage: clip.thumbnail ? `url(${clip.thumbnail})` : 'none',
                        }}
                      />
                    )}
                    <video
                      ref={clipVideoRef}
                      src={clip.url}
                      className={`relative z-10 w-full ${
                        isFullCover
                          ? 'h-full object-cover' // FULL MÀN 9:16 TRÀN VIỀN 100%
                          : 'max-h-[85%] object-contain'
                      }`}
                      playsInline
                      muted={true}
                    />
                  </div>
                ) : (
                  <CinematicMotionPlayer actor={currentActor} duration={5} />
                )}

                {/* Tag for real clip phase */}
                <div className="absolute top-3 left-3 z-30 pointer-events-none bg-black/80 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <span>Clip thật 5s ({trimStart.toFixed(1)}s &rarr; {trimEnd.toFixed(1)}s)</span>
                  {isFullCover && (
                    <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-black">
                      FULL
                    </span>
                  )}
                </div>

                {/* VIBRANT GREEN NEON TEXT OVERLAY (Exactly matching user's video) */}
                <div className="absolute bottom-5 inset-x-0 text-center z-30 pointer-events-none px-2">
                  <span
                    className="text-[#22c55e] font-black text-base sm:text-lg tracking-wider uppercase block"
                    style={{
                      textShadow:
                        '0 0 12px rgba(34,197,94,0.95), -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000',
                    }}
                  >
                    {currentActor?.name}
                  </span>
                </div>
              </div>
            )}

            {/* ✨ CINEMATIC TRANSITION FLASH OVERLAY ON SCREEN */}
            {transitionFlash && (
              <div
                className={`absolute inset-0 z-40 pointer-events-none transition-opacity duration-300 ${
                  settings.transition === 'flash'
                    ? 'bg-white opacity-85 animate-pulse'
                    : settings.transition === 'fade-black'
                    ? 'bg-black opacity-95'
                    : settings.transition === 'zoom-blur'
                    ? 'bg-gradient-to-r from-amber-400/80 via-white/95 to-rose-500/80 opacity-90'
                    : 'bg-white/40'
                }`}
              />
            )}

            {/* 🏷️ LOGO WATERMARK DISPLAYED IN TOP-RIGHT CORNER (Text or Image) */}
            {settings.logo?.enabled && (
              <div
                className="absolute top-3 right-3 z-30 pointer-events-none transition-all drop-shadow-md"
                style={{ opacity: settings.logo.opacity ?? 0.9 }}
              >
                {settings.logo.type === 'image' && settings.logo.imageUrl ? (
                  <img
                    src={settings.logo.imageUrl}
                    alt="Logo"
                    className={`object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ${
                      settings.logo.size === 'small' ? 'h-6' : settings.logo.size === 'large' ? 'h-11' : 'h-8'
                    }`}
                  />
                ) : settings.logo.text ? (
                  <div
                    className={`font-black tracking-wider uppercase drop-shadow-lg flex items-center justify-center ${
                      settings.logo.size === 'small'
                        ? 'text-[10px] px-2 py-0.5'
                        : settings.logo.size === 'large'
                        ? 'text-sm px-3.5 py-1.5'
                        : 'text-xs px-2.5 py-1'
                    } ${
                      settings.logo.textStyle === 'green-glow'
                        ? 'text-[#22c55e] bg-black/85 border-2 border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.85)] rounded-lg'
                        : settings.logo.textStyle === 'gold-neon'
                        ? 'text-amber-300 bg-black/85 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.85)] rounded-lg'
                        : 'text-white bg-slate-950/85 border border-white/30 backdrop-blur-md rounded-lg shadow-md'
                    }`}
                  >
                    {settings.logo.text}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Controls Bar: Play / Pause / Reset / Volume */}
          <div className="w-full flex items-center justify-between mt-3 px-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition"
                title={isPlaying ? 'Tạm dừng xem thử' : 'Phát xem thử đan xen'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  setCurrentActorIndex(0);
                  setCurrentSubPhase('original');
                  if (customAudioRef.current) customAudioRef.current.currentTime = 0;
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Về đầu danh sách"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Tiếng video gốc: <strong>TẮT 100%</strong></span>
              </span>

              <span className="text-[11px] text-slate-400">
                Tổng ~<strong>{totalDuration}s</strong>
              </span>
            </div>
          </div>

          {/* ⚡ SMART 5-SECOND TRIMMER & HIGHLIGHT ADJUSTER (Right in Step 4) */}
          <div className="w-full mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-rose-400" />
                Cắt 5s cho: <span className="text-emerald-400">{currentActor.name}</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {trimStart.toFixed(1)}s &rarr; {trimEnd.toFixed(1)}s (5 giây)
              </span>
            </div>

            {/* Auto Pick Best 5s Button */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleAutoPickBestForCurrent}
                className="flex-1 py-1.5 px-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                ⚡ Tự động cắt 5s đẹp nhất cho {currentActor.name}
              </button>
            </div>

            {/* Quick 5s Highlight Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Mốc nhanh:</span>
              <button
                onClick={() => handleSetTrimStart(bestHighlight.start)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                  Math.abs(trimStart - bestHighlight.start) < 0.2
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900 text-amber-300 border-amber-500/30 hover:bg-slate-800'
                }`}
              >
                ⚡ Đẹp nhất ({bestHighlight.start}s)
              </button>
              {[0, 5, 10, 15, 20].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleSetTrimStart(sec)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                    Math.abs(trimStart - sec) < 0.2
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {sec}s - {sec + 5}s
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={40}
              step={0.5}
              value={trimStart}
              onChange={(e) => handleSetTrimStart(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Right Column: Custom Audio + Logo Config + Transitions + Visual Interleaved Timeline */}
        <div className="lg:col-span-5 space-y-4">
          {/* 🎵 TẢI LÊN NHẠC NỀN CỦA BẠN (MP3 / WAV / M4A) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400" />
                Nhạc nền của bạn (MP3 / WAV)
              </h3>
              <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                {settings.customBgmName ? 'Đã có nhạc' : 'Nhạc mặc định: ĐÃ TẮT'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>Đã tắt 100% tiếng nói &amp; âm thanh gốc của các video</span>
              </div>
              <p className="text-slate-400 text-[10px]">
                Video xuất ra sẽ CHỈ phát bài nhạc bạn tải lên dưới đây (hoặc hoàn toàn im lặng nếu bạn không thêm nhạc).
              </p>
            </div>

            <input
              type="file"
              ref={audioFileInputRef}
              onChange={handleCustomAudioUpload}
              accept="audio/mp3,audio/wav,audio/aac,audio/m4a,audio/ogg"
              className="hidden"
            />

            {/* Custom Audio Element & Controller */}
            {settings.customBgmUrl ? (
              <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-2">
                <audio ref={customAudioRef} src={settings.customBgmUrl} loop />

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 truncate max-w-[200px]">
                    🎵 {settings.customBgmName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleCustomAudioPreview}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                    >
                      {customAudioPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {customAudioPlaying ? 'Dừng' : 'Nghe thử'}
                    </button>
                    <button
                      onClick={handleRemoveCustomAudio}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                      title="Gỡ bỏ file nhạc này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Volume slider */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Âm lượng nhạc:</span>
                  <span className="font-mono text-white font-bold">
                    {Math.round((settings.bgmVolume ?? 0.8) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={settings.bgmVolume ?? 0.8}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    setSettings((prev) => ({ ...prev, bgmVolume: vol }));
                    if (customAudioRef.current) customAudioRef.current.volume = vol;
                  }}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            ) : (
              <div
                onClick={() => audioFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/70 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 group"
              >
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition" />
                <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                  Nhấp để tải file nhạc MP3 / WAV từ máy tính
                </span>
                <span className="text-[10px] text-slate-500">
                  (Hệ thống sẽ lồng bài nhạc này vào video thành phẩm khi bạn xuất ra)
                </span>
              </div>
            )}
          </div>

          {/* 🏷️ KHUNG ĐIỀN LOGO TRÊN GÓC PHẢI */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                Khung Logo trên góc Phải
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.logo?.enabled ?? true}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      logo: {
                        ...(prev.logo || {
                          enabled: true,
                          type: 'text',
                          text: 'AI CINEMA',
                          opacity: 0.9,
                          size: 'medium',
                          position: 'top-right',
                        }),
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {settings.logo?.enabled && (
              <div className="space-y-3.5 pt-1 border-t border-slate-800/80">
                {/* 2 Clear Options: Text vs Image */}
                <div>
                  <label className="text-[11px] text-slate-300 font-bold block mb-1.5">
                    Chọn loại Logo hiển thị trên góc Phải:
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <button
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          logo: { ...prev.logo!, type: 'text' },
                        }))
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        settings.logo.type === 'text'
                          ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Type className="w-3.5 h-3.5" />
                      1. Chữ bạn nhập vào
                    </button>

                    <button
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          logo: { ...prev.logo!, type: 'image' },
                        }))
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        settings.logo.type === 'image'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      2. Tải ảnh Logo lên
                    </button>
                  </div>
                </div>

                {/* Option 1: Text Input & Presets */}
                {settings.logo.type === 'text' ? (
                  <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-rose-500/30">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-200 font-bold flex items-center gap-1.5">
                        <Type className="w-3 h-3 text-rose-400" />
                        Nhập chữ Logo hiển thị trên góc Phải:
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        Đang hiển thị trên góc Phải
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Ví dụ: AI MOVIE, @kenhcuaban, PHIM HAY..."
                      value={settings.logo.text}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          logo: { ...prev.logo!, text: e.target.value },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-extrabold tracking-wider"
                    />

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                      {['AI CINEMA', '@kenhcuaban', 'PHIM HAY', 'REVIEW PHIM', 'FULL HOUSE'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              logo: { ...prev.logo!, text: suggestion },
                            }))
                          }
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition ${
                            settings.logo?.text === suggestion
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>

                    {/* Text Style Selector */}
                    <div className="pt-1.5">
                      <span className="text-[10px] text-slate-400 block mb-1">Màu sắc chữ logo:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'white-badge', label: 'Trắng thanh lịch', color: 'text-white' },
                          { id: 'green-glow', label: 'Xanh lá neon', color: 'text-emerald-400' },
                          { id: 'gold-neon', label: 'Vàng kim neon', color: 'text-amber-400' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() =>
                              setSettings((prev) => ({
                                ...prev,
                                logo: { ...prev.logo!, textStyle: st.id as any },
                              }))
                            }
                            className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition text-center ${
                              (settings.logo?.textStyle || 'white-badge') === st.id
                                ? 'bg-slate-800 border-rose-500 ring-1 ring-rose-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className={st.color}>●</span> {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Option 2: Image File Upload */
                  <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-emerald-500/30">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      onChange={handleLogoImageUpload}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                    />

                    {settings.logo.imageUrl ? (
                      <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-3">
                          <img
                            src={settings.logo.imageUrl}
                            alt="Logo preview"
                            className="h-9 w-auto max-w-[80px] object-contain rounded bg-slate-950 p-1 border border-slate-700"
                          />
                          <div>
                            <span className="text-xs font-bold text-emerald-400 block">Đã nạp file ảnh Logo</span>
                            <span className="text-[10px] text-slate-400">Hiển thị ở góc phải trên cùng</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => logoFileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-bold transition"
                          >
                            Đổi ảnh
                          </button>
                          <button
                            onClick={() =>
                              setSettings((prev) => ({
                                ...prev,
                                logo: { ...prev.logo!, imageUrl: undefined },
                              }))
                            }
                            className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                            title="Xóa ảnh logo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => logoFileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/80 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition" />
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                          Nhấp để tải file ảnh Logo (PNG / JPG)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Khuyên dùng file ảnh PNG nền trong suốt để đẹp nhất
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Size & Opacity Controls */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Kích thước Logo:</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['small', 'medium', 'large'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              logo: { ...prev.logo!, size: s },
                            }))
                          }
                          className={`py-1 rounded-md text-[10px] font-bold border transition ${
                            settings.logo?.size === s
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {s === 'small' ? 'Nhỏ' : s === 'large' ? 'Lớn' : 'Vừa'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Độ rõ Logo:</span>
                      <span className="font-mono text-white font-bold">
                        {Math.round((settings.logo.opacity ?? 0.9) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={1.0}
                      step={0.05}
                      value={settings.logo.opacity ?? 0.9}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          logo: { ...prev.logo!, opacity: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ✨ HIỆU ỨNG CHUYỂN CẢNH ĐIỆN ẢNH (CINEMATIC TRANSITIONS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                Hiệu ứng chuyển cảnh (Transitions)
              </h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                Mượt mà
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'flash', label: '✨ Flash Điện Ảnh', desc: 'Vệt sáng trắng mờ ảo, bắt mắt nhất' },
                { id: 'zoom-blur', label: '🚀 Phóng To & Flare', desc: 'Phóng nhanh kèm tia sáng vàng' },
                { id: 'crossfade', label: '🌟 Hòa Tan Mượt', desc: 'Tan biến chuyển cảnh êm dịu' },
                { id: 'fade-black', label: '🎬 Chớp Đen', desc: 'Chớp tối kinh điển phim chiếu rạp' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      transition: t.id as TransitionType,
                    }))
                  }
                  className={`p-2 rounded-xl text-left border transition ${
                    settings.transition === t.id
                      ? 'bg-rose-500/20 border-rose-500 ring-1 ring-rose-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{t.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Transition duration selector */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span className="text-[11px]">Thời gian chuyển cảnh:</span>
              <div className="flex items-center gap-1">
                {[0.3, 0.5, 0.8].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setSettings((prev) => ({ ...prev, transitionDuration: dur }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      settings.transitionDuration === dur
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DÒNG THỜI GIAN GHÉP ĐAN XEN */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Dòng thời gian ghép ({actors.length} diễn viên)
              </h3>
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {isFullCover ? 'Full 9:16' : '9:16 Nền mờ'}
              </span>
            </div>

            {/* Global Auto-Optimize All 5s Clips Button */}
            <button
              onClick={handleAutoOptimizeAll}
              className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
              ⚡ Tự động cắt 5s đẹp nhất cho TẤT CẢ {actors.length} diễn viên
            </button>

            {/* List of Actor Chapters */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {actors.map((actor, idx) => {
                const isCurrentActor = currentActorIndex === idx;
                const isOriginalActive = isCurrentActor && currentSubPhase === 'original';
                const isClipActive = isCurrentActor && currentSubPhase === 'clip';

                return (
                  <div
                    key={actor.id}
                    className={`p-2.5 rounded-xl border transition ${
                      isCurrentActor
                        ? 'bg-slate-950 border-rose-500/60 shadow'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="flex items-center gap-1.5 text-white">
                        <span className="w-4 h-4 rounded bg-slate-800 text-slate-300 flex items-center justify-center text-[9px]">
                          #{idx + 1}
                        </span>
                        <span className="text-emerald-400 font-extrabold">{actor.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {actor.characterName}
                      </span>
                    </div>

                    {/* Dual Segment Buttons: [AI Gốc] -> [Clip thật 5s] */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleJumpToSegment(idx, 'original')}
                        className={`py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition border ${
                          isOriginalActive
                            ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-1 ring-rose-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Film className="w-3 h-3 text-rose-400" />
                        Đoạn AI ({actor.originalVideoStart ?? idx * 7}s &rarr; {actor.originalVideoEnd ?? (idx + 1) * 7}s)
                      </button>

                      <button
                        onClick={() => handleJumpToSegment(idx, 'clip')}
                        className={`py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition border ${
                          isClipActive
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-1 ring-emerald-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Scissors className="w-3 h-3 text-emerald-400" />
                        Clip 5s ({(actor.trimStartTime || 0).toFixed(1)}s &rarr; {((actor.trimStartTime || 0) + (actor.clipDuration || 5)).toFixed(1)}s)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Exporting Progress Modal */}
      {isExporting && exportProgress && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Đang ghép video đan xen 9:16...</h3>
              <p className="text-xs text-slate-300 mt-1">{exportProgress.stage}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Tiến độ</span>
                <span className="font-bold text-rose-400">{exportProgress.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              {settings.customBgmName
                ? `Đang lồng bài nhạc nền: ${settings.customBgmName}...`
                : 'Đang kết xuất video không có nhạc nền theo yêu cầu...'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Bước 3 (Chỉnh video &amp; Link)
        </button>

        <button
          onClick={handleStartExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-emerald-600 hover:from-rose-500 hover:to-emerald-500 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          Bắt đầu xuất video hoàn chỉnh
        </button>
      </div>
    </div>
  );
};
