import React, { useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RNCallKeep from 'react-native-callkeep';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ChatProvider } from './context/ChatContext';
import { UserProvider, useUser } from './context/UserContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { webRTCService } from './services/webRTCService';
import { contactService, type UserContact } from './services/contactService';
import { ChatScreen } from './screens/ChatScreen';
import { SplashScreen } from './components/ui/SplashScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import LoginScreen from './screens/LoginScreen';
import PlansScreen from './screens/PlansScreen';
import { RootStackParamList } from './types/navigation';
import { linking } from './navigation/linking';
import LegalDocumentScreen from './screens/legal/LegalDocumentScreen';
// Portal Main Screen
import { PortalMainScreen } from './screens/portal/PortalMainScreen';
import WidgetSelectionScreen from './screens/portal/WidgetSelectionScreen';
import { AppSettingsScreen } from './screens/settings/AppSettingsScreen';
import { EditProfileScreen } from './screens/settings/EditProfileScreen';
import { LinkedAccountsScreen } from './screens/settings/LinkedAccountsScreen';
import { ProPlansScreen } from './screens/settings/ProPlansScreen';
import {
  SupportHomeScreen,
  SupportTicketFormScreen,
  SupportInboxScreen,
  SupportConversationScreen,
} from './screens/support';
// KrishnaAssistant - only used in Portal header
import { ContactsScreen } from './screens/portal/contacts/ContactsScreen';
import { ContactProfileScreen } from './screens/portal/contacts/ContactProfileScreen';
import { SettingsDrawer } from './SettingsDrawer';
import { GlobalGestureHandler } from './components/GlobalGestureHandler';
import { PortalLayoutProvider } from './context/PortalLayoutContext';
import { MiniPlayer } from './components/MiniPlayer';
import { MultimediaHubScreen } from './screens/multimedia/MultimediaHubScreen';
import { RadioScreen } from './screens/multimedia/RadioScreen';
import { AudioScreen } from './screens/multimedia/AudioScreen';
import { VideoScreen } from './screens/multimedia/VideoScreen';
import { VideoCirclesScreen } from './screens/multimedia/VideoCirclesScreen';
import { MyVideoCirclesScreen } from './screens/multimedia/MyVideoCirclesScreen';
import { VideoTariffsAdminScreen } from './screens/multimedia/VideoTariffsAdminScreen';
import { TVScreen } from './screens/multimedia/TVScreen';
import { AudioPlayerScreen } from './screens/multimedia/AudioPlayerScreen';
import { RadioPlayerScreen } from './screens/multimedia/RadioPlayerScreen';
import { VideoPlayerScreen } from './screens/multimedia/VideoPlayerScreen';
import { TVPlayerScreen } from './screens/multimedia/TVPlayerScreen';
import { FavoritesScreen } from './screens/multimedia/FavoritesScreen';
import { SeriesScreen } from './screens/multimedia/SeriesScreen';
import { SeriesDetailScreen } from './screens/multimedia/SeriesDetailScreen';
import { PlaylistsScreen } from './screens/multimedia/PlaylistsScreen';
import { PlaylistDetailScreen } from './screens/multimedia/PlaylistDetailScreen';
import { OfflineMediaScreen } from './screens/multimedia/OfflineMediaScreen';
import i18n from './i18n';
import { resolveUserCallDisplayName, resolveUserCallHandle } from './utils/userDisplay';


let VoipPushNotification: any;
if (Platform.OS === 'ios') {
  try {
    VoipPushNotification = require('react-native-voip-push-notification').default;
  } catch (e) {
    console.warn('VoipPushNotification not available', e);
  }
}

const getUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

import { RoomChatScreen } from './screens/portal/chat/RoomChatScreen';
import { RoomInviteEntryScreen } from './screens/portal/chat/RoomInviteEntryScreen';
import { RoomsHomeScreen } from './screens/portal/chat/RoomsHomeScreen';
import { CallScreen } from './screens/calls/CallScreen';
import { CallHistoryScreen } from './screens/calls/CallHistoryScreen';
import { MediaLibraryScreen } from './screens/portal/dating/MediaLibraryScreen';
import { EditDatingProfileScreen } from './screens/portal/dating/EditDatingProfileScreen';
import { DatingFavoritesScreen } from './screens/portal/dating/DatingFavoritesScreen';
import { DatingScreen } from './screens/portal/dating/DatingScreen';

import { AdsScreen } from './screens/portal/ads/AdsScreen';
import { CreateAdScreen } from './screens/portal/ads/CreateAdScreen';
import { AdDetailScreen } from './screens/portal/ads/AdDetailScreen';
import { AdsFiltersScreen } from './screens/portal/ads/AdsFiltersScreen';
import { LibraryHomeScreen } from './screens/library/LibraryHomeScreen';
import { BookListScreen } from './screens/library/BookListScreen';
import { ReaderScreen } from './screens/library/ReaderScreen';
import { NewsScreen } from './screens/portal/news/NewsScreen';
import { NewsDetailScreen } from './screens/portal/news/NewsDetailScreen';
import PreviewScreen from './screens/PreviewScreen';

// Market Routes
import { MarketHomeScreen } from './screens/portal/shops/MarketHomeScreen';
import { ShopsScreen } from './screens/portal/shops/ShopsScreen';
import { CreateShopScreen } from './screens/portal/shops/CreateShopScreen';
import { SellerDashboardScreen } from './screens/portal/shops/SellerDashboardScreen';
import { ProductEditScreen } from './screens/portal/shops/ProductEditScreen';
import { ProductDetailsScreen } from './screens/portal/shops/ProductDetailsScreen';
import { CheckoutScreen } from './screens/portal/shops/CheckoutScreen';
import { OrderSuccessScreen } from './screens/portal/shops/OrderSuccessScreen';
import { MyOrdersScreen } from './screens/portal/shops/MyOrdersScreen';
import { SellerOrdersScreen } from './screens/portal/shops/SellerOrdersScreen';
import { MyProductsScreen } from './screens/portal/shops/MyProductsScreen';
import { ShopsMapScreen } from './screens/portal/shops/ShopsMapScreen';
import { MapGeoapifyScreen } from './screens/portal/map/MapGeoapifyScreen';
import { DhamaCollectionDetailScreen, DhamaHomeScreen, DhamaMapScreen, HolyPlaceDetailScreen } from './screens/dhama';

import { EducationHomeScreen } from './screens/portal/education/EducationHomeScreen';
import { CourseDetailsScreen } from './screens/portal/education/CourseDetailsScreen';
import { ExamTrainerScreen } from './screens/portal/education/ExamTrainerScreen';
import { AITutorScreen } from './screens/portal/education/AITutorScreen';

import {
  CafeListScreen,
  CafeDetailScreen,
  DishDetailScreen,
  CafeCartScreen,
  OrderSuccessScreen as CafeOrderSuccessScreen,
  OrderTrackingScreen,
  QRScannerScreen,
  CafesMapScreen,
  CreateCafeScreen,
  CafeAdminDashboardScreen,
  StaffOrderBoardScreen,
  StaffWaiterCallsScreen,
  StaffStopListScreen,
  StaffTableEditorScreen,
  StaffOrderHistoryScreen,
  StaffMenuEditorScreen,
  StaffStatsScreen,
  CafeSettingsScreen,
} from './screens/portal/cafe';
import { CafeCartProvider } from './contexts/CafeCartContext';

import {
  TravelHomeScreen,
  YatraDetailScreen,
  YatraPublishScreen,
  ShelterDetailScreen,
  CreateYatraScreen,
  CreateShelterScreen,
} from './screens/portal/travel';

import {
  ServicesHomeScreen,
  ServiceDetailScreen,
  ServiceBookingScreen,
  MyBookingsScreen,
  CreateServiceScreen,
  MyServicesScreen,
  IncomingBookingsScreen,
  ServiceScheduleScreen,
  EkadashiCalendarScreen,
  ChannelsHubScreen,
  SadhuSangaHubScreen,
  SadhuSangaScheduleScreen,
  SadhuSangaLiveScreen,
  SadhuSangaProfileScreen,
  SadhuSangaSmartPushScreen,
  ChannelDetailsScreen,
  CreateChannelScreen,
  ChannelPostComposerScreen,
  ChannelManageScreen,
  ChannelTeamScreen,
  ChannelRoadmapManageScreen,
  ChannelPreacherBioManageScreen,
} from './screens/portal/services';
import {
  ConnectHomeScreen,
  ConnectFiltersScreen,
  ConnectOpportunityDetailsScreen,
  ConnectCommunityDetailsScreen,
  ConnectProfileSetupScreen,
  ConnectCreateOpportunityScreen,
  ConnectModerationScreen,
} from './screens/portal/connect';
import { SevaHubScreen, SevaProjectDetailsScreen } from './screens/seva';
import MyDonationsScreen from './screens/seva/MyDonationsScreen';
import WalletScreen from './screens/wallet/WalletScreen';
import InviteFriendsScreen from './screens/portal/referral/InviteFriendsScreen';
import { WalletProvider } from './context/WalletContext';
import { PathTrackerHomeScreen, PathCheckinScreen, PathStepScreen, PathReflectionScreen, PathWeeklySummaryScreen } from './screens/path_tracker';

import { QueryProvider } from './providers/QueryProvider';

import { StatusBar, ActivityIndicator, Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NotificationManager } from './components/NotificationManager';
import { NotificationProvider } from './context/NotificationContext';
import { crashReportingService } from './services/crashReportingService';
import { setIncomingCallPushHandler } from './services/notificationService';
import { PENDING_ROOM_INVITE_TOKEN_KEY } from './screens/portal/chat/roomInviteStorage';

const Stack = createNativeStackNavigator<RootStackParamList>();
import { navigationRef } from './navigation/navigationRef';

// Component to handle StatusBar styling based on theme context
const ThemedStatusBar = () => {
  const { isDarkMode } = useSettings();

  return (
    <StatusBar
      barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent={true}
    />
  );
};

const AppContent = () => {
  const { t } = useTranslation();
  const { theme, isMenuOpen, setIsMenuOpen, isDarkMode, currentModel, selectModel, isSettingsLoaded } = useSettings();
  const { isLoggedIn, isLoading, user } = useUser();
  const [showPreview, setShowPreview] = useState(true);
  const [minLoadTime, setMinLoadTime] = useState(false); // Force min loading time to hide flashes
  const pendingRoomInviteTokenRef = React.useRef('');
  const voipSetupRef = React.useRef(false);
  const incomingCallRef = React.useRef<{ callUUID: string; targetId?: number; callerName: string } | null>(null);
  const callerProfileCacheRef = React.useRef<Map<number, UserContact | null>>(new Map());
  // Keep sipUser ref or state if needed to manage connection

  // Use WebSocket to listen for incoming WebRTC calls
  const { addListener } = useWebSocket();

  React.useEffect(() => {
    crashReportingService.configureReleaseTags();
    crashReportingService.logBreadcrumb('app_bootstrap');

    const globalAny: any = global as any;
    const errorUtils = globalAny?.ErrorUtils;
    if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) {
      return;
    }

    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      crashReportingService.recordError(error, isFatal ? 'fatal_js' : 'js_error');
      if (typeof defaultHandler === 'function') {
        defaultHandler(error, isFatal);
      }
    });

    return () => {
      if (typeof defaultHandler === 'function') {
        errorUtils.setGlobalHandler(defaultHandler);
      }
    };
  }, []);

  React.useEffect(() => {
    crashReportingService.setUserContext(user?.ID ?? null);
  }, [user?.ID]);

  React.useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const useCallKeepNativeUi = Platform.OS === 'ios';

    // 1. Setup VoIP (CallKeep) only when app is active.
    // On Android we skip startup CallKeep init to avoid permission-dialog churn and ANR on cold start.
    const setupVoIP = async () => {
      try {
        if (voipSetupRef.current) {
          return;
        }

        // iOS must be ready for incoming call UI even when app is in background.
        if (Platform.OS !== 'ios' && AppState.currentState !== 'active') {
          return;
        }

        const options = {
          ios: { appName: 'VedaMatch VoIP' },
          android: {
            alertTitle: 'Permissions required',
            alertDescription: 'This application needs to access your phone accounts',
            cancelButton: 'Cancel',
            okButton: 'OK',
            imageName: 'phone_account_icon',
            additionalPermissions: [],
            selfManaged: true,
            foregroundService: {
              channelId: 'com.ragagent.voip',
              channelName: 'VoIP Service',
              notificationTitle: 'VedaMatch Call',
              notificationIcon: 'ic_launcher',
            },
          },
        };
        await RNCallKeep.setup(options);
        RNCallKeep.setAvailable(true);
        voipSetupRef.current = true;
      } catch (err) {
        console.error('CallKeep setup failed', err);
      }
    };

    const parseIncomingTargetId = (payload: any): number | undefined => {
      const candidates = [
        payload?.senderId,
        payload?.targetId,
        payload?.userId,
        payload?.callerId,
      ];

      for (const candidate of candidates) {
        const parsed = Number.parseInt(String(candidate ?? ''), 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }

      const params = payload?.params;
      if (params && typeof params === 'object') {
        for (const key of ['senderId', 'targetId', 'userId', 'callerId']) {
          const parsed = Number.parseInt(String((params as any)[key] ?? ''), 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
          }
        }
      }

      return undefined;
    };

    const fallbackCallerLabel = (targetId?: number) => {
      const fallbackLabel = i18n.t('contacts.userFallback', {
        id: targetId ?? 0,
        defaultValue: targetId ? `User #${targetId}` : 'User',
      });
      return String(fallbackLabel || 'User').replace(/\s*#\d+$/, '').trim() || 'User';
    };

    const resolveIncomingCallerIdentity = async (payload: any) => {
      const targetId = parseIncomingTargetId(payload);
      const genericCallerName = String(payload?.callerName || payload?.name || payload?.title || '').trim();
      const fallbackLabel = fallbackCallerLabel(targetId);
      const defaultIncomingCallTitle = i18n.t('calls.incomingCall', { defaultValue: 'Incoming call' });

      let callerName = genericCallerName || (targetId ? `${fallbackLabel} #${targetId}` : defaultIncomingCallTitle);
      let callerHandle = targetId ? String(targetId) : callerName;

      if (targetId) {
        let contact = callerProfileCacheRef.current.get(targetId) ?? null;
        if (!callerProfileCacheRef.current.has(targetId)) {
          contact = await contactService.getUserById(targetId);
          callerProfileCacheRef.current.set(targetId, contact);
        }

        if (contact) {
          callerName = resolveUserCallDisplayName(contact, { fallbackLabel });
          callerHandle = resolveUserCallHandle(contact, { fallbackLabel });
        }
      }

      return {
        targetId,
        callerName,
        callerHandle,
      };
    };

    const isUuidLike = (value: string): boolean => (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );

    const showIncomingCall = async (rawPayload: any) => {
      const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
      const { targetId, callerName, callerHandle } = await resolveIncomingCallerIdentity(payload);
      const incomingUUID = String(payload?.callUUID || payload?.uuid || '').trim();
      const callUUID = isUuidLike(incomingUUID) ? incomingUUID : getUUID();

      incomingCallRef.current = { callUUID, targetId, callerName };

      if (useCallKeepNativeUi) {
        await setupVoIP();
        if (voipSetupRef.current) {
          RNCallKeep.displayIncomingCall(callUUID, callerHandle, callerName, 'generic', true);
          return;
        }
      }

      if (navigationRef.isReady()) {
        navigationRef.navigate('CallScreen', {
          isIncoming: true,
          targetId,
          callerName,
          callUUID,
        });
      }
    };

    const appStateSub = useCallKeepNativeUi
      ? AppState.addEventListener('change', (state) => {
        if (state === 'active' && !voipSetupRef.current) {
          void setupVoIP();
        }
      })
      : null;

    if (useCallKeepNativeUi) {
      void setupVoIP();
    }

    const onAnswerCall = ({ callUUID }: { callUUID: string }) => {
      const incoming = incomingCallRef.current;
      const isMatchedCall = incoming && incoming.callUUID === callUUID;
      if (navigationRef.isReady()) {
        // @ts-ignore
        navigationRef.navigate('CallScreen', {
          isIncoming: true,
          callUUID,
          autoAccept: true,
          targetId: isMatchedCall ? incoming.targetId : undefined,
          callerName: isMatchedCall ? incoming.callerName : undefined,
        });
      }
    };

    if (useCallKeepNativeUi) {
      RNCallKeep.addEventListener('answerCall', onAnswerCall);
      RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
        if (incomingCallRef.current?.callUUID === callUUID) {
          incomingCallRef.current = null;
        }
        webRTCService.sendHangup();
      });
    }

    setIncomingCallPushHandler((payload) => {
      void showIncomingCall(payload);
    });

    const onVoipNotification = (notification: any) => {
      const payload = notification?.data || notification;
      void showIncomingCall(payload);
      const completionId = String(notification?.uuid || notification?.callUUID || payload?.uuid || '');
      if (completionId && typeof VoipPushNotification?.onVoipNotificationCompleted === 'function') {
        VoipPushNotification.onVoipNotificationCompleted(completionId);
      }
    };
    const onVoipDidLoad = (events: any[]) => {
      if (!Array.isArray(events) || events.length === 0) {
        return;
      }
      events.forEach((event) => {
        if (event?.name === 'RNVoipPushRemoteNotificationReceivedEvent') {
          onVoipNotification(event?.data);
        }
      });
    };

    const shouldRegisterVoipPush = useCallKeepNativeUi && VoipPushNotification && !__DEV__;
    if (useCallKeepNativeUi && VoipPushNotification) {
      try {
        if (shouldRegisterVoipPush) {
          VoipPushNotification.registerVoipToken();
        } else {
          console.log('[VoIP] registerVoipToken skipped in dev runtime');
        }
        VoipPushNotification.addEventListener('notification', onVoipNotification);
        VoipPushNotification.addEventListener('didLoadWithEvents', onVoipDidLoad);
      } catch (error) {
        console.warn('VoipPushNotification listener setup failed', error);
      }
    }

    // 2. LISTEN FOR WEBRTC OFFERS
    const removeLisener = addListener((msg: any) => {
      if (msg.type === 'offer') {
        const callerId = Number.parseInt(String(msg.senderId || ''), 10);
        console.log('Incoming WebRTC Call from:', callerId);
        void showIncomingCall({
          senderId: Number.isFinite(callerId) ? callerId : undefined,
          callerName: String(msg.callerName || '').trim(),
          uuid: msg?.payload?.roomId || msg?.roomId,
        });
      }
    });

    return () => {
      appStateSub?.remove();
      setIncomingCallPushHandler(null);
      if (useCallKeepNativeUi) {
        RNCallKeep.removeEventListener('answerCall');
        RNCallKeep.removeEventListener('endCall');
        if (VoipPushNotification) {
          try {
            VoipPushNotification.removeEventListener('notification', onVoipNotification);
            VoipPushNotification.removeEventListener('didLoadWithEvents', onVoipDidLoad);
          } catch (error) {
            console.warn('VoipPushNotification listener cleanup failed', error);
          }
        }
      }
      removeLisener();
    };
  }, [addListener, isLoggedIn]);

  // Force minimum load time to prevent white flashes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTime(true);
    }, 1500); // 1.5 seconds minimum load time
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!isLoggedIn) {
      pendingRoomInviteTokenRef.current = '';
      return;
    }

    let cancelled = false;
    const processPendingToken = () => {
      void (async () => {
        const rawToken = await AsyncStorage.getItem(PENDING_ROOM_INVITE_TOKEN_KEY);
        if (cancelled) return;

        const token = String(rawToken || '').trim();
        if (!token) {
          pendingRoomInviteTokenRef.current = '';
          return;
        }
        if (pendingRoomInviteTokenRef.current === token) {
          return;
        }

        if (!navigationRef.isReady()) {
          setTimeout(() => {
            if (!cancelled) {
              processPendingToken();
            }
          }, 200);
          return;
        }

        pendingRoomInviteTokenRef.current = token;
        navigationRef.navigate('RoomInviteEntry', { token });
      })().catch((error) => {
        console.warn('[App] Failed to process pending room invite token', error);
      });
    };
    const timer = setTimeout(processPendingToken, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLoggedIn]);

  // Show preview only for non-logged-in users
  // if (showPreview && !isLoggedIn && !isLoading) {
  //   return <PreviewScreen onFinish={() => setShowPreview(false)} />;
  // }

  if (isLoading || !isSettingsLoaded || !minLoadTime) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['top']}
    >
      <GlobalGestureHandler>
        <PortalLayoutProvider>
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            theme={{
              ...(isDarkMode ? DarkTheme : DefaultTheme),
              colors: {
                ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
                background: 'transparent',
              },
            }}
          >
            <ThemedStatusBar />
            <NotificationManager />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: Platform.OS === 'android' ? 'fade' : 'slide_from_right',
                freezeOnBlur: Platform.OS === 'android',
                contentStyle: {
                  // Transparent layers on Android increase overdraw and render-thread pressure.
                  backgroundColor: Platform.OS === 'android' ? (theme.background || '#000000') : 'transparent',
                },
              }}
            >
              {isLoggedIn ? (
                <Stack.Group>
                  <Stack.Screen name="Portal" component={PortalMainScreen} options={{ animation: 'fade' }} />
                  <Stack.Screen
                    name="WidgetSelection"
                    component={WidgetSelectionScreen}
                    options={{
                      animation: Platform.OS === 'android' ? 'none' : 'slide_from_right',
                      freezeOnBlur: false,
                      contentStyle: { backgroundColor: Platform.OS === 'android' ? (theme.background || '#000000') : 'transparent' },
                    }}
                  />
                  <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={{
                      animation: Platform.OS === 'android' ? 'none' : 'slide_from_right',
                      freezeOnBlur: Platform.OS === 'android' ? false : undefined,
                      contentStyle: { backgroundColor: Platform.OS === 'android' ? (theme.background || '#000000') : 'transparent' },
                    }}
                  />
                  <Stack.Screen
                    name="CallScreen"
                    component={CallScreen}
                    options={{
                      headerShown: false,
                      animation: 'none',
                      freezeOnBlur: false,
                      contentStyle: { backgroundColor: '#000000' },
                    }}
                  />
                  <Stack.Screen name="Plans" component={PlansScreen} />
                  <Stack.Screen
                    name="AppSettings"
                    component={AppSettingsScreen}
                    options={{
                      animation: Platform.OS === 'android' ? 'slide_from_right' : 'slide_from_right',
                      freezeOnBlur: false,
                      contentStyle: { backgroundColor: Platform.OS === 'android' ? (theme.background || '#000000') : 'transparent' },
                    }}
                  />
                  <Stack.Screen
                    name="LinkedAccounts"
                    component={LinkedAccountsScreen}
                    options={{
                      headerShown: false,
                      animation: Platform.OS === 'android' ? 'slide_from_right' : 'slide_from_right',
                      freezeOnBlur: false,
                      contentStyle: { backgroundColor: Platform.OS === 'android' ? (theme.background || '#000000') : 'transparent' },
                    }}
                  />
                  <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SupportHome" component={SupportHomeScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SupportTicketForm" component={SupportTicketFormScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SupportInbox" component={SupportInboxScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SupportConversation" component={SupportConversationScreen} options={{ headerShown: false }} />
                  <Stack.Screen
                    name="EditProfile"
                    component={EditProfileScreen}
                    options={{
                      gestureEnabled: false,
                      fullScreenGestureEnabled: false,
                      animationMatchesGesture: false,
                    }}
                  />
                  <Stack.Screen name="ProPlans" component={ProPlansScreen} options={{ headerShown: false }} />
                  <Stack.Screen
                    name="ContactProfile"
                    component={ContactProfileScreen}
                    options={{ freezeOnBlur: false }}
                  />
                  <Stack.Screen
                    name="RoomChat"
                    component={RoomChatScreen}
                    options={{ headerShown: true }}
                  />
                  <Stack.Screen name="RoomInviteEntry" component={RoomInviteEntryScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="MediaLibrary" component={MediaLibraryScreen} />
                  <Stack.Screen name="EditDatingProfile" component={EditDatingProfileScreen} />
                  <Stack.Screen name="DatingFavorites" component={DatingFavoritesScreen} />

                  {/* Ads Routes */}
                  <Stack.Screen name="Ads" component={AdsScreen} />
                  <Stack.Screen name="CreateAd" component={CreateAdScreen} />
                  <Stack.Screen name="AdDetail" component={AdDetailScreen} />
                  <Stack.Screen name="AdsFilters" component={AdsFiltersScreen} options={{ presentation: 'modal' }} />

                  {/* Library Routes */}
                  <Stack.Screen name="LibraryHome" component={LibraryHomeScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="BookList" component={BookListScreen} options={{ headerShown: true, title: t('portal.appNavigation.books') }} />
                  <Stack.Screen name="Reader" component={ReaderScreen} options={{ headerShown: true, title: t('portal.appNavigation.reader') }} />
                  <Stack.Screen name="NewsHome" component={NewsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ headerShown: false }} />

                  {/* Market Routes */}
                  <Stack.Screen name="MarketHome" component={MarketHomeScreen} options={{ headerShown: true, title: t('market.title') }} />
                  <Stack.Screen name="Shops" component={ShopsScreen} options={{ headerShown: true, title: t('market.shops') }} />
                  <Stack.Screen name="ShopDetails" component={ShopsScreen} options={{ headerShown: true, title: t('market.shops').slice(0, -1) }} />
                  <Stack.Screen name="CreateShop" component={CreateShopScreen} options={{ headerShown: true, title: t('market.shop.create') }} />
                  <Stack.Screen name="EditShop" component={CreateShopScreen} options={{ headerShown: true, title: t('market.product.edit') }} />
                  <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} options={{ headerShown: true, title: t('market.myShop') }} />
                  <Stack.Screen name="CreateProduct" component={ProductEditScreen} options={{ headerShown: true, title: t('market.product.add') }} />
                  <Stack.Screen name="EditProduct" component={ProductEditScreen} options={{ headerShown: true, title: t('market.product.edit') }} />
                  <Stack.Screen name="MyProducts" component={MyProductsScreen} options={{ headerShown: true, title: t('market.seller.myProducts') }} />
                  <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ headerShown: true, title: t('market.title').split(' ')[1] || t('market.title') }} />
                  <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: t('market.total') }} />
                  <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ headerShown: true, title: t('market.seller.orders') }} />
                  <Stack.Screen name="OrderDetails" component={MyOrdersScreen} options={{ headerShown: true, title: t('market.seller.orders') }} />
                  <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} options={{ headerShown: true, title: t('market.seller.orders') }} />
                  <Stack.Screen name="ShopsMap" component={ShopsMapScreen} options={{ headerShown: true, title: t('market.map.title') }} />

                  {/* Map Routes */}
                  <Stack.Screen name="MapGeoapify" component={MapGeoapifyScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="DhamaHome" component={DhamaHomeScreen} options={{ headerShown: true, title: t('dhama.homeTitle') }} />
                  <Stack.Screen name="DhamaMap" component={DhamaMapScreen} options={{ headerShown: true, title: t('dhama.mapTitle') }} />
                  <Stack.Screen name="DhamaCollectionDetail" component={DhamaCollectionDetailScreen} options={{ headerShown: true, title: t('dhama.collectionDetailTitle') }} />
                  <Stack.Screen name="HolyPlaceDetail" component={HolyPlaceDetailScreen} options={{ headerShown: true, title: t('dhama.placeDetailTitle') }} />
                  <Stack.Screen name="DatingHome" component={DatingScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CafeHome" component={CafeListScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ContactsHome" component={ContactsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CallsHome" component={CallHistoryScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="RoomsHome" component={RoomsHomeScreen} options={{ headerShown: false }} />

                  {/* Cafe Routes */}
                  <Stack.Screen name="CafesMap" component={CafesMapScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CreateCafe" component={CreateCafeScreen} options={{ headerShown: false, title: t('cafe.create') }} />
                  <Stack.Screen name="EditCafe" component={CafeAdminDashboardScreen} options={{ headerShown: false, title: t('cafe.dashboard.title') }} />
                  <Stack.Screen name="CafeDetail" component={CafeDetailScreen} options={{ headerShown: false, title: t('cafe.detail.title') }} />
                  <Stack.Screen name="DishDetail" component={DishDetailScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CafeCart" component={CafeCartScreen} options={{ headerShown: false, title: t('cafe.cart.title') }} />
                  <Stack.Screen name="CafeOrderSuccess" component={CafeOrderSuccessScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ headerShown: false, title: t('cafe.order.tracking') }} />
                  <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="StaffOrderBoard" component={StaffOrderBoardScreen} options={{ headerShown: false, title: t('cafe.staff.board.title') }} />
                  <Stack.Screen name="StaffWaiterCalls" component={StaffWaiterCallsScreen} options={{ headerShown: false, title: t('cafe.staff.waiterCalls.title') }} />
                  <Stack.Screen name="StaffStopList" component={StaffStopListScreen} options={{ headerShown: false, title: t('cafe.staff.stopList.title') }} />
                  <Stack.Screen name="StaffTableEditor" component={StaffTableEditorScreen} options={{ headerShown: false, title: t('cafe.staff.tables.title') }} />
                  <Stack.Screen name="StaffOrderHistory" component={StaffOrderHistoryScreen} options={{ headerShown: false, title: t('cafe.staff.history.title') }} />
                  <Stack.Screen name="StaffMenuEditor" component={StaffMenuEditorScreen} options={{ headerShown: false, title: t('cafe.dashboard.menu') }} />
                  <Stack.Screen name="StaffStats" component={StaffStatsScreen} options={{ headerShown: false, title: t('cafe.dashboard.stats') }} />
                  <Stack.Screen name="CafeSettings" component={CafeSettingsScreen} options={{ headerShown: false, title: t('cafe.dashboard.settings') }} />

                  {/* Education Routes */}
                  <Stack.Screen name="EducationHome" component={EducationHomeScreen} options={{ headerShown: true, title: t('education.title') }} />
                  <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ headerShown: true, title: t('education.courseTitle') }} />
                  <Stack.Screen name="ExamTrainer" component={ExamTrainerScreen} options={{ headerShown: true, title: t('education.examTrainerTitle') }} />
                  <Stack.Screen name="AITutor" component={AITutorScreen} options={{ headerShown: true, title: t('education.aiTutor.title') }} />

                  {/* Multimedia Routes */}
                  <Stack.Screen name="MultimediaHub" component={MultimediaHubScreen} />
                  <Stack.Screen name="RadioScreen" component={RadioScreen} />
                  <Stack.Screen name="AudioScreen" component={AudioScreen} />
                  <Stack.Screen name="VideoScreen" component={VideoScreen} />
                  <Stack.Screen name="VideoCirclesScreen" component={VideoCirclesScreen} />
                  <Stack.Screen name="MyVideoCirclesScreen" component={MyVideoCirclesScreen} />
                  <Stack.Screen name="VideoTariffsAdminScreen" component={VideoTariffsAdminScreen} />
                  <Stack.Screen name="TVScreen" component={TVScreen} />
                  <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} />
                  <Stack.Screen name="PlaylistsScreen" component={PlaylistsScreen} />
                  <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
                  <Stack.Screen name="OfflineMedia" component={OfflineMediaScreen} />
                  <Stack.Screen name="SeriesScreen" component={SeriesScreen} />
                  <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />

                  {/* Travel Routes */}
                  <Stack.Screen name="TravelHome" component={TravelHomeScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="YatraDetail" component={YatraDetailScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="YatraPublish" component={YatraPublishScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ShelterDetail" component={ShelterDetailScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CreateYatra" component={CreateYatraScreen} options={{ headerShown: true, title: t('portal.appNavigation.createTour') }} />
                  <Stack.Screen name="CreateShelter" component={CreateShelterScreen} options={{ headerShown: true, title: t('portal.appNavigation.addStay') }} />

                  {/* Services Routes */}
                  <Stack.Screen name="ServicesHome" component={ServicesHomeScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ServiceBooking" component={ServiceBookingScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ headerShown: false }} />

                  {/* Provider Routes */}
                  <Stack.Screen name="CreateService" component={CreateServiceScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="MyServices" component={MyServicesScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="IncomingBookings" component={IncomingBookingsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ServiceSchedule" component={ServiceScheduleScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="EkadashiCalendar" component={EkadashiCalendarScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChannelsHub" component={ChannelsHubScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SadhuSangaHub" component={SadhuSangaHubScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SadhuSangaSchedule" component={SadhuSangaScheduleScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SadhuSangaLive" component={SadhuSangaLiveScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SadhuSangaProfile" component={SadhuSangaProfileScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SadhuSangaSmartPush" component={SadhuSangaSmartPushScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChannelDetails" component={ChannelDetailsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CreateChannel" component={CreateChannelScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChannelPostComposer" component={ChannelPostComposerScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChannelManage" component={ChannelManageScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChannelTeam" component={ChannelTeamScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChannelRoadmapManage" component={ChannelRoadmapManageScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChannelPreacherBioManage" component={ChannelPreacherBioManageScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ConnectHome" component={ConnectHomeScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ConnectFilters" component={ConnectFiltersScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ConnectOpportunityDetails" component={ConnectOpportunityDetailsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ConnectCommunityDetails" component={ConnectCommunityDetailsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ConnectProfileSetup" component={ConnectProfileSetupScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ConnectCreateOpportunity" component={ConnectCreateOpportunityScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ConnectModeration" component={ConnectModerationScreen} options={{ headerShown: false }} />

                  {/* Wallet Routes */}
                  <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} options={{ headerShown: false }} />

                  {/* Seva Charity Routes */}
                  <Stack.Screen name="SevaHub" component={SevaHubScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SevaProjectDetails" component={SevaProjectDetailsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="MyDonations" component={MyDonationsScreen} options={{ headerShown: false }} />

                  {/* Path Tracker Routes */}
                  <Stack.Screen name="PathTrackerHome" component={PathTrackerHomeScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="PathCheckin" component={PathCheckinScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="PathStep" component={PathStepScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="PathReflection" component={PathReflectionScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="PathWeeklySummary" component={PathWeeklySummaryScreen} options={{ headerShown: false }} />

                  {/* Player Screens */}
                  <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                  <Stack.Screen name="RadioPlayer" component={RadioPlayerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                  <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="TVPlayer" component={TVPlayerScreen} options={{ headerShown: false }} />

                </Stack.Group>
              ) : (
                <Stack.Group>
                  <Stack.Screen name="RoomInviteEntry" component={RoomInviteEntryScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
                  <Stack.Screen name="Registration" component={RegistrationScreen} />
                  <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SupportHome" component={SupportHomeScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SupportTicketForm" component={SupportTicketFormScreen} options={{ headerShown: false }} />
                </Stack.Group>
              )}
            </Stack.Navigator>
            {isLoggedIn && (
              <>
                <MiniPlayer />
              </>
            )}
            <SettingsDrawer
              isVisible={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              isDarkMode={isDarkMode}
              currentModel={currentModel}
              onSelectModel={(model: any) => {
                selectModel(model.id, model.provider);
              }}
              onNavigateToSettings={() => {
                setIsMenuOpen(false);
                if (navigationRef.isReady()) {
                  // @ts-ignore
                  navigationRef.navigate('AppSettings');
                }
              }}
              onNavigateToRegistration={() => {
                setIsMenuOpen(false);
                if (navigationRef.isReady()) {
                  // @ts-ignore
                  navigationRef.navigate('Registration', { isDarkMode });
                }
              }}
              onNavigateToChat={() => {
                setIsMenuOpen(false);
                if (navigationRef.isReady()) {
                  // @ts-ignore
                  navigationRef.navigate('Chat');
                }
              }}
            />
          </NavigationContainer>
        </PortalLayoutProvider>
      </GlobalGestureHandler>
    </SafeAreaView>
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <UserProvider>
          <SettingsProvider>
            <NotificationProvider>
              <WebSocketProvider>
                <ChatProvider>
                  <CafeCartProvider>
                    <WalletProvider>
                      <AppContent />
                    </WalletProvider>
                  </CafeCartProvider>
                </ChatProvider>
              </WebSocketProvider>
            </NotificationProvider>
          </SettingsProvider>
        </UserProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

export default App;
