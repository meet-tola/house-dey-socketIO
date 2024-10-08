import { Server } from "socket.io";
import express from "express";
import cors from "cors";

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://www.housedey.com.ng"]
    : ["http://localhost:3000"];

const app = express();
app.use(cors());
app.use(express.json());

const server = app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
  },
});

let onlineUser = [];
let offlineNotifications = {};

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

app.post("/emitNotification", (req, res) => {
  const { userId, notification } = req.body;

  const receiver = getUser(userId);
  if (receiver) {
    io.to(receiver.socketId).emit("newNotification", notification);
    return res
      .status(200)
      .json({ message: "Notification sent to online user" });
  } else {
    if (!offlineNotifications[userId]) {
      offlineNotifications[userId] = [];
    }
    offlineNotifications[userId].push(notification);
    return res
      .status(200)
      .json({ message: "User offline, notification stored" });
  }
});

io.on("connection", (socket) => {
  socket.on("newUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", onlineUser);

    if (
      offlineNotifications[userId] &&
      offlineNotifications[userId].length > 0
    ) {
      offlineNotifications[userId].forEach((notification) => {
        io.to(socket.id).emit("newNotification", notification);
      });
      offlineNotifications[userId] = [];
    }
  });

  socket.on("sendMessage", ({ receiverId, message }) => {
    const receiver = getUser(receiverId);    
    if (receiver) {
      io.to(receiver.socketId).emit("getMessage", { ...message });
    } else {
      console.log("Receiver not found or offline");
    }
  });
  

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", onlineUser);
  });
});
