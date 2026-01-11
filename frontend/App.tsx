import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ChatProvider } from './context/ChatContext';
import { UserProvider, useUser } from './context/UserContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ChatScreen } from './screens/ChatScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import LoginScreen from './screens/LoginScreen';
import PlansScreen from './screens/PlansScreen';
import { RootStackParamList } from './types/navigation';
// Portal Main Screen
import { PortalMainScreen } from './screens/portal/PortalMainScreen';
import { AppSettingsScreen } from './screens/settings/AppSettingsScreen';
import { EditProfileScreen } from './screens/settings/EditProfileScreen';
import { KrishnaAssistant } from './components/KrishnaAssistant';
import { ContactProfileScreen } from './screens/portal/contacts/ContactProfileScreen';

import { RoomChatScreen } from './screens/portal/chat/RoomChatScreen';
import { MediaLibraryScreen } from './screens/portal/dating/MediaLibraryScreen';
import { EditDatingProfileScreen } from './screens/portal/dating/EditDatingProfileScreen';
import { DatingFavoritesScreen } from './screens/portal/dating/DatingFavoritesScreen';

import { AdsScreen } from './screens/portal/ads/AdsScreen';
import { CreateAdScreen } from './screens/portal/ads/CreateAdScreen';
import { AdDetailScreen } from './screens/portal/ads/AdDetailScreen';
import { AdsFiltersScreen } from './screens/portal/ads/AdsFiltersScreen';
import { BookListScreen } from './screens/library/BookListScreen';
import { ReaderScreen } from './screens/library/ReaderScreen';
import PreviewScreen from './screens/PreviewScreen';

import { StatusBar, useColorScheme, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  const { theme } = useSettings();
  const { isLoggedIn, isLoading } = useUser();
  const [showPreview, setShowPreview] = useState(true);

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
      <NavigationContainer>
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
              <Stack.Screen name="Chat" component={ChatScreen} />
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


              <Stack.Screen name="Registration" component={RegistrationScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Registration" component={RegistrationScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
        {isLoggedIn && <KrishnaAssistant />}
      </NavigationContainer>
    </SafeAreaView>
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <UserProvider>
          <WebSocketProvider>
            <ChatProvider>
              <AppContent />
            </ChatProvider>
          </WebSocketProvider>
        </UserProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

export default App;
