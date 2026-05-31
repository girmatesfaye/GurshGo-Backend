// Handles order rooms and basic order events
export function register(io: any) {
  if (!io) return;

  io.on("connection", (socket: any) => {
    socket.on("join_order", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("leave_order", (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });
  });
}

export default { register };
