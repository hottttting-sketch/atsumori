async function testRest() {
  const apiKey = "AQ.Ab8RN6Ii2JOEPnGDcRJodIqp2KF7ROudZJe8QQrDV8rzoRpeQg";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [{ text: "Hello, this is a test. Reply with 'OK'." }]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("REST API Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testRest();
