import { useCallback } from 'react';
import { Platform, Vibration } from 'react-native';

export function usePressFeedback(duration = 8) {
  return useCallback(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Vibration.vibrate(duration);
    }
  }, [duration]);
}

