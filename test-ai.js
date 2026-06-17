async function testWebhook() {
  console.log("Testing Webhook with Gemini API...");
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/inbound-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: "博報堂案件 見積回答",
        text: "お疲れ様です。以下の通り見積回答が来ました。\n・広告主: トヨタ自動車\n・契約名: 春のキャンペーン\n・開始日: 2024/04/01\n・規模: 5000万\n・ステータス: 検討中\n・確度: 確度B\n・メモ: 特急対応が必要かもしれません。\nよろしくお願いいたします。"
      })
    });

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

testWebhook();
