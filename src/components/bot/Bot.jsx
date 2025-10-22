

import React, { useRef, useState, useEffect } from "react";
import { ImageUpload } from "./ImageUpload";
import { Audio } from "./Audio";
import "./Bot.css";

export const Bot = () => {
  const [file, setFile] = useState(null);
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

  // reemplaza tu tryCompressProgressive por esta versión
const tryCompressProgressive = async (file, targets = [500 * 1024, 300 * 1024, 150 * 1024]) => {
  try {
    // obtener bitmap o fallback a Image element (compatible con HEIC fallback)
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      const url = URL.createObjectURL(file);
      bitmap = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          res(img);
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          rej(e);
        };
        img.src = url;
      });
    }

    const srcW = bitmap.width;
    const srcH = bitmap.height;

    // dimensiones y estrategia más agresiva (incluye tamaños muy pequeños)
    const dims = [1200, 1000, 800, 600, 480, 360, 240, 160];
    // rangos de calidad inicial (empezar alto, bajar muy agresivo)
    const initialQualities = [0.92, 0.85, 0.75];

    for (let t = 0; t < targets.length; t++) {
      const target = targets[t];

      for (let d = 0; d < dims.length; d++) {
        const maxDim = dims[d];
        const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
        // w/h iniciales para esta dimensión
        let w = Math.max(120, Math.round(srcW * scale));
        let h = Math.max(90, Math.round(srcH * scale));

        for (let qStart = 0; qStart < initialQualities.length; qStart++) {
          let quality = initialQualities[qStart];

          // varios pasos: reducimos calidad y tamaño en cada iteración
          for (let step = 0; step < 9; step++) {
            try {
              const blob = await canvasToBlob(bitmap, w, h, quality);
              if (blob && blob.size > 0 && blob.size <= target) {
                return fileFromBlob(blob, file.name);
              }
            } catch (err) {
              // si canvas falla, seguimos intentando con otras combinaciones
            }

            // bajar calidad y reducir dimensiones agresivamente
            quality = Math.max(0.05, quality - 0.12);
            w = Math.max(100, Math.round(w * 0.80));
            h = Math.max(80, Math.round(h * 0.80));
          }
        }
      }
    }

    // Intentos finales ultra-agresivos: probar varios tamaños fijos muy pequeños y calidades mínimas
    const finalSizes = [420, 360, 320, 240, 200, 160];
    for (let size of finalSizes) {
      const scale = Math.min(1, size / Math.max(srcW, srcH));
      const w = Math.max(120, Math.round(srcW * scale));
      const h = Math.max(80, Math.round(srcH * scale));
      // probamos calidades bajísimas
      for (let q = 0.06; q >= 0.03; q -= 0.01) {
        try {
          const blob = await canvasToBlob(bitmap, w, h, q);
          if (blob && blob.size > 0) {
            // si quedó razonablemente pequeño lo devolvemos (umbral levemente superior al objetivo más pequeño)
            if (blob.size <= (targets[targets.length - 1] || 150 * 1024) * 2) {
              return fileFromBlob(blob, file.name);
            }
          }
        } catch {}
      }
    }

    // si todo falla, devolver intento extremo final en 120px ancho (calidad mínima)
    try {
      const verySmallW = 120;
      const verySmallH = Math.max(60, Math.round((verySmallW * srcH) / Math.max(1, srcW)));
      const finalBlob = await canvasToBlob(bitmap, verySmallW, verySmallH, 0.03);
      if (finalBlob && finalBlob.size > 0) return fileFromBlob(finalBlob, file.name);
    } catch {}

    // fallback al archivo original si no fue posible comprimir correctamente
    return file;
  } catch (err) {
    // cualquier error: devolver original
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
                text: "Analiza la imagen y responde de forma clara en español. Si necesito preguntar algo más, lo haré después.",
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
        <h1>Asistente mejIASSS</h1>
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
        className="pol"
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
