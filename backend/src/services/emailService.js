const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporterPromise = null;

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    })
  ]);

const createTransporter = async () => {
  if (config.env === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const timeoutOptions = {
    connectionTimeout: 3000,
    greetingTimeout: 3000,
    socketTimeout: 5000
  };

  if (config.mail.smtpHost && config.mail.smtpUser && config.mail.smtpPass) {
    return nodemailer.createTransport({
      host: config.mail.smtpHost,
      port: config.mail.smtpPort,
      secure: config.mail.smtpPort === 465,
      auth: {
        user: config.mail.smtpUser,
        pass: config.mail.smtpPass
      },
      ...timeoutOptions
    });
  }

  const testAccount = await withTimeout(
    nodemailer.createTestAccount(),
    3000,
    'Ethereal account creation timeout'
  );

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    },
    ...timeoutOptions
  });
};

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }

  return transporterPromise;
};

const createFallbackResult = ({ code, error }) => {
  console.warn(`Email delivery failed, using development code fallback: ${error.message}`);

  return {
    messageId: null,
    previewUrl: null,
    developmentCode: code,
    deliveryError: error.message
  };
};

const sendEmailVerificationCode = async ({ email, code }) => {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: config.mail.from,
      to: email,
      subject: 'Код подтверждения Auction.by',
      text: `Ваш код подтверждения: ${code}. Код действует 15 минут.`,
      html: `<p>Ваш код подтверждения Auction.by:</p><h2>${code}</h2><p>Код действует 15 минут.</p>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(`Ethereal email preview: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
      developmentCode: null,
      deliveryError: null
    };
  } catch (error) {
    if (config.env !== 'production') {
      transporterPromise = null;
      return createFallbackResult({ code, error });
    }

    throw error;
  }
};

module.exports = {
  sendEmailVerificationCode,
  sendStaffLoginCode: sendEmailVerificationCode
};
