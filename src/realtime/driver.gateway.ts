// Driver gateway: push job requests to specific driver sockets
export function register(io: any) {
  if (!io) return;

  io.on("connection", (socket: any) => {
    socket.on("register_driver", (driverId: string) => {
      socket.join(`driver:${driverId}`);
    });

    socket.on("unregister_driver", (driverId: string) => {
      socket.leave(`driver:${driverId}`);
    });
  });
}

export default { register };
