/**
 * @format
 */

import 'react-native-gesture-handler';
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

// #region agent log
console.log('DEBUG: Config loaded:', typeof Config !== 'undefined', 'API_KEY:', Config?.API_OPEN_AI?.substring(0, 10) || 'undefined');
try {
  const debugUrl = Platform.OS === 'android' ? 'http://10.0.2.2:7245' : 'http://127.0.0.1:7245';
  fetch(`${debugUrl}/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'index.js:15', message: 'App initialization with Config', data: { hasConfig: typeof Config !== 'undefined', configApiKey: Config?.API_OPEN_AI || 'undefined', configApiKeyLength: (Config?.API_OPEN_AI || '').length, configKeys: typeof Config !== 'undefined' ? Object.keys(Config).slice(0, 5) : [] }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'A' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
} catch (e) {
  console.log('DEBUG: Logging error:', e);
}
// #endregion

AppRegistry.registerComponent(appName, () => App);

