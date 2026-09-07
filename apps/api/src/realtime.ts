import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { config } from './config';
@WebSocketGateway({ cors: { origin: config.webUrl }, maxHttpBufferSize: 4096 })
export class Realtime {
  @WebSocketServer() server!: Server;
  changed(tripId: string) {
    this.server?.emit('seats:changed', { tripId });
  }
}
