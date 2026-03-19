import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const videoRef = useRef(null);

  const [employee, setEmployee] = useState("");
  const [loading, setLoading] = useState(false);
  const [ubicacion, setUbicacion] = useState(null);
  const [hora, setHora] = useState("");

  // ============================
  // INICIAR CÁMARA
  // ============================
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(() => alert("⚠️ Debes permitir la cámara"));
  }, []);

  // ============================
  // HORA ACTUAL
  // ============================
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setHora(now.toLocaleTimeString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ============================
  // OBTENER GPS
  // ============================
  const obtenerUbicacion = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const data = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          };
          setUbicacion(data);
          resolve(data);
        },
        () => reject("⚠️ Debes activar el GPS")
      );
    });
  };

  // ============================
  // CAPTURAR FOTO
  // ============================
  const capturarFoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(blob => resolve(blob), "image/jpeg");
    });
  };

  // ============================
  // REGISTRAR
  // ============================
  const registrar = async (tipo) => {
    if (!employee) {
      alert("⚠️ Ingrese documento");
      return;
    }

    setLoading(true);

    try {
      const ubic = await obtenerUbicacion();
      const foto = await capturarFoto();

      const formData = new FormData();
      formData.append("employee", employee);
      formData.append("tipo", tipo);
      formData.append("lat", ubic.lat);
      formData.append("lon", ubic.lon);
      formData.append("photo", foto, "selfie.jpg");

      const res = await fetch("http://127.0.0.1:8000/registrar", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail);

      alert("✅ " + data.mensaje);

    } catch (e) {
      alert(e);
    }

    setLoading(false);
  };

  // ============================
  // UI
  // ============================
  return (
    <div className="app">

      <h2>📍 Control de Asistencia</h2>

      <div className="card">

        <div className="info">
          <span>🕒 {hora}</span>
          {ubicacion && (
            <span>📍 {ubicacion.lat.toFixed(4)}, {ubicacion.lon.toFixed(4)}</span>
          )}
        </div>

        <input
          placeholder="Documento del empleado"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
        />

        <video ref={videoRef} autoPlay playsInline className="video" />

        <div className="buttons">
          <button
            className="entrada"
            onClick={() => registrar("entrada")}
            disabled={loading}
          >
            🟢 Entrada
          </button>

          <button
            className="salida"
            onClick={() => registrar("salida")}
            disabled={loading}
          >
            🔴 Salida
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;