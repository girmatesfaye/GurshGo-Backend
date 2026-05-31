// Payout job — triggers nightly payouts. Minimal skeleton that exposes start().
export function start(cron: any) {
  if (!cron) {
    // nothing scheduled by default if cron not installed
    // eslint-disable-next-line no-console
    console.warn("payout.job: node-cron not installed; job disabled");
    return { stop: () => {} };
  }

  // run daily at midnight
  const task = cron.schedule("0 0 * * *", () => {
    // eslint-disable-next-line no-console
    console.log("payout.job: running nightly payout job");
  });
  task.start();
  return task;
}

export default { start };
