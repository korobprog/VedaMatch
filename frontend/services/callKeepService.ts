import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';

class CallKeepService {
    constructor() {
        this.setup();
    }

    setup() {
        const options = {
            ios: {
                appName: 'Sanga',
            },
            android: {
                alertTitle: 'Permissions required',
                alertDescription: 'This application needs to access your phone accounts',
                cancelButton: 'Cancel',
                okButton: 'ok',
                imageName: 'phone_account_icon',
                additionalPermissions: [],
                // Required to get audio in background when using Android 11
                foregroundService: {
                    channelId: 'com.ragagent.voip',
                    channelName: 'VoIP Service',
                    notificationTitle: 'Sanga Call',
                    notificationIcon: 'ic_launcher',
                },
                selfManaged: true,
            },
        };

        try {
            RNCallKeep.setup(options);
            RNCallKeep.setAvailable(true);
        } catch (err) {
            console.error('CallKeep setup error:', err);
        }
    }

    displayIncomingCall(uuid: string, handle: string, localizedCallerName: string) {
        RNCallKeep.displayIncomingCall(uuid, handle, localizedCallerName, 'generic', true);
    }

    startCall(uuid: string, handle: string, contactIdentifier?: string) {
        RNCallKeep.startCall(uuid, handle, contactIdentifier);
    }

    endCall(uuid: string) {
        RNCallKeep.endCall(uuid);
    }

    // Events need to be handled by listeners registered globally
}

export const callKeepService = new CallKeepService();
