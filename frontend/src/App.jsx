import { useRef, useState } from "react";

function App() {

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [employee, setEmployee] = useState("");
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [historial, setHistorial] = useState([]);

  const openCamera = async () => {

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    videoRef.current.srcObject = stream;

  };

  const takePhoto = () => {

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    const image = canvas.toDataURL("image/png");

    setPhoto(image);

  };

  const getLocation = () => {

    navigator.geolocation.getCurrentPosition((position) => {

      setLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      });

    });

  };

  const register = async (type) => {

    if (!employee) {
      alert("Ingrese el ID del empleado");
      return;
    }

    if (!location) {
      alert("Debe activar el GPS primero");
      return;
    }

    if (!photo) {
      alert("Debe tomar una foto primero");
      return;
    }

    const formData = new FormData();

    const timestamp = new Date().toISOString();

    formData.append("employee", employee);
    formData.append("tipo", type);
    formData.append("lat", location.lat);
    formData.append("lon", location.lon);
    formData.append("timestamp", timestamp);

    const blob = await fetch(photo).then(r => r.blob());

    formData.append("photo", blob, "photo.png");

    const response = await fetch("http://127.0.0.1:8000/registrar", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    alert(result.message);

  };

  const cargarHistorial = async () => {

    if (!employee) {
      alert("Ingrese el ID del empleado");
      return;
    }

    const response = await fetch(`http://127.0.0.1:8000/historial/${employee}`);

    const data = await response.json();

    setHistorial(data);

  };

  return (

    <div style={{ textAlign: "center", marginTop: "40px" }}>

      <h1>Control de Asistencia</h1>

      <input
        placeholder="ID empleado"
        value={employee}
        onChange={(e) => setEmployee(e.target.value)}
      />

      <br /><br />

      <button onClick={openCamera}>Abrir cámara</button>

      <button onClick={takePhoto}>Tomar foto</button>

      <br /><br />

      <video ref={videoRef} autoPlay width="300"></video>

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

      {photo && (
        <>
          <p>Foto capturada:</p>
          <img src={photo} width="200" />
        </>
      )}

      <br /><br />

      <button onClick={getLocation}>Obtener ubicación</button>

      <br /><br />

      <button onClick={() => register("entrada")}>Registrar Entrada</button>

      <button onClick={() => register("salida")}>Registrar Salida</button>

      <br /><br />

      <button onClick={cargarHistorial}>Ver Historial</button>

      {location && (
        <>
          <p>Latitud: {location.lat}</p>
          <p>Longitud: {location.lon}</p>
        </>
      )}

      <hr />

      <h2>Historial</h2>

      {historial.map((item, index) => (

        <div key={index} style={{
          border: "1px solid gray",
          padding: "10px",
          margin: "10px"
        }}>

          <p><b>Tipo:</b> {item.tipo}</p>

          <p><b>Hora servidor:</b> {item.timestamp_servidor}</p>

          <p><b>GPS:</b> {item.lat}, {item.lon}</p>

          <img
            src={`http://127.0.0.1:8000/${item.photo_path}`}
            width="150"
          />

        </div>

      ))}

    </div>

  );

}

export default App;