import { toBlob } from 'html-to-image';
import type { Round, Profile } from '@/store/golfStore';
import RoundCard from '@/components/RoundCard';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SAFE_TOP = 150;
const SAFE_BOTTOM = 200;

/**
 * Генерирует изображение для Instagram Story (1080x1920) с результатами раунда
 */
export async function generateStoryImage(
  round: Round,
  profile: Profile
): Promise<Blob> {
  // Создать скрытый контейнер
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${STORY_WIDTH}px`;
  container.style.height = `${STORY_HEIGHT}px`;
  container.style.background = '#000';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  // Обертка для центрирования
  const wrapper = document.createElement('div');
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.paddingTop = `${SAFE_TOP}px`;
  wrapper.style.paddingBottom = `${SAFE_BOTTOM}px`;
  wrapper.style.paddingLeft = '40px';
  wrapper.style.paddingRight = '40px';
  container.appendChild(wrapper);

  // Контейнер для RoundCard
  const cardContainer = document.createElement('div');
  cardContainer.style.width = '1000px'; // Увеличенная ширина для Stories
  cardContainer.style.maxWidth = '100%';
  wrapper.appendChild(cardContainer);

  // Watermark
  const watermark = document.createElement('div');
  watermark.textContent = '⛳ GOLF • Made with Golf Livescore';
  watermark.style.position = 'absolute';
  watermark.style.bottom = '80px';
  watermark.style.left = '50%';
  watermark.style.transform = 'translateX(-50%)';
  watermark.style.color = 'rgba(255,255,255,0.4)';
  watermark.style.fontSize = '16px';
  watermark.style.fontWeight = '600';
  watermark.style.letterSpacing = '0.1em';
  watermark.style.textAlign = 'center';
  container.appendChild(watermark);

  try {
    // Отрендерить RoundCard
    const playerName = `${profile.firstName} ${profile.lastName}`.trim() || 'Player';

    const root = createRoot(cardContainer);
    root.render(
      createElement(RoundCard, {
        round,
        profilePhoto: profile.photoUrl,
        playerName,
        playerHcp: profile.hcp,
      })
    );

    // Дождаться рендера и загрузки шрифтов
    await new Promise(resolve => setTimeout(resolve, 100));
    await document.fonts.ready;

    // Дождаться загрузки всех изображений
    const images = container.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(
        img =>
          new Promise((resolve, reject) => {
            if (img.complete) {
              resolve(true);
            } else {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true); // Продолжить даже если изображение не загрузилось
            }
          })
      )
    );

    // Еще небольшая задержка для финального рендера
    await new Promise(resolve => setTimeout(resolve, 200));

    // Конвертировать в blob
    const blob = await toBlob(container, {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      pixelRatio: 1,
      quality: 0.9,
      backgroundColor: '#000',
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
