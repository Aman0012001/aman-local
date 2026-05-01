import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from '../notifications/ws-jwt.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

@WebSocketGateway({
    namespace: 'chat',
    cors: {
        origin: true,
        credentials: true,
    },
    transports: ['polling', 'websocket'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(private chatService: ChatService) {}

    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to chat: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from chat: ${client.id}`);
    }

    @SubscribeMessage('joinRoom')
    @UseGuards(WsJwtGuard)
    async handleJoinRoom(
        @ConnectedSocket() client: any,
        @MessageBody('conversationId') conversationId: string,
    ) {
        client.join(conversationId);
        this.logger.log(`User ${client.user.id} joined conversation ${conversationId}`);
        return { status: 'joined', conversationId };
    }

    /**
     * Vendor joins their own room so they receive newConversation events
     * in real-time without polling.
     */
    @SubscribeMessage('joinVendorRoom')
    @UseGuards(WsJwtGuard)
    async handleJoinVendorRoom(
        @ConnectedSocket() client: any,
        @MessageBody('vendorId') vendorId: string,
    ) {
        const room = `vendor:${vendorId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} joined vendor room ${room}`);
        return { status: 'joined', room };
    }

    /**
     * User joins their own room so they receive conversation events
     */
    @SubscribeMessage('joinUserRoom')
    @UseGuards(WsJwtGuard)
    async handleJoinUserRoom(
        @ConnectedSocket() client: any,
    ) {
        const room = `user:${client.user.id}`;
        client.join(room);
        this.logger.log(`Client ${client.id} joined user room ${room}`);
        return { status: 'joined', room };
    }

    @SubscribeMessage('sendMessage')
    @UseGuards(WsJwtGuard)
    async handleSendMessage(
        @ConnectedSocket() client: any,
        @MessageBody() data: SendMessageDto,
    ) {
        const userId = client.user.id;
        try {
            const message = await this.chatService.sendMessage(
                userId,
                data.conversationId,
                data.content,
            );

            // Broadcast full message to conversation room
            this.logger.log(`Broadcasting newMessage to room: ${data.conversationId}`);
            this.server.to(data.conversationId).emit('newMessage', message);

            // Also broadcast a lightweight update to vendor/user rooms
            // so their conversation list can update the last_message preview
            const conversation = await this.chatService.getConversationById(data.conversationId);
            if (conversation) {
                const update = {
                    conversationId: data.conversationId,
                    lastMessage: data.content,
                    lastMessageAt: message.createdAt,
                };
                
                const vendorRoom = `vendor:${conversation.vendorId}`;
                const userRoom = `user:${conversation.userId}`;
                
                this.logger.log(`Broadcasting conversationUpdated to rooms: ${vendorRoom}, ${userRoom}`);
                this.server.to(vendorRoom).emit('conversationUpdated', update);
                this.server.to(userRoom).emit('conversationUpdated', update);
            }

            return { status: 'success', message };
        } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            return { status: 'error', message: error.message };
        }
    }

    @SubscribeMessage('typing')
    @UseGuards(WsJwtGuard)
    async handleTyping(
        @ConnectedSocket() client: any,
        @MessageBody('conversationId') conversationId: string,
    ) {
        client.to(conversationId).emit('userTyping', {
            userId: client.user.id,
            conversationId,
        });
    }

    /**
     * Called by frontend after getOrCreateConversation succeeds.
     * Broadcasts the new conversation to both participants' rooms.
     */
    async notifyNewConversation(conversation: any) {
        // Notify Vendor
        this.server.to(`vendor:${conversation.vendorId}`).emit('newConversation', conversation);
        // Notify User
        this.server.to(`user:${conversation.userId}`).emit('newConversation', conversation);
        
        this.logger.log(`Notified both vendor:${conversation.vendorId} and user:${conversation.userId} of new conversation ${conversation.id}`);
    }
}
