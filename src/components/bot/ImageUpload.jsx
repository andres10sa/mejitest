// import React, { useRef, useState } from "react";

// export const ImageUpload = ({ file, setFile }) => {
//   const ref = useRef();
//   const [preview, setPreview] = useState(null);
//   const [dragOver, setDragOver] = useState(false);

//   const handleSelectClick = () => ref.current?.click();

//   const readFile = (f) => {
//     const url = URL.createObjectURL(f);
//     setPreview(url);
//     setFile(f);
//     if (typeof onFileChange === "function")
//       onFileChange({ target: { files: [f] } });
//   };

//   const handleFile = (f) => {
//     if (!f) return;
//     if (!f.type.startsWith("image/")) return;
//     readFile(f);
//   };

//   const handleInputChange = (e) => {
//     const f = e.target.files?.[0];
//     handleFile(f);
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setDragOver(false);
//     const f = e.dataTransfer.files?.[0];
//     handleFile(f);
//   };

//   const clear = () => {
//     setFile(null);
//     setPreview(null);
//     if (inputRef.current) inputRef.current.value = "";
//     if (typeof onFileChange === "function")
//       onFileChange({ target: { files: [] } });
//   };

//   return (
//     <div className={`iu-wrapper ${dragOver ? "iu-drag" : ""}`}>
//       <div
//         className="iu-dropzone"
//         onClick={handleSelectClick}
//         onKeyDown={(e) =>
//           (e.key === "Enter" || e.key === " ") && handleSelectClick()
//         }
//         role="button"
//         tabIndex={0}
//         onDragOver={(e) => {
//           e.preventDefault();
//           setDragOver(true);
//         }}
//         onDragLeave={() => setDragOver(false)}
//         onDrop={handleDrop}
//         aria-label="Subir imagen"
//       >
//         {!preview && (
//           <>
//             <svg className="iu-icon" viewBox="0 0 24 24" aria-hidden="true">
//               <path
//                 d="M5 20h14a1 1 0 0 0 1-1V9.5a1 1 0 0 0-.293-.707l-4.5-4.5A1 1 0 0 0 15.5 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z"
//                 fill="currentColor"
//               />
//               <path
//                 d="M8 13l2.5 3L13 12l4 6H7l1-5z"
//                 fill="currentColor"
//                 opacity="0.9"
//               />
//             </svg>
//             <div className="iu-text">
//               <div className="iu-title">Seleccionar imagen</div>
//               <div className="iu-sub">
//                 Arrastra la imagen o has click para elegir
//               </div>
//             </div>
//           </>
//         )}

//         {preview && (
//           <div className="iu-preview">
//             <img
//               src={preview}
//               alt={file?.name ?? "Preview"}
//               className="iu-img"
//             />
//           </div>
//         )}
//       </div>

//       <div className="iu-controls">
//         {file && (
//           <label className="iu-button" onClick={handleSelectClick}>
//             <svg className="iu-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
//               <path
//                 d="M12 5v14M5 12h14"
//                 stroke="currentColor"
//                 strokeWidth="1.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//             Cambiar imagen
//           </label>
//         )}

//         <button
//           className="iu-clear"
//           onClick={clear}
//           aria-label="Eliminar imagen"
//           disabled={!file}
//         >
//           <svg viewBox="0 0 24 24" className="iu-clear-icon" aria-hidden="true">
//             <path
//               d="M6 6l12 12M18 6L6 18"
//               stroke="currentColor"
//               strokeWidth="1.6"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             />
//           </svg>
//           Eliminar
//         </button>

//         <div className="iu-meta">
//           {file ? (
//             <>
//               <div className="iu-filename" title={file.name}>
//                 {file.name}
//               </div>
//               <div className="iu-size">{(file.size / 1024).toFixed(0)} KB</div>
//             </>
//           ) : (
//             <div className="iu-hint">PNG, JPG, WEBP — hasta 10MB</div>
//           )}
//         </div>
//       </div>

//       <input
//         ref={ref}
//         type="file"
//         accept="image/*"
//         onChange={handleInputChange}
//         className="iu-input"
//       />
//     </div>
//   );
// };
import React, { useRef, useState, useEffect } from "react";

export const ImageUpload = ({ file, setFile }) => {
  const ref = useRef();
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const TARGET_BYTES = 700 * 1024;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleSelectClick = () => ref.current?.click();

  const toImage = (f) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error("load error"));
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(f);
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

  const fileFromBlob = (blob, name) =>
    new File([blob], name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });

  const compressUntilUnder = async (inputFile, targetBytes = TARGET_BYTES) => {
    if (!inputFile || !inputFile.type?.startsWith?.("image/")) throw new Error("no image");
    try {
      const img = await toImage(inputFile);
      let w = img.width;
      let h = img.height;
      let quality = 0.9;
      let scale = Math.min(1, 1200 / w);
      w = Math.round(w * scale);
      h = Math.round(h * scale);

      for (let i = 0; i < 8; i++) {
        const blob = await canvasBlob(img, w, h, quality);
        if (blob && blob.size <= targetBytes) return fileFromBlob(blob, inputFile.name);
        quality = Math.max(0.35, quality - 0.12);
        w = Math.round(w * 0.85);
        h = Math.round(h * 0.85);
      }

      const finalBlob = await canvasBlob(img, 800, Math.round((800 / img.width) * img.height), 0.35);
      return fileFromBlob(finalBlob, inputFile.name);
    } catch {
      return inputFile;
    }
  };

  const setPreviewAndFile = (f) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(url);
    setFile(f);
  };

  const readFile = (f) => {
    if (!f) return;
    setPreviewAndFile(f);
  };

  const handleFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    try {
      if (f.size <= TARGET_BYTES) {
        readFile(f);
        return;
      }
      const compressed = await compressUntilUnder(f, TARGET_BYTES);
      if (compressed && compressed.size <= f.size) {
        readFile(compressed);
      } else {
        readFile(f);
      }
    } catch {
      readFile(f);
    }
  };

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    handleFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const clear = () => {
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (ref.current) ref.current.value = "";
  };

  return (
    <div className={`iu-wrapper ${dragOver ? "iu-drag" : ""}`}>
      <div
        className="iu-dropzone"
        onClick={handleSelectClick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSelectClick()}
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        aria-label="Subir imagen"
      >
        {!preview && (
          <>
            <svg className="iu-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 20h14a1 1 0 0 0 1-1V9.5a1 1 0 0 0-.293-.707l-4.5-4.5A1 1 0 0 0 15.5 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z" fill="currentColor"/>
              <path d="M8 13l2.5 3L13 12l4 6H7l1-5z" fill="currentColor" opacity="0.9"/>
            </svg>
            <div className="iu-text">
              <div className="iu-title">Seleccionar imagen</div>
              <div className="iu-sub">Arrastra la imagen o haz click para elegir</div>
            </div>
          </>
        )}
        {preview && (
          <div className="iu-preview">
            <img src={preview} alt={file?.name ?? "Preview"} className="iu-img" />
          </div>
        )}
      </div>

      <div className="iu-controls">
        {file && (
          <label className="iu-button" onClick={handleSelectClick}>
            <svg className="iu-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Cambiar imagen
          </label>
        )}

        <button className="iu-clear" onClick={clear} aria-label="Eliminar imagen" disabled={!file}>
          <svg viewBox="0 0 24 24" className="iu-clear-icon" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Eliminar
        </button>

        <div className="iu-meta">
          {file ? (
            <>
              <div className="iu-filename" title={file.name}>{file.name}</div>
              <div className="iu-size">{(file.size / 1024).toFixed(0)} KB</div>
            </>
          ) : (
            <div className="iu-hint">PNG, JPG, WEBP — hasta 10MB</div>
          )}
        </div>
      </div>

      <input ref={ref} type="file" accept="image/*" onChange={handleInputChange} className="iu-input" />
    </div>
  );
};
