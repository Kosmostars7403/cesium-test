from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import kml2geojson

app = FastAPI()

origins = [
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/")
def upload_file(file: UploadFile = File()):
    geo_json_decode = kml2geojson.main.convert(file.file, '.')
    return geo_json_decode
