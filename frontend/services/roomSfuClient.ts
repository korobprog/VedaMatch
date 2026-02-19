export type RoomSfuConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface RoomSfuParticipant {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  videoStreamURL?: string;
}

export interface RoomSfuConnectInput {
  wsUrl: string;
  token: string;
  dynacastEnabled: boolean;
  adaptiveStreamEnabled: boolean;
}

type RoomSfuEventType =
  | 'participant_joined'
  | 'participant_left'
  | 'track_subscribed'
  | 'track_unsubscribed'
  | 'reconnecting'
  | 'reconnected'
  | 'connection_state_changed'
  | 'participants_changed';

type RoomSfuListener = (payload?: unknown) => void;

export class RoomSfuClient {
  private room: any = null;
  private listeners = new Map<RoomSfuEventType, Set<RoomSfuListener>>();
  private connectionState: RoomSfuConnectionState = 'idle';

  on(type: RoomSfuEventType, listener: RoomSfuListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  private emit(type: RoomSfuEventType, payload?: unknown) {
    this.listeners.get(type)?.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error('[RoomSfuClient] listener error', error);
      }
    });
  }

  private updateState(next: RoomSfuConnectionState) {
    if (this.connectionState === next) return;
    this.connectionState = next;
    this.emit('connection_state_changed', next);
  }

  getState(): RoomSfuConnectionState {
    return this.connectionState;
  }

  getParticipants(): RoomSfuParticipant[] {
    if (!this.room) return [];

    const participants: RoomSfuParticipant[] = [];

    const local = this.room.localParticipant;
    if (local) {
      participants.push({
        identity: String(local.identity || 'local'),
        name: String(local.name || local.identity || 'You'),
        isLocal: true,
        isSpeaking: Boolean(local.isSpeaking),
        hasAudio: hasParticipantTrack(local, 'audio'),
        hasVideo: hasParticipantTrack(local, 'video'),
        videoStreamURL: extractParticipantVideoStreamURL(local),
      });
    }

    const remote = this.room.remoteParticipants;
    if (remote && typeof remote.forEach === 'function') {
      remote.forEach((participant: any) => {
        participants.push({
          identity: String(participant?.identity || ''),
          name: String(participant?.name || participant?.identity || 'Participant'),
          isLocal: false,
          isSpeaking: Boolean(participant?.isSpeaking),
          hasAudio: hasParticipantTrack(participant, 'audio'),
          hasVideo: hasParticipantTrack(participant, 'video'),
          videoStreamURL: extractParticipantVideoStreamURL(participant),
        });
      });
    }

    return participants;
  }

  private emitParticipantsChanged() {
    this.emit('participants_changed', this.getParticipants());
  }

  private bindRoomEvents(room: any, roomEvent: any) {
    if (!room || typeof room.on !== 'function') return;

    const onParticipantConnected = roomEvent?.ParticipantConnected || 'participantConnected';
    const onParticipantDisconnected = roomEvent?.ParticipantDisconnected || 'participantDisconnected';
    const onTrackSubscribed = roomEvent?.TrackSubscribed || 'trackSubscribed';
    const onTrackUnsubscribed = roomEvent?.TrackUnsubscribed || 'trackUnsubscribed';
    const onReconnecting = roomEvent?.Reconnecting || 'reconnecting';
    const onReconnected = roomEvent?.Reconnected || 'reconnected';
    const onDisconnected = roomEvent?.Disconnected || 'disconnected';
    const onConnected = roomEvent?.Connected || 'connected';
    const onActiveSpeakersChanged = roomEvent?.ActiveSpeakersChanged || 'activeSpeakersChanged';

    room.on(onConnected, () => {
      this.updateState('connected');
      this.emitParticipantsChanged();
    });
    room.on(onDisconnected, () => {
      this.updateState('disconnected');
      this.emitParticipantsChanged();
    });
    room.on(onReconnecting, () => {
      this.updateState('reconnecting');
      this.emit('reconnecting');
    });
    room.on(onReconnected, () => {
      this.updateState('connected');
      this.emit('reconnected');
      this.emitParticipantsChanged();
    });
    room.on(onParticipantConnected, (participant: any) => {
      this.emit('participant_joined', participant);
      this.emitParticipantsChanged();
    });
    room.on(onParticipantDisconnected, (participant: any) => {
      this.emit('participant_left', participant);
      this.emitParticipantsChanged();
    });
    room.on(onTrackSubscribed, () => {
      this.emit('track_subscribed');
      this.emitParticipantsChanged();
    });
    room.on(onTrackUnsubscribed, () => {
      this.emit('track_unsubscribed');
      this.emitParticipantsChanged();
    });
    room.on(onActiveSpeakersChanged, () => {
      this.emitParticipantsChanged();
    });
  }

  async connect(input: RoomSfuConnectInput): Promise<void> {
    this.updateState('connecting');
    try {
      const livekit = require('@livekit/react-native');
      const Room = livekit?.Room;
      if (!Room) {
        throw new Error('LiveKit Room SDK is unavailable');
      }

      this.room = new Room({
        adaptiveStream: Boolean(input.adaptiveStreamEnabled),
        dynacast: Boolean(input.dynacastEnabled),
      });

      this.bindRoomEvents(this.room, livekit?.RoomEvent);
      await this.room.connect(input.wsUrl, input.token);
      this.updateState('connected');
      this.emitParticipantsChanged();
    } catch (error) {
      this.updateState('failed');
      throw error;
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    const local = this.room?.localParticipant;
    if (!local || typeof local.setMicrophoneEnabled !== 'function') return;
    await local.setMicrophoneEnabled(Boolean(enabled));
    this.emitParticipantsChanged();
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    const local = this.room?.localParticipant;
    if (!local || typeof local.setCameraEnabled !== 'function') return;
    await local.setCameraEnabled(Boolean(enabled));
    this.emitParticipantsChanged();
  }

  async disconnect(): Promise<void> {
    if (this.room && typeof this.room.disconnect === 'function') {
      await this.room.disconnect();
    }
    this.room = null;
    this.updateState('disconnected');
    this.emitParticipantsChanged();
  }
}

function hasParticipantTrack(participant: any, kind: 'audio' | 'video'): boolean {
  if (!participant) return false;

  const tracks = participant.trackPublications;
  if (tracks && typeof tracks.forEach === 'function') {
    let found = false;
    tracks.forEach((publication: any) => {
      const sourceKind = String(publication?.kind || publication?.track?.kind || '').toLowerCase();
      if (sourceKind === kind && !publication?.isMuted) {
        found = true;
      }
    });
    return found;
  }

  return false;
}

function extractParticipantVideoStreamURL(participant: any): string | undefined {
  if (!participant) return undefined;

  const publications = participant.trackPublications;
  if (!publications || typeof publications.forEach !== 'function') {
    return undefined;
  }

  let streamURL: string | undefined;
  publications.forEach((publication: any) => {
    if (streamURL) return;
    const sourceKind = String(publication?.kind || publication?.track?.kind || '').toLowerCase();
    if (sourceKind !== 'video' || publication?.isMuted) return;

    const candidates = [
      publication?.videoTrack,
      publication?.track,
      publication?.track?.mediaStreamTrack,
      publication?.videoTrack?.mediaStreamTrack,
    ];

    for (const candidate of candidates) {
      const next = extractStreamURLFromTrack(candidate);
      if (next) {
        streamURL = next;
        return;
      }
    }
  });

  return streamURL;
}

function extractStreamURLFromTrack(track: any): string | undefined {
  if (!track) return undefined;

  const mediaStream = track?.mediaStream;
  if (mediaStream && typeof mediaStream.toURL === 'function') {
    return mediaStream.toURL();
  }

  if (typeof track?.toURL === 'function') {
    return track.toURL();
  }

  if (typeof track?.getStreams === 'function') {
    const streams = track.getStreams();
    if (Array.isArray(streams) && streams.length > 0 && typeof streams[0]?.toURL === 'function') {
      return streams[0].toURL();
    }
  }

  return undefined;
}
