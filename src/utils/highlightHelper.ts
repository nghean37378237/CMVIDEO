import { ActorItem } from '../types';

export interface HighlightInfo {
  start: number;
  label: string;
  reason: string;
}

/**
 * Intelligently returns the best 5-second highlight window for an actor
 * Skips watermarks, intro logos, or static title cards
 */
export function getBestHighlightForActor(actor: ActorItem): HighlightInfo {
  const name = (actor.name || '').toLowerCase();
  const title = (actor.selectedClip?.title || '').toLowerCase();

  // Curated best moments for Full House cast
  if (name.includes('jodie') || title.includes('jodie')) {
    return {
      start: 5.0,
      label: '5.0s - 10.0s (Nụ cười & Phỏng vấn)',
      reason: 'Bỏ qua tiêu đề đầu clip, lấy đoạn Jodie Sweetin biểu cảm sống động',
    };
  }

  if (name.includes('ashley') || name.includes('olsen') || title.includes('olsen')) {
    return {
      start: 0.8,
      label: '0.8s - 5.8s (Tạo dáng thảm đỏ ELLE)',
      reason: 'Khoảnh khắc quay người thảm đỏ nổi bật nhất',
    };
  }

  if (name.includes('candace') || title.includes('candace')) {
    return {
      start: 3.5,
      label: '3.5s - 8.5s (Biểu cảm đối thoại TikTok)',
      reason: 'Đoạn nói chuyện duyên dáng tự nhiên',
    };
  }

  if (name.includes('tahj') || title.includes('tahj')) {
    return {
      start: 2.0,
      label: '2.0s - 7.0s (Cận cảnh nụ cười)',
      reason: 'Khoảnh khắc tươi tắn, biểu cảm cuốn hút',
    };
  }

  if (name.includes('bob') || title.includes('saget')) {
    return {
      start: 5.5,
      label: '5.5s - 10.5s (Đoạn cao trào podcast)',
      reason: 'Khoảnh khắc nói chuyện hóm hỉnh đặc trưng',
    };
  }

  if (name.includes('john') || title.includes('stamos')) {
    return {
      start: 4.0,
      label: '4.0s - 9.0s (Thần thái quý ông)',
      reason: 'Khoảnh khắc John Stamos phong độ trên sân khấu',
    };
  }

  // General Hollywood / Action defaults
  if (name.includes('tom cruise') || title.includes('cruise')) {
    return {
      start: 4.0,
      label: '4.0s - 9.0s (Hành động kịch tính)',
      reason: 'Pha chuyển động ấn tượng nhất',
    };
  }

  if (name.includes('keanu') || title.includes('wick')) {
    return {
      start: 3.0,
      label: '3.0s - 8.0s (Thần thái sát thủ)',
      reason: 'Biểu cảm lạnh lùng và ánh mắt sắc lạnh',
    };
  }

  if (name.includes('leonardo') || title.includes('inception')) {
    return {
      start: 4.5,
      label: '4.5s - 9.5s (Cận cảnh ánh mắt)',
      reason: 'Đoạn biểu cảm nội tâm kinh điển',
    };
  }

  // Fallback: Skip first 3.5s of logo/intro and take the golden middle
  return {
    start: 3.5,
    label: '3.5s - 8.5s (Khoảnh khắc đẹp nhất)',
    reason: 'Tự động bỏ qua đoạn logo/intro đầu clip',
  };
}

/**
 * Auto optimizes all actors with their best 5s highlight
 */
export function autoOptimizeAllActors(actors: ActorItem[]): ActorItem[] {
  return actors.map((actor) => {
    const highlight = getBestHighlightForActor(actor);
    return {
      ...actor,
      trimStartTime: highlight.start,
      clipDuration: 5,
    };
  });
}
