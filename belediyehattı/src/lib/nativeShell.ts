import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

const STATUS_BAR_LIGHT = '#0b4f9c';
const STATUS_BAR_DARK = '#0f172a';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initNativeShell(isDark: boolean): Promise<void> {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('native-app');

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: isDark ? STATUS_BAR_DARK : STATUS_BAR_LIGHT });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch {
    /* Web or unsupported */
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setScroll({ isDisabled: false });
  } catch {
    /* ignore */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
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
