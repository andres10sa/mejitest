// import React, {  useState } from "react";
// import { ImageUpload } from "./ImageUpload";
// import "./Bot.css";

// export const Bot = () => {
//   const [file, setFile] = useState(null);
//   const [instruction, setInstruction] = useState("");
//   const [response, setResponse] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!(file instanceof File)) return;

//     setResponse("");
//     setLoading(true);

//     try {
//       const fileToDataUrl = (file) =>
//         new Promise((resolve, reject) => {
//           const reader = new FileReader();
//           reader.onload = () => resolve(reader.result);
//           reader.onerror = reject;
//           reader.readAsDataURL(file);
//         });

//       const imageUrl = await fileToDataUrl(file);

//       const payload = {
//         model: "Qwen/Qwen2.5-VL-7B-Instruct",
//         messages: [
//           {
//             role: "system",
//             content:
//               "Responde siempre en español, de forma clara y concisa, y usa emojis.",
//           },
//           {
//             role: "user",
//             content: [
//               { type: "image_url", image_url: { url: imageUrl } },
//               {
//                 type: "text",
//                 text:
//                   instruction ||
//                   "Analiza la imagen y responde de forma clara en español. Si necesito preguntar algo más, lo haré después.",
//               },
//             ],
//           },
//         ],
//         stream: false,
//       };

//       const res = await fetch(
//         "https://router.huggingface.co/v1/chat/completions",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
//           },
//           body: JSON.stringify(payload),
//         }
//       );

//       const data = await res.json();
//       console.log("LA DAT", data);
//       setResponse(data?.choices?.[0]?.message?.content ?? JSON.stringify(data));
//     } catch (err) {
//       console.log("Error con la IA multimodal", err);
//     }

//     setLoading(false);
//   };

//   return (
//     <div className="bot">
//       <header className="header">
//         <h1>Asistente mejIA</h1>
//         <p>Sube una imagen e indica lo que quieres que analice </p>
//       </header>
//       <form onSubmit={handleSubmit} className="form">
//         <textarea
//           className="textarea"
//           placeholder="Escribe algo..."
//           value={instruction}
//           onChange={(e) => {
//             setInstruction(e.target.value);
//           }}
//         >
//           {instruction}
//         </textarea>
//         <ImageUpload file={file} setFile={setFile} />
//         <button disabled={!file} className="button" type="submit">
//           Analizar
//         </button>
//       </form>
//       {loading && (
//         <div className="spinner-container">
//           <div className="spinner"></div>
//           <p>Pensando como Harold.....</p>
//         </div>
//       )}
//       <br />
//       {response && (
//         <div className="response-box">
//           <h2>Respuesta de mejIA:</h2>
//           <p>{response}</p>
//         </div>
//       )}
//       <br />
//     </div>
//   );
// };
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
      const resizeImageFile = (inputFile, maxWidth = 1200, quality = 0.75) =>
        new Promise((resolve, reject) => {
          if (!inputFile || !inputFile.type.startsWith("image/"))
            return reject(new Error("no image"));
          const img = new Image();
          img.onerror = () => reject(new Error("load error"));
          img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
              (blob) => {
                if (!blob) return reject(new Error("no blob"));
                const outFile = new File(
                  [blob],
                  inputFile.name.replace(/\.\w+$/, ".jpg"),
                  { type: "image/jpeg" }
                );
                resolve(outFile);
              },
              "image/jpeg",
              quality
            );
          };
          const url = URL.createObjectURL(inputFile);
          img.src = url;
        });

      const fileToDataUrl = (f) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(f);
        });

      const MAX_ALLOWED_MB = 5;
      const maxBytes = MAX_ALLOWED_MB * 1024 * 1024;

      let fileToSend = file;
      if (file.size > 700 * 1024) {
        try {
          const resized = await resizeImageFile(file, 1200, 0.75);
          if (resized.size < file.size) fileToSend = resized;
        } catch (err) {
          fileToSend = file;
        }
      }

      if (fileToSend.size > maxBytes) {
        setLoading(false);
        setResponse(
          `Imagen demasiado grande (${(fileToSend.size / 1024 / 1024).toFixed(
            2
          )} MB). Reduzca el tamaño.`
        );
        return;
      }

      const imageUrl = await fileToDataUrl(fileToSend);

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
      setResponse("Error: " + (err.message || "falló la petición"));
    }

    setLoading(false);
  };

  return (
    <div className="bot">
      <header className="header">
        <h1>Asistente mejIA</h1>
        <p>Sube una imagen e indica lo que quieres que analice. </p>
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
