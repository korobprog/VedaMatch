import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useSettings } from '../../context/SettingsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'WidgetSelection'>;

const WidgetSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
    const { vTheme, isDarkMode } = useSettings();

    useEffect(() => {
        const source = route.params?.source || 'unknown';
        console.log(`[portal_widgets_wrapper_redirect] source=${source}`);
        navigation.replace('Portal', {
            initialPage: 'widgets',
            returnToWidget: true,
        });
    }, [navigation, route.params?.source]);

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}> 
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ActivityIndicator size="small" color={vTheme.colors.primary} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default WidgetSelectionScreen;
