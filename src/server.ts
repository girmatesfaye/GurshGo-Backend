import http from "http";
import { createApp } from "./app";
import startJobs from "./jobs/scheduler";
import attachSocketServer from "./realtime/socket.server";

const app = createApp();
const server = http.createServer(app);

// Attach realtime (socket.io) if available
attachSocketServer(server);

// Start background jobs (node-cron) if available
startJobs();

const port = Number(process.env.PORT ?? 3001);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
});

export default server;
