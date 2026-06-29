import * as xlsx from 'xlsx';

export async function parseEmailContent(subject: string, body: string, files: File[] = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const prompt = `
You are an AI assistant that extracts structured data from business emails.
Based on the following email subject, body, and attachments, extract the relevant fields to populate a database.

Determine the specific "targetSheet" for EACH extracted item, which must be one of: "電通見積", "博報堂見積", "アザー見積", or "プレ".
If the item is an estimate related to Dentsu, choose "電通見積". For Hakuhodo, choose "博報堂見積". For other agencies, choose "アザー見積". If the item relates to pre-sales, leads, or inquiries (e.g., contains words like "プレ", "相談", "問い合わせ"), choose "プレ".

Email Subject: ${subject}
Email Body: ${body}
{ATTACHMENT_NAME_PLACEHOLDER}
{ATTACHMENT_TEXT_PLACEHOLDER}

Return a JSON object with the following schema:
{
  "data": [
    {
      "ソースファイル名": "string (The exact name of the file this data came from)",
      "targetSheet": "string (one of: 電通見積, 博報堂見積, アザー見積, プレ)",
      "記載日": "string (YYYY/MM/DD)",
      "代理店": "string",
      "広告主": "string",
      "契約名": "string",
      "開始月": "string (YYYY年M月 or YYYY年MM月. DO NOT use zero-padding for months 1-9. e.g. 2024年4月)",
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
If a field is not found, leave it as an empty string "".

CRITICAL RULES FOR MULTIPLE ATTACHMENTS (ISOLATION):
There are multiple attached files. You MUST treat each file as completely separate. Do NOT mix information between them. For example, do not assign the Advertiser from File A to the Contract of File B. Analyze each file independently and output them as separate objects in the "data" array.
For EACH object you extract, you MUST fill the "ソースファイル名" field with the exact file name the data came from.
When extracting "代理店" (Agency Name) and determining "targetSheet", you MUST ONLY look at the text between "--- START OF FILE: [ソースファイル名] ---" and "--- END OF FILE: [ソースファイル名] ---". If the agency name is not found in that specific section, you MUST set "代理店" to "" and "targetSheet" to "アザー見積". NEVER copy the agency from the Email Body or a different file!

CRITICAL RULES:
1. MULTIPLE MONTHS: If the estimate or project spans multiple months, split it into multiple objects within the "data" array (one object per month). For each split row, increment the "開始月" (Start Month) sequentially (e.g., 2024年4月, 2024年5月... 2024年10月). DO NOT use zero-padding for months 1-9.
2. BACK-END FIGURES (裏数字): Columns ＲＮＢ, ＩＴＶ, ＥＢＣ, and ｅａｔ must ONLY be filled if the email contains actual back-end figures or revenue numbers. If it is a normal estimate email without back-end figures, leave these 4 fields completely empty "".
3. MANUAL ENTRY FIELDS: Columns 社内担当, 確度, and メモ will be entered manually by the user. You MUST ALWAYS leave these 3 fields as completely empty strings "", regardless of the email content.
4. AGENCY NAME (代理店) & TARGET SHEET: You MUST extract the advertising agency (e.g., 電通, 博報堂, etc.) for EACH file independently. If a file does not explicitly contain the agency name, DO NOT copy the agency name from a different file. If you cannot confidently determine the agency for a specific file, leave "代理店" blank "" and set "targetSheet" to "アザー見積" (Other). If it's Dentsu, targetSheet is "電通見積". If Hakuhodo, "博報堂見積".
5. STRICT DEDUPLICATION: If the exact same project is mentioned multiple times with slight text variations (e.g., '(株)ニチレイフーズ' vs 'ニチレイフーズ', or '26年8-9月_...' vs '２６年８ー９月'), you MUST merge them into a single project. DO NOT create separate rows for these variations. You should only create multiple rows for the same project if they are for DIFFERENT MONTHS (as per rule 1).
  `;

  let attachmentText = '';
  let attachmentName = '';
  let inlineDatas: any[] = [];

  for (const file of files) {
    if (!file) continue;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;
    const fileName = file.name || '';
    attachmentName += (attachmentName ? ', ' : '') + fileName;

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
          attachmentText += `\n--- START OF FILE: ${fileName}, Sheet: ${sheetName} ---\n${csv}\n--- END OF FILE: ${fileName} ---\n`;
        });
      } catch (err) {
        console.error('Failed to parse Excel/CSV:', err);
      }
    } else if (
      mimeType === 'application/pdf' ||
      mimeType.startsWith('image/')
    ) {
      // PDF or Image handling for Gemini inlineData
      inlineDatas.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: buffer.toString('base64')
        }
      });
    } else {
      // Try to read as plain text
      try {
        const textContent = buffer.toString('utf-8');
        if (textContent && textContent.length < 50000) { // arbitrary limit to prevent blowing up the prompt
          attachmentText += `\n--- START OF FILE: ${fileName} ---\n${textContent}\n--- END OF FILE: ${fileName} ---\n`;
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  const finalPrompt = prompt
    .replace('{ATTACHMENT_NAME_PLACEHOLDER}', attachmentName ? `Attachment File Names: ${attachmentName}` : '')
    .replace('{ATTACHMENT_TEXT_PLACEHOLDER}', attachmentText ? `\nAttachment Content:\n${attachmentText}` : '');

  const parts: any[] = [{ text: finalPrompt }, ...inlineDatas];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const startTime = Date.now();
  let retries = 1; // Retry exactly once for 503/429 errors to avoid Vercel timeouts
  let lastError = null;

  while (retries >= 0) {
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
    } catch (error: any) {
      console.error('AI Parsing Error on attempt:', error);
      lastError = error;
      
      // If it's a 503 (High Demand) or 429 (Rate Limit), and we have retries left, wait and retry
      if (retries > 0 && error.message && (error.message.includes('503') || error.message.includes('429'))) {
        const elapsed = Date.now() - startTime;
        if (elapsed > 40000) {
          console.log(`API overloaded but ${elapsed}ms elapsed. Aborting retry to prevent 60s timeout.`);
          throw error;
        }
        console.log(`API overloaded (503/429). Retrying in 5 seconds... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        retries--;
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}
