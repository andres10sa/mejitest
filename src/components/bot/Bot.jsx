// import React, { useRef, useState, useEffect } from "react";
// import { ImageUpload } from "./ImageUpload";
// import { Audio } from "./Audio";
// import "./Bot.css";

// export const Bot = () => {
//   const [file, setFile] = useState(null);
//   const [instruction, setInstruction] = useState("");
//   const [response, setResponse] = useState("");
//   const [loading, setLoading] = useState(false);

//   const liveRef = useRef(null); // región aria-live para anuncios cortos
//   const responseRef = useRef(null); // foco cuando llega la respuesta
//   const submitBtnRef = useRef(null);
//   const audioCtxRef = useRef(null);

//   useEffect(() => {
//     try {
//       window.speechSynthesis && window.speechSynthesis.getVoices();
//     } catch (e) {}
//   }, []);

//   const handleTextareaKey = (e) => {
//     if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
//       e.preventDefault();
//       if (submitBtnRef.current && !submitBtnRef.current.disabled) {
//         submitBtnRef.current.focus();
//         submitBtnRef.current.click();
//       }
//     }
//   };

//   const announce = (msg) => {
//     try {
//       if (liveRef.current) {
//         liveRef.current.textContent = msg;
//       }
//     } catch {}
//   };

//   // --------- NUEVO: intentar desbloquear audio en el gesto de usuario ----------
//   const ensureAudioUnlocked = () => {
//     // 1) resume AudioContext (Web Audio)
//     try {
//       const AC = window.AudioContext || window.webkitAudioContext;
//       if (AC) {
//         if (!audioCtxRef.current) audioCtxRef.current = new AC();
//         // resume puede devolver una promesa; la llamamos sin await para que ocurra dentro del gesto
//         audioCtxRef.current.resume && audioCtxRef.current.resume().catch(() => {});
//       }
//     } catch (e) {
//       // ignore
//     }

//     // 2) speak breve y silencioso para "despertar" speechSynthesis (muchos navegadores lo aceptan dentro del gesto)
//     try {
//       const voices = window.speechSynthesis.getVoices() || [];
//       const pref =
//         voices.find((x) => x.lang === "es-CO") ||
//         voices.find((x) => x.lang === "es-MX") ||
//         voices.find((x) => x.lang && x.lang.startsWith("es")) ||
//         voices[0];
//       const u = new SpeechSynthesisUtterance("\u200B"); // zero-width space — apenas audible
//       u.volume = 0; // volumen 0 para intentar evitar sonido
//       if (pref) u.voice = pref;
//       u.lang = pref?.lang || "es-MX";
//       window.speechSynthesis.cancel();
//       window.speechSynthesis.speak(u);
//     } catch (e) {
//       // ignore
//     }
//   };
//   // -------------------------------------------------------------------------

//   // --- Copié aquí la lógica original tal cual, sólo añadí ensureAudioUnlocked() ---
//   const toImage = (file) =>
//     new Promise((resolve, reject) => {
//       const img = new Image();
//       img.onerror = () => reject(new Error("load error"));
//       img.onload = () => resolve(img);
//       img.src = URL.createObjectURL(file);
//     });

//   const fileFromBlob = (blob, name) =>
//     new File([blob], name.replace(/\.\w+$/, ".jpg"), {
//       type: "image/jpeg",
//     });

//   const canvasBlob = (img, width, height, quality) =>
//     new Promise((resolve) => {
//       const canvas = document.createElement("canvas");
//       canvas.width = width;
//       canvas.height = height;
//       const ctx = canvas.getContext("2d");
//       ctx.drawImage(img, 0, 0, width, height);
//       canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
//     });

//   const compressUntilUnder = async (inputFile, targetBytes) => {
//     let img = await toImage(inputFile);
//     let w = img.width;
//     let h = img.height;
//     let quality = 0.85;
//     let scale = Math.min(1, 1200 / w);
//     w = Math.round(w * scale);
//     h = Math.round(h * scale);

//     for (let i = 0; i < 8; i++) {
//       const blob = await canvasBlob(img, w, h, quality);
//       if (blob && blob.size <= targetBytes) return fileFromBlob(blob, inputFile.name);
//       quality = Math.max(0.35, quality - 0.12);
//       w = Math.round(w * 0.85);
//       h = Math.round(h * 0.85);
//     }
//     const finalBlob = await canvasBlob(
//       img,
//       800,
//       Math.round((800 / img.width) * img.height),
//       0.35
//     );
//     return fileFromBlob(finalBlob, inputFile.name);
//   };

//   const fileToDataUrl = (f) =>
//     new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onerror = reject;
//       reader.onload = () => resolve(reader.result);
//       reader.readAsDataURL(f);
//     });

//   const handleSubmit = async (e) => {
//     e && e.preventDefault();

//     // <-- aquí: dentro del gesto de usuario -->
//     ensureAudioUnlocked();

//     if (!(file instanceof File)) {
//       announce("No hay imagen seleccionada. Por favor suba una imagen.");
//       return;
//     }

//     setResponse("");
//     setLoading(true);
//     announce("Enviando imagen a la IA. Espere por favor.");

//     try {
//       const maxBytes = 700 * 1024;
//       let fileToSend = file;
//       if (file.size > maxBytes) {
//         try {
//           fileToSend = await compressUntilUnder(file, maxBytes);
//         } catch (err) {
//           fileToSend = file;
//         }
//       }

//       if (fileToSend.size > 2 * maxBytes) {
//         const tooBigMsg = `Imagen demasiado grande aun tras compresión (${(
//           fileToSend.size /
//           1024 /
//           1024
//         ).toFixed(2)} MB). Elija otra imagen o reduzca calidad en cámara.`;
//         setLoading(false);
//         setResponse(tooBigMsg);
//         announce(tooBigMsg);
//         return;
//       }

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

//       const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const errText = await res.text().catch(() => "");
//         throw new Error(`${res.status} ${errText}`);
//       }

//       const data = await res.json();
//       const textResp = data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
//       setResponse(textResp);

//       // accessibility: foco al contenedor de respuesta y anuncio breve
//       setTimeout(() => {
//         try {
//           if (responseRef.current) responseRef.current.focus();
//         } catch {}
//         announce("Respuesta recibida.");
//       }, 80);
//     } catch (err) {
//       console.log("Error con la IA multimodal", err);
//       const errMsg = "Error: " + (err.message || "falló la petición");
//       setResponse(errMsg);
//       announce(errMsg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="bot" role="application" aria-label="Asistente mejIA">
//       <header className="header" role="banner">
//         <h1>Asistente mejIAs</h1>
//         <p>Sube una imagen e indica lo que quieres que analice</p>
//       </header>

//       <form
//         onSubmit={handleSubmit}
//         className="form"
//         role="form"
//         aria-label="Formulario de análisis de imagen"
//       >
//         <div
//           role="group"
//           aria-label="Control de subida de imagen y enviar"
//           className="iu-controls"
//         >
//           <ImageUpload
//             file={file}
//             setFile={setFile}
//             aria-label="Subir imagen"
//           />
//           <button
//             ref={submitBtnRef}
//             disabled={!file}
//             className="button"
//             type="submit"
//             aria-label={loading ? "Enviando a la IA" : "Analizar imagen"}
//           >
//             {loading ? "Analizando..." : "Analizar"}
//           </button>
//         </div>
//       </form>

//       <div
//         aria-live="polite"
//         aria-atomic="true"
//         ref={liveRef}
//         style={{
//           position: "absolute",
//           width: 1,
//           height: 1,
//           margin: -1,
//           border: 0,
//           padding: 0,
//           overflow: "hidden",
//           clip: "rect(0 0 0 0)",
//           clipPath: "inset(50%)",
//           whiteSpace: "nowrap",
//         }}
//       />

//       {loading && (
//         <div className="spinner-container" aria-hidden="true">
//           <div className="spinner"></div>
//           <p>Pensando como Harold.....</p>
//         </div>
//       )}

//       <div
//         className="response-box"
//         role="region"
//         aria-label="Respuesta de la IA"
//         tabIndex={-1}
//         ref={responseRef}
//       >
//         {response ? <Audio text={response} /> : null}
//       </div>
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

  const liveRef = useRef(null);
  const responseRef = useRef(null);
  const submitBtnRef = useRef(null);

  useEffect(() => {
    try {
      window.speechSynthesis && window.speechSynthesis.getVoices();
    } catch (e) {}
  }, []);

  const announce = (msg) => {
    try {
      if (liveRef.current) liveRef.current.textContent = msg;
    } catch {}
  };

  const handleTextareaKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (submitBtnRef.current && !submitBtnRef.current.disabled) {
        submitBtnRef.current.focus();
        submitBtnRef.current.click();
      }
    }
  };

  // ------- helpers de compresión robusta (targets progresivos) -------
  const canvasToBlob = (imgBitmap, w, h, quality) =>
    new Promise((res) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(imgBitmap, 0, 0, w, h);
      c.toBlob((b) => res(b), "image/jpeg", quality);
    });

  const fileFromBlob = (blob, origName) => new File([blob], origName.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });

  // calcula bytes reales desde dataURL base64
  const dataUrlBytes = (dataUrl) => {
    const parts = String(dataUrl).split(",");
    if (!parts[1]) return 0;
    const b64 = parts[1];
    return Math.ceil((b64.length * 3) / 4);
  };

  // intenta compresión iterativa con varias configuraciones
  const tryCompressProgressive = async (file, targets = [500 * 1024, 300 * 1024, 150 * 1024]) => {
    // si no hay createImageBitmap (antiguos browsers), devolvemos el archivo original
    try {
      const bitmap = await createImageBitmap(file);
      // combos de dimensiones a intentar (maxDim)
      const dims = [1200, 1000, 800, 600, 480];
      for (let t = 0; t < targets.length; t++) {
        const target = targets[t];
        for (let d = 0; d < dims.length; d++) {
          let maxDim = dims[d];
          const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
          let w = Math.max(200, Math.round(bitmap.width * scale));
          let h = Math.max(200, Math.round(bitmap.height * scale));
          let quality = 0.85;
          // hacer varios pasos de calidad para el mismo dimension
          for (let step = 0; step < 6; step++) {
            const blob = await canvasToBlob(bitmap, w, h, quality);
            if (blob && blob.size <= target) {
              return fileFromBlob(blob, file.name);
            }
            // reducir calidad y tamaño
            quality = Math.max(0.25, quality - 0.15);
            w = Math.max(200, Math.round(w * 0.85));
            h = Math.max(200, Math.round(h * 0.85));
          }
          // si no cumple, probar siguiente dimension (más pequeña)
        }
      }
      // último intento: tamaño pequeño agresivo
      const finalBlob = await canvasToBlob(bitmap, 420, Math.round((420 / bitmap.width) * bitmap.height), 0.25);
      return fileFromBlob(finalBlob, file.name);
    } catch (err) {
      // si falla el procesamiento (e.g. HEIC en algunos browsers), fallback al archivo original
      return file;
    }
  };

  // --------------------------------------------------------------------

  const fileToDataUrl = (f) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onerror = rej;
      reader.onload = () => res(reader.result);
      reader.readAsDataURL(f);
    });

  const handleSubmit = async (e) => {
    e && e.preventDefault();

    if (!(file instanceof File)) {
      announce("No hay imagen seleccionada. Por favor suba una imagen.");
      return;
    }

    // inicio (mantener compatibilidad con tu flujo)
    setResponse("");
    setLoading(true);
    announce("Enviando imagen a la IA. Espere por favor.");

    try {
      // 1) intentar comprimir progresivamente (targets en bytes de archivo, antes de base64).
      // Nota: base64 crece ~33% respecto a bytes del archivo, por eso tenemos targets agresivos.
      const compressed = await tryCompressProgressive(file, [500 * 1024, 300 * 1024, 150 * 1024]);

      // 2) convertir a dataURL y medir tamaño real del base64
      const imageUrl = await fileToDataUrl(compressed);
      const bytes = dataUrlBytes(imageUrl);

      // 3) umbral seguro: si dataURL > 1.2 MB -> probablemente dará 413 en router, mejor avisar
      const SAFE_DATAURL_LIMIT = 1_200 * 1024; // 1.2 MB
      if (bytes > SAFE_DATAURL_LIMIT) {
        const msg =
          "La imagen sigue siendo demasiado grande para enviarla desde este móvil. " +
          "Pruebe con una foto de menor resolución o reduzca la calidad en la cámara.";
        setResponse(msg);
        announce(msg);
        setLoading(false);
        return;
      }

      // 4) construir payload (igual que antes)
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

      // 5) enviar
      const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // si el servidor responde 413 pese a todo, lo informamos y damos alternativas
        if (res.status === 413) {
          const msg =
            "El servidor rechazó la imagen por tamaño (413). Intente usar una imagen más pequeña o suba la imagen a un hosting y pegue el enlace.";
          setResponse(msg);
          announce(msg);
          setLoading(false);
          return;
        }
        const errText = await res.text().catch(() => "");
        throw new Error(`${res.status} ${errText}`);
      }

      const data = await res.json();
      const textResp = data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
      setResponse(textResp);

      // foco + anuncio
      setTimeout(() => {
        try {
          if (responseRef.current) responseRef.current.focus();
        } catch {}
        announce("Respuesta recibida.");
      }, 80);
    } catch (err) {
      console.error("Error envío/compresión:", err);
      const errMsg = "Error: " + (err?.message || "falló la petición");
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

      <form
        onSubmit={handleSubmit}
        className="form"
        role="form"
        aria-label="Formulario de análisis de imagen"
      >
        <div
          role="group"
          aria-label="Control de subida de imagen y enviar"
          className="iu-controls"
        >
          <ImageUpload
            file={file}
            setFile={setFile}
            aria-label="Subir imagen"
          />
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
        {response ? <Audio text={response} /> : null}
        <br />
        {response ? "si hay" : "no hay"}
        <Audio text={response} />
      </div>
    </div>
  );
};
