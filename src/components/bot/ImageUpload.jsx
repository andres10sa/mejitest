import React, { useRef, useState } from "react";

export const ImageUpload = ({ file, setFile }) => {
  const ref = useRef();
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleSelectClick = () => ref.current?.click();

  const readFile = (f) => {
    const url = URL.createObjectURL(f);
    setPreview(url);
    setFile(f);
    if (typeof onFileChange === "function")
      onFileChange({ target: { files: [f] } });
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    readFile(f);
  };

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    handleFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    if (typeof onFileChange === "function")
      onFileChange({ target: { files: [] } });
  };

  return (
    <div className={`iu-wrapper ${dragOver ? "iu-drag" : ""}`}>
      <div
        className="iu-dropzone"
        onClick={handleSelectClick}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && handleSelectClick()
        }
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
              <path
                d="M5 20h14a1 1 0 0 0 1-1V9.5a1 1 0 0 0-.293-.707l-4.5-4.5A1 1 0 0 0 15.5 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z"
                fill="currentColor"
              />
              <path
                d="M8 13l2.5 3L13 12l4 6H7l1-5z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
            <div className="iu-text">
              <div className="iu-title">Seleccionar imagen</div>
              <div className="iu-sub">
                Arrastra la imagen o has click para elegir
              </div>
            </div>
          </>
        )}

        {preview && (
          <div className="iu-preview">
            <img
              src={preview}
              alt={file?.name ?? "Preview"}
              className="iu-img"
            />
          </div>
        )}
      </div>

      <div className="iu-controls">
        {file && (
          <label className="iu-button" onClick={handleSelectClick}>
            <svg className="iu-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cambiar imagen
          </label>
        )}

        <button
          className="iu-clear"
          onClick={clear}
          aria-label="Eliminar imagen"
          disabled={!file}
        >
          <svg viewBox="0 0 24 24" className="iu-clear-icon" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Eliminar
        </button>

        <div className="iu-meta">
          {file ? (
            <>
              <div className="iu-filename" title={file.name}>
                {file.name}
              </div>
              <div className="iu-size">{(file.size / 1024).toFixed(0)} KB</div>
            </>
          ) : (
            <div className="iu-hint">PNG, JPG, WEBP — hasta 10MB</div>
          )}
        </div>
      </div>

      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="iu-input"
      />
    </div>
  );
};
