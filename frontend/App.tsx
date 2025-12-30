import React from 'react';
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
import { KrishnaAssistant } from './components/KrishnaAssistant';
import { ContactProfileScreen } from './screens/portal/contacts/ContactProfileScreen';

import { RoomChatScreen } from './screens/portal/chat/RoomChatScreen';
import { MediaLibraryScreen } from './screens/portal/dating/MediaLibraryScreen';
import { EditDatingProfileScreen } from './screens/portal/dating/EditDatingProfileScreen';
import { DatingFavoritesScreen } from './screens/portal/dating/DatingFavoritesScreen';

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

// Component to handle the main app layout with theme and safe area
const AppContent = () => {
  const { theme } = useSettings();
  const { isLoggedIn, isLoading } = useUser();

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
              <Stack.Screen name="ContactProfile" component={ContactProfileScreen} />
              <Stack.Screen
                name="RoomChat"
                component={RoomChatScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen name="MediaLibrary" component={MediaLibraryScreen} />
              <Stack.Screen name="EditDatingProfile" component={EditDatingProfileScreen} />
              <Stack.Screen name="DatingFavorites" component={DatingFavoritesScreen} />
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
