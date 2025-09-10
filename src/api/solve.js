// api/solve.js  (Vercel)
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "falta prompt" });
  
    const model = "mistralai/Mistral-7B-Instruct-v0.2"; // ejemplo; cambie si quiere otro modelo
    try {
      const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 300 } })
      });
      const data = await r.json();
      const text = Array.isArray(data) ? (data[0]?.generated_text || JSON.stringify(data)) : (data?.generated_text || data?.error || JSON.stringify(data));
      res.status(200).json({ text });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  }
  