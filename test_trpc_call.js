import superjson from 'superjson';

async function test() {
  try {
    const input = {
      "0": {
        "occasion": "interview",
        "season": "spring"
      }
    };
    
    // Superjson encodes this to:
    const stringified = superjson.stringify(input);
    
    // TRPC sends { json: { "0": { occasion: "interview", season: "spring" } } }
    // Wait, superjson.stringify returns { json: ..., meta: ... }
    
    const url = 'http://localhost:3000/api/trpc/ai.getOccasionStyling?batch=1&input=' + encodeURIComponent(stringified);
    
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
