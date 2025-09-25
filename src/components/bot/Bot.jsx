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
      const maxBytes = 700 * 1024; // objetivo seguro para Hugging Face router (ajuste si necesita)
      const toImage = (file) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onerror = () => reject(new Error("load error"));
          img.onload = () => resolve(img);
          img.src = URL.createObjectURL(file);
        });

      const fileFromBlob = (blob, name) =>
        new File([blob], name.replace(/\.\w+$/, ".jpg"), {
          type: "image/jpeg",
        });

      const canvasBlob = (img, width, height, quality) =>
        new Promise((resolve) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
        });

      const compressUntilUnder = async (inputFile, targetBytes) => {
        let img = await toImage(inputFile);
        let w = img.width;
        let h = img.height;
        let quality = 0.85;
        let scale = Math.min(1, 1200 / w);
        w = Math.round(w * scale);
        h = Math.round(h * scale);

        for (let i = 0; i < 8; i++) {
          const blob = await canvasBlob(img, w, h, quality);
          if (blob && blob.size <= targetBytes)
            return fileFromBlob(blob, inputFile.name);
          // reducir calidad y tamaño progresivamente
          quality = Math.max(0.35, quality - 0.12);
          w = Math.round(w * 0.85);
          h = Math.round(h * 0.85);
        }
        // último intento: máxima compresión con tamaño pequeño
        const finalBlob = await canvasBlob(
          img,
          800,
          Math.round((800 / img.width) * img.height),
          0.35
        );
        return fileFromBlob(finalBlob, inputFile.name);
      };

      let fileToSend = file;
      if (file.size > maxBytes) {
        try {
          fileToSend = await compressUntilUnder(file, maxBytes);
        } catch (err) {
          fileToSend = file;
        }
      }

      if (fileToSend.size > 2 * maxBytes) {
        setLoading(false);
        setResponse(
          `Imagen demasiado grande aun tras compresión (${(
            fileToSend.size /
            1024 /
            1024
          ).toFixed(2)} MB). Elija otra imagen o reduzca calidad en cámara.`
        );
        return;
      }

      const fileToDataUrl = (f) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(f);
        });

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

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${res.status} ${errText}`);
      }

      const data = await res.json();
      setResponse(data?.choices?.[0]?.message?.content ?? JSON.stringify(data));
    } catch (err) {
      console.log("Error con la IA multimodal", err);
      setResponse("Error: " + (err.message || "falló la petición"));
    } finally {
      setLoading(false);
    }
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
