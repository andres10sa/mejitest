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

  const fileFromBlob = (blob, origName) =>
    new File([blob], origName.replace(/\.\w+$/, ".jpg"), {
      type: "image/jpeg",
    });

  // calcula bytes reales desde dataURL base64
  const dataUrlBytes = (dataUrl) => {
    const parts = String(dataUrl).split(",");
    if (!parts[1]) return 0;
    const b64 = parts[1];
    return Math.ceil((b64.length * 3) / 4);
  };

  // reemplaza tu tryCompressProgressive por esta versión
  const tryCompressProgressive = async (
    file,
    targets = [500 * 1024, 300 * 1024, 150 * 1024]
  ) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = objectURL;
    });
    URL.revokeObjectURL(objectURL);

    // Definir ancho máximo y escalar si es necesario (mantener aspecto)
    const MAX_WIDTH = 300;
    let { width, height } = img;
    if (width > MAX_WIDTH) {
      height = Math.round(height * (MAX_WIDTH / width));
      width = MAX_WIDTH;
    }

    // Crear canvas con las dimensiones escaladas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    // Determinar formato (preferir WebP si está soportado)
    // Al usar aQuality=0.8 para probar si retorna WebP; si no, se usará JPEG.
    const mimeType = canvas
      .toDataURL("image/webp", 0.8)
      .startsWith("data:image/webp")
      ? "image/webp"
      : "image/jpeg";

    // Iterar sobre niveles de calidad decrecientes hasta <100KB
    let quality = 0.8;
    let blob = await new Promise((res) =>
      canvas.toBlob(res, mimeType, quality)
    );
    // Loop: si es muy grande, disminuir calidad
    while (blob.size > 100 * 1024 && quality > 0.1) {
      quality = Math.max(quality - 0.1, 0.1);
      // Generar nuevo Blob con menor calidad
      blob = await new Promise((res) => canvas.toBlob(res, mimeType, quality));
    }

    return blob;
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
      const compressed = await tryCompressProgressive(file, [
        500 * 1024,
        300 * 1024,
        150 * 1024,
      ]);

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
      const textResp =
        data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
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
console.log(response)
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
        {response}
      </div>
    </div>
  );
};
