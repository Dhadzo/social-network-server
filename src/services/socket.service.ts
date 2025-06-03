import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Message, MessageWithUser } from '../types/message.types';
import { AuthenticatedSocket } from '../types/socket.types';
import { MessagesService } from './messages.service';

export class SocketService {
  private io: Server;
  private userSockets: Map<number, string> = new Map(); // userId -> socketId
  private messagesService: MessagesService;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || process.env.VERCEL_CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.messagesService = new MessagesService();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      // Authentication middleware will be added here
      // For now, we'll just pass through
      next();
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('User connected:', socket.id);

      // Handle user joining their personal room
      socket.on('join', (userId: number) => {
        this.userSockets.set(userId, socket.id);
        socket.join(`user:${userId}`);
        console.log(`User ${userId} joined their room`);
      });

      // Handle new message
      socket.on('send_message', async (message: MessageWithUser) => {
        // Emit to all participants in the conversation
        this.io
          .to(`conversation:${message.conversation_id}`)
          .emit('new_message', message);

        // Update message status to delivered for online users
        const participants = await this.getConversationParticipants(
          message.conversation_id
        );
        participants.forEach((participant) => {
          if (this.userSockets.has(participant.user_id)) {
            this.io
              .to(`user:${participant.user_id}`)
              .emit('message_delivered', {
                messageId: message.id,
                conversationId: message.conversation_id
              });
          }
        });
      });

      // Handle message read
      socket.on(
        'message_read',
        (data: { messageId: number; conversationId: number }) => {
          this.io
            .to(`conversation:${data.conversationId}`)
            .emit('message_read', {
              messageId: data.messageId,
              conversationId: data.conversationId,
              readBy: socket.userId
            });
        }
      );

      // Handle disconnection
      socket.on('disconnect', () => {
        // Remove user from the map
        for (const [userId, socketId] of this.userSockets.entries()) {
          if (socketId === socket.id) {
            this.userSockets.delete(userId);
            break;
          }
        }
        console.log('User disconnected:', socket.id);
      });
    });
  }

  // Helper method to get conversation participants
  private async getConversationParticipants(conversationId: number) {
    return this.messagesService.getConversationParticipants(conversationId);
  }

  // Method to emit events to specific users
  public emitToUser(userId: number, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Method to emit events to all users in a conversation
  public emitToConversation(conversationId: number, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }
}
