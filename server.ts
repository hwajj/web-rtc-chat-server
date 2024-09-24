import { createServer } from "http";
import { Server } from "socket.io";

const port = 4000;
const isProduction = true;
const hostname = "https://dae-hwa-cheong.netlify.app";

// Create an HTTP server
const httpServer = createServer();

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: isProduction
      ? ["https://dae-hwa-cheong.netlify.app"]
      : ["http://localhost:4000"],
    methods: ["GET", "POST"],
    credentials: true, // 자격 증명 허용
  },
});

// 소켓 연결 처리
io.on("connection", (socket) => {
  // 방에 참여했을 때
  socket.on("join-room", (roomId: string) => {
    // 소켓이 이미 방에 있는지 확인
    if (!Array.from(socket.rooms).includes(roomId)) {
      socket.join(roomId);
      // 다른 사용자들에게 새로운 피어 연결 알림
      socket.to(roomId).emit("new-peer", socket.id);
    }
  });

  // 채팅 메시지 처리
  socket.on(
    "chat-message",
    (roomId: string, message: { userId: string; text: string }) => {
      console.log(`Message from ${message.userId} in room ${roomId}: ${message.text}`);
      io.to(roomId).emit("receive-message", {
        userId: message.userId,
        text: message.text,
      });
    },
  );

  // WebRTC Offer 처리
  socket.on("offer", (peerId: string, offer) => {
    socket.to(peerId).emit("offer", socket.id, offer);
  });

  // WebRTC Answer 처리
  socket.on("answer", (peerId: string, answer) => {
    socket.to(peerId).emit("answer", socket.id, answer);
  });

  // ICE Candidate 처리
  socket.on("ice-candidate", (peerId: string, candidate) => {
    socket.to(peerId).emit("ice-candidate", socket.id, candidate);
  });

  // 방을 나갈 때
  socket.on("leave-room", (roomId: string) => {
    if (socket.rooms.has(roomId)) {
      socket.leave(roomId);
      socket.to(roomId).emit("peer-disconnected", socket.id);
    }
  });

  // 소켓 연결이 끊어질 때
  socket.on("disconnect", () => {
    Array.from(socket.rooms).forEach((roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit("peer-disconnected", socket.id);
    });
  });
});

// HTTP 서버 시작
httpServer.listen(port, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
