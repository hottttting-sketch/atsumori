import * as xlsx from 'xlsx';

export async function parseEmailContent(subject: string, body: string, file?: File) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const prompt = `
You are an AI assistant that extracts structured data from business emails.
Based on the following email subject and body, extract the relevant fields to populate a database.
Also, determine the "targetSheet" which must be one of: "電通見積", "博報堂見積", "アザー見積", or "プレ".
If it's an estimate related to Dentsu, choose "電通見積". For Hakuhodo, choose "博報堂見積". For other agencies, choose "アザー見積". If the email subject or body contains words like "プレ", "プレ情報", "相談", "問い合わせ", "リード", or if it's pre-sales or lead info, choose "プレ".

Email Subject: ${subject}
Email Body: ${body}
{ATTACHMENT_TEXT_PLACEHOLDER}

Return a JSON object with the following schema:
{
  "targetSheet": "string",
  "data": [
    {
      "記載日": "string (YYYY/MM/DD)",
      "代理店": "string",
      "広告主": "string",
      "契約名": "string",
      "開始月": "string (e.g. 4月)",
      "開始日": "string (YYYY/MM/DD)",
      "終了日": "string (YYYY/MM/DD)",
      "業推": "string",
      "規模": "string",
      "ターゲット": "string",
      "種類": "string",
      "内容": "string",
      "回答": "string",
      "回答〆切": "string",
      "社内担当": "string",
      "確度": "string (e.g. 確度A, 確度B, 確度C)",
      "ステータス": "string (e.g. 受注, 検討中, 失注)",
      "ＲＮＢ": "string",
      "ＩＴＶ": "string",
      "ＥＢＣ": "string",
      "ｅａｔ": "string",
      "メモ": "string"
    }
  ]
}
If a field is not found in the email, leave it as an empty string "".

CRITICAL RULES:
1. MULTIPLE MONTHS: If the estimate or project spans multiple months, split it into multiple objects within the "data" array (one object per month). For each split row, increment the "開始月" (Start Month) sequentially (e.g., 4月, 5月, 6月).
2. BACK-END FIGURES (裏数字): Columns ＲＮＢ, ＩＴＶ, ＥＢＣ, and ｅａｔ must ONLY be filled if the email contains actual back-end figures or revenue numbers. If it is a normal estimate email without back-end figures, leave these 4 fields completely empty "".
3. MANUAL ENTRY FIELDS: Columns 社内担当, 確度, and メモ will be entered manually by the user. You MUST ALWAYS leave these 3 fields as completely empty strings "", regardless of the email content.
  `;

  let attachmentText = '';
  let inlineData: any = null;

  if (file) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;
    const fileName = file.name || '';

    // Excel or CSV handling
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'text/csv' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.csv')
    ) {
      try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        workbook.SheetNames.forEach(sheetName => {
          const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
          attachmentText += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
        });
      } catch (err) {
        console.error('Failed to parse Excel/CSV:', err);
      }
    } else if (
      mimeType === 'application/pdf' ||
      mimeType.startsWith('image/')
    ) {
      // PDF or Image handling for Gemini inlineData
      inlineData = {
        mimeType: mimeType || 'application/pdf',
        data: buffer.toString('base64')
      };
    } else {
      // Try to read as plain text
      try {
        const textContent = buffer.toString('utf-8');
        if (textContent && textContent.length < 50000) { // arbitrary limit to prevent blowing up the prompt
          attachmentText += `\n--- Text Attachment: ${fileName} ---\n${textContent}\n`;
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  const finalPrompt = prompt.replace('{ATTACHMENT_TEXT_PLACEHOLDER}', attachmentText ? `\nAttachment Content:\n${attachmentText}` : '');

  const parts: any[] = [{ text: finalPrompt }];
  if (inlineData) {
    parts.push({ inlineData });
  }

  // We use fetch instead of the SDK to avoid SDK parsing bugs with certain valid API keys.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error('AI Parsing Error:', error);
    throw error;
  }
}
