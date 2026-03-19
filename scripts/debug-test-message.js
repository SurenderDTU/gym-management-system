const axios = require('axios');

(async () => {
  try {
    const base = 'http://localhost:5000';
    const stamp = Date.now();
    const email = `owner${stamp}@test.com`;
    const password = 'Pass@12345';

    await axios.post(`${base}/api/auth/register-owner`, {
      gym_name: `Twilio Debug Gym ${stamp}`,
      full_name: `Owner ${stamp}`,
      email,
      password,
    });

    const login = await axios.post(`${base}/api/auth/login`, { email, password });
    const headers = { headers: { 'x-auth-token': login.data.token } };

    const setup = await axios.get(`${base}/api/settings/integrations`, headers);
    await axios.put(
      `${base}/api/settings/integrations`,
      {
        owner_mobile: '+917428204922',
        bulk_enabled: true,
        bulk_monthly_limit: 500,
        bulk_per_campaign_limit: 50,
        bulk_channels: { whatsapp: true, sms: true },
        templates: setup.data.templates,
      },
      headers
    );

    const test = await axios.post(
      `${base}/api/settings/integrations/test-message`,
      {
        channel: 'WHATSAPP',
        to: '+917428204922',
        message: 'GymVault test message from backend debug script.',
      },
      headers
    );

    console.log('TEST_SEND_OK', test.status, test.data);
  } catch (error) {
    console.log('TEST_SEND_FAIL_STATUS', error.response?.status);
    console.log('TEST_SEND_FAIL_DATA', error.response?.data || error.message);
  }
})();
