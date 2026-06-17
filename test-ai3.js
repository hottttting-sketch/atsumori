const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const apiKey = "RANDOM_STRING_THAT_IS_NOT_A_VALID_KEY_1234567890";
  console.log("Testing random key:", apiKey);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const result = await model.generateContent("Hello!");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

testGemini();
