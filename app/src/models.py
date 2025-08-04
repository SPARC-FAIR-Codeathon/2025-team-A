import torch
import numpy as np
from .vae_dynamic import VAE1D_Dynamic

def load_vae_model(model_path="vae_model.pt", arch_path="arch_params.npy"):
    arch_params = np.load(arch_path, allow_pickle=True).item()
    model = VAE1D_Dynamic(
        input_length=arch_params["segment_length"],
        latent_dim=arch_params["latent_dim"],
        filters=arch_params["filters"]
    )
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()
    return model, arch_params
