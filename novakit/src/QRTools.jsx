import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function QRTools() {
  const [text, setText] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [scanError, setScanError] = useState("");
  const [mode, setMode] = useState("generate");
  const canvasRef = useRef(null);

  useEffect(() => {
    if (mode !== "scan") return;

    const scanner = new Html5QrcodeScanner(
      "novakit-qr-reader",
      {
        fps: 10,
        qrbox: { width: 230, height: 230 },
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        setScanError("");
        scanner.clear().catch(() => {});
      },
      () => {
        // Ignore frequent frame-by-frame scan misses.
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [mode]);

  function downloadQR() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "novakit-qr-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(scanResult);
      setScanError("Result copied to clipboard.");
    } catch {
      setScanError("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <div className="qr-tools-grid">
      <section className="panel page-panel qr-panel">
        <div className="qr-tabs">
          <button
            className={mode === "generate" ? "primary-btn" : "secondary-btn"}
            onClick={() => {
              setMode("generate");
              setScanError("");
            }}
          >
            Generate QR
          </button>
          <button
            className={mode === "scan" ? "primary-btn" : "secondary-btn"}
            onClick={() => {
              setMode("scan");
              setScanResult("");
              setScanError("");
            }}
          >
            Scan QR
          </button>
        </div>

        {mode === "generate" ? (
          <>
            <h2>QR Code Generator</h2>
            <p className="muted">
              Enter text or a website address. Check the content before sharing it.
            </p>
            <textarea
              className="note-input"
              rows="4"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type text or paste a URL..."
            />

            {text.trim() ? (
              <div className="qr-preview" ref={canvasRef}>
                <QRCodeCanvas
                  value={text.trim()}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>
            ) : (
              <p className="empty-state">Your QR code will appear here.</p>
            )}

            <button
              className="primary-btn"
              onClick={downloadQR}
              disabled={!text.trim()}
            >
              Download QR as PNG
            </button>
          </>
        ) : (
          <>
            <h2>QR Code Scanner</h2>
            <p className="muted">
              Allow camera access to scan a QR code. Scanned links are shown as text;
              they will not open automatically.
            </p>
            <div id="novakit-qr-reader" className="qr-reader" />

            {scanResult && (
              <div className="qr-result">
                <strong>Scan result</strong>
                <p>{scanResult}</p>
                <button className="secondary-btn" onClick={copyResult}>
                  Copy result
                </button>
              </div>
            )}

            {scanError && <p className="muted qr-message">{scanError}</p>}
          </>
        )}
      </section>
    </div>
  );
}
