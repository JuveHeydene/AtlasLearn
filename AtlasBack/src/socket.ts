// socket.ts
import { Server as HTTPServer } from "http";
import { Server} from "socket.io";
import { handleUserStatus } from "./socketHandlers/userStatusHandler";
import { socketService } from "./Services/socket.service";

// Define your CORS options properly
interface SocketConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    credentials?: boolean;
  };
}

export function setupSocketIO(server: HTTPServer): void {
  const config: SocketConfig = {
    cors: {
      origin:'*',
      methods: ['GET', 'POST']
    } 
  };

  const io = new Server(server, config);

  // Initialize socket service
  socketService.initialize(io);

  io.on('connection', (socket:any) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Add type for room joining handler
    socket.on('join_user_room', (userId: string) => {
      if (typeof userId !== 'string') {
        console.error('Invalid user ID format');
        return;
      }
      
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Initialize status handler
    handleUserStatus(socket);

    // Add message type
    interface MessageData {
      content: string;
      timestamp: Date;
      sender: string;
    }

    socket.on('message', (data: MessageData) => {
      console.log(`Message from ${socket.id}:`, data);
      io.emit('message', data);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}