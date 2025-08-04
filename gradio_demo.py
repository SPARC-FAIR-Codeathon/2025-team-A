import gradio as gr
import torch
import numpy as np
import matplotlib.pyplot as plt
from scipy.io import wavfile
import tempfile
import os
from app.src.models import VAE1D_Dynamic  

# === Load model ===
def load_vae_model():
    arch_params = np.load("arch_params.npy", allow_pickle=True).item()
    model = VAE1D_Dynamic(
        input_length=arch_params['segment_length'],
        latent_dim=arch_params['latent_dim'],
        filters=arch_params['filters']
    )
    model.load_state_dict(torch.load("vae_model.pt", map_location=torch.device("cpu")))
    model.eval()
    return model, arch_params

vae_model, arch_params = load_vae_model()

# === Gradio handler ===
def generate_from_wav(wav_file):
    # Read WAV
    rate, signal = wavfile.read(wav_file)
    if len(signal.shape) > 1:
        signal = signal.mean(axis=1)  # convert to mono

    signal = signal.astype(np.float32)
    signal = (signal - np.mean(signal)) / np.std(signal)

    # Segment real signal
    segment_length = arch_params['segment_length']
    stride = 64
    segments = []
    for i in range(0, len(signal) - segment_length + 1, stride):
        segments.append(signal[i:i+segment_length])
    segments = np.array(segments)
    segments_tensor = torch.tensor(segments, dtype=torch.float32).unsqueeze(1)

    # Sample from model
    z = torch.randn(len(segments_tensor), arch_params['latent_dim'])
    with torch.no_grad():
        generated = vae_model.decode(z).squeeze().cpu().numpy()

    # Plot real vs generated (first segment example)
    plt.figure(figsize=(12, 4))
    plt.plot(segments[0], label='Real')
    plt.plot(generated[0], label='Generated')
    plt.legend()
    plt.title("First Segment: Real vs Generated")
    plt.grid(True)
    plot_path = "vae_signals/compare_segment.png"
    os.makedirs("vae_signals", exist_ok=True)
    plt.savefig(plot_path)
    plt.close()

    # Save generated segments as downloadable file
    npy_path = "vae_signals/generated_segments.npy"
    np.save(npy_path, generated)

    return plot_path, npy_path

# === Launch Gradio App ===
demo = gr.Interface(
    fn=generate_from_wav,
    inputs=gr.File(label="Upload WAV File"),
    outputs=[
        gr.Image(label="First Segment Comparison"),
        gr.File(label="Download Generated Segments (.npy)")
    ],
    title="Signal Generator with VAE",
    description="Upload a WAV file, and the model will return generated synthetic segments."
)

if __name__ == "__main__":
    if __name__ == "__main__":
        demo.launch(
            server_name="0.0.0.0",  
            server_port=8000,       
            share=False             
        )

