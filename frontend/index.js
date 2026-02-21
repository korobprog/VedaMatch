/**
 * @format
 */

globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import 'react-native-gesture-handler';
// Firebase App MUST be imported first as a side-effect before any Firebase service
import '@react-native-firebase/app';
import { AppRegistry } from 'react-native';
import App from './App';
import './i18n';
import { name as appName } from './app.json';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './services/audioPlayerService';

// Background message handler — use dynamic require() so Firebase App is
// guaranteed to be initialized before we call getMessaging().
// Static import hoisting would race with '@react-native-firebase/app'.
try {
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
  const { notificationService } = require('./services/notificationService');
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async remoteMessage => {
    await notificationService.handleBackgroundMessage(remoteMessage);
  });
} catch (error) {
  console.warn('[Push] Background handler was not initialized:', error);
}

AppRegistry.registerComponent(appName, () => App);
TrackPlayer.registerPlaybackService(() => PlaybackService);
