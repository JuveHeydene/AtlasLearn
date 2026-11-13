import express, { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import dotenv from "dotenv";
import { setupSwagger } from '@config/swagger';
import { registerRoutes } from "./routes";
const cors = require('cors');
import http from 'http';
import { setupSocketIO } from "./socket";
import { ensureBucket } from "./config/storage";



dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// Alternatively, we can specify specific origins like this:
// app.use(cors({ origin: 'http://localhost:3000' }));


registerRoutes(app);
// Setup Swagger
setupSwagger(app);


app.get("/", (req: Request, res: Response) => {
  res.send("Welcome we will be using Express + TypeScript  ");
});

// JSON errors instead of HTML stack traces (e.g. rejected upload type or size)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof multer.MulterError ? 413 : /not allowed/.test(err.message) ? 415 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message });
});
 
// HTTP Server and Socket.IO setup
const httpServer = http.createServer(app);
setupSocketIO(httpServer);  



// Create the storage bucket if needed (local MinIO); the API still starts if storage is down.
ensureBucket().catch((err) => console.error("Storage not reachable:", err.message));

const server =httpServer.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  //console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});


process.on('SIGINT', () => {
  console.log('Gracefully shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});


//run server : ts-node src/main.ts

