import { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./assets/hero.png";

function App() {
  const videoRef = useRef(null);
  const [employee, setEmployee] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Iniciar cámara
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          console.error("Error cámara:", err);
          alert("Por favor, permite el acceso a la cámara.");
        });
    }
  }, []);

  // 2. Obtener GPS
  const obtenerUbicacion = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Navegador no soporta GPS"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }),
        () => reject(new Error("Activa el GPS y da permisos de ubicación.")),
        { enableHighAccuracy: true }
      );
    });
  };

  // 3. Capturar Foto
  const capturarFoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  };

  // 4. Registrar asistencia
  const registrar = async (tipo) => {
    if (!employee) {
      alert("Ingrese su número de documento.");
      return;
    }

    setLoading(true);

    try {
      const ubicacion = await obtenerUbicacion();
      const fotoBlob = await capturarFoto();

      const formData = new FormData();
      formData.append("employee", employee);
      formData.append("tipo", tipo);
      formData.append("lat", ubicacion.lat.toString());
      formData.append("lon", ubicacion.lon.toString());
      formData.append("photo", fotoBlob, "selfie.jpg");

      const res = await fetch("https://dco-backend-asistencia.onrender.com/registrar", {
          method: "POST",
          body: formData,
        }
      );

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Respuesta inválida del servidor");
      }

      if (!res.ok) {
        throw new Error(data.detail || "Error en el servidor");
      }

      alert("✅ " + data.mensaje);
    } catch (e) {
      console.error(e);
      alert("❌ Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Logo */}
      <img
        src={logo}
        alt="Logo D&CO"
        className="logo-empresa"
        style={{ width: "180px", marginBottom: "20px" }}
      />

      <h1>📍 Control D&CO</h1>
      <p>Diseñamos y Construimos S.A.S.</p>

      <input
        type="text"
        placeholder="Número de Documento"
        value={employee}
        onChange={(e) => setEmployee(e.target.value)}
        className="input-documento"
      />

      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline className="video" />
      </div>

      <div className="button-group">
        <button
          className="btn-entrada"
          onClick={() => registrar("entrada")}
          disabled={loading}
        >
          {loading ? "Procesando..." : "Marcar Entrada"}
        </button>

        <button
          className="btn-salida"
          onClick={() => registrar("salida")}
          disabled={loading}
          style={{ backgroundColor: "#ff4d4d" }}
        >
          {loading ? "Procesando..." : "Marcar Salida"}
        </button>
      </div>
    </div>
  );
}

export default App;