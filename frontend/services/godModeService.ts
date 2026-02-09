import AsyncStorage from '@react-native-async-storage/async-storage';

export const getGodModeQueryParams = async (): Promise<Record<string, string>> => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    const activeMathId = await AsyncStorage.getItem('active_math_id');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user?.godModeEnabled || !activeMathId) {
      return {};
    }

    return { math: activeMathId };
  } catch (error) {
    console.warn('Failed to read god mode params:', error);
    return {};
  }
};
