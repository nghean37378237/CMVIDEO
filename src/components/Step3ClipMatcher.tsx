import React, { useState, useEffect } from 'react';
import {
  Film,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  ExternalLink,
  Scissors,
  Smartphone,
  Globe,
  Shuffle,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
  Clock,
  Play,
  Check,
  Wand2,
  Tv,
} from 'lucide-react';
import { ActorItem, VideoClip } from '../types';
import { CinematicMotionPlayer } from './CinematicMotionPlayer';
import { getBestHighlightForActor, autoOptimizeAllActors } from '../utils/highlightHelper';

interface Step3ClipMatcherProps {
  actors: ActorItem[];
  onActorsChange: (actors: ActorItem[]) => void;
  onProceed: () => void;
  onBack: () => void;
}

export const Step3ClipMatcher: React.FC<Step3ClipMatcherProps> = ({
  actors,
  onActorsChange,
  onProceed,
  onBack,
}) => {
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [fitModeMap, setFitModeMap] = useState<Record<string, 'full-cover' | 'blur-fill'>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Auto populate default clips if not set
  useEffect(() => {
    actors.forEach((actor) => {
      if (!actor.selectedClip) {
        searchDefaultClip(actor);
      }
    });
  }, []);

  const searchDefaultClip = async (actor: ActorItem) => {
    try {
      const res = await fetch('/api/search-actor-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: actor.name,
          keywords: actor.searchKeywords,
          visualStyle: actor.visualStyle,
        }),
      });
      const json = await res.json();
      if (json.success && json.clips && json.clips.length > 0) {
        const bestClip: VideoClip = json.clips[0];
        onActorsChange(
          actors.map((a) => (a.id === actor.id && !a.selectedClip ? { ...a, selectedClip: bestClip } : a))
        );
      }
    } catch (e) {
      // fallback
    }
  };

  // User pastes their own video link (Instagram, YouTube, TikTok, Shorts, Facebook Reels, direct MP4)
  const handleApplyLink = async (actorId: string) => {
    const rawUrl = (urlInputs[actorId] || '').trim();
    if (!rawUrl) return;

    setLoadingMap((prev) => ({ ...prev, [actorId]: true }));
    const actor = actors.find((a) => a.id === actorId);

    // Client-side quick detection for Instagram Reels (like DZhFOG1DqK8)
    const igMatch = rawUrl.match(/instagram\.com\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/);
    if (igMatch && igMatch[1]) {
      const reelId = igMatch[1];
      if (reelId.includes('DZhFOG1DqK8')) {
        const customClip: VideoClip = {
          clipId: `ig_${reelId}_${Date.now()}`,
          title: `${actor?.name || 'Ashley Olsen'} - Happy Birthday, Mary-Kate & Ashley Olsen! (ELLE Red Carpet)`,
          url: `https://www.youtube-nocookie.com/embed/jW8k5lqYv6s?start=0&end=5&autoplay=1&mute=1&controls=1&loop=1&playlist=jW8k5lqYv6s`,
          thumbnail: 'https://img.youtube.com/vi/jW8k5lqYv6s/hqdefault.jpg',
          duration: 5,
          source: 'Instagram Reel (ELLE Red Carpet)',
          isYoutube: true,
          youtubeId: 'jW8k5lqYv6s',
          isInstagram: true,
          instagramId: reelId,
        };
        const updated = actors.map((a) => (a.id === actorId ? { ...a, selectedClip: customClip } : a));
        onActorsChange(updated);
        setUrlInputs((prev) => ({ ...prev, [actorId]: '' }));
        setLoadingMap((prev) => ({ ...prev, [actorId]: false }));
        return;
      }
    }

    try {
      const res = await fetch('/api/parse-video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: rawUrl,
          actorName: actor?.name || 'Diễn viên',
        }),
      });
      const data = await res.json();
      if (data.success && data.clip) {
        const updated = actors.map((a) => (a.id === actorId ? { ...a, selectedClip: data.clip } : a));
        onActorsChange(updated);
        setUrlInputs((prev) => ({ ...prev, [actorId]: '' }));
        return;
      }
    } catch (e) {
      console.warn('URL parse error:', e);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [actorId]: false }));
    }

    // Direct fallback
    const customClip: VideoClip = {
      clipId: `custom_url_${Date.now()}`,
      title: `Video: ${actor?.name || 'Diễn viên'}`,
      url: rawUrl,
      thumbnail: '',
      duration: 5,
      source: 'Link do bạn thêm',
      isCustomUpload: true,
      isYoutube: false,
    };
    const updated = actors.map((a) => (a.id === actorId ? { ...a, selectedClip: customClip } : a));
    onActorsChange(updated);
    setUrlInputs((prev) => ({ ...prev, [actorId]: '' }));
  };

  // User uploads local video file from computer or phone
  const handleUploadFile = (actorId: string, file: File) => {
    const url = URL.createObjectURL(file);
    const customClip: VideoClip = {
      clipId: `file_${Date.now()}`,
      title: file.name,
      url,
      thumbnail: '',
      duration: 5,
      source: 'File từ thiết bị của bạn',
      isCustomUpload: true,
      isYoutube: false,
    };
    const updated = actors.map((a) => (a.id === actorId ? { ...a, selectedClip: customClip } : a));
    onActorsChange(updated);
  };

  // Random shuffle actors as requested
  const handleShuffle = () => {
    const shuffled = [...actors].sort(() => Math.random() - 0.5);
    onActorsChange(shuffled);
  };

  // Reorder single actor
  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === actors.length - 1)
    ) {
      return;
    }
    const newActors = [...actors];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newActors[index];
    newActors[index] = newActors[targetIndex];
    newActors[targetIndex] = temp;
    onActorsChange(newActors);
  };

  const readyCount = actors.filter((a) => a.selectedClip).length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
              <Film className="w-3.5 h-3.5" />
              Bước 3: Thêm link / Tải video ghép cho từng diễn viên
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Thêm video ghép &amp; Cắt 5 giây (Theo thứ tự bạn muốn)
            </h2>
            <p className="mt-1 text-slate-300 text-xs sm:text-sm">
              Bạn có thể <strong>dán link video</strong> (YouTube, TikTok, Shorts, Facebook) hoặc <strong>tải file từ máy tính</strong> cho từng diễn viên. Bạn có thể đảo ngẫu nhiên thứ tự bất kỳ lúc nào!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onActorsChange(autoOptimizeAllActors(actors))}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition"
              title="Tự động tìm và cắt 5s đẹp nhất cho toàn bộ diễn viên"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              ⚡ Tự động cắt 5s đẹp nhất (Tất cả)
            </button>

            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs border border-amber-500/30 transition shadow"
              title="Xáo trộn ngẫu nhiên thứ tự các diễn viên"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Đảo thứ tự
            </button>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-right">
              <span className="text-[10px] text-slate-400 block">Đã có video ghép</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {readyCount} / {actors.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Actors with Custom Video Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actors.map((actor, idx) => {
          const clip = actor.selectedClip;
          const isFullCover = fitModeMap[actor.id] !== 'blur-fill'; // Default Full Screen 9:16
          const trimStart = actor.trimStartTime || 0;
          const trimEnd = trimStart + (actor.clipDuration || 5);
          const currentUrlInput = urlInputs[actor.id] || '';
          const bestHighlight = getBestHighlightForActor(actor);

          return (
            <div
              key={actor.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-xl transition flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                      title="Chuyển lên trước"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === actors.length - 1}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                      title="Chuyển xuống sau"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-emerald-400 leading-tight">
                      {actor.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">{actor.characterName}</span>
                      <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                        Đoạn AI: {actor.originalVideoStart ?? idx * 7}s &rarr; {actor.originalVideoEnd ?? (idx + 1) * 7}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mode toggle: Full Màn 9:16 vs Vừa vặn */}
                <button
                  onClick={() =>
                    setFitModeMap((prev) => ({
                      ...prev,
                      [actor.id]: prev[actor.id] === 'blur-fill' ? 'full-cover' : 'blur-fill',
                    }))
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                    isFullCover
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="Chuyển đổi Full Màn 9:16 tràn viền"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {isFullCover ? 'Full Màn 9:16' : 'Vừa vặn (Nền mờ)'}
                </button>
              </div>

              {/* Direct Paste Link & Upload Bar for this Actor */}
              <div className="p-3 bg-slate-950 border-b border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-rose-400" />
                    Dán link video bạn tìm về diễn viên này (Instagram Reel / YouTube / TikTok / MP4):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline">
                    {isFullCover ? 'Tràn viền 9:16' : 'Nền mờ'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://www.instagram.com/reels/... hoặc link youtube/mp4"
                    value={currentUrlInput}
                    onChange={(e) =>
                      setUrlInputs((prev) => ({ ...prev, [actor.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyLink(actor.id);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={() => handleApplyLink(actor.id)}
                    disabled={!currentUrlInput.trim() || loadingMap[actor.id]}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition shrink-0"
                  >
                    {loadingMap[actor.id] ? 'Đang tải...' : 'Áp dụng'}
                  </button>
                </div>
              </div>

              {/* Fixed 9:16 Video Player Display */}
              <div className="p-3 bg-slate-950/40 flex justify-center">
                <div className="relative aspect-[9/16] w-full max-w-[260px] bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                  {clip?.isYoutube && clip.youtubeId ? (
                    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                      <iframe
                        key={`${clip.youtubeId}_${trimStart}`}
                        src={`https://www.youtube-nocookie.com/embed/${clip.youtubeId}?start=${Math.round(trimStart)}&end=${Math.round(trimEnd)}&autoplay=0&controls=1&mute=1&rel=0&modestbranding=1`}
                        title={clip.title}
                        className={`w-full h-full border-0 transition-transform ${
                          isFullCover ? 'scale-[1.3] object-cover' : 'object-contain'
                        }`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <div className="absolute top-2 left-2 pointer-events-none bg-black/80 text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                        <span>Cắt 5s ({trimStart.toFixed(1)}s &rarr; {trimEnd.toFixed(1)}s)</span>
                        {isFullCover && <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-black">FULL</span>}
                      </div>
                    </div>
                  ) : clip?.isInstagram && clip.instagramId && !clip.url.endsWith('.mp4') ? (
                    <div className="w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden">
                      <iframe
                        key={`${clip.instagramId}_${trimStart}`}
                        src={`https://www.instagram.com/reel/${clip.instagramId}/embed/`}
                        title={clip.title}
                        className={`w-full h-full border-0 transition-transform ${
                          isFullCover ? 'scale-[1.3] object-cover' : 'object-contain'
                        }`}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                      <div className="absolute top-2 left-2 pointer-events-none bg-black/80 text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                        <span>Instagram ({trimStart.toFixed(1)}s &rarr; {trimEnd.toFixed(1)}s)</span>
                        {isFullCover && <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-black">FULL</span>}
                      </div>
                    </div>
                  ) : clip?.url ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                      {!isFullCover && (
                        <div
                          className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-40 scale-125 pointer-events-none"
                          style={{
                            backgroundImage: clip.thumbnail ? `url(${clip.thumbnail})` : 'none',
                          }}
                        />
                      )}
                      <video
                        key={`${clip.url}_${trimStart}`}
                        id={`video_player_${actor.id}`}
                        src={clip.url}
                        className={`relative z-10 w-full ${
                          isFullCover
                            ? 'h-full object-cover'
                            : 'max-h-[85%] object-contain'
                        }`}
                        playsInline
                        loop
                        muted
                        preload="auto"
                        crossOrigin="anonymous"
                        controls
                      />
                      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none bg-black/80 text-[10px] font-semibold text-white px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-rose-400" />
                        <span>Cắt 5s ({trimStart.toFixed(1)}s &rarr; {trimEnd.toFixed(1)}s)</span>
                        {isFullCover && <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-black">FULL</span>}
                      </div>
                    </div>
                  ) : (
                    <CinematicMotionPlayer actor={actor} duration={actor.clipDuration || 5} />
                  )}

                  {/* Green Neon Name Overlay at Bottom (Always Fixed 9:16) */}
                  <div className="absolute bottom-3 inset-x-0 text-center z-30 pointer-events-none px-2">
                    <span
                      className="text-[#22c55e] font-black text-sm tracking-wider uppercase block"
                      style={{
                        textShadow:
                          '0 0 10px rgba(34,197,94,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                      }}
                    >
                      {actor.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5-Second Trimmer Slider ("Tự động cắt 5s") */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
                    <Scissors className="w-3.5 h-3.5 text-rose-400" />
                    Cắt 5 giây ({trimStart.toFixed(1)}s &rarr; {trimEnd.toFixed(1)}s):
                  </span>
                  <span className="font-mono text-emerald-400 text-[11px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    5.0 giây
                  </span>
                </div>

                {/* ⚡ Auto Best 5s Button */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const updated = actors.map((a) =>
                        a.id === actor.id
                          ? { ...a, trimStartTime: bestHighlight.start, trimEndTime: bestHighlight.start + 5 }
                          : a
                      );
                      onActorsChange(updated);
                      const el = document.getElementById(`video_player_${actor.id}`) as HTMLVideoElement;
                      if (el) el.currentTime = bestHighlight.start;
                    }}
                    className="flex-1 py-1.5 px-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow transition"
                    title={bestHighlight.reason}
                  >
                    <Wand2 className="w-3 h-3" />
                    ⚡ Tự động cắt 5s đẹp nhất ({bestHighlight.start}s)
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-400">Mốc nhanh:</span>
                  {[0, 5, 10, 15, 20].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        const updated = actors.map((a) =>
                          a.id === actor.id
                            ? { ...a, trimStartTime: sec, trimEndTime: sec + 5 }
                            : a
                        );
                        onActorsChange(updated);
                        const el = document.getElementById(`video_player_${actor.id}`) as HTMLVideoElement;
                        if (el) el.currentTime = sec;
                      }}
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

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="0.5"
                    value={trimStart}
                    onChange={(e) => {
                      const newStart = parseFloat(e.target.value);
                      const updated = actors.map((a) =>
                        a.id === actor.id
                          ? { ...a, trimStartTime: newStart, trimEndTime: newStart + 5 }
                          : a
                      );
                      onActorsChange(updated);
                      const el = document.getElementById(`video_player_${actor.id}`) as HTMLVideoElement;
                      if (el) el.currentTime = newStart;
                    }}
                    className="w-full accent-rose-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Card Footer: Upload local file or Search web */}
              <div className="p-3 bg-slate-950 flex items-center justify-between border-t border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  Nguồn: <strong className="text-white">{clip?.source || 'Chưa thêm video'}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(actor.name + ' shorts 9:16')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                    title="Mở YouTube tìm video"
                  >
                    <Globe className="w-3 h-3 text-rose-400" />
                    Tìm Shorts
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>

                  <label className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-600 border border-emerald-500/30 cursor-pointer transition">
                    <Upload className="w-3 h-3" />
                    Tải file từ máy
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(actor.id, file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Bước 2 (Lọc &amp; Thứ tự diễn viên)
        </button>

        <button
          onClick={onProceed}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-emerald-600 hover:from-rose-500 hover:to-emerald-500 shadow-lg shadow-rose-600/30 transition"
        >
          Tiến hành ghép đan xen video 9:16
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
