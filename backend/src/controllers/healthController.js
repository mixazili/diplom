const config = require('../config/env');
const { getConnectionState } = require('../config/database');

const getHealth = (req, res) => {
  res.json({
    status: 'ok',
    service: 'auction-by-api',
    env: config.env,
    database: getConnectionState()
  });
};

module.exports = {
  getHealth
};
