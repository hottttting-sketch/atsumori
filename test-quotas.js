require('dotenv').config({ path: '.env.local' });

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = [
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-3.5-flash',
    'gemini-2.5-flash-lite'
  ];

  for (const model of models) {
    console.log(`Testing model: ${model}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello, testing 123" }] }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Success with ${model}`);
      } else {
        console.log(`❌ Failed with ${model}:`, JSON.stringify(data.error));
      }
    } catch (e) {
      console.log(`Error testing ${model}:`, e);
    }
  }
}

testModels();
