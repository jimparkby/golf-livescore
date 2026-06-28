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
  const vpColor = vsPar < 0 ? '#22c55e' : vsPar === 0 ? '#ffffff' : '#f87171';
  const playerName = `${profile.firstName} ${profile.lastName}`.trim() || 'Player';
  const courseName = round.courseName.split(' · ')[0];

  // Создать canvas
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Фон
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // Если есть фото раунда, загрузить и нарисовать
  if (round.photoUrl) {
    try {
      const img = await loadImage(round.photoUrl);

      // Рассчитать размеры для фото (центрированное, aspect ratio 4:3)
      const photoHeight = 720; // Максимальная высота
      const photoWidth = photoHeight * (4/3);
      const photoX = (STORY_WIDTH - photoWidth) / 2;
      const photoY = 400; // Отступ сверху

      // Нарисовать фото
      ctx.drawImage(img, photoX, photoY, photoWidth, photoHeight);

      // Затемнение снизу
      const gradient = ctx.createLinearGradient(photoX, photoY + photoHeight, photoX, photoY + photoHeight - 200);
      gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(photoX, photoY, photoWidth, photoHeight);

      // Счёт поверх фото (правый верхний угол)
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      roundRect(ctx, photoX + photoWidth - 180, photoY + 30, 150, 120, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(total), photoX + photoWidth - 105, photoY + 95);

      ctx.fillStyle = vpColor;
      ctx.font = 'bold 28px -apple-system, sans-serif';
      ctx.fillText(vpText, photoX + photoWidth - 105, photoY + 130);

      // Название курса внизу фото
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 18px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(courseName.toUpperCase(), photoX + 30, photoY + photoHeight - 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px -apple-system, sans-serif';
      ctx.fillText(courseName, photoX + 30, photoY + photoHeight - 45);

    } catch (err) {
      console.warn('Failed to load photo:', err);
      // Продолжить без фото
    }
  }

  // Счёт (большой, в центре если нет фото)
  if (!round.photoUrl) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 140px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), STORY_WIDTH / 2, STORY_HEIGHT / 2);

    ctx.fillStyle = vpColor;
    ctx.font = 'bold 56px -apple-system, sans-serif';
    ctx.fillText(vpText, STORY_WIDTH / 2, STORY_HEIGHT / 2 + 80);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '600 24px -apple-system, sans-serif';
    ctx.fillText(courseName, STORY_WIDTH / 2, STORY_HEIGHT / 2 + 140);
  }

  // Имя игрока вверху
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '600 16px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROUND COMPLETED', STORY_WIDTH / 2, 250);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px -apple-system, sans-serif';
  ctx.fillText(playerName, STORY_WIDTH / 2, 290);

  // Watermark внизу
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '600 22px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⛳ GOLF • Made with Golf Livescore', STORY_WIDTH / 2, STORY_HEIGHT - 100);

  // Конвертировать в blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/jpeg', 0.92);
  });
}

/**
 * Загрузить изображение из URL или DataURL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Для CORS

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    // Timeout через 5 секунд
    setTimeout(() => reject(new Error('Image load timeout')), 5000);

    img.src = src;
  });
}

/**
 * Нарисовать закругленный прямоугольник
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Поделиться изображением через Web Share API или скачать
 */
export async function shareToInstagram(blob: Blob): Promise<void> {
  const file = new File([blob], `golf-round-${Date.now()}.jpg`, {
    type: 'image/jpeg',
  });

  console.log('[Share] File created:', file.size, 'bytes');

  // Попытаться использовать Web Share API
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    console.log('[Share] Web Share API available, sharing...');
    try {
      await navigator.share({
        files: [file],
        title: 'My Golf Round',
        text: 'Check out my golf round! ⛳',
      });
      console.log('[Share] Share successful');
      return;
    } catch (err) {
      console.log('[Share] Share error:', err);
      // Пользователь отменил или произошла ошибка
      if ((err as Error).name === 'AbortError') {
        throw new Error('Share cancelled');
      }
      // Fallback на download
    }
  } else {
    console.log('[Share] Web Share API not available, downloading...');
  }

  // Fallback: скачать файл
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  throw new Error('Web Share not available, image downloaded');
}

/**
 * Проверить поддержку Web Share API
 */
export function canShare(): boolean {
  return !!(navigator.canShare && navigator.share);
}
