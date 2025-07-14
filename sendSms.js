const twilio = require('twilio');

const accountSid = 'ACfc2c3e0f6fb7469be1728740d73e3bdd';
const authToken = '632836caf12a8a6665d5e135f3e8ef35';
const twilioPhoneNumber = '+16205083142';

const client = twilio(accountSid, authToken);

const sendSMS = (to, message) => {
  return client.messages.create({
    body: message,
    from: twilioPhoneNumber,
    to: to
  });
};

module.exports = sendSMS;