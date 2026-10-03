import { ActorItem, StitchSettings, AspectRatio, TransitionType } from '../types';

export interface StitchProgress {
  currentActorIndex: number;
  totalActors: number;
  actorName: string;
  percent: number;
  stage: string;
}

export async function stitchActorVideos(
  actors: ActorItem[],
  settings: StitchSettings,
  onProgress?: (progress: StitchProgress) => void,
  originalVideoUrl?: string
): Promise<Blob> {
  const validActors = actors.filter((a) => a.selectedClip && a.selectedClip.url);
  if (validActors.length === 0) {
    throw new Error('Chưa có clip video nào được chọn để ghép!');
  }

  // 9:16 Portrait default (TikTok/Reels/Shorts)
  let width = 720;
  let height = 1280;
  if (settings.aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (settings.aspectRatio === '1:1') {
    width = 720;
    height = 720;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');

  // All procedural synth BGM disabled by user request
  // Custom audio file uploaded by user will be mixed if provided

  onProgress?.({
    currentActorIndex: 0,
    totalActors: validActors.length,
    actorName: 'Khởi tạo',
    percent: 5,
    stage: 'Đang chuẩn bị ghép video đan xen chuẩn 9:16...',
  });

  // Pre-load user's original AI 9:16 video
  let originalVideoEl: HTMLVideoElement | null = null;
  let originalDuration = 0;
  if (originalVideoUrl) {
    try {
      originalVideoEl = document.createElement('video');
      originalVideoEl.crossOrigin = 'anonymous';
      originalVideoEl.muted = true;
      originalVideoEl.playsInline = true;
      originalVideoEl.preload = 'auto';
      originalVideoEl.src = originalVideoUrl;
      await new Promise<void>((resolve) => {
        originalVideoEl!.onloadedmetadata = () => {
          originalDuration = originalVideoEl!.duration || 0;
          resolve();
        };
        originalVideoEl!.onloadeddata = () => resolve();
        originalVideoEl!.onerror = () => resolve();
        setTimeout(() => resolve(), 3500);
      });
    } catch (e) {
      originalVideoEl = null;
    }
  }

  // Pre-load actor 5s video elements
  const videoElements: HTMLVideoElement[] = [];
  for (let i = 0; i < validActors.length; i++) {
    const actor = validActors[i];
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';

    // Prefer direct stream or proxied URL
    const targetUrl = actor.selectedClip?.directStreamUrl || actor.selectedClip!.url;
    vid.src = targetUrl;

    await new Promise<void>((resolve) => {
      vid.onloadeddata = () => resolve();
      vid.onerror = () => {
        console.warn(`Lỗi tải video của ${actor.name}, sử dụng chế độ đồ họa động 5s.`);
        resolve();
      };
      setTimeout(() => resolve(), 3000);
    });

    videoElements.push(vid);
  }

  // Pre-load logo image if provided
  let logoImg: HTMLImageElement | null = null;
  if (settings.logo?.enabled && settings.logo.type === 'image' && settings.logo.imageUrl) {
    try {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = settings.logo.imageUrl;
      await new Promise<void>((resolve) => {
        logoImg!.onload = () => resolve();
        logoImg!.onerror = () => resolve();
        setTimeout(resolve, 2000);
      });
    } catch (e) {
      logoImg = null;
    }
  }

  const fps = 30;
  const canvasStream = canvas.captureStream(fps);

  let customAudioEl: HTMLAudioElement | null = null;
  let customAudioTrack: MediaStreamTrack | null = null;

  // Mix user's uploaded custom background audio if provided
  if (settings.bgm === 'custom' && settings.customBgmUrl) {
    try {
      customAudioEl = document.createElement('audio');
      customAudioEl.src = settings.customBgmUrl;
      customAudioEl.loop = true;
      customAudioEl.volume = settings.bgmVolume ?? 0.8;
      customAudioEl.crossOrigin = 'anonymous';

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(customAudioEl);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = settings.bgmVolume ?? 0.8;
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(gainNode);
        gainNode.connect(dest);
        customAudioTrack = dest.stream.getAudioTracks()[0] || null;
      }
    } catch (e) {
      console.warn('Lỗi kết nối nhạc nền tải lên:', e);
    }
  }

  let combinedStream: MediaStream = canvasStream;
  if (customAudioTrack) {
    combinedStream = new MediaStream([canvasStream.getVideoTracks()[0], customAudioTrack]);
  }

  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: 3_500_000,
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
      resolve(blob);
    };
    mediaRecorder.onerror = (e) => reject(e);
  });

  if (customAudioEl) {
    customAudioEl.currentTime = 0;
    customAudioEl.play().catch(() => {});
  }
  mediaRecorder.start(250);

  const totalActors = validActors.length;
  // Default mode is 'interleaved' as requested in user's example video
  const stitchMode = settings.stitchMode || (originalVideoEl ? 'interleaved' : 'compilation-only');
  const captionStyle = settings.captionStyle || 'green-glow';

  // Calculate default slice duration per actor if not explicitly set
  const autoSliceDuration = originalDuration > 0
    ? Math.max(4, Math.floor(originalDuration / totalActors))
    : 7;

  try {
    for (let actorIdx = 0; actorIdx < totalActors; actorIdx++) {
      const actor = validActors[actorIdx];
      const vid = videoElements[actorIdx];

      // PART 1: Play User's Original AI Video Segment for this Actor (Interleaved Mode)
      if (stitchMode === 'interleaved' && originalVideoEl) {
        const segStart = typeof actor.originalVideoStart === 'number'
          ? actor.originalVideoStart
          : actorIdx * autoSliceDuration;
        const segEnd = typeof actor.originalVideoEnd === 'number'
          ? actor.originalVideoEnd
          : segStart + autoSliceDuration;
        const segDuration = Math.max(2, segEnd - segStart);
        const segFrames = Math.round(segDuration * fps);

        originalVideoEl.currentTime = segStart;
        await new Promise<void>((r) => setTimeout(r, 150));
        try {
          await originalVideoEl.play().catch(() => {});
        } catch (e) {}

        for (let f = 0; f < segFrames; f++) {
          const curTime = f / fps;
          const overallProgress = Math.round(
            ((actorIdx * 2) / (totalActors * 2)) * 90 + (f / segFrames) * (45 / totalActors)
          );

          onProgress?.({
            currentActorIndex: actorIdx + 1,
            totalActors,
            actorName: `${actor.name} (Phân đoạn AI gốc)`,
            percent: Math.min(99, Math.max(5, overallProgress)),
            stage: `Đang ghép: Đoạn AI gốc của ${actor.name} (${Math.round(curTime)}s / ${segDuration}s, 9:16)`,
          });

          // Draw user's original 9:16 video
          ctx.fillStyle = '#05070f';
          ctx.fillRect(0, 0, width, height);

          if (originalVideoEl.videoWidth > 0) {
            const vw = originalVideoEl.videoWidth;
            const vh = originalVideoEl.videoHeight;
            const ratio = Math.max(width / vw, height / vh);
            const cx = (width - vw * ratio) / 2;
            const cy = (height - vh * ratio) / 2;
            ctx.drawImage(originalVideoEl, 0, 0, vw, vh, cx, cy, vw * ratio, vh * ratio);
          } else {
            drawGenerativeActorMotion(ctx, width, height, actor, curTime);
          }

          // Transition effect near the end of Part 1
          const transFrames = Math.max(4, Math.round((settings.transitionDuration || 0.4) * fps));
          if (f >= segFrames - transFrames) {
            const tProg = (f - (segFrames - transFrames)) / (transFrames * 2);
            drawTransitionOverlay(ctx, width, height, settings.transition || 'flash', tProg);
          }

          // Draw Logo on Top-Right Corner
          drawLogoWatermark(ctx, width, height, settings, logoImg);

          await new Promise((r) => setTimeout(r, 1000 / fps));
        }
        originalVideoEl.pause();
      }

      // PART 2: Play the 5-Second Real Web Video Clip of this Actor
      const realClipDuration = actor.clipDuration || 5; // Exactly 5 seconds
      const trimStart = actor.trimStartTime || 0;
      const totalFramesForClip = Math.round(realClipDuration * fps);

      vid.currentTime = trimStart;
      try {
        await vid.play().catch(() => {});
      } catch (e) {}

      for (let frame = 0; frame < totalFramesForClip; frame++) {
        const currentTime = frame / fps;
        const overallProgress = Math.round(
          ((actorIdx * 2 + 1) / (totalActors * 2)) * 90 + (frame / totalFramesForClip) * (45 / totalActors)
        );

        onProgress?.({
          currentActorIndex: actorIdx + 1,
          totalActors,
          actorName: `${actor.name} (Clip thật 5s)`,
          percent: Math.min(99, Math.max(5, overallProgress)),
          stage: `Đang ghép: Clip thật 5s của ${actor.name} (${Math.round(currentTime)}s / ${realClipDuration}s, chuẩn 9:16)`,
        });

        // Clear canvas
        ctx.fillStyle = '#05070f';
        ctx.fillRect(0, 0, width, height);

        // Draw real actor video with 9:16 blur-fill or smart-crop
        drawVideoCover(ctx, vid, width, height, actor, currentTime, settings);

        // Draw caption
        if (settings.showLowerThird) {
          if (captionStyle === 'green-glow') {
            // Exact green text style matching user's video (e.g. "Ashley Olsen", "Jodie Sweetin")
            drawGreenGlowName(ctx, width, height, actor.name);
          } else {
            drawLowerThirdBadge(ctx, width, height, actor, currentTime, realClipDuration, actorIdx + 1, totalActors, settings.aspectRatio);
          }
        }

        // Transition effect at the beginning of Part 2
        const transFrames = Math.max(4, Math.round((settings.transitionDuration || 0.4) * fps));
        if (frame < transFrames) {
          const tProg = 0.5 + frame / (transFrames * 2);
          drawTransitionOverlay(ctx, width, height, settings.transition || 'flash', tProg);
        }

        // Draw Logo on Top-Right Corner
        drawLogoWatermark(ctx, width, height, settings, logoImg);

        await new Promise((r) => setTimeout(r, 1000 / fps));
      }
      vid.pause();
    }

    onProgress?.({
      currentActorIndex: totalActors,
      totalActors,
      actorName: 'Hoàn tất',
      percent: 100,
      stage: 'Đã ghép hoàn tất video đan xen 9:16!',
    });

    mediaRecorder.stop();
    if (customAudioEl) customAudioEl.pause();

    const outputBlob = await recordingPromise;
    return outputBlob;
  } catch (error) {
    mediaRecorder.stop();
    if (customAudioEl) customAudioEl.pause();
    throw error;
  }
}

// Green font overlay matching the user's video exactly
function drawGreenGlowName(ctx: CanvasRenderingContext2D, w: number, h: number, name: string) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const bottomY = h - 90;

  // Black glowing text outline for maximum legibility on any video
  ctx.font = 'bold 36px sans-serif';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = 6;
  ctx.strokeText(name, w / 2, bottomY);

  // Vibrant neon green fill (identical to the user's video)
  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText(name, w / 2, bottomY);

  ctx.restore();
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  actor: ActorItem,
  currentTime: number,
  settings: StitchSettings
) {
  if (video.readyState >= 2 && video.videoWidth > 0) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const isPortraitOutput = settings.aspectRatio === '9:16';
    const fitMode = settings.verticalFitMode || 'full-cover';

    if (isPortraitOutput && fitMode === 'blur-fill') {
      // 1. Draw blurred ambient backdrop to fill the 9:16 canvas seamlessly
      ctx.save();
      const bgRatio = Math.max(w / vw, h / vh);
      const bgShiftX = (w - vw * bgRatio) / 2;
      const bgShiftY = (h - vh * bgRatio) / 2;
      ctx.filter = 'blur(18px) brightness(0.55)';
      ctx.drawImage(video, 0, 0, vw, vh, bgShiftX, bgShiftY, vw * bgRatio, vh * bgRatio);
      ctx.restore();

      // 2. Draw crisp centered video in the 9:16 frame
      const centerRatio = Math.min(w / vw, (h * 0.72) / vh);
      const cw = vw * centerRatio;
      const ch = vh * centerRatio;
      const cx = (w - cw) / 2;
      const cy = (h - ch) / 2 - 20;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 32;
      ctx.drawImage(video, 0, 0, vw, vh, cx, cy, cw, ch);
      ctx.restore();

      // Soft vignette top and bottom
      const botGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
      botGrad.addColorStop(0, 'rgba(0,0,0,0)');
      botGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
    } else {
      // Direct center cover crop (smart crop)
      const hRatio = w / vw;
      const vRatio = h / vh;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (w - vw * ratio) / 2;
      const centerShiftY = (h - vh * ratio) / 2;

      ctx.drawImage(video, 0, 0, vw, vh, centerShiftX, centerShiftY, vw * ratio, vh * ratio);

      const botGrad = ctx.createLinearGradient(0, h * 0.8, 0, h);
      botGrad.addColorStop(0, 'rgba(0,0,0,0)');
      botGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
    }
  } else {
    drawGenerativeActorMotion(ctx, w, h, actor, currentTime);
  }
}

function drawGenerativeActorMotion(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  actor: ActorItem,
  currentTime: number
) {
  const bgGradient = ctx.createLinearGradient(0, 0, w, h);
  bgGradient.addColorStop(0, '#0f172a');
  bgGradient.addColorStop(0.5, '#1e1b4b');
  bgGradient.addColorStop(1, '#020617');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  const t = currentTime * 1.5;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = actor.tagColor || '#22c55e';
  for (let i = 0; i < 18; i++) {
    const x = ((Math.sin(t + i * 1.1) * 0.5 + 0.5) * w) % w;
    const y = ((Math.cos(t * 0.8 + i * 1.3) * 0.5 + 0.5) * h) % h;
    const radius = 3 + (i % 5) * 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const pulse = 1 + Math.sin(currentTime * 3) * 0.05;
  ctx.strokeStyle = actor.tagColor || '#22c55e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.42, 96 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = actor.tagColor || '#22c55e';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.42, 85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  const initial = actor.name ? actor.name.charAt(0).toUpperCase() : 'A';
  ctx.fillText(initial, w / 2, h * 0.42);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(actor.name, w / 2, h * 0.62);

  ctx.font = '22px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(actor.characterName || 'Diễn viên điện ảnh', w / 2, h * 0.68);

  ctx.restore();
}

function drawLowerThirdBadge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  actor: ActorItem,
  currentTime: number,
  duration: number,
  actorIdx: number,
  totalActors: number,
  aspectRatio?: string
) {
  ctx.save();
  const isPortrait = h > w;
  const paddingX = isPortrait ? 24 : 48;
  const bottomY = isPortrait ? h - 140 : h - 90;
  const bannerWidth = Math.min(w - paddingX * 2, isPortrait ? 670 : 700);
  const bannerHeight = 84;

  const bgX = paddingX;
  const bgY = bottomY - bannerHeight;
  const radius = 16;

  const grad = ctx.createLinearGradient(bgX, bgY, bgX + bannerWidth, bgY + bannerHeight);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
  grad.addColorStop(1, 'rgba(30, 27, 75, 0.88)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(bgX, bgY, bannerWidth, bannerHeight, radius);
  ctx.fill();

  ctx.strokeStyle = actor.tagColor || '#22c55e';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const badgeWidth = 72;
  ctx.fillStyle = actor.tagColor || '#22c55e';
  ctx.beginPath();
  ctx.roundRect(bgX + 12, bgY + 14, badgeWidth, 56, 10);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${actorIdx}/${totalActors}`, bgX + 12 + badgeWidth / 2, bgY + 14 + 28);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  const textLeft = bgX + badgeWidth + 24;
  ctx.fillText(actor.name, textLeft, bgY + 14);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '15px sans-serif';
  const roleText = actor.characterName ? `Vai: ${actor.characterName}` : '';
  const movieText = actor.famousMovie ? ` • ${actor.famousMovie}` : '';
  ctx.fillText(`${roleText}${movieText}`, textLeft, bgY + 46);

  const progressRatio = Math.min(1, currentTime / duration);
  const lineWidth = bannerWidth - 24;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(bgX + 12, bgY + bannerHeight - 4, lineWidth, 3);

  ctx.fillStyle = actor.tagColor || '#22c55e';
  ctx.fillRect(bgX + 12, bgY + bannerHeight - 4, lineWidth * progressRatio, 3);

  ctx.restore();
}

// Cinematic Transition Overlay (Flash, Dip to Black, Zoom-Blur, Crossfade)
function drawTransitionOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: TransitionType,
  progress: number
) {
  if (progress <= 0 || progress >= 1) return;
  ctx.save();

  if (type === 'flash') {
    // Film White Flash: peaks in the middle with soft bloom
    const flashAlpha = Math.sin(progress * Math.PI) * 0.95;
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'fade-black') {
    // Dip to Black: cinematic black fade
    const blackAlpha = Math.sin(progress * Math.PI) * 0.98;
    ctx.fillStyle = `rgba(0, 0, 0, ${blackAlpha})`;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'zoom-blur') {
    // Warm light burst & zoom flare
    const warmAlpha = Math.sin(progress * Math.PI) * 0.8;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, `rgba(255, 255, 255, ${warmAlpha})`);
    grad.addColorStop(0.4, `rgba(251, 191, 36, ${warmAlpha * 0.6})`);
    grad.addColorStop(0.8, `rgba(244, 63, 94, ${warmAlpha * 0.3})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Soft Crossfade dissolve
    const softAlpha = Math.sin(progress * Math.PI) * 0.45;
    ctx.fillStyle = `rgba(255, 255, 255, ${softAlpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

// Logo Watermark on Top-Right Corner
function drawLogoWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  settings: StitchSettings,
  logoImg: HTMLImageElement | null
) {
  if (!settings.logo?.enabled) return;
  const logo = settings.logo;
  const padding = 28;
  const opacity = logo.opacity ?? 0.9;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (logo.type === 'image' && logoImg && logoImg.width > 0) {
    const baseW = logo.size === 'small' ? 70 : logo.size === 'large' ? 140 : 100;
    const aspect = logoImg.height / logoImg.width;
    const baseH = baseW * aspect;
    const x = w - baseW - padding;
    const y = padding + 8;

    // Drop shadow behind logo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 10;
    ctx.drawImage(logoImg, x, y, baseW, baseH);
  } else if (logo.text) {
    const fontSize = logo.size === 'small' ? 16 : logo.size === 'large' ? 26 : 20;
    ctx.font = `900 ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(logo.text);
    const badgeW = metrics.width + 26;
    const badgeH = fontSize + 16;
    const x = w - badgeW - padding;
    const y = padding + 8;

    const style = logo.textStyle || 'white-badge';

    if (style === 'green-glow') {
      // Green neon style matching actor text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(x, y, badgeW, badgeH, 10);
      ctx.fill();

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(34, 197, 94, 0.9)';
      ctx.shadowBlur = 12;
      ctx.fillText(logo.text, x + badgeW / 2, y + badgeH / 2);
    } else if (style === 'gold-neon') {
      // Gold neon
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(x, y, badgeW, badgeH, 10);
      ctx.fill();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
      ctx.shadowBlur = 12;
      ctx.fillText(logo.text, x + badgeW / 2, y + badgeH / 2);
    } else {
      // Rounded background badge (white-badge)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x, y, badgeW, badgeH, 10);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Clean white text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText(logo.text, x + badgeW / 2, y + badgeH / 2);
    }
  }

  ctx.restore();
}
