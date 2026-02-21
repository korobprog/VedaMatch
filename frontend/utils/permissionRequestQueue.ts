import { Platform } from 'react-native';

let androidPermissionQueue: Promise<void> = Promise.resolve();

export async function serializeAndroidPermissionRequest<T>(
    request: () => Promise<T>,
): Promise<T> {
    if (Platform.OS !== 'android') {
        return request();
    }

    const previous = androidPermissionQueue;
    let releaseCurrent: () => void = () => undefined;

    androidPermissionQueue = new Promise<void>((resolve) => {
        releaseCurrent = resolve;
    });

    await previous.catch(() => undefined);

    try {
        return await request();
    } finally {
        releaseCurrent();
    }
}
