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
  const clubName = round.courseName.split(' · ')[1] || '';

  // Форматировать дату
  const date = new Date(round.date);
  const dateStr = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Создать canvas
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Фон с градиентом
  const bgGradient = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  bgGradient.addColorStop(0, '#0a0a0a');
  bgGradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // Основная карточка с фото и счётом
  const cardY = 360;
  const cardWidth = 960;
  const cardX = (STORY_WIDTH - cardWidth) / 2;

  // Если есть фото раунда, загрузить и нарисовать
  if (round.photoUrl) {
    try {
      const img = await loadImage(round.photoUrl);

      // Рассчитать размеры для фото с закругленными углами
      const photoHeight = 720;
      const photoWidth = photoHeight * (4/3);
      const photoX = (STORY_WIDTH - photoWidth) / 2;
      const photoY = cardY;

      // Создать clipping path для закругленных углов
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(photoX + 24, photoY);
      ctx.lineTo(photoX + photoWidth - 24, photoY);
      ctx.quadraticCurveTo(photoX + photoWidth, photoY, photoX + photoWidth, photoY + 24);
      ctx.lineTo(photoX + photoWidth, photoY + photoHeight - 24);
      ctx.quadraticCurveTo(photoX + photoWidth, photoY + photoHeight, photoX + photoWidth - 24, photoY + photoHeight);
      ctx.lineTo(photoX + 24, photoY + photoHeight);
      ctx.quadraticCurveTo(photoX, photoY + photoHeight, photoX, photoY + photoHeight - 24);
      ctx.lineTo(photoX, photoY + 24);
      ctx.quadraticCurveTo(photoX, photoY, photoX + 24, photoY);
      ctx.closePath();
      ctx.clip();

      // Нарисовать фото
      ctx.drawImage(img, photoX, photoY, photoWidth, photoHeight);
      ctx.restore();

      // Градиент затемнения снизу
      const gradient = ctx.createLinearGradient(photoX, photoY + photoHeight, photoX, photoY + photoHeight - 250);
      gradient.addColorStop(0, 'rgba(0,0,0,0.9)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(photoX + 24, photoY);
      ctx.lineTo(photoX + photoWidth - 24, photoY);
      ctx.quadraticCurveTo(photoX + photoWidth, photoY, photoX + photoWidth, photoY + 24);
      ctx.lineTo(photoX + photoWidth, photoY + photoHeight - 24);
      ctx.quadraticCurveTo(photoX + photoWidth, photoY + photoHeight, photoX + photoWidth - 24, photoY + photoHeight);
      ctx.lineTo(photoX + 24, photoY + photoHeight);
      ctx.quadraticCurveTo(photoX, photoY + photoHeight, photoX, photoY + photoHeight - 24);
      ctx.lineTo(photoX, photoY + 24);
      ctx.quadraticCurveTo(photoX, photoY, photoX + 24, photoY);
      ctx.closePath();
      ctx.clip();
      ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
      ctx.restore();

      // Карточка со счётом (правый верхний угол)
      const scoreCardX = photoX + photoWidth - 200;
      const scoreCardY = photoY + 40;

      // Фон карточки со счётом
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      roundRect(ctx, scoreCardX, scoreCardY, 160, 140, 20);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Счёт
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(total), scoreCardX + 80, scoreCardY + 75);

      // vs Par
      ctx.fillStyle = vpColor;
      ctx.font = 'bold 32px -apple-system, sans-serif';
      ctx.fillText(vpText, scoreCardX + 80, scoreCardY + 115);

      // Информация о курсе внизу фото
      const courseInfoY = photoY + photoHeight - 50;

      // Название курса
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 18px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.letterSpacing = '2px';
      ctx.fillText(courseName.toUpperCase(), photoX + 40, courseInfoY - 35);
      ctx.letterSpacing = '0px';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px -apple-system, sans-serif';
      ctx.fillText(clubName || courseName, photoX + 40, courseInfoY);

      // Rating / Slope справа
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '500 18px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`⛳ ${round.rating} / ${round.slope}`, photoX + photoWidth - 40, courseInfoY);

    } catch (err) {
      console.warn('Failed to load photo:', err);
      // Продолжить без фото
    }
  }

  // Карточка со счётом (если нет фото)
  if (!round.photoUrl) {
    const centerY = 700;

    // Большая карточка со счётом
    const scoreCardWidth = 800;
    const scoreCardHeight = 500;
    const scoreCardX = (STORY_WIDTH - scoreCardWidth) / 2;
    const scoreCardY = centerY - scoreCardHeight / 2;

    // Фон карточки с градиентом
    const cardGradient = ctx.createLinearGradient(scoreCardX, scoreCardY, scoreCardX, scoreCardY + scoreCardHeight);
    cardGradient.addColorStop(0, 'rgba(30,30,30,0.95)');
    cardGradient.addColorStop(1, 'rgba(20,20,20,0.95)');
    ctx.fillStyle = cardGradient;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    roundRect(ctx, scoreCardX, scoreCardY, scoreCardWidth, scoreCardHeight, 32);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Счёт
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 160px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), STORY_WIDTH / 2, scoreCardY + 180);

    // vs Par
    ctx.fillStyle = vpColor;
    ctx.font = 'bold 64px -apple-system, sans-serif';
    ctx.fillText(vpText, STORY_WIDTH / 2, scoreCardY + 260);

    // Разделитель
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scoreCardX + 100, scoreCardY + 310);
    ctx.lineTo(scoreCardX + scoreCardWidth - 100, scoreCardY + 310);
    ctx.stroke();

    // Название курса
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '600 20px -apple-system, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(courseName.toUpperCase(), STORY_WIDTH / 2, scoreCardY + 360);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.fillText(clubName || courseName, STORY_WIDTH / 2, scoreCardY + 395);

    // Rating / Slope
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 20px -apple-system, sans-serif';
    ctx.fillText(`⛳ ${round.rating} / ${round.slope}`, STORY_WIDTH / 2, scoreCardY + 440);
  }

  // Верхняя секция с информацией об игроке
  const topY = 180;

  // Заголовок
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '700 20px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('⛳ РАУНД ЗАВЕРШЁН', STORY_WIDTH / 2, topY);
  ctx.letterSpacing = '0px';

  // Имя игрока
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px -apple-system, sans-serif';
  ctx.fillText(playerName, STORY_WIDTH / 2, topY + 60);

  // HCP
  if (profile.hcp !== undefined && profile.hcp !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '600 24px -apple-system, sans-serif';
    ctx.fillText(`HCP ${profile.hcp}`, STORY_WIDTH / 2, topY + 95);
  }

  // Дата
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '500 18px -apple-system, sans-serif';
  ctx.fillText(dateStr, STORY_WIDTH / 2, topY + 130);

  // Watermark внизу
  const watermarkY = STORY_HEIGHT - 120;

  // Фон для watermark
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(ctx, STORY_WIDTH / 2 - 300, watermarkY - 35, 600, 70, 16);

  // Текст watermark
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '700 18px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('GOLF LIVESCORE', STORY_WIDTH / 2, watermarkY);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '500 16px -apple-system, sans-serif';
  ctx.fillText('Track • Share • Compete', STORY_WIDTH / 2, watermarkY + 25);

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
