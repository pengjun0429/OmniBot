const logs = [];
const MAX_LOGS = 500;

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function push(level, args) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
}

console.log = (...args) => { push('info', args); originalLog.apply(console, args); };
console.warn = (...args) => { push('warn', args); originalWarn.apply(console, args); };
console.error = (...args) => { push('error', args); originalError.apply(console, args); };

function getLogs() {
  return logs;
}

function getLogsSince(index) {
  return logs.slice(index);
}

module.exports = { getLogs, getLogsSince };
