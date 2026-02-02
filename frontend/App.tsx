import React, { useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RNCallKeep from 'react-native-callkeep';
import { Platform, PermissionsAndroid } from 'react-native';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ChatProvider } from './context/ChatContext';
import { UserProvider, useUser } from './context/UserContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { ChatScreen } from './screens/ChatScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import LoginScreen from './screens/LoginScreen';
import PlansScreen from './screens/PlansScreen';
import { RootStackParamList } from './types/navigation';
// Portal Main Screen
import { PortalMainScreen } from './screens/portal/PortalMainScreen';
import WidgetSelectionScreen from './screens/portal/WidgetSelectionScreen';
import { AppSettingsScreen } from './screens/settings/AppSettingsScreen';
import { EditProfileScreen } from './screens/settings/EditProfileScreen';
import { KrishnaAssistant } from './components/KrishnaAssistant';
import { ContactProfileScreen } from './screens/portal/contacts/ContactProfileScreen';
import { SettingsDrawer } from './SettingsDrawer';
import { GlobalGestureHandler } from './components/GlobalGestureHandler';
import { PortalDrawer } from './components/PortalDrawer';
import { PortalLayoutProvider } from './context/PortalLayoutContext';
import { MiniPlayer } from './components/MiniPlayer';
import { audioPlayerService } from './services/audioPlayerService';
import { MultimediaHubScreen } from './screens/multimedia/MultimediaHubScreen';
import { RadioScreen } from './screens/multimedia/RadioScreen';
import { AudioScreen } from './screens/multimedia/AudioScreen';
import { VideoScreen } from './screens/multimedia/VideoScreen';
import { TVScreen } from './screens/multimedia/TVScreen';
import { AudioPlayerScreen } from './screens/multimedia/AudioPlayerScreen';
import { RadioPlayerScreen } from './screens/multimedia/RadioPlayerScreen';
import { VideoPlayerScreen } from './screens/multimedia/VideoPlayerScreen';
import { TVPlayerScreen } from './screens/multimedia/TVPlayerScreen';
import { FavoritesScreen } from './screens/multimedia/FavoritesScreen';
import { SeriesScreen } from './screens/multimedia/SeriesScreen';
import { SeriesDetailScreen } from './screens/multimedia/SeriesDetailScreen';


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
import { CallScreen } from './screens/calls/CallScreen';
import { MediaLibraryScreen } from './screens/portal/dating/MediaLibraryScreen';
import { EditDatingProfileScreen } from './screens/portal/dating/EditDatingProfileScreen';
import { DatingFavoritesScreen } from './screens/portal/dating/DatingFavoritesScreen';

import { AdsScreen } from './screens/portal/ads/AdsScreen';
import { CreateAdScreen } from './screens/portal/ads/CreateAdScreen';
import { AdDetailScreen } from './screens/portal/ads/AdDetailScreen';
import { AdsFiltersScreen } from './screens/portal/ads/AdsFiltersScreen';
import { BookListScreen } from './screens/library/BookListScreen';
import { ReaderScreen } from './screens/library/ReaderScreen';
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

import { EducationHomeScreen } from './screens/portal/education/EducationHomeScreen';
import { CourseDetailsScreen } from './screens/portal/education/CourseDetailsScreen';
import { ExamTrainerScreen } from './screens/portal/education/ExamTrainerScreen';

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

import { StatusBar, useColorScheme, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
  const { theme, isMenuOpen, setIsMenuOpen, isDarkMode, currentModel, selectModel, isPortalOpen, setIsPortalOpen } = useSettings();
  const { isLoggedIn, isLoading, user } = useUser();
  const [showPreview, setShowPreview] = useState(true);
  // Keep sipUser ref or state if needed to manage connection

  // Use WebSocket to listen for incoming WebRTC calls
  const { addListener } = useWebSocket();

  React.useEffect(() => {
    // 1. Setup VoIP (CallKeep)
    const setupVoIP = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            PermissionsAndroid.PERMISSIONS.CAMERA
          ]);
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
      } catch (err) {
        console.error('CallKeep setup failed', err);
      }
    };

    setupVoIP();

    const onAnswerCall = ({ callUUID }: { callUUID: string }) => {
      if (navigationRef.isReady()) {
        // @ts-ignore
        navigationRef.navigate('CallScreen', { isIncoming: true, callUUID });
      }
    };

    RNCallKeep.addEventListener('answerCall', onAnswerCall);
    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      // Handle end call
    });

    // 2. LISTEN FOR WEBRTC OFFERS
    const removeLisener = addListener((msg: any) => {
      if (msg.type === 'offer') {
        const callerId = msg.senderId;
        const callerName = `User ${callerId}`;
        console.log('Incoming WebRTC Call from:', callerId);

        // Use CallKeep to show native incoming call UI
        const uuid = getUUID();
        RNCallKeep.displayIncomingCall(uuid, String(callerId), callerName, 'generic', true);

        // Also navigate to CallScreen directly if the app is in foreground? 
        // Better to wait for user to accept via CallKeep UI or in-app UI.
        // But for better UX in foreground, we often navigate calling screen immediately.
        if (navigationRef.isReady()) {
          navigationRef.navigate('CallScreen', {
            isIncoming: true,
            targetId: callerId,
            callerName: callerName,
            callUUID: uuid // Pass UUID so we can end call in CallKeep later
          });
        }
      }
    });

    return () => {
      RNCallKeep.removeEventListener('answerCall');
      RNCallKeep.removeEventListener('endCall');
      removeLisener();
    };
  }, [addListener]);

  // Handle Multimedia Player Setup
  React.useEffect(() => {
    const initPlayer = async () => {
      await audioPlayerService.setup();
    };
    initPlayer();
  }, []);

  // Show preview only for non-logged-in users
  if (showPreview && !isLoggedIn && !isLoading) {
    return <PreviewScreen onFinish={() => setShowPreview(false)} />;
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" color={theme.primary || '#FF9933'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['top']}
    >
      <GlobalGestureHandler>
        <PortalLayoutProvider>
          <NavigationContainer ref={navigationRef}>
            <ThemedStatusBar />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              {isLoggedIn ? (
                <Stack.Group>
                  <Stack.Screen name="Portal" component={PortalMainScreen} />
                  <Stack.Screen name="WidgetSelection" component={WidgetSelectionScreen} />
                  <Stack.Screen name="Chat" component={ChatScreen} />
                  <Stack.Screen name="CallScreen" component={CallScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Plans" component={PlansScreen} />
                  <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
                  <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                  <Stack.Screen name="ContactProfile" component={ContactProfileScreen} />
                  <Stack.Screen
                    name="RoomChat"
                    component={RoomChatScreen}
                    options={{ headerShown: true }}
                  />
                  <Stack.Screen name="MediaLibrary" component={MediaLibraryScreen} />
                  <Stack.Screen name="EditDatingProfile" component={EditDatingProfileScreen} />
                  <Stack.Screen name="DatingFavorites" component={DatingFavoritesScreen} />

                  {/* Ads Routes */}
                  <Stack.Screen name="Ads" component={AdsScreen} />
                  <Stack.Screen name="CreateAd" component={CreateAdScreen} />
                  <Stack.Screen name="AdDetail" component={AdDetailScreen} />
                  <Stack.Screen name="AdsFilters" component={AdsFiltersScreen} options={{ presentation: 'modal' }} />

                  {/* Library Routes */}
                  <Stack.Screen name="BookList" component={BookListScreen} options={{ headerShown: true, title: 'Книги' }} />
                  <Stack.Screen name="Reader" component={ReaderScreen} options={{ headerShown: true, title: 'Чтение' }} />
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
                  <Stack.Screen name="EducationHome" component={EducationHomeScreen} options={{ headerShown: true, title: 'Обучение' }} />
                  <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ headerShown: true, title: 'Курс' }} />
                  <Stack.Screen name="ExamTrainer" component={ExamTrainerScreen} options={{ headerShown: true, title: 'Тренажер' }} />

                  {/* Multimedia Routes */}
                  <Stack.Screen name="MultimediaHub" component={MultimediaHubScreen} />
                  <Stack.Screen name="RadioScreen" component={RadioScreen} />
                  <Stack.Screen name="AudioScreen" component={AudioScreen} />
                  <Stack.Screen name="VideoScreen" component={VideoScreen} />
                  <Stack.Screen name="TVScreen" component={TVScreen} />
                  <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} />
                  <Stack.Screen name="SeriesScreen" component={SeriesScreen} />
                  <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />

                  {/* Player Screens */}
                  <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                  <Stack.Screen name="RadioPlayer" component={RadioPlayerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                  <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="TVPlayer" component={TVPlayerScreen} options={{ headerShown: false }} />

                  <Stack.Screen name="Registration" component={RegistrationScreen} />
                </Stack.Group>
              ) : (
                <Stack.Group>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Registration" component={RegistrationScreen} />
                </Stack.Group>
              )}
            </Stack.Navigator>
            {isLoggedIn && (
              <>
                <MiniPlayer />
                <KrishnaAssistant />
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
            />
            {isLoggedIn && (
              <PortalDrawer
                isVisible={isPortalOpen}
                onClose={() => setIsPortalOpen(false)}
                onServicePress={(serviceId) => {
                  setIsPortalOpen(false);
                  if (navigationRef.isReady()) {
                    // @ts-ignore
                    navigationRef.navigate('Portal', { initialTab: serviceId });
                  }
                }}
              />
            )}
          </NavigationContainer>
        </PortalLayoutProvider>
      </GlobalGestureHandler>
    </SafeAreaView>
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <SettingsProvider>
          <WebSocketProvider>
            <ChatProvider>
              <CafeCartProvider>
                <AppContent />
              </CafeCartProvider>
            </ChatProvider>
          </WebSocketProvider>
        </SettingsProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}

export default App;
