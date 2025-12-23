import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';
import { UserProvider } from './context/UserContext';
import { ChatScreen } from './screens/ChatScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import LoginScreen from './screens/LoginScreen';
import PlansScreen from './screens/PlansScreen';
import { RootStackParamList } from './types/navigation';
import { PortalMainScreen } from './screens/portal/PortalMainScreen';
import { AppSettingsScreen } from './screens/settings/AppSettingsScreen';
import { KrishnaAssistant } from './components/KrishnaAssistant';
import { ContactProfileScreen } from './screens/portal/contacts/ContactProfileScreen';

import { RoomChatScreen } from './screens/portal/chat/RoomChatScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <SettingsProvider>
      <UserProvider>
        <ChatProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Registration" component={RegistrationScreen} />
              <Stack.Screen name="Plans" component={PlansScreen} />
              <Stack.Screen name="Portal" component={PortalMainScreen} />
              <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
              <Stack.Screen name="ContactProfile" component={ContactProfileScreen} />
              <Stack.Screen
                name="RoomChat"
                component={RoomChatScreen}
                options={{ headerShown: true }}
              />
            </Stack.Navigator>
            <KrishnaAssistant />
          </NavigationContainer>
        </ChatProvider>
      </UserProvider>
    </SettingsProvider>
  );
}

export default App;
