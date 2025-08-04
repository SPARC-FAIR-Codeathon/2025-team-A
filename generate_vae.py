import torch
import numpy as np
import matplotlib.pyplot as plt
from vae_dynamic import VAE1D_Dynamic
from vae_model import VAE
import os

# Load architecture parameters
arch_params = np.load("vae_outputs/arch_params.npy", allow_pickle=True).item()
latent_dim = arch_params['latent_dim']
input_length = arch_params['segment_length']
filters = arch_params['filters']

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Rebuild the same model
vae = VAE1D_Dynamic(input_length=input_length, latent_dim=latent_dim, filters=filters).to(device)
vae.load_state_dict(torch.load("vae_outputs/vae_model.pt", map_location=device))
vae.eval()

# Sample latent vectors and decode
z = torch.randn(10, latent_dim).to(device)
with torch.no_grad():
    generated = vae.decode(z).cpu().numpy().squeeze()

# Save and plot results
os.makedirs("vae_signals", exist_ok=True)
np.save("vae_signals/synthetic_vae_signals.npy", generated)

for i, sig in enumerate(generated):
    plt.figure(figsize=(10, 2))
    plt.plot(sig)
    plt.title(f"VAE Synthetic Signal {i+1}")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(f"vae_signals/vae_signal_{i+1}.png")
    plt.close()

segments_to_generate = 10  

z = torch.randn(segments_to_generate, latent_dim).to(device)

with torch.no_grad():
    generated_segments = vae.decode(z).cpu().numpy().squeeze()

if generated_segments.ndim == 1:
    generated_segments = generated_segments[np.newaxis, :]

long_signal = np.concatenate(generated_segments, axis=-1)

np.save("vae_signals/long_synthetic_signal.npy", long_signal)

plt.figure(figsize=(15, 3))
plt.plot(long_signal)
plt.title("Long Synthetic Signal")
plt.grid(True)
plt.tight_layout()
plt.savefig("vae_signals/long_synthetic_signal.png")
plt.show()


