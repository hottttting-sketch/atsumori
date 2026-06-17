const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const apiKey = "AQ.Ab8RN6Ii2JOEPnGDcRJodIqp2KF7ROudZJe8QQrDV8rzoRpeQg";
  console.log("Testing list models with key:", apiKey);
  
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

testGemini();
