import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
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
export declare function initializeMessaging(httpServer: HTTPServer): SocketIOServer;
/**
 * Get active users in a dispute
 */
export declare function getActiveUsers(disputeId: number): string[];
/**
 * Get message history for a dispute
 */
export declare function getMessageHistory(disputeId: number): ChatMessage[];
/**
 * Clear message history (optional cleanup)
 */
export declare function clearMessageHistory(disputeId: number): void;
export {};
//# sourceMappingURL=websocket.d.ts.map