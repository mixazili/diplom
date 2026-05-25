const Counter = require('../models/Counter');

const TIME_OFFSET_KEY = 'system:time-offset-ms';

const getTimeOffsetMs = async () => {
  const record = await Counter.findOne({ key: TIME_OFFSET_KEY }).lean();
  return Number(record?.value || 0);
};

const setTimeOffsetMs = async (value) => {
  const offset = Number(value) || 0;
  await Counter.findOneAndUpdate(
    { key: TIME_OFFSET_KEY },
    { $set: { key: TIME_OFFSET_KEY, value: offset } },
    { upsert: true, returnDocument: 'after' }
  );
  return offset;
};

const advanceTimeByMs = async (deltaMs) => {
  const current = await getTimeOffsetMs();
  return setTimeOffsetMs(current + (Number(deltaMs) || 0));
};

const resetTimeOffset = () => setTimeOffsetMs(0);

const getCurrentTime = async () => new Date(Date.now() + (await getTimeOffsetMs()));

module.exports = {
  advanceTimeByMs,
  getCurrentTime,
  getTimeOffsetMs,
  resetTimeOffset,
  setTimeOffsetMs,
  TIME_OFFSET_KEY
};
