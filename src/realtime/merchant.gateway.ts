// Merchant gateway: merchant-specific rooms for new order alerts
export function register(io: any) {
  if (!io) return;

  io.on("connection", (socket: any) => {
    socket.on("register_merchant", (merchantId: string) => {
      socket.join(`merchant:${merchantId}`);
    });

    socket.on("unregister_merchant", (merchantId: string) => {
      socket.leave(`merchant:${merchantId}`);
    });
  });
}

export default { register };
