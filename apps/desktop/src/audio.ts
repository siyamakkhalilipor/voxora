import { Room, RoomEvent, Track } from 'livekit-client';
import type { VoiceCredentials } from '@voxora/protocol';

export type AudioMode = 'ptt'|'vad'|'continuous';
export class VoiceSession {
  room: Room | null = null;
  speakingListener: ((identity:string,speaking:boolean)=>void) | null = null;

  async connect(credentials: VoiceCredentials) {
    await this.disconnect();
    const room = new Room({ adaptiveStream:true, dynacast:true });
    room.on(RoomEvent.ActiveSpeakersChanged, speakers => {
      const active = new Set(speakers.map(s=>s.identity));
      this.speakingListener?.(room.localParticipant.identity, active.has(room.localParticipant.identity));
      for (const participant of room.remoteParticipants.values()) {
        this.speakingListener?.(participant.identity, active.has(participant.identity));
      }
    });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) track.attach();
    });
    await room.connect(credentials.serverUrl, credentials.participantToken, { autoSubscribe:true });
    await room.localParticipant.setMicrophoneEnabled(false);
    this.room = room;
  }

  async setMicrophone(enabled:boolean) {
    if (!this.room) return;
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  setDeafened(deafened:boolean) {
    if (!this.room) return;
    for (const participant of this.room.remoteParticipants.values()) {
      for (const publication of participant.audioTrackPublications.values()) publication.setSubscribed(!deafened);
    }
  }

  async disconnect() {
    if (!this.room) return;
    await this.room.disconnect();
    this.room = null;
  }
}
export const voiceSession = new VoiceSession();
