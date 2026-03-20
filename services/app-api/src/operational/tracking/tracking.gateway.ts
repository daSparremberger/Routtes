import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LocationUpdateDto } from './dto/location-update.dto';

/**
 * MVP: single instance — no Redis Adapter.
 * Future horizontal scale requires adding @nestjs/platform-socket.io + Redis Adapter.
 * See: docs/superpowers/specs/2026-03-19-backend-roadmap-design.md § Nota Socket.io
 */
@WebSocketGateway({
  cors: {
    origin: '*', // TODO: restrict to dashboard domain before production — @WebSocketGateway decorators are evaluated at init time and cannot read env vars directly; requires IoAdapter configuration or process.env read here
  },
  namespace: 'tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins the room for a specific execution.
   * Emit from client: { "event": "join_execution", "data": { "executionId": "..." } }
   */
  @SubscribeMessage('join_execution')
  handleJoinExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string },
  ) {
    const room = `execution:${data.executionId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', data: { room } };
  }

  /**
   * Driver emits location updates; server broadcasts to all clients in execution room.
   * Emit from driver app: { "event": "location_update", "data": { executionId, lat, lng } }
   * Broadcast to room: { "event": "position_update", "data": { executionId, lat, lng, timestamp } }
   */
  @SubscribeMessage('location_update')
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationUpdateDto,
  ) {
    const room = `execution:${data.executionId}`;
    this.server.to(room).emit('position_update', {
      executionId: data.executionId,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Server-side method: broadcast execution status change to all room subscribers.
   * Called by ExecutionsService when status changes (start, stop recorded, finish).
   */
  broadcastStatusUpdate(executionId: string, payload: Record<string, unknown>) {
    this.server.to(`execution:${executionId}`).emit('status_update', payload);
  }
}
