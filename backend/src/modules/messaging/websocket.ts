import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../../logger';

interface ChatMessage {
  id: string;
  senderAddress: string;
  senderName: string;
  message: string;
  timestamp: number;
  projectId: number;
  disputeId?: number;
  messageType: 'TEXT' | 'FILE' | 'VERDICT' | 'SYSTEM';
  attachments?: {
    type: string;
    cid: string;
    url: string;
  }[];
}

// Store active connections per dispute
const activeConnections = new Map<
  number,
  Set<{ address: string; socketId: string }>
>();

// Store message history in memory (use Redis/DB in production)
const messageHistory = new Map<number, ChatMessage[]>();

export function initializeMessaging(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`📡 New connection: ${socket.id}`);

    // Join dispute room
    socket.on(
      'join_dispute',
      (
        { disputeId, userAddress, userName }: {
          disputeId: number;
          userAddress: string;
          userName: string;
        },
        callback
      ) => {
        try {
          socket.join(`dispute_${disputeId}`);

          if (!activeConnections.has(disputeId)) {
            activeConnections.set(disputeId, new Set());
          }

          activeConnections.get(disputeId)!.add({
            address: userAddress,
            socketId: socket.id,
          });

          // Send message history
          const history = messageHistory.get(disputeId) || [];

          // Send existing messages to new user
          socket.emit('message_history', history);

          // Notify others that user joined
          socket.to(`dispute_${disputeId}`).emit('user_joined', {
            userAddress,
            userName,
            timestamp: Date.now(),
          });

          logger.info(`User ${userAddress} joined dispute ${disputeId}`);

          callback({ success: true, history });
        } catch (error) {
          logger.error('Failed to join dispute', error);
          callback({ success: false, error: (error as Error).message });
        }
      }
    );

    // Send chat message
    socket.on(
      'send_message',
      (
        {
          disputeId,
          senderAddress,
          senderName,
          message,
          attachments,
        }: {
          disputeId: number;
          senderAddress: string;
          senderName: string;
          message: string;
          attachments?: any[];
        },
        callback
      ) => {
        try {
          const chatMessage: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            senderAddress,
            senderName,
            message,
            timestamp: Date.now(),
            projectId: 0, // Should come from database
            messageType: 'TEXT',
            attachments,
          };

          // Store message
          if (!messageHistory.has(disputeId)) {
            messageHistory.set(disputeId, []);
          }
          messageHistory.get(disputeId)!.push(chatMessage);

          // Broadcast to all users in dispute
          io.to(`dispute_${disputeId}`).emit('new_message', chatMessage);

          logger.info(`Message sent in dispute ${disputeId}`);

          callback({ success: true, messageId: chatMessage.id });
        } catch (error) {
          logger.error('Failed to send message', error);
          callback({ success: false, error: (error as Error).message });
        }
      }
    );

    // Send file/document
    socket.on(
      'send_file',
      (
        {
          disputeId,
          senderAddress,
          senderName,
          fileName,
          cid,
          url,
        }: {
          disputeId: number;
          senderAddress: string;
          senderName: string;
          fileName: string;
          cid: string;
          url: string;
        },
        callback
      ) => {
        try {
          const fileMessage: ChatMessage = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            senderAddress,
            senderName,
            message: `Uploaded file: ${fileName}`,
            timestamp: Date.now(),
            projectId: 0,
            messageType: 'FILE',
            attachments: [
              {
                type: 'file',
                cid,
                url,
              },
            ],
          };

          if (!messageHistory.has(disputeId)) {
            messageHistory.set(disputeId, []);
          }
          messageHistory.get(disputeId)!.push(fileMessage);

          io.to(`dispute_${disputeId}`).emit('file_shared', fileMessage);

          logger.info(
            `File shared in dispute ${disputeId}: ${fileName} (CID: ${cid.substring(0, 8)}...)`
          );

          callback({ success: true, messageId: fileMessage.id });
        } catch (error) {
          logger.error('Failed to send file', error);
          callback({ success: false, error: (error as Error).message });
        }
      }
    );

    // Leave dispute room
    socket.on('leave_dispute', ({ disputeId, userAddress }) => {
      socket.leave(`dispute_${disputeId}`);

      if (activeConnections.has(disputeId)) {
        const users = activeConnections.get(disputeId)!;
        users.forEach((user) => {
          if (user.socketId === socket.id) {
            users.delete(user);
          }
        });

        io.to(`dispute_${disputeId}`).emit('user_left', {
          userAddress,
          timestamp: Date.now(),
        });
      }

      logger.info(`User ${userAddress} left dispute ${disputeId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`📡 Disconnected: ${socket.id}`);
    });
  });

  logger.info('🔌 Messaging system initialized');
  return io;
}

/**
 * Get active users in a dispute
 */
export function getActiveUsers(disputeId: number): string[] {
  const users = activeConnections.get(disputeId);
  return users ? Array.from(users).map((u) => u.address) : [];
}

/**
 * Get message history for a dispute
 */
export function getMessageHistory(disputeId: number): ChatMessage[] {
  return messageHistory.get(disputeId) || [];
}

/**
 * Clear message history (optional cleanup)
 */
export function clearMessageHistory(disputeId: number): void {
  messageHistory.delete(disputeId);
  logger.info(`Message history cleared for dispute ${disputeId}`);
}
