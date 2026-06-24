require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(data.models.map(m => m.name).filter(n => n.includes('flash')));
}

listModels();
