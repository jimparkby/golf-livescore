import { useEffect, useState } from 'react';

const tg = (window as any)?.Telegram?.WebApp;

function applyTelegramSafeArea() {
  const deviceTop    = tg?.safeAreaInset?.top ?? 0;
  const contentTop   = tg?.contentSafeAreaInset?.top ?? 0;
  const isFullscreen = tg?.isFullscreen ?? false;

  // In fullscreen mode: deviceTop (notch/status bar) + contentTop (TG Close button) must BOTH be added.
  // contentSafeAreaInset is the EXTRA inset on top of the device inset, not a replacement.
  // Minimum 100px in fullscreen so the Close button never overlaps even before SDK reports values.
  const safeTop = isFullscreen
    ? Math.max(deviceTop + contentTop, 100)
    : deviceTop;

  const bottom = tg?.safeAreaInset?.bottom ?? 0;
  document.documentElement.style.setProperty('--tg-safe-top',    `${safeTop}px`);
  document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom}px`);
}

export function useTelegram() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tg) {
      try { tg.ready(); } catch {}
      try { tg.expand(); } catch {}
      try { if (typeof tg.requestFullscreen === 'function') tg.requestFullscreen(); } catch {}

      try { tg.setHeaderColor('#000000'); } catch {}
      try { tg.setBackgroundColor('#000000'); } catch {}
      try { if (typeof tg.setBottomBarColor === 'function') tg.setBottomBarColor('#000000'); } catch {}
      // Prevent swipe-down from closing the app
      try { if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes(); } catch {}
      try { tg.enableClosingConfirmation(); } catch {}

      applyTelegramSafeArea();
      const t1 = setTimeout(applyTelegramSafeArea, 100);
      const t2 = setTimeout(applyTelegramSafeArea, 300);
      const t3 = setTimeout(applyTelegramSafeArea, 600);
      const t4 = setTimeout(applyTelegramSafeArea, 1200);
      const t5 = setTimeout(applyTelegramSafeArea, 2000);

      tg.onEvent?.('safeAreaChanged',        applyTelegramSafeArea);
      tg.onEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);
      tg.onEvent?.('fullscreenChanged',      applyTelegramSafeArea);

      setReady(true);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        tg.offEvent?.('safeAreaChanged',        applyTelegramSafeArea);
        tg.offEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);
        tg.offEvent?.('fullscreenChanged',      applyTelegramSafeArea);
      };
    } else {
      document.documentElement.style.setProperty('--tg-safe-top',    '0px');
      document.documentElement.style.setProperty('--tg-safe-bottom', '0px');
      setReady(true);
    }
  }, []);

  return { tg, ready };
}
