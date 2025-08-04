import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import matplotlib.pyplot as plt
import os
from vae_dynamic import VAE1D_Dynamic
from vae_model import VAE  
from scipy.io import wavfile

# ========= Helper functions =========
def compute_entropy(signal):
    hist, _ = np.histogram(signal, bins=50, density=True)
    hist += 1e-8  # to avoid log(0)
    return -np.sum(hist * np.log2(hist))

def segment_signal(signal, segment_length=1024, stride=256):
    segments = []
    for i in range(0, len(signal) - segment_length + 1, stride):
        segments.append(signal[i:i+segment_length])
    return np.array(segments)

def analyze_signal(signal, sr):
    stats = {
        'length': len(signal),
        'duration': len(signal) / sr,
        'mean': np.mean(signal),
        'std': np.std(signal),
        'rms': np.sqrt(np.mean(signal**2)),
        'spectral_entropy': compute_entropy(signal),
        'zero_crossings': ((signal[:-1] * signal[1:]) < 0).sum()
    }
    return stats

def design_vae_architecture(stats):
    if stats['std'] < 0.05:
        latent_dim = 16
        conv_filters = [16, 32]
    elif stats['std'] < 0.2:
        latent_dim = 32
        conv_filters = [32, 64]
    else:
        latent_dim = 64
        conv_filters = [64, 128]
    
    segment_length = 512 if stats['duration'] > 2 else 256
    print('Duration::: ' , stats['duration'])
    return {
        'latent_dim': latent_dim,
        'filters': conv_filters,
        'segment_length': segment_length
    }

# ========= Load WAV file =========
rate, signal = wavfile.read("./primary/sub-1001/perf-1001-A/01-A-1.wav")
if len(signal.shape) > 1:
    signal = signal.mean(axis=1)  # convert to mono

signal = signal.astype(np.float32)
signal = (signal - np.mean(signal)) / np.std(signal)  # normalize

# ========= Plot the waveform =========
time = np.arange(len(signal)) / rate  # Time axis in seconds

plt.figure(figsize=(30, 8))
duration = 10  # seconds
samples = int(duration * rate)
plt.plot(time[samples:samples + 10 * rate], signal[samples:samples+10 *rate])
plt.xlabel("Time (seconds)")
plt.ylabel("Amplitude (normalized)")
plt.title("Waveform of Audio Signal")
plt.grid(True)
plt.tight_layout()
plt.show()
# ========= Analyze & Design model =========
stats = analyze_signal(signal, rate)
arch_params = design_vae_architecture(stats)

# ========= Segment the signal =========
segment_length = arch_params['segment_length']
stride = 64 #segment_length // 2
segments = segment_signal(signal, segment_length=segment_length, stride=stride)
segments = (segments - np.mean(segments)) / np.std(segments)
segments_tensor = torch.tensor(segments, dtype=torch.float32).unsqueeze(1)  # [B, 1, L]

# ========= Train VAE =========
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
vae = VAE1D_Dynamic(
    input_length=segment_length,
    latent_dim=arch_params['latent_dim'],
    filters=arch_params['filters']
).to(device)

optimizer = torch.optim.Adam(vae.parameters(), lr=0.001)
dataset = TensorDataset(segments_tensor)
dataloader = DataLoader(dataset, batch_size=512, shuffle=True)

def loss_function(recon_x, x, mu, logvar):
    recon_loss = nn.MSELoss()(recon_x, x)
    kld = -0.5 * torch.mean(1 + logvar - mu.pow(2) - logvar.exp())
    return recon_loss + kld, recon_loss.item(), kld.item()

os.makedirs("vae_outputs", exist_ok=True)
vae.train()
epochs = 50

for epoch in range(epochs):
    total_loss = 0
    for real_batch, in dataloader:
        real_batch = real_batch.to(device)
        optimizer.zero_grad()
        recon, mu, logvar = vae(real_batch)
        loss, r_loss, kld = loss_function(recon, real_batch, mu, logvar)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()

    print(f"[{epoch+1}/{epochs}] Recon Loss: {r_loss:.4f}, KLD: {kld:.4f}, Total: {loss.item():.4f}")

# ========= Save the model =========
torch.save(vae.state_dict(), "vae_outputs/vae_model.pt")
np.save("vae_outputs/arch_params.npy", arch_params)
