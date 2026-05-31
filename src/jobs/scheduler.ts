// Scheduler that registers jobs with node-cron when available.
export function startJobs() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cron = require("node-cron");

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const orderJob = require("./order.timeout.job");
      orderJob.start(cron);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("order.timeout.job not available");
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const payoutJob = require("./payout.job");
      payoutJob.start(cron);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("payout.job not available");
    }

    // eslint-disable-next-line no-console
    console.log("Jobs scheduler started");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("node-cron not installed — jobs disabled");
  }
}

export default startJobs;
