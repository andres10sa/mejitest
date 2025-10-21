// import React, { useState } from "react";
// import { ImageUpload } from "./ImageUpload";
// import { Audio } from "./Audio";
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
//       const maxBytes = 700 * 1024; // objetivo seguro para Hugging Face router (ajuste si necesita)
//       const toImage = (file) =>
//         new Promise((resolve, reject) => {
//           const img = new Image();
//           img.onerror = () => reject(new Error("load error"));
//           img.onload = () => resolve(img);
//           img.src = URL.createObjectURL(file);
//         });

//       const fileFromBlob = (blob, name) =>
//         new File([blob], name.replace(/\.\w+$/, ".jpg"), {
//           type: "image/jpeg",
//         });

//       const canvasBlob = (img, width, height, quality) =>
//         new Promise((resolve) => {
//           const canvas = document.createElement("canvas");
//           canvas.width = width;
//           canvas.height = height;
//           const ctx = canvas.getContext("2d");
//           ctx.drawImage(img, 0, 0, width, height);
//           canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
//         });

//       const compressUntilUnder = async (inputFile, targetBytes) => {
//         let img = await toImage(inputFile);
//         let w = img.width;
//         let h = img.height;
//         let quality = 0.85;
//         let scale = Math.min(1, 1200 / w);
//         w = Math.round(w * scale);
//         h = Math.round(h * scale);

//         for (let i = 0; i < 8; i++) {
//           const blob = await canvasBlob(img, w, h, quality);
//           if (blob && blob.size <= targetBytes)
//             return fileFromBlob(blob, inputFile.name);
//           // reducir calidad y tamaño progresivamente
//           quality = Math.max(0.35, quality - 0.12);
//           w = Math.round(w * 0.85);
//           h = Math.round(h * 0.85);
//         }
//         // último intento: máxima compresión con tamaño pequeño
//         const finalBlob = await canvasBlob(
//           img,
//           800,
//           Math.round((800 / img.width) * img.height),
//           0.35
//         );
//         return fileFromBlob(finalBlob, inputFile.name);
//       };

//       let fileToSend = file;
//       if (file.size > maxBytes) {
//         try {
//           fileToSend = await compressUntilUnder(file, maxBytes);
//         } catch (err) {
//           fileToSend = file;
//         }
//       }

//       if (fileToSend.size > 2 * maxBytes) {
//         setLoading(false);
//         setResponse(
//           `Imagen demasiado grande aun tras compresión (${(
//             fileToSend.size /
//             1024 /
//             1024
//           ).toFixed(2)} MB). Elija otra imagen o reduzca calidad en cámara.`
//         );
//         return;
//       }

//       const fileToDataUrl = (f) =>
//         new Promise((resolve, reject) => {
//           const reader = new FileReader();
//           reader.onerror = reject;
//           reader.onload = () => resolve(reader.result);
//           reader.readAsDataURL(f);
//         });

//       const imageUrl = await fileToDataUrl(fileToSend);

//       const payload = {
//         model: "Qwen/Qwen2.5-VL-7B-Instruct",
//         messages: [
//           {
//             role: "system",
//             content: "Responde siempre en español, de forma clara y concisa.",
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

//       if (!res.ok) {
//         const errText = await res.text();
//         throw new Error(`${res.status} ${errText}`);
//       }

//       const data = await res.json();
//       setResponse(data?.choices?.[0]?.message?.content ?? JSON.stringify(data));
//     } catch (err) {
//       console.log("Error con la IA multimodal", err);
//       setResponse("Error: " + (err.message || "falló la petición"));
//     } finally {
//       setLoading(false);
//     }
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
//           {/* <h2>Respuesta de mejIA:</h2>
//           <p>{response}</p> */}
//           <Audio text={response} />
//         </div>
//       )}
//       <br />
//     </div>
//   );
// };
import React, { useRef, useState, useEffect } from "react";
import { ImageUpload } from "./ImageUpload";
import { Audio } from "./Audio";
import "./Bot.css";

export const Bot = () => {
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const liveRef = useRef(null); // región aria-live para anuncios cortos
  const responseRef = useRef(null); // foco cuando llega la respuesta
  const submitBtnRef = useRef(null);

  useEffect(() => {
    // precargar voces (si Audio usa SpeechSynthesis internamente)
    try {
      window.speechSynthesis && window.speechSynthesis.getVoices();
    } catch (e) {}
  }, []);

  // Ctrl/Cmd + Enter para enviar (Enter normal sigue insertando nueva línea)
  const handleTextareaKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (submitBtnRef.current && !submitBtnRef.current.disabled) {
        submitBtnRef.current.focus();
        submitBtnRef.current.click();
      }
    }
  };

  // pequeña función para actualizar aria-live
  const announce = (msg) => {
    try {
      if (liveRef.current) {
        liveRef.current.textContent = msg;
      }
    } catch {}
  };

  // --- Copié aquí la lógica original tal cual, sólo añadí announce/focus ---
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
      if (blob && blob.size <= targetBytes) return fileFromBlob(blob, inputFile.name);
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

  const fileToDataUrl = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(f);
    });

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!(file instanceof File)) {
      announce("No hay imagen seleccionada. Por favor suba una imagen.");
      return;
    }

    setResponse("");
    setLoading(true);
    announce("Enviando imagen a la IA. Espere por favor.");

    try {
      const maxBytes = 700 * 1024;
      let fileToSend = file;
      if (file.size > maxBytes) {
        try {
          fileToSend = await compressUntilUnder(file, maxBytes);
        } catch (err) {
          fileToSend = file;
        }
      }

      if (fileToSend.size > 2 * maxBytes) {
        const tooBigMsg = `Imagen demasiado grande aun tras compresión (${(
          fileToSend.size /
          1024 /
          1024
        ).toFixed(2)} MB). Elija otra imagen o reduzca calidad en cámara.`;
        setLoading(false);
        setResponse(tooBigMsg);
        announce(tooBigMsg);
        return;
      }

      const imageUrl = await fileToDataUrl(fileToSend);

      const payload = {
        model: "Qwen/Qwen2.5-VL-7B-Instruct",
        messages: [
          {
            role: "system",
            content: "Responde siempre en español, de forma clara y concisa.",
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

      const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`${res.status} ${errText}`);
      }

      const data = await res.json();
      const textResp = data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
      setResponse(textResp);

      // accessibility: foco al contenedor de respuesta y anuncio breve
      setTimeout(() => {
        try {
          if (responseRef.current) responseRef.current.focus();
        } catch {}
        announce("Respuesta recibida.");
      }, 80);
    } catch (err) {
      console.log("Error con la IA multimodal", err);
      const errMsg = "Error: " + (err.message || "falló la petición");
      setResponse(errMsg);
      announce(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bot" role="application" aria-label="Asistente mejIA">
      <header className="header" role="banner">
        <h1>Asistente mejIA</h1>
        <p>Sube una imagen e indica lo que quieres que analice</p>
      </header>

      <form onSubmit={handleSubmit} className="form" role="form" aria-label="Formulario de análisis de imagen">
        {/* <textarea
          id="instruction"
          className="textarea"
          placeholder="Escribe algo..."
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleTextareaKey}
          aria-label="Instrucción para la IA (opcional). Presiona Control+Enter para enviar."
        >
          {instruction}
        </textarea> */}

        <div role="group" aria-label="Control de subida de imagen y enviar" className="iu-controls">
          {/* delegamos en tu ImageUpload; asegúrate de que ImageUpload tenga tabIndex y aria props si es personalizado */}
          <ImageUpload file={file} setFile={setFile} aria-label="Subir imagen" />
          <button
            ref={submitBtnRef}
            disabled={!file}
            className="button"
            type="submit"
            aria-label={loading ? "Enviando a la IA" : "Analizar imagen"}
          >
            {loading ? "Analizando..." : "Analizar"}
          </button>
        </div>
      </form>

      {/* region viva para lectores de pantalla (visually hidden but announced) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        ref={liveRef}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          border: 0,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      />

      {loading && (
        <div className="spinner-container" aria-hidden="true">
          <div className="spinner"></div>
          <p>Pensando como Harold.....</p>
        </div>
      )}

      <div
        className="response-box"
        role="region"
        aria-label="Respuesta de la IA"
        tabIndex={-1}
        ref={responseRef}
      >
        {response ? (
          <>
            {/* visible text (sighted) */}
            {/* <p style={{ whiteSpace: "pre-line" }}>{response}</p> */}

            {/* Audio component (tu implementación original) */}
            <Audio text={response} />
          </>
        ) : null}
      </div>
    </div>
  );
};
