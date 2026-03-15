const GEMINI_API_KEY = "AIzaSyBmVjxP_kdkuu024CPxjQopxkGb2VX7Htw";

async function listModels() {
  try {
    console.log("Fetching models...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const result = await fetch(url);
    if (!result.ok) {
      const text = await result.text();
      console.error(`HTTP error! status: ${result.status}, body: ${text}`);
      return;
    }
    const data = await result.json();
    console.log("Models available:");
    (data.models || []).forEach((m) =>
      console.log(` - ${m.name} (${m.displayName})`),
    );
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
