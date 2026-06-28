import { toBlob } from 'html-to-image';
import type { Round, Profile } from '@/store/golfStore';
import { getAllCourses } from '@/lib/courses';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/**
 * Генерирует изображение для Instagram Story (1080x1920) с результатами раунда
 */
export async function generateStoryImage(
  round: Round,
  profile: Profile
): Promise<Blob> {
  const course = getAllCourses().find((c) => c.id === round.courseId);
  const me = round.players.find((p) => p.isMe) ?? round.players[0];
  const scores = me ? (round.scores[me.id] ?? []) : [];
  const total = scores.reduce((a, s) => a + s.score, 0);
  const vsPar = scores.reduce((a, s) => {
    const h = course?.holes.find((h) => h.number === s.hole);
    return a + (s.score - (h?.par ?? 4));
  }, 0);

  const vpText = vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`;
  const vpColor = vsPar < 0 ? '#22c55e' : vsPar === 0 ? 'rgba(255,255,255,0.8)' : '#f87171';
  const playerName = `${profile.firstName} ${profile.lastName}`.trim() || 'Player';
  const dateStr = new Date(round.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Создать контейнер
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    left: -99999px;
    top: 0;
    width: ${STORY_WIDTH}px;
    height: ${STORY_HEIGHT}px;
    background: #000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 150px 60px 200px;
    box-sizing: border-box;
  `;

  container.innerHTML = `
    <div style="width: 100%; max-width: 960px; background: #111111; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 16px; padding: 24px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: #eab308; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #000; flex-shrink: 0;">
          ${playerName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 22px; font-weight: bold; color: white;">
            ${playerName} <span style="color: rgba(255,255,255,0.5); font-weight: normal;">(${profile.hcp})</span>
          </div>
          <div style="font-size: 18px; color: rgba(255,255,255,0.5); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${round.courseName.split(' · ')[0]} · ${round.courseName.split(' · ')[1] ?? 'Golf Club'}
          </div>
        </div>
        <div style="font-size: 18px; color: rgba(255,255,255,0.4);">${dateStr}</div>
      </div>

      <!-- Photo -->
      ${round.photoUrl ? `
        <div style="position: relative; width: 100%; aspect-ratio: 4/3; max-height: 540px; overflow: hidden;">
          <img
            src="${round.photoUrl}"
            style="width: 100%; height: 100%; object-fit: cover;"
            crossorigin="anonymous"
          />
          <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%);"></div>

          <!-- Score badge -->
          <div style="position: absolute; top: 24px; right: 24px; background: rgba(0,0,0,0.7); backdrop-filter: blur(12px); border-radius: 16px; padding: 16px 24px; text-align: center;">
            <div style="font-size: 56px; font-weight: 900; color: white; line-height: 1; font-feature-settings: 'tnum';">${total}</div>
            <div style="font-size: 24px; font-weight: bold; color: ${vpColor}; margin-top: 4px;">${vpText}</div>
          </div>

          <!-- Bottom info -->
          <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 32px;">
            <div style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.1em;">${dateStr}</div>
            <div style="font-size: 22px; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">${round.courseName.split(' · ')[0]}</div>
            <div style="font-size: 16px; color: rgba(255,255,255,0.5); margin-top: 4px;">⛳ ${round.rating} / ${round.slope}</div>
          </div>
        </div>
      ` : `
        <!-- No photo - just show big score -->
        <div style="padding: 80px 40px; text-align: center;">
          <div style="font-size: 120px; font-weight: 900; color: white; line-height: 1; font-feature-settings: 'tnum';">${total}</div>
          <div style="font-size: 48px; font-weight: bold; color: ${vpColor}; margin-top: 16px;">${vpText}</div>
          <div style="font-size: 20px; color: rgba(255,255,255,0.5); margin-top: 24px;">${round.courseName.split(' · ')[0]}</div>
        </div>
      `}

      <!-- Footer stats -->
      <div style="display: flex; items-center: justify-end; gap: 24px; padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="color: rgba(255,255,255,0.5); font-size: 18px; font-weight: 600;">TOTAL</div>
        <div style="font-size: 40px; font-weight: 900; color: white; font-feature-settings: 'tnum';">${total}</div>
        <div style="font-size: 22px; font-weight: 900; color: ${vpColor}; font-feature-settings: 'tnum';">${vpText}</div>
      </div>
    </div>

    <!-- Watermark -->
    <div style="position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.3); font-size: 20px; font-weight: 600; letter-spacing: 0.15em; text-align: center; white-space: nowrap;">
      ⛳ GOLF • Made with Golf Livescore
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Дождаться загрузки шрифтов
    await document.fonts.ready;

    // Дождаться загрузки изображения (если есть)
    if (round.photoUrl) {
      const img = container.querySelector('img');
      if (img && !img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Продолжить даже если не загрузилось
          setTimeout(resolve, 3000); // Timeout через 3 секунды
        });
      }
    }

    // Небольшая задержка для финального рендера
    await new Promise(resolve => setTimeout(resolve, 300));

    // Конвертировать в blob
    const blob = await toBlob(container, {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      pixelRatio: 1,
      quality: 0.92,
      backgroundColor: '#000000',
    });

    if (!blob) {
      throw new Error('Failed to generate image');
    }

    return blob;
  } finally {
    // Очистить DOM
    document.body.removeChild(container);
  }
}

/**
 * Поделиться изображением через Web Share API или скачать
 */
export async function shareToInstagram(blob: Blob): Promise<void> {
  const file = new File([blob], `golf-round-${Date.now()}.jpg`, {
    type: 'image/jpeg',
  });

  // Попытаться использовать Web Share API
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'My Golf Round',
        text: 'Check out my golf round! ⛳',
      });
      return;
    } catch (err) {
      // Пользователь отменил или произошла ошибка
      if ((err as Error).name === 'AbortError') {
        throw new Error('Share cancelled');
      }
      // Fallback на download
    }
  }

  // Fallback: скачать файл
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);

  throw new Error('Share not supported, image downloaded');
}

/**
 * Проверить поддержку Web Share API
 */
export function canShare(): boolean {
  return !!(navigator.canShare && navigator.share);
}
