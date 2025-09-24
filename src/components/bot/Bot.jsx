import React, {  useState } from "react";
import { ImageUpload } from "./ImageUpload";
import "./Bot.css";

export const Bot = () => {
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(file instanceof File)) return;

    setResponse("");
    setLoading(true);

    try {
      const fileToDataUrl = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const imageUrl = await fileToDataUrl(file);

      const payload = {
        model: "Qwen/Qwen2.5-VL-7B-Instruct",
        messages: [
          {
            role: "system",
            content:
              "Responde siempre en español, de forma clara y concisa, y usa emojis.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              {
                type: "text",
                text:
                  instruction ||
                  "Analiza la imagen y responde de forma clara en español. Si necesito preguntar algo más, lo haré después.",
              },
            ],
          },
        ],
        stream: false,
      };

      const res = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      setResponse(data?.choices?.[0]?.message?.content ?? JSON.stringify(data));
    } catch (err) {
      console.log("Error con la IA multimodal", err);
    }

    setLoading(false);
  };

  return (
    <div className="bot">
      <header className="header">
        <h1>Asistente mejIA</h1>
        <p>Sube una imagen e indica lo que quieres que analice </p>
      </header>
      <form onSubmit={handleSubmit} className="form">
        <textarea
          className="textarea"
          placeholder="Escribe algo..."
          value={instruction}
          onChange={(e) => {
            setInstruction(e.target.value);
          }}
        >
          {instruction}
        </textarea>
        <ImageUpload file={file} setFile={setFile} />
        <button disabled={!file} className="button" type="submit">
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
      <br />
    </div>
  );
};
