from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import os
import xmlrpc.client
import base64
import hashlib

# ===============================
# CONFIGURACIÓN GENERAL
# ===============================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# CONFIGURACIÓN ODOO
# ===============================
ODOO_URL = "https://disenamos-y-construimos-sas-1.odoo.com"
ODOO_DB = "disenamos-y-construimos-sas-1"
ODOO_USER = "alexandercanon9@gmail.com"
ODOO_API_KEY = "fcc5b0be85a76463ef06fa61f799fc21b8e1d7fa"

def get_odoo_connection():
    try:
        common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_API_KEY, {})
        if not uid:
            return None, None
        models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")
        return uid, models
    except:
        return None, None

# ===============================
# ARCHIVO HASH (ANTI FRAUDE)
# ===============================
HASH_FILE = "/tmp/hashes.json" # Cambiado a /tmp para que funcione mejor en Render

if not os.path.exists(HASH_FILE):
    with open(HASH_FILE, "w") as f:
        json.dump([], f)

def validar_imagen_unica(base64_img):
    hash_img = hashlib.md5(base64_img.encode()).hexdigest()
    try:
        with open(HASH_FILE, "r") as f:
            hashes = json.load(f)
        if hash_img in hashes:
            raise HTTPException(400, "❌ Imagen ya utilizada (posible fraude)")
        hashes.append(hash_img)
        with open(HASH_FILE, "w") as f:
            json.dump(hashes, f)
    except:
        pass # Evita que el sistema se bloquee si falla el archivo de hashes

# ===============================
# REGISTRO EN ODOO
# ===============================
def registrar_asistencia_odoo(employee_doc, tipo, lat, lon, photo_base64):
    uid, models = get_odoo_connection()
    if not uid:
        raise Exception("Error de conexión con Odoo")

    empleados = models.execute_kw(
        ODOO_DB, uid, ODOO_API_KEY,
        'hr.employee', 'search_read',
        [[['identification_id', '=', employee_doc]]],
        {'fields': ['id', 'name']}
    )

    if not empleados:
        raise Exception("Empleado no encontrado en Odoo")

    employee_id = empleados[0]['id']
    ahora = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    if tipo == "entrada":
        models.execute_kw(
            ODOO_DB, uid, ODOO_API_KEY,
            'hr.attendance', 'create',
            [{
                'employee_id': employee_id,
                'check_in': ahora,
                'x_latitude': lat,
                'x_longitude': lon,
                'x_studio_foto_de_asistencia': photo_base64
            }]
        )
    elif tipo == "salida":
        asistencias = models.execute_kw(
            ODOO_DB, uid, ODOO_API_KEY,
            'hr.attendance', 'search',
            [[['employee_id', '=', employee_id], ['check_out', '=', False]]]
        )
        if not asistencias:
            raise Exception("No hay asistencia abierta para cerrar")
        
        models.execute_kw(
            ODOO_DB, uid, ODOO_API_KEY,
            'hr.attendance', 'write',
            [asistencias, {
                'check_out': ahora,
                'x_studio_latitud_de_salida': lat,
                'x_studio_longitud_de_salida': lon,
                'x_studio_foto_de_salida_2': photo_base64
            }]
        )

# ===============================
# ENDPOINTS
# ===============================
@app.post("/registrar")
async def registrar(
    employee: str = Form(...),
    tipo: str = Form(...),
    lat: str = Form(...),
    lon: str = Form(...),
    photo: UploadFile = File(...)
):
    try:
        contents = await photo.read()
        photo_base64 = base64.b64encode(contents).decode("utf-8")
        validar_imagen_unica(photo_base64)
        registrar_asistencia_odoo(employee, tipo.lower(), float(lat), float(lon), photo_base64)
        return {"status": "ok", "mensaje": f"Asistencia {tipo} registrada correctamente para D&CO"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"status": "ok", "mensaje": "API D&CO Activa"}