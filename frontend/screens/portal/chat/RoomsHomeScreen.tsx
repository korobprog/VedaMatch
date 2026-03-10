import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../../types/navigation';
import { PortalChatScreen } from './PortalChatScreen';

export const RoomsHomeScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const handleBackPress = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Portal');
    }, [navigation]);

    return <PortalChatScreen onBackPress={handleBackPress} />;
};
