import torch
from torch import nn

z_dim = 100
signal_len = 500
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class Generator(nn.Module):
    def __init__(self, z_dim=100, signal_len=500):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(z_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 512),
            nn.ReLU(),
            nn.Linear(512, signal_len),
            nn.Tanh(),
        )

    def forward(self, z):
        return self.net(z)

def load_models():
    G_ecg = Generator(z_dim, signal_len).to(device)
    G_ecg.load_state_dict(torch.load("G_ecg.pth", map_location=device))
    G_ecg.eval()

    G_eeg = Generator(z_dim, signal_len).to(device)
    G_eeg.load_state_dict(torch.load("G_eeg.pth", map_location=device))
    G_eeg.eval()

    return G_ecg, G_eeg

def generate_signal(G):
    z = torch.randn(1, z_dim).to(device)
    with torch.no_grad():
        return G(z).cpu().numpy().flatten()
