import { Server } from "socket.io";

const allowedOrigins = process.env.NODE_ENV === "production"
  ? ["https://house-dey.vercel.app"]
  : ["http://localhost:3000"];

const io = new Server({
  cors: {
    origin: allowedOrigins,
  },
});

let onlineUser = [];

const addUser = (userId, socketId) => {
  const userExits = onlineUser.find((user) => user.userId === userId);
  if (!userExits) {
    onlineUser.push({ userId, socketId });
  }
};

const removeUser = (socketId) => {
  onlineUser = onlineUser.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return onlineUser.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {

  socket.on("newUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", onlineUser); 
  });

  socket.on("sendMessage", ({ receiverId, message }) => {
    const receiver = getUser(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("getMessage", message);
    } else {
      console.log(`User ${receiverId} is not online`);
    }
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", onlineUser); 
  });
});


io.listen("4000");