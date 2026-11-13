import { Socket } from "socket.io";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleUserStatus(socket: Socket) {
  const userId = socket.handshake.auth.userId;

  if (!userId) {
    console.warn(` Missing userId for socket ${socket.id}`);
    socket.disconnect();
    return;
  }

  console.log(`🔌 Client connected: ${socket.id}, User: ${userId}`);

  
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'online' },
  }).then(() => {
    socket.broadcast.emit('userStatusUpdated'); // notify others
  }).catch(err => {
    console.error(`Failed to update status for user ${userId}`, err);
  });

  socket.on('disconnect', () => {
     prisma.user.update({
      where: { id: userId },
      data: { status: 'offline' },
    }).then(() => {
      socket.broadcast.emit('userStatusUpdated');
    }).catch(err => {
      console.error(`Failed to update status for user ${userId}`, err);
    });
  });
}
