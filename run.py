

from generate_vae import generate_signals
from train_vae import train_model


train_model(
    wav_path="./primary/sub-1001/perf-1001-A/01-A-1.wav",
    epochs=30,
    batch_size=256,
    stride=128,
    learning_rate=0.0005,
    normalize=True,
    save_dir="vae_outputs"
)

generate_signals(
    param1=10,
    param2=None,
    param3=None,
    param4=None,
    param5=None
)
