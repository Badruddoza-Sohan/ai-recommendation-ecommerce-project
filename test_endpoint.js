async function test() {
  try {
    const inputStr = JSON.stringify({
      "0": {
        "json": {
          "occasion": "interview",
          "season": "spring"
        }
      }
    });
    
    const url = 'http://localhost:3000/api/trpc/ai.getOccasionStyling?batch=1&input=' + encodeURIComponent(inputStr);
    
    console.log("Querying:", url);
    const res = await fetch(url);
    const text = await res.text();
    console.log("Response HTTP:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
