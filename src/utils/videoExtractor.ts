/**
 * Client-side video keyframe extractor
 * Samples evenly spaced frames from an uploaded video file or URL
 */
export async function extractKeyframesFromVideo(
  videoSource: File | string,
  frameCount: number = 4,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ frames: string[]; duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    const url = typeof videoSource === 'string' ? videoSource : URL.createObjectURL(videoSource);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        const width = video.videoWidth || 480;
        const height = video.videoHeight || 270;

        // Resize canvas to max 480px wide for optimal AI token efficiency
        const scale = Math.min(1, 480 / width);
        const canvasWidth = Math.round(width * scale);
        const canvasHeight = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        const frames: string[] = [];
        // Calculate timestamp intervals
        const safeDuration = Math.max(duration - 0.5, 1);
        const interval = safeDuration / (frameCount + 1);

        for (let i = 1; i <= frameCount; i++) {
          const targetTime = Math.min(i * interval, duration - 0.2);
          if (onProgress) {
            onProgress(Math.round((i / frameCount) * 100), `Đang trích xuất khung hình ${i}/${frameCount}...`);
          }

          await seekVideo(video, targetTime);
          ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
          // Export as JPEG with 0.65 quality for light payload
          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          frames.push(dataUrl);
        }

        if (typeof videoSource !== 'string') {
          URL.revokeObjectURL(url);
        }

        resolve({
          frames,
          duration,
          width,
          height,
        });
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error('Không thể tải hoặc giải mã video. Vui lòng kiểm tra định dạng file (MP4, WebM).'));
    };
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      // Brief RAF to ensure frame buffer is updated
      requestAnimationFrame(() => resolve());
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.max(0, time);
  });
}
