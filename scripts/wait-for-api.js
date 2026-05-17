const http = require('http');

const url = new URL(process.env.API_HEALTH_URL || 'http://127.0.0.1:5055/api/health');
const timeoutMs = Number(process.env.API_WAIT_TIMEOUT_MS) || 180000;
const intervalMs = Number(process.env.API_WAIT_INTERVAL_MS) || 500;
const startedAt = Date.now();

const retry = () => {
  if (Date.now() - startedAt >= timeoutMs) {
    console.error(`API is not ready after ${timeoutMs}ms: ${url.href}`);
    process.exit(1);
  }

  setTimeout(check, intervalMs);
};

const check = () => {
  const request = http.get(url, (response) => {
    response.resume();

    if (response.statusCode >= 200 && response.statusCode < 500) {
      process.exit(0);
      return;
    }

    retry();
  });

  request.on('error', retry);
  request.setTimeout(intervalMs, () => {
    request.destroy();
    retry();
  });
};

check();
