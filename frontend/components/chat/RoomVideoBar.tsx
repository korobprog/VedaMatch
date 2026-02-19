import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { webRTCService } from '../../services/webRTCService';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Camera } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';

interface RoomVideoBarProps {
    roomId: number;
    targetUserId?: number | null;
    targetUserName?: string;
    onClose: () => void;
}

export const RoomVideoBar: React.FC<RoomVideoBarProps> = ({ roomId, targetUserId, targetUserName, onClose }) => {
    const { vTheme } = useSettings();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [status, setStatus] = useState('Preparing call...');

    useEffect(() => {
        let mounted = true;

        const startCall = async () => {
            try {
                // 1. Get Local Stream
                let stream = webRTCService.localStream;
                if (!stream) {
                    stream = await webRTCService.startLocalStream(true);
                }

                // Default room call state: microphone OFF + camera OFF.
                stream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
                stream.getVideoTracks().forEach(track => {
                    track.enabled = false;
                });

                if (mounted) setLocalStream(stream);
                if (mounted) {
                    setIsMuted(true);
                    setIsVideoEnabled(false);
                }

                // 2. Setup Listeners
                webRTCService.setOnRemoteStream((rStream) => {
                    if (mounted) {
                        console.log('[RoomVideoBar] Received remote stream');
                        setRemoteStream(rStream);
                        setStatus('Connected');
                    }
                });

                webRTCService.setOnIceStateChange((iceStatus) => {
                    if (mounted) {
                        setStatus(iceStatus);
                    }
                });

                // 3. Start connection only when there is a real participant user ID.
                if (!targetUserId || targetUserId <= 0) {
                    if (mounted) {
                        setStatus('Waiting for participant');
                    }
                    return;
                }

                setStatus('Connecting...');
                await webRTCService.startRoomCall(targetUserId, roomId);

            } catch (err) {
                console.error('[RoomVideoBar] Failed to start call:', err);
                if (mounted) setStatus('Connection Failed');
            }
        };

        startCall();

        return () => {
            mounted = false;
            webRTCService.endCall();
        };
    }, [roomId, targetUserId]);

    const toggleMute = () => {
        if (localStream) {
            setIsMuted(prev => {
                const nextMuted = !prev;
                localStream.getAudioTracks().forEach(track => {
                    track.enabled = !nextMuted;
                });
                return nextMuted;
            });
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            setIsVideoEnabled(prev => {
                const nextVideoEnabled = !prev;
                localStream.getVideoTracks().forEach(track => {
                    track.enabled = nextVideoEnabled;
                });
                return nextVideoEnabled;
            });
        }
    };

    const switchCamera = () => {
        if (localStream) {
            // @ts-ignore - _switchCamera is a specific method on the MediaStream in react-native-webrtc
            localStream.getVideoTracks().forEach(track => track._switchCamera());
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider }]}>

            <ScrollView horizontal style={styles.streamContainer} contentContainerStyle={{ alignItems: 'center' }}>
                {/* Local User */}
                <View style={styles.videoWrapper}>
                    {localStream ? (
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.video}
                            objectFit="cover"
                            mirror={true}
                        />
                    ) : (
                        <View style={[styles.videoPlaceholder, { backgroundColor: vTheme.colors.surface }]}>
                            <Text style={{ color: vTheme.colors.textSecondary }}>Checking camera...</Text>
                        </View>
                    )}
                    <Text style={[styles.userName, { backgroundColor: vTheme.colors.glass, color: vTheme.colors.text }]}>You</Text>
                    {!isVideoEnabled && (
                        <View style={styles.videoOffOverlay}>
                            <VideoOff size={20} color={vTheme.colors.textSecondary} />
                        </View>
                    )}
                </View>

                {/* Remote User (Room) */}
                {remoteStream && (
                    <View style={styles.videoWrapper}>
                        <RTCView
                            streamURL={remoteStream.toURL()}
                            style={styles.video}
                            objectFit="cover"
                        />
                        <Text style={[styles.userName, { backgroundColor: vTheme.colors.glass, color: vTheme.colors.text }]}>
                            {targetUserName || 'Participant'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Controls */}
            <View style={[styles.controls, { borderTopColor: vTheme.colors.divider }]}>
                <Text style={{ color: vTheme.colors.primary, fontSize: 12, marginRight: 'auto', paddingLeft: 10 }}>
                    {status}
                </Text>

                <TouchableOpacity onPress={toggleVideo} style={styles.iconButton}>
                    {isVideoEnabled ? <Video size={20} color={vTheme.colors.text} /> : <VideoOff size={20} color={'#ff4444'} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
                    {isMuted ? <MicOff size={20} color={'#ff4444'} /> : <Mic size={20} color={vTheme.colors.text} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={switchCamera} style={styles.iconButton}>
                    <Camera size={20} color={vTheme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onClose}
                    style={[styles.disconnectButton, { backgroundColor: '#ff4444' }]}
                >
                    <PhoneOff size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 180,
        borderBottomWidth: 1,
        paddingTop: 12,
        backgroundColor: 'transparent',
    },
    streamContainer: {
        flex: 1,
        padding: 8,
    },
    videoWrapper: {
        width: 110,
        height: 110,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 10,
        position: 'relative',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        fontSize: 10,
        paddingHorizontal: 4,
        borderRadius: 4,
        overflow: 'hidden',
    },
    videoOffOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    controls: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 8,
        borderTopWidth: 1,
    },
    iconButton: {
        padding: 8,
        marginHorizontal: 4,
    },
    disconnectButton: {
        padding: 8,
        borderRadius: 20,
        marginLeft: 8,
        marginRight: 4,
    }
});
