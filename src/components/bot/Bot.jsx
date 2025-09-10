import React, { useState } from "react";
import "./Bot.css";

// pensando como harold
//

export const Bot = () => {
  const [prompt, setPrompt] = useState("");
  const [response,setResponse]=useState("")
  const [loading,setLoading]=useState(false)

  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt) return;

    setResponse('')
    setLoading(true)

    try {
      const res = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
          },
          body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-V3-0324",
            messages: [
              {
                role: "system",
                content:
                  "Responde siempre en español de manera clara y sencilla y concisa, es decir no es necesario extenderse mucho. Teniendo en cuenta que estamos en Colombia. Siempre respode con emojis",
              },
              { role: "user", content: prompt },
            ],
            stream: false,
          }),
        }
      );
      const data = await res.json();
       setResponse(data?.choices[0]?.message?.content)
    } catch (err) {
      console.log("Error al conectar con la IA", err);
    }
    setLoading(false)

  };
console.log("response",response)
  return (
    <div className="bot">
      <header className="header">
        <h1>Asistente mejIA</h1>
        <p>Describe tu problema y recibe un plan de acción</p>
      </header>

      <form onSubmit={handleSubmit} className="form">
        <textarea
          className="textarea"
          placeholder="Ejemplo: tengo muchas deudas con tarjeta..."
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
          }}
        >
          {prompt}
        </textarea>
        <button className="button" type="submit">
          Analizar
        </button>
      </form>
      {loading && (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p>Pensando como Harold.....</p>
        </div>
      )}
      <br />
      {response && (
        <div className="response-box">
          <h2>Respuesta de mejIA:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};
