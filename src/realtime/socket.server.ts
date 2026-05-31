import http from "http";

// Attach Socket.io to an existing HTTP server. If socket.io isn't installed,
// this becomes a no-op to keep the app runnable without the dependency.
export function attachSocketServer(server: http.Server) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Server } = require("socket.io");
    const io = new Server(server, { cors: { origin: "*" } });

    // Register gateways if present
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const order = require("./order.gateway");
      if (order && typeof order.register === "function") order.register(io);
    } catch (e) {}

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const driver = require("./driver.gateway");
      if (driver && typeof driver.register === "function") driver.register(io);
    } catch (e) {}

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const merchant = require("./merchant.gateway");
      if (merchant && typeof merchant.register === "function")
        merchant.register(io);
    } catch (e) {}

    // eslint-disable-next-line no-console
    console.log("Socket.io attached");
    return io;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("socket.io not installed — realtime disabled");
    return null;
  }
}

export default attachSocketServer;
