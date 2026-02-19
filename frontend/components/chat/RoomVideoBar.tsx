import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react-native';
import { RTCView } from 'react-native-webrtc';
import { useSettings } from '../../context/SettingsContext';
import { roomCallService, RoomSfuConfigResponse } from '../../services/roomCallService';
import { RoomSfuClient, RoomSfuConnectionState, RoomSfuParticipant } from '../../services/roomSfuClient';

interface RoomVideoBarProps {
  roomId: number;
  onClose: () => void;
}

const MAX_VISIBLE_PARTICIPANTS = 9;
const PARTICIPANT_LABEL_BG = 'rgba(0,0,0,0.55)';
const DANGER_BG = '#ff4444';

export const RoomVideoBar: React.FC<RoomVideoBarProps> = ({ roomId, onClose }) => {
  const { vTheme } = useSettings();
  const sfuClient = useMemo(() => new RoomSfuClient(), []);
  const [participants, setParticipants] = useState<RoomSfuParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<RoomSfuConnectionState>('idle');
  const [isPublishingAudio, setIsPublishingAudio] = useState(false);
  const [isPublishingVideo, setIsPublishingVideo] = useState(false);
  const [status, setStatus] = useState('Preparing room call...');
  const [config, setConfig] = useState<RoomSfuConfigResponse | null>(null);

  useEffect(() => {
    const unsubParticipants = sfuClient.on('participants_changed', (next) => {
      setParticipants(Array.isArray(next) ? (next as RoomSfuParticipant[]) : []);
    });
    const unsubState = sfuClient.on('connection_state_changed', (next) => {
      const state = String(next || 'idle') as RoomSfuConnectionState;
      setConnectionState(state);
      setStatus(formatConnectionState(state));
    });
    const unsubReconnecting = sfuClient.on('reconnecting', () => setStatus('Reconnecting...'));
    const unsubReconnected = sfuClient.on('reconnected', () => setStatus('Connected'));

    return () => {
      unsubParticipants();
      unsubState();
      unsubReconnecting();
      unsubReconnected();
    };
  }, [sfuClient]);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        setStatus('Checking room video config...');
        const nextConfig = await roomCallService.getRoomSfuConfig(roomId);
        if (!mounted) return;
        setConfig(nextConfig);

        if (!nextConfig.enabled) {
          setStatus('Room video disabled by server policy');
          return;
        }

        setStatus('Requesting secure room token...');
        const tokenData = await roomCallService.getRoomSfuToken(roomId, {
          metadata: { platform: 'mobile' },
        });
        if (!mounted) return;

        setStatus('Connecting to room SFU...');
        await sfuClient.connect({
          wsUrl: tokenData.wsUrl,
          token: tokenData.token,
          dynacastEnabled: nextConfig.dynacastEnabled,
          adaptiveStreamEnabled: nextConfig.adaptiveStreamEnabled,
        });
        if (!mounted) return;

        // Default state by product policy.
        await sfuClient.setMicrophoneEnabled(false);
        await sfuClient.setCameraEnabled(false);
        setIsPublishingAudio(false);
        setIsPublishingVideo(false);
      } catch (error: any) {
        console.error('[RoomVideoBar] failed to connect SFU:', error);
        if (mounted) {
          setStatus('Room video unavailable');
        }
      }
    };

    connect().catch((error: any) => {
      console.error('[RoomVideoBar] connect effect failed', error);
      if (mounted) {
        setStatus('Room video unavailable');
      }
    });

    return () => {
      mounted = false;
      sfuClient.disconnect().catch((error: any) => {
        console.error('[RoomVideoBar] disconnect effect failed', error);
      });
    };
  }, [roomId, sfuClient]);

  const toggleAudio = async () => {
    const next = !isPublishingAudio;
    setIsPublishingAudio(next);
    try {
      await sfuClient.setMicrophoneEnabled(next);
    } catch (error) {
      console.error('[RoomVideoBar] toggle audio failed', error);
      setIsPublishingAudio(!next);
    }
  };

  const toggleVideo = async () => {
    const next = !isPublishingVideo;
    setIsPublishingVideo(next);
    try {
      await sfuClient.setCameraEnabled(next);
    } catch (error) {
      console.error('[RoomVideoBar] toggle video failed', error);
      setIsPublishingVideo(!next);
    }
  };

  const visibleParticipants = participants.slice(0, MAX_VISIBLE_PARTICIPANTS);
  const overflowCount = Math.max(0, participants.length - MAX_VISIBLE_PARTICIPANTS);

  return (
    <View style={[styles.container, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.statusText, { color: vTheme.colors.primary }]}>{status}</Text>
        <Text style={[styles.smallMeta, { color: vTheme.colors.textSecondary }]}>
          {config?.provider ? `${config.provider} · up to ${config.maxParticipants}` : ''}
        </Text>
      </View>

      <ScrollView horizontal style={styles.participantsStrip} contentContainerStyle={styles.participantsStripContent}>
        {visibleParticipants.map((participant) => (
          <View
            key={participant.identity}
            style={[styles.participantCard, { backgroundColor: vTheme.colors.surface, borderColor: vTheme.colors.divider }]}
          >
            {participant.videoStreamURL ? (
              <RTCView
                streamURL={participant.videoStreamURL}
                style={styles.videoTile}
                objectFit="cover"
                mirror={participant.isLocal}
                zOrder={0}
              />
            ) : (
              <View style={[styles.videoFallback, { backgroundColor: vTheme.colors.glass }]}>
                <Text style={[styles.videoFallbackText, { color: vTheme.colors.textSecondary }]}>
                  {participant.hasVideo ? 'Video loading...' : 'Camera off'}
                </Text>
              </View>
            )}

            <View style={styles.participantLabel}>
              <Text style={styles.participantLabelText} numberOfLines={1}>
                {participant.isLocal ? 'You' : participant.name}
              </Text>
              <Text style={styles.participantLabelMeta}>
                {participant.hasAudio ? '🎤' : '🔇'} {participant.hasVideo ? '📹' : '🎞️'}
              </Text>
            </View>
          </View>
        ))}
        {overflowCount > 0 && (
          <View style={[styles.overflowCard, { backgroundColor: vTheme.colors.glass, borderColor: vTheme.colors.divider }]}>
            <Text style={[styles.overflowText, { color: vTheme.colors.text }]}>+{overflowCount}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.controls, { borderTopColor: vTheme.colors.divider }]}>
        <Text style={[styles.smallMeta, { color: vTheme.colors.textSecondary }]}>
          {`participants: ${participants.length} · state: ${connectionState}`}
        </Text>

        <TouchableOpacity onPress={toggleVideo} style={styles.iconButton}>
          {isPublishingVideo ? <Video size={20} color={vTheme.colors.text} /> : <VideoOff size={20} color={'#ff4444'} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleAudio} style={styles.iconButton}>
          {isPublishingAudio ? <Mic size={20} color={vTheme.colors.text} /> : <MicOff size={20} color={'#ff4444'} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.disconnectButton}>
          <PhoneOff size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderBottomWidth: 1,
    paddingTop: 10,
  },
  headerRow: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  smallMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  participantsStrip: {
    flex: 1,
  },
  participantsStripContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  participantCard: {
    width: 110,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  videoTile: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1b1b1b',
  },
  videoFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  videoFallbackText: {
    fontSize: 11,
    fontWeight: '500',
  },
  participantLabel: {
    width: '100%',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: PARTICIPANT_LABEL_BG,
  },
  participantLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  participantLabelMeta: {
    color: '#e5e7eb',
    fontSize: 11,
  },
  overflowCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  overflowText: {
    fontSize: 16,
    fontWeight: '700',
  },
  controls: {
    height: 52,
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
    backgroundColor: DANGER_BG,
  },
});

function formatConnectionState(state: RoomSfuConnectionState): string {
  switch (state) {
    case 'connecting':
      return 'Connecting...';
    case 'connected':
      return 'Connected';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'failed':
      return 'Connection failed';
    case 'disconnected':
      return 'Disconnected';
    default:
      return 'Preparing room call...';
  }
}
