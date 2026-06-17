const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  console.log("Email:", email);
  console.log("Private Key valid?", privateKey.includes('BEGIN PRIVATE KEY'));

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'プレ!A1:B2',
    });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

testAuth();
