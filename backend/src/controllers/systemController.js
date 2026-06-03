const asyncHandler = require('../utils/asyncHandler');
const { getCurrentTime, getTimeOffsetMs } = require('../services/timeService');

const getSystemTime = asyncHandler(async (req, res) => {
  const [currentTime, offsetMs] = await Promise.all([
    getCurrentTime(),
    getTimeOffsetMs()
  ]);

  res.json({
    time: {
      currentTime: currentTime.toISOString(),
      realTime: new Date().toISOString(),
      offsetMs
    }
  });
});

module.exports = {
  getSystemTime
};
