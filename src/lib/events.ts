import { EventEmitter } from 'events';
import { RoomEventPayload } from '@/types';

// Global singleton EventEmitter across Next.js API routes
declare global {
  var __roomEventEmitter: EventEmitter | undefined;
}

if (!global.__roomEventEmitter) {
  global.__roomEventEmitter = new EventEmitter();
  global.__roomEventEmitter.setMaxListeners(100);
}

export const roomEmitter = global.__roomEventEmitter;

export function broadcastRoomEvent(payload: RoomEventPayload) {
  roomEmitter.emit(`room:${payload.roomId}`, payload);
}

export function subscribeToRoom(roomId: string, listener: (payload: RoomEventPayload) => void) {
  const eventName = `room:${roomId}`;
  roomEmitter.on(eventName, listener);
  return () => {
    roomEmitter.off(eventName, listener);
  };
}
