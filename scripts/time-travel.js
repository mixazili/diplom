const { spawnSync } = require('child_process');

const envArg = process.argv[2] || 'development';
const command = process.argv[3] || 'status';

const envMap = {
  dev: 'development',
  development: 'development',
  test: 'test'
};

if (envArg === 'all') {
  const args = process.argv.slice(3);
  for (const target of ['test', 'development']) {
    const result = spawnSync(process.execPath, [__filename, target, ...args], { stdio: 'inherit' });
    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
  process.exit(0);
}

process.env.NODE_ENV = envMap[envArg] || envArg;

const { connectDatabase, disconnectDatabase } = require('../backend/src/config/database');
const {
  advanceTimeByMs,
  getCurrentTime,
  getTimeOffsetMs,
  resetTimeOffset,
  setTimeOffsetMs
} = require('../backend/src/services/timeService');
const { runStatusAutomation } = require('../backend/src/services/statusAutomationService');

const readOption = (name, fallback = '') => {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }

  return process.argv[index + 1];
};

const parseDurationMs = () => {
  const days = Number(readOption('--days', 0));
  const hours = Number(readOption('--hours', 0));
  const minutes = Number(readOption('--minutes', 0));
  const namedDurationMs = (((days * 24 + hours) * 60) + minutes) * 60 * 1000;

  if (namedDurationMs) {
    return namedDurationMs;
  }

  const positional = process.argv.slice(4).filter((item) => !item.startsWith('--'));
  return positional.reduce((total, item) => {
    const match = String(item).trim().match(/^(-?\d+(?:\.\d+)?)(d|h|m)?$/i);

    if (!match) {
      return total;
    }

    const value = Number(match[1]);
    const unit = (match[2] || 'h').toLowerCase();

    if (unit === 'd') {
      return total + value * 24 * 60 * 60 * 1000;
    }

    if (unit === 'm') {
      return total + value * 60 * 1000;
    }

    return total + value * 60 * 60 * 1000;
  }, 0);
};

const printStatus = async () => {
  const offset = await getTimeOffsetMs();
  const currentTime = await getCurrentTime();

  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Real time: ${new Date().toISOString()}`);
  console.log(`Offset: ${offset} ms`);
  console.log(`Auction.by time: ${currentTime.toISOString()}`);
};

const main = async () => {
  await connectDatabase();

  if (command === 'status') {
    await printStatus();
    return;
  }

  if (command === 'reset') {
    await resetTimeOffset();
    await runStatusAutomation();
    await printStatus();
    return;
  }

  if (command === 'advance') {
    const deltaMs = parseDurationMs();
    await advanceTimeByMs(deltaMs);
    await runStatusAutomation();
    await printStatus();
    return;
  }

  if (command === 'set') {
    const dateValue = readOption('--date');
    const targetDate = new Date(dateValue);

    if (!dateValue || Number.isNaN(targetDate.getTime())) {
      throw new Error('Use: node scripts/time-travel.js dev set --date "2026-06-01T09:00:00+03:00"');
    }

    await setTimeOffsetMs(targetDate.getTime() - Date.now());
    await runStatusAutomation();
    await printStatus();
    return;
  }

  throw new Error('Unknown command. Use status, advance, set, or reset.');
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
  });
