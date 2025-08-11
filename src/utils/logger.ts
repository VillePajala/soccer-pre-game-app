const isProd = process.env.NODE_ENV === 'production';
const level = (process.env.NEXT_PUBLIC_LOG_LEVEL || (isProd ? 'info' : 'debug')).toLowerCase();
const order: Record<string, number> = { error: 0, warn: 1, info: 2, log: 3, debug: 4 };
const enabled = (method: keyof typeof order) => order[method] <= (order[level] ?? 4);

const logger = {
  log: (...args: unknown[]) => { if (enabled('log')) console.log(...args); },
  info: (...args: unknown[]) => { if (enabled('info')) console.info(...args); },
  warn: (...args: unknown[]) => { if (enabled('warn')) console.warn(...args); },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  debug: (...args: unknown[]) => { if (enabled('debug')) console.debug(...args); },
};

export default logger;
