// Order timeout job — cancels stale PENDING orders.
// Implementation is intentionally minimal: it logs ticks and provides a start() API
// that can be wired into a cron scheduler when node-cron is available.
export function start(cron: any) {
  if (!cron) {
    // fallback: run every 60s using setInterval
    const id = setInterval(() => {
      // eslint-disable-next-line no-console
      console.log("order.timeout.job: tick (no cron installed)");
    }, 60 * 1000);
    return { stop: () => clearInterval(id) };
  }

  // schedule every minute
  const task = cron.schedule("*/1 * * * *", () => {
    // eslint-disable-next-line no-console
    console.log("order.timeout.job: tick");
  });
  task.start();
  return task;
}

export default { start };
