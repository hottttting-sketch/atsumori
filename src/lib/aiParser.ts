export async function parseEmailContent(subject: string, body: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const prompt = `
You are an AI assistant that extracts structured data from business emails.
Based on the following email subject and body, extract the relevant fields to populate a database.
Also, determine the "targetSheet" which must be one of: "電通見積", "博報堂見積", "アザー見積", or "プレ".
If it's an estimate related to Dentsu, choose "電通見積". For Hakuhodo, choose "博報堂見積". For other agencies, choose "アザー見積". If it's pre-sales or lead info, choose "プレ".

Email Subject: ${subject}
Email Body: ${body}

Return a JSON object with the following schema:
{
  "targetSheet": "string",
  "data": {
    "記載日": "string (YYYY/MM/DD)",
    "広告主": "string",
    "契約名": "string",
    "開始月": "string",
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
}
If a field is not found in the email, leave it as an empty string "".
  `;

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
            parts: [{ text: prompt }]
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
