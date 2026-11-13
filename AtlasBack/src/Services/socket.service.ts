import { Server as SocketIOServer } from "socket.io";

class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;

  private constructor() {} // Private constructor for singleton

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(io: SocketIOServer): void {
    this.io = io;
  }
  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error("Socket.IO not initialized");
    }
    return this.io;
  }

   // General broadcast to all connected clients
   broadcastEvent(event: string, data: any) { 
    if (!this.io) {
      console.error('Socket.IO not initialized');
      return;
    }
    this.io.emit(event, data); // Broadcast to everyone
  }

  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      throw new Error('Socket.IO not initialized. Call initialize() first.');
    }
    console.log("Emitting... to user room:", `user_${userId}`);
    this.io.to(`user_${userId}`).emit(event, data);
    console.log("Emitted to user room:", `user_${userId}`);

  }
} 

// Export singleton instance
export const socketService = SocketService.getInstance();