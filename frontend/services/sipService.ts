import { SimpleUser, SimpleUserOptions } from 'sip.js';
import { mediaDevices, MediaStream } from 'react-native-webrtc';
import { RegistererState } from 'sip.js/lib/api/registerer-state';

class SipService {
    private user: SimpleUser | null = null;
    public localStream: MediaStream | null = null;

    // Delegate to notify UI
    public onCallReceived: ((callId: string) => void) | null = null;

    async init(login: string, pwd: string, domain: string = 'your-domain', wssUri: string = 'wss://your-domain:7443') {
        if (this.user) {
            return;
        }

        try {
            const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
            this.localStream = stream;

            const opts: SimpleUserOptions = {
                aor: `sip:${login}@${domain}`,
                media: {
                    local: { audio: (stream.getTracks().find(t => t.kind === 'audio'))! },
                    remote: { audio: undefined },
                },
                userAgentOptions: {
                    authorizationUsername: login,
                    authorizationPassword: pwd,
                    displayName: login,
                },
            };

            this.user = new SimpleUser(wssUri, opts);

            this.user.delegate = {
                onCallReceived: async () => {
                    if (this.onCallReceived) {
                        // Generate a dummy ID or get from session
                        this.onCallReceived('incoming-call-id');
                    } else {
                        await this.user?.answer();
                    }
                },
            };

            await this.user.connect();
            await this.user.register();

        } catch (e) {
            console.error('SipService Init Error', e);
        }
    }

    async call(destination: string) {
        if (!this.user) throw new Error('SIP User not initialized');
        await this.user.call(destination);
    }

    async answer() {
        if (!this.user) throw new Error('SIP User not initialized');
        await this.user.answer();
    }

    async hangup() {
        if (!this.user) return;
        try {
            await this.user.hangup();
        } catch (error) {
            // Check if call exists, etc.
        }
    }

    async register() {
        await this.user?.register();
    }
}

export const sipService = new SipService();
