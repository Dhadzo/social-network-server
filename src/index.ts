import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { environment } from './config/environment';
import authRoutes from './routes/auth.routes';
import postsRoutes from './routes/posts.routes';
import commentsRoutes from './routes/comments.routes';
import followsRoutes from './routes/follows.routes';
import notificationsRoutes from './routes/notifications.routes';
import messagesRoutes from './routes/messages.routes';
import usersRoutes from './routes/users.routes';
import { SocketService } from './services/socket.service';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const socketService = new SocketService(httpServer);

const allowedOrigins: string[] = [];

if (environment.clientUrl) allowedOrigins.push(environment.clientUrl);
if (environment.vercelClientUrl)
  allowedOrigins.push(environment.vercelClientUrl);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);

httpServer.listen(environment.port, () => {
  console.log(`Server running on port ${environment.port}`);
});
