/**
 * @format
 */

globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import 'react-native-gesture-handler';
import '@react-native-firebase/app';
import '@react-native-firebase/messaging';
import { AppRegistry, Platform } from 'react-native';
let Config;
try {
  Config = require('react-native-config').default;
} catch (e) {
  console.error('Failed to load react-native-config:', e);
  Config = {};
}
import App from './App';
import './i18n';
import { name as appName } from './app.json';



AppRegistry.registerComponent(appName, () => App);
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './services/audioPlayerService';
TrackPlayer.registerPlaybackService(() => PlaybackService);

