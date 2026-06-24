import { google } from 'googleapis';

export const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export const ESTIMATE_COLUMNS = [
  '記載日', '代理店', '広告主', '契約名', '開始月', '開始日', '終了日', 
  '業推', '規模', 'ターゲット', '種類', '内容', '回答', 
  '回答〆切', '社内担当', '確度', 'ステータス', 'ＲＮＢ', 
  'ＩＴＶ', 'ＥＢＣ', 'ｅａｔ', 'メモ'
];

export const LOG_COLUMNS = [
  '受信日時', '件名', '解析ステータス', '反映先', 'エラー内容'
];

export const getColumnsForSheet = (sheetName: string) => {
  if (sheetName === '受信ログ') {
    return LOG_COLUMNS;
  }
  return ESTIMATE_COLUMNS;
};

export type SheetRecord = {
  id: string; // generated ID for frontend key
  sheetName: string;
  rowIndex: number;
  [key: string]: string | number;
};

// Auth client
const getAuth = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    console.warn('Google Sheets credentials are not set in environment variables.');
    return null;
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

export async function getSheetData(sheetName: string): Promise<SheetRecord[]> {
  const auth = getAuth();
  if (!auth) {
    // Return empty if no auth (e.g. during development setup)
    return [];
  }

  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A2:V`, // Assuming A to V covers the 22 columns
    });

    const columns = getColumnsForSheet(sheetName);
    const rows = response.data.values || [];
    return rows.map((row, index) => {
      const record: SheetRecord = { 
        id: `${sheetName}-${index + 2}`,
        sheetName, 
        rowIndex: index + 2 
      };
      columns.forEach((col, colIndex) => {
        record[col] = row[colIndex] || '';
      });
      return record;
    });
  } catch (error) {
    console.error(`Error fetching data for sheet ${sheetName}:`, error);
    return [];
  }
}

export async function appendSheetData(sheetName: string, data: Partial<SheetRecord> | Partial<SheetRecord>[]) {
  const auth = getAuth();
  if (!auth) throw new Error('Not authenticated');
  
  const sheets = google.sheets({ version: 'v4', auth });
  const columns = getColumnsForSheet(sheetName);
  
  const dataArray = Array.isArray(data) ? data : [data];
  const values = dataArray.map(record => columns.map(col => record[col] || ''));

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:V`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });
    return true;
  } catch (error) {
    console.error(`Error appending data to sheet ${sheetName}:`, error);
    throw error;
  }
}

export async function updateSheetRow(sheetName: string, rowIndex: number, fullRowData: Partial<SheetRecord>) {
  const auth = getAuth();
  if (!auth) throw new Error('Not authenticated');
  
  const sheets = google.sheets({ version: 'v4', auth });
  const columns = getColumnsForSheet(sheetName);
  
  // Create an array of values based on the columns
  const values = [columns.map(col => fullRowData[col] !== undefined ? fullRowData[col] : '')];

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A${rowIndex}:V${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });
    return true;
  } catch (error) {
    console.error(`Error updating row ${rowIndex} in sheet ${sheetName}:`, error);
    throw error;
  }
}

