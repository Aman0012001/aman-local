import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, OnModuleInit } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@WebSocketGateway({
    namespace: 'notifications',
    cors: {
        origin: true,
        credentials: true,
    },
    transports: ['polling', 'websocket'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    onModuleInit() {
        // Run the reset in the background — don't block app startup on remote DB latency
        setImmediate(() => {
            this.userRepository.query('UPDATE users SET is_online = false')
                .then(() => this.logger.log('isOnline reset complete for all users.'))
                .catch((err: any) => this.logger.warn('Could not reset isOnline on startup: ' + err.message));
        });
    }

    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);
    private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    async handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from notifications: ${client.id}`);
        // Remove from connected users map
        for (const [userId, sockets] of this.connectedUsers.entries()) {
            if (sockets.includes(client.id)) {
                const updatedSockets = sockets.filter(id => id !== client.id);
                if (updatedSockets.length === 0) {
                    this.connectedUsers.delete(userId);
                    // Update DB status
                    await this.userRepository.update(userId, { isOnline: false });
                    this.logger.log(`User ${userId} is now offline (no active sessions)`);
                    
                    // Broadcast offline event to all connected clients
                    this.server.emit('userOffline', { userId });
                } else {
                    this.connectedUsers.set(userId, updatedSockets);
                }
                break;
            }
        }
    }

    @SubscribeMessage('authenticate')
    @UseGuards(WsJwtGuard)
    async handleAuthenticate(client: any) {
        const userId: string | undefined = client.user?.id;

        // Guard: if JWT guard didn't populate the user (invalid/missing token), bail out safely
        if (!userId) {
            this.logger.warn(`handleAuthenticate: No userId found on socket ${client.id}. Skipping.`);
            return { status: 'error', message: 'Not authenticated' };
        }

        const sockets = this.connectedUsers.get(userId) || [];
        if (!sockets.includes(client.id)) {
            sockets.push(client.id);
        }
        this.connectedUsers.set(userId, sockets);
        
        // Update DB status
        await this.userRepository.update(userId, { isOnline: true });
        
        // Broadcast online event to all connected clients
        this.server.emit('userOnline', { userId });
        
        this.logger.log(`User ${userId} authenticated on socket ${client.id} and is now online`);
        return { status: 'authenticated' };
    }

    sendToUser(userId: string, event: string, data: any) {
        const sockets = this.connectedUsers.get(userId);
        if (sockets) {
            sockets.forEach(socketId => {
                this.server.to(socketId).emit(event, data);
            });
            this.logger.log(`Notification sent to user ${userId}: ${event}`);
        } else {
            this.logger.log(`User ${userId} not connected, notification stored? (future)`);
        }
    }
}
