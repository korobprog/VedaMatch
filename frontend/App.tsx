import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';
import { UserProvider } from './context/UserContext';
import { ChatScreen } from './screens/ChatScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import { RootStackParamList } from './types/navigation';
import { PortalMainScreen } from './screens/portal/PortalMainScreen';
import { AppSettingsScreen } from './screens/settings/AppSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <SettingsProvider>
      <UserProvider>
        <ChatProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Chat"
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Registration" component={RegistrationScreen} />
              <Stack.Screen name="Portal" component={PortalMainScreen} />
              <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ChatProvider>
      </UserProvider>
    </SettingsProvider>
  );
}

export default App;
