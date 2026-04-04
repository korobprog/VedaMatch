import { act } from '@testing-library/react-native';

export const flushScreenFocusEffects = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};
