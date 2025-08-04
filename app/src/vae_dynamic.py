import torch
import torch.nn as nn
import torch.nn.functional as F

class VAE1D_Dynamic(nn.Module):
    def __init__(self, input_length=1024, latent_dim=64, filters=[32, 64, 128]):
        super(VAE1D_Dynamic, self).__init__()
        self.latent_dim = latent_dim
        self.input_length = input_length
        self.filters = filters

        # ----------------------
        # Encoder
        # ----------------------
        self.encoder_layers = nn.ModuleList()
        in_channels = 1
        current_length = input_length

        for f in filters:
            self.encoder_layers.append(
                nn.Conv1d(in_channels, f, kernel_size=5, stride=2, padding=2)
            )
            in_channels = f
            current_length = (current_length + 2 * 2 - 5) // 2 + 1

        self.flattened_size = in_channels * current_length
        self.fc_mu = nn.Linear(self.flattened_size, latent_dim)
        self.fc_logvar = nn.Linear(self.flattened_size, latent_dim)

        # ----------------------
        # Decoder
        # ----------------------
        self.decoder_input = nn.Linear(latent_dim, self.flattened_size)

        self.decoder_layers = nn.ModuleList()
        reversed_filters = list(reversed(filters))

        for i in range(len(reversed_filters) - 1):
            self.decoder_layers.append(
                nn.ConvTranspose1d(
                    reversed_filters[i], reversed_filters[i + 1],
                    kernel_size=5, stride=2, padding=2, output_padding=1
                )
            )

        # Final output layer (no activation)
        self.final_layer = nn.ConvTranspose1d(
            reversed_filters[-1], 1,
            kernel_size=5, stride=2, padding=2, output_padding=1
        )

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def encode(self, x):
        for layer in self.encoder_layers:
            x = F.leaky_relu(layer(x))
        x = torch.flatten(x, start_dim=1)
        mu = self.fc_mu(x)
        logvar = self.fc_logvar(x)
        return mu, logvar

    def decode(self, z):
        x = self.decoder_input(z)
        # Dynamically infer reshaping length
        intermediate_length = self.flattened_size // self.filters[-1]
        x = x.view(-1, self.filters[-1], intermediate_length)
        for layer in self.decoder_layers:
            x = F.leaky_relu(layer(x))
        x = self.final_layer(x)  # No activation
        return x

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        x_hat = self.decode(z)
        return x_hat, mu, logvar
