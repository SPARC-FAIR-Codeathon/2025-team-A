from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.src.models import load_models, generate_signal
import os
import wfdb
import mne

router = APIRouter()
G_ecg, G_eeg = load_models()

signal_len = 500

@router.post("/generate_eeg/")
async def generate_eeg(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    if ext != ".edf":
        raise HTTPException(400, "Only .edf files supported for EEG")

    with open("tmp.edf", "wb") as f:
        f.write(await file.read())

    try:
        raw = mne.io.read_raw_edf("tmp.edf", preload=True, verbose=False)
        real = raw.get_data()[0][:signal_len]
    except Exception as e:
        raise HTTPException(400, f"EEG parse failed: {e}")

    fake = generate_signal(G_eeg)
    return JSONResponse({"type": "EEG", "real": real.tolist(), "fake": fake.tolist()})


@router.post("/generate_ecg/")
async def generate_ecg(
    dat_file: UploadFile = File(...),
    hea_file: UploadFile = File(...)
):
    base = dat_file.filename.replace(".dat", "")
    with open(base + ".dat", "wb") as f:
        f.write(await dat_file.read())
    with open(base + ".hea", "wb") as f:
        f.write(await hea_file.read())

    try:
        record = wfdb.rdrecord(base)
        real = record.p_signal[:, 0][:signal_len]
    except Exception as e:
        raise HTTPException(400, f"ECG parse failed: {e}")

    fake = generate_signal(G_ecg)
    return JSONResponse({"type": "ECG", "real": real.tolist(), "fake": fake.tolist()})
