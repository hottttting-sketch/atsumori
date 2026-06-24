import * as xlsx from 'xlsx';

export async function parseEmailContent(subject: string, body: string, files: File[] = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const prompt = `
You are an AI assistant that extracts structured data from business emails.
Based on the following email subject, body, and attachments, extract the relevant fields to populate a database.
For each extracted item (e.g. for each attached estimate file), determine its specific "targetSheet" which must be one of: "電通見積", "博報堂見積", "アザー見積", or "プレ".
If the item is an estimate related to Dentsu, choose "電通見積". For Hakuhodo, choose "博報堂見積". For other agencies, choose "アザー見積". If the item relates to pre-sales, leads, or inquiries (e.g., contains words like "プレ", "相談", "問い合わせ"), choose "プレ".

Email Subject: ${subject}
Email Body: ${body}
{ATTACHMENT_NAME_PLACEHOLDER}
{ATTACHMENT_TEXT_PLACEHOLDER}

Return a JSON object with the following schema:
{
  "data": [
    {
      "targetSheet": "string (one of: 電通見積, 博報堂見積, アザー見積, プレ)",
      "記載日": "string (YYYY/MM/DD)",
      "代理店": "string",
      "広告主": "string",
      "契約名": "string",
      "開始月": "string (YYYY年MM月, e.g. 2024年04月)",
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
1. MULTIPLE MONTHS: If the estimate or project spans multiple months, split it into multiple objects within the "data" array (one object per month). For each split row, increment the "開始月" (Start Month) sequentially using the YYYY年MM月 format (e.g., 2024年04月, 2024年05月, 2024年06月).
2. BACK-END FIGURES (裏数字): Columns ＲＮＢ, ＩＴＶ, ＥＢＣ, and ｅａｔ must ONLY be filled if the email contains actual back-end figures or revenue numbers. If it is a normal estimate email without back-end figures, leave these 4 fields completely empty "".
3. MANUAL ENTRY FIELDS: Columns 社内担当, 確度, and メモ will be entered manually by the user. You MUST ALWAYS leave these 3 fields as completely empty strings "", regardless of the email content.
4. AGENCY NAME (代理店): You MUST ALWAYS extract the name of the advertising agency (e.g., 電通, 博報堂, ADK, サイバーエージェント, etc.) from the email body, attachment content, OR the attachment file name, and put it in the "代理店" field. If the targetSheet is "アザー見積", it is extremely important to identify and output the specific agency name rather than leaving it blank.
5. STRICT DEDUPLICATION: If the same estimate or project is mentioned multiple times with slight text variations (e.g., '(株)ニチレイフーズ' vs 'ニチレイフーズ', or '26年8-9月_...' vs '２６年８ー９月'), you MUST merge them into a single project. DO NOT create separate rows for these variations. You should only create multiple rows for the same project if they are for DIFFERENT MONTHS (as per rule 1). Otherwise, strictly output ONE row per project.
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
          attachmentText += `\n--- File: ${fileName}, Sheet: ${sheetName} ---\n${csv}\n`;
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
          attachmentText += `\n--- Text Attachment: ${fileName} ---\n${textContent}\n`;
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
