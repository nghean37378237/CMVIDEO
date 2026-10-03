import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { ActorItem } from '../types';

interface CinematicMotionPlayerProps {
  actor: ActorItem;
  duration?: number; // 5 seconds
  autoPlay?: boolean;
}

export const CinematicMotionPlayer: React.FC<CinematicMotionPlayerProps> = ({
  actor,
  duration = 5,
  autoPlay = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number>(0);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localCurrentTime = pausedAtRef.current;

    const renderFrame = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - pausedAtRef.current * 1000;
      }

      if (isPlaying) {
        const elapsed = (timestamp - startTimeRef.current) / 1000;
        localCurrentTime = elapsed % duration;
        setCurrentTime(localCurrentTime);
      }

      const w = canvas.width;
      const h = canvas.height;
      const t = localCurrentTime;
      const progress = t / duration;

      // 1. Dark Cinematic Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Animated Ambient Glow / Light Flare
      const flareX = (0.5 + Math.sin(t * 1.2) * 0.25) * w;
      const flareY = (0.4 + Math.cos(t * 0.9) * 0.15) * h;
      const flareGrad = ctx.createRadialGradient(flareX, flareY, 20, flareX, flareY, w * 0.6);
      flareGrad.addColorStop(0, (actor.tagColor || '#38bdf8') + '44');
      flareGrad.addColorStop(0.6, (actor.tagColor || '#38bdf8') + '08');
      flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, 0, w, h);

      // 3. Floating Cinematic Dust Particles
      ctx.save();
      for (let i = 0; i < 20; i++) {
        const px = ((Math.sin(i * 99 + t * 0.4) * 0.5 + 0.5) * w) % w;
        const py = ((Math.cos(i * 33 + t * 0.5) * 0.5 + 0.5) * h) % h;
        const radius = 1 + (i % 3);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. Ken Burns Portrait / Center Avatar with Smooth Zoom
      ctx.save();
      const kenBurnsScale = 1 + progress * 0.12; // Gentle zoom in 5s
      const centerY = h * 0.4;
      ctx.translate(w / 2, centerY);
      ctx.scale(kenBurnsScale, kenBurnsScale);

      // Glowing Aura Ring
      const ringPulse = 1 + Math.sin(t * 3) * 0.05;
      ctx.strokeStyle = actor.tagColor || '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 72 * ringPulse, 0, Math.PI * 2);
      ctx.stroke();

      // Solid Avatar Center
      ctx.fillStyle = actor.tagColor || '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 0, 64, 0, Math.PI * 2);
      ctx.fill();

      // Letter Initial
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = actor.name ? actor.name.charAt(0).toUpperCase() : 'A';
      ctx.fillText(initial, 0, 0);

      ctx.restore();

      // 5. Cinematic Lower-Third Banner
      ctx.save();
      const bannerW = w - 48;
      const bannerH = 68;
      const bannerX = 24;
      const bannerY = h - bannerH - 24;

      // Glassmorphic pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
      ctx.fill();

      // Accent border
      ctx.strokeStyle = actor.tagColor || '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Index Pill
      ctx.fillStyle = actor.tagColor || '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(bannerX + 10, bannerY + 12, 44, 44, 8);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('5s', bannerX + 10 + 22, bannerY + 12 + 22);

      // Actor Title
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(actor.name, bannerX + 66, bannerY + 12);

      // Character & Film
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px sans-serif';
      const sub = `${actor.characterName ? 'Vai: ' + actor.characterName : ''} ${
        actor.famousMovie ? ' • ' + actor.famousMovie : ''
      }`;
      ctx.fillText(sub, bannerX + 66, bannerY + 38);

      // Bottom 5s progress bar
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(bannerX + 10, bannerY + bannerH - 4, bannerW - 20, 2.5);

      ctx.fillStyle = actor.tagColor || '#3b82f6';
      ctx.fillRect(bannerX + 10, bannerY + bannerH - 4, (bannerW - 20) * progress, 2.5);

      ctx.restore();

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, actor, duration]);

  const togglePlay = () => {
    if (isPlaying) {
      pausedAtRef.current = currentTime;
      startTimeRef.current = null;
      setIsPlaying(false);
    } else {
      startTimeRef.current = null;
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    pausedAtRef.current = 0;
    setCurrentTime(0);
    startTimeRef.current = null;
    setIsPlaying(true);
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="w-full h-full object-cover cursor-pointer"
        onClick={togglePlay}
      />

      {/* Top Tag */}
      <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-[10px] font-semibold text-rose-300 px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-500/30 pointer-events-none">
        <Sparkles className="w-3 h-3 text-rose-400" />
        AI Motion Reel 5s
      </div>

      {/* Floating Center Play Button when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl transition transform hover:scale-110"
        >
          <Play className="w-5 h-5 fill-white ml-0.5" />
        </button>
      )}

      {/* Bottom Bar Controls Overlay */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-white text-xs opacity-0 group-hover:opacity-100 transition">
        <button onClick={togglePlay} className="p-1 hover:text-rose-400 transition">
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button onClick={handleReset} className="p-1 hover:text-rose-400 transition" title="Xem lại">
          <RotateCcw className="w-3 h-3" />
        </button>
        <span className="text-[11px] font-mono text-slate-300 ml-1">
          00:0{Math.floor(currentTime)} / 00:05
        </span>
      </div>
    </div>
  );
};
