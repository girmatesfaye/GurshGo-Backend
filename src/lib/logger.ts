// Simple logger wrapper — prefer pino when available, fallback to console
type Logger = any;

let logger: Logger | null = null;

function createConsoleLogger() {
  return {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug
      ? console.debug.bind(console)
      : console.log.bind(console),
  } as Logger;
}

export function getLogger(): Logger {
  if (logger) return logger;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pino = require("pino");
    logger = pino();
    return logger;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("pino not installed — using console logger");
    logger = createConsoleLogger();
    return logger;
  }
}

export default getLogger;
