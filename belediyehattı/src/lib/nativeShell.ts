import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

const STATUS_BAR_LIGHT = '#f8fafc';
const STATUS_BAR_DARK = '#0f172a';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function hideNativeSplash(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 0 });
  } catch {
    /* ignore */
  }
}

export async function initNativeShell(isDark: boolean, options?: { hideSplash?: boolean }): Promise<void> {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('native-app');

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: isDark ? STATUS_BAR_DARK : STATUS_BAR_LIGHT });
    await StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark });
  } catch {
    /* Web or unsupported */
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setScroll({ isDisabled: false });
  } catch {
    /* ignore */
  }

  if (options?.hideSplash !== false) {
    await hideNativeSplash();
  }
}

/** Android hardware back: return true if the event was handled. */
export function registerNativeBackHandler(handler: () => boolean): () => void {
  if (Capacitor.getPlatform() !== 'android') {
    return () => {};
  }

  const sub = App.addListener('backButton', () => {
    if (handler()) return;
    App.exitApp();
  });

  return () => {
    sub.then((l) => l.remove()).catch(() => {});
  };
}
