from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import os
import xmlrpc.client
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# CONFIGURACION ODOO
# ===============================

ODOO_URL = "https://disenamos-y-construimos-sas-1.odoo.com"
ODOO_DB = "disenamos-y-construimos-sas-1"
ODOO_USER = "alexandercanon9@gmail.com"
ODOO_API_KEY = "6e40f85ea4e5228410dbad1660ff50888f49cb32"

print("Conectando con Odoo...")

common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")

uid = common.authenticate(
    ODOO_DB,
    ODOO_USER,
    ODOO_API_KEY,
    {}
)

print("UID obtenido:", uid)

models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")

# ===============================
# CARPETAS
# ===============================

os.makedirs("data/photos", exist_ok=True)

json_path = os.path.join("data", "asistencias.json")

if not os.path.exists(json_path):
    with open(json_path, "w") as f:
        json.dump([], f)

# ===============================
# REGISTRAR EN ODOO
# ===============================

def registrar_asistencia_odoo(employee_doc, tipo, lat, lon, photo_base64):

    print("Buscando empleado:", employee_doc)

    empleados = models.execute_kw(
        ODOO_DB,
        uid,
        ODOO_API_KEY,
        'hr.employee',
        'search_read',
        [[['identification_id', '=', employee_doc]]],
        {'fields': ['id','name','identification_id']}
    )

    print("Resultado búsqueda empleado:", empleados)

    if not empleados:
        print("ERROR: empleado no encontrado en Odoo")
        return

    employee_id = empleados[0]['id']

    if tipo == "entrada":

        attendance_id = models.execute_kw(
            ODOO_DB,
            uid,
            ODOO_API_KEY,
            'hr.attendance',
            'create',
            [{
                'employee_id': employee_id,
                'check_in': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                'x_latitude': lat,
                'x_longitude': lon,
                'x_studio_foto_de_asistencia': photo_base64
            }]
        )

        print("Asistencia creada:", attendance_id)

    else:

        asistencias = models.execute_kw(
            ODOO_DB,
            uid,
            ODOO_API_KEY,
            'hr.attendance',
            'search',
            [[
                ['employee_id','=',employee_id],
                ['check_out','=',False]
            ]]
        )

        if asistencias:

            models.execute_kw(
                ODOO_DB,
                uid,
                ODOO_API_KEY,
                'hr.attendance',
                'write',
                [
                    asistencias,
                    {
                        'check_out': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                        'x_latitude': lat,
                        'x_longitude': lon,
                        'x_studio_foto_de_asistencia': photo_base64
                    }
                ]
            )

            print("Salida registrada")

# ===============================
# REGISTRAR ASISTENCIA
# ===============================

@app.post("/registrar")
async def registrar(
    employee: str = Form(...),
    tipo: str = Form(...),
    lat: str = Form(...),
    lon: str = Form(...),
    photo: UploadFile = File(...)
):

    with open(json_path,"r",encoding="utf-8") as f:
        registros=json.load(f)

    contents=await photo.read()

    photo_name=f"{employee}_{tipo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    photo_path=os.path.join("data/photos",photo_name)

    with open(photo_path,"wb") as f:
        f.write(contents)

    photo_base64=base64.b64encode(contents).decode("utf-8")

    registro={
        "employee":employee,
        "tipo":tipo,
        "lat":lat,
        "lon":lon,
        "timestamp":datetime.now().isoformat(),
        "photo":photo_name
    }

    registros.append(registro)

    with open(json_path,"w",encoding="utf-8") as f:
        json.dump(registros,f,indent=4)

    registrar_asistencia_odoo(employee,tipo,lat,lon,photo_base64)

    return {"ok":True}

# ===============================
# HISTORIAL
# ===============================

@app.get("/historial/{employee}")
def historial(employee:str):

    if not os.path.exists(json_path):
        return []

    with open(json_path,"r",encoding="utf-8") as f:
        registros=json.load(f)

    historial=[r for r in registros if r["employee"]==employee]

    return historial