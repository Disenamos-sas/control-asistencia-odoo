import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const [employee, setEmployee] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Iniciar cámara al cargar la app
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error cámara:", err);
          alert("Por favor, permite el acceso a la cámara para marcar asistencia.");
        });
    }
  }, []);

  // 2. Función para obtener GPS
  const obtenerUbicacion = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Tu navegador no soporta geolocalización");
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        (error) => {
          console.error("Error GPS:", error);
          reject("Debes activar el GPS y dar permisos de ubicación.");
        },
        { enableHighAccuracy: true }
      );
    });
  };

  // 3. Función para capturar la foto del video
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

  // 4. Lógica de registro (Frontend -> Backend -> Odoo)
  const registrar = async (tipo) => {
    if (!employee) {
      alert("Por favor, ingrese su número de documento.");
      return;
    }

    setLoading(true);

    try {
      const ubicacion = await obtenerUbicacion();
      const fotoBlob = await capturarFoto();

      // Construcción del FormData (idéntico a los Form/File de tu FastAPI)
      const formData = new FormData();
      formData.append("employee", employee);
      formData.append("tipo", tipo);
      formData.append("lat", ubicacion.lat.toString());
      formData.append("lon", ubicacion.lon.toString());
      formData.append("photo", fotoBlob, "selfie.jpg");

      const res = await fetch("https://asistencia-api-s0ut.onrender.com/registrar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Error en el servidor");
      }

      alert("✅ " + data.mensaje);
    } catch (e) {
      alert("❌ Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>📍 Control Terracampo</h1>
      <p>Registro de asistencia</p>

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
        >
          {loading ? "Procesando..." : "Marcar Salida"}
        </button>
      </div>
    </div>
  );
}

export default App;