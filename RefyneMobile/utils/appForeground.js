import { useEffect, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { supabase } from '../supabaseClient';

export const APP_FOREGROUND_EVENT = 'appForeground';

let started = false;
let previousAppState = AppState.currentState;

/**
 * Single AppState listener for the app. Emits only on background → active.
 * Ignores inactive → active (Control Center, notification shade, app switcher).
 */
export function startAppForegroundListener() {
  if (started) return;
  started = true;
  previousAppState = AppState.currentState;

  AppState.addEventListener('change', async (nextAppState) => {
    const cameFromBackground =
      previousAppState === 'background' && nextAppState === 'active';
    previousAppState = nextAppState;

    if (!cameFromBackground) return;

    let sessionTimeoutId;
    try {
      const sessionTimeoutMs = 8000;
      await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => {
          sessionTimeoutId = setTimeout(
            () => reject(new Error('Foreground session check timeout')),
            sessionTimeoutMs
          );
        }),
      ]);
    } catch (error) {
      console.warn(
        'Session check on app foreground failed (non-critical):',
        error?.message
      );
    } finally {
      clearTimeout(sessionTimeoutId);
    }

    DeviceEventEmitter.emit(APP_FOREGROUND_EVENT);
  });
}

export function subscribeToAppForeground(callback) {
  startAppForegroundListener();
  const subscription = DeviceEventEmitter.addListener(APP_FOREGROUND_EVENT, callback);
  return () => subscription.remove();
}

export function useAppForeground(onForeground) {
  const callbackRef = useRef(onForeground);
  callbackRef.current = onForeground;

  useEffect(() => {
    return subscribeToAppForeground(() => {
      callbackRef.current();
    });
  }, []);
}
