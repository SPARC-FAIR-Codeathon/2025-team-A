from fastapi import APIRouter, UploadFile, File
import numpy as np
import torch
from scipy.io import wavfile
from ..src.models import load_vae_model

router = APIRouter()

vae_model, arch = load_vae_model()

@router.post("/generate/")
async def generate_signal(file: UploadFile = File(...)):
    # Read and normalize .wav
    rate, signal = wavfile.read(file.file)
    if signal.ndim > 1:
        signal = signal.mean(axis=1)  # mono
    signal = signal.astype(np.float32)
    signal = (signal - signal.mean()) / signal.std()

    # Generate from VAE
    z = torch.randn(1, arch['latent_dim'])
    with torch.no_grad():
        generated = vae_model.decode(z).cpu().numpy().squeeze()

    return {
        "samples": generated.tolist(),
        "length": len(generated)
    }
