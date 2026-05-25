const app = require('./app');
const config = require('./config/env');
const { connectDatabase } = require('./config/database');
const { ensureAdminAccount } = require('./services/adminSeedService');
const { startStatusAutomation } = require('./services/statusAutomationService');

const startServer = async () => {
  await connectDatabase();
  await ensureAdminAccount();
  startStatusAutomation();

  app.listen(config.port, () => {
    console.log(`Auction.by API is running on port ${config.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start Auction.by API', error);
  process.exit(1);
});
