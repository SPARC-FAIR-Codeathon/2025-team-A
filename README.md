# 2025-team-A

---

## SYNAPSE Signal Generator

**Version:** 1.0.0
**Tech Stack:** `FastAPI + Gradio + PyTorch`
**Purpose:** Upload a `.wav` EEG/ECG signal → Normalize & segment it → Generate realistic synthetic signals using a pretrained VAE model → Get downloadable outputs and visual comparison.

---

### 🚀 How to Run

#### 🔧 Option 1: Local or Server Execution

```bash
python gradio_demo.py
```

To expose it publicly (e.g., on a remote server):

```python
# Inside gradio_demo.py
demo.launch(server_name="0.0.0.0", server_port=8000)
```

#### 🐳 Option 2: Docker Compose

```bash
docker compose up --build
```

Make sure `vae_model.pt` and `arch_params.npy` are available in your working directory.

---

### 🌐 Access the UIs

| Interface                | URL                                                                      |
| ------------------------ | ------------------------------------------------------------------------ |
| **Gradio Web UI**        | [http://65.109.180.201:8000](http://65.109.180.201:8000)                 |
| **FastAPI Swagger Docs** | [http://65.109.180.201/docs](http://65.109.180.201/docs)                 |
| **OpenAPI JSON**         | [http://65.109.180.201/openapi.json](http://65.109.180.201/openapi.json) |

---

### 🎨 Gradio UI Instructions

1. Visit [http://65.109.180.201:8000](http://65.109.180.201:8000)
2. Upload a `.wav` file (1D mono-channel EEG/ECG recommended)
3. The app will:

   * Normalize & segment the signal
   * Generate synthetic signals using VAE
   * Show a plot (`real vs generated segment`)
   * Provide a downloadable `.npy` of all generated segments

---

### 🔁 FastAPI Endpoint

#### ➤ POST `/generate/`

Generates synthetic signals from a `.wav` file using VAE.

* **URL:** `http://65.109.180.201/generate/`
* **Method:** `POST`
* **Request:** `multipart/form-data`
* **Field:** `file` (`.wav`, required)

#### 📦 Sample Request (cURL)

```bash
curl -X 'POST' \
  'http://65.109.180.201/generate/' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@example.wav;type=audio/x-wav'
```

#### ✅ Sample Response (JSON)

```json
{
  "samples": [0.052, -0.011, ...],  // 1D array of floats
  "length": 512
}
```

---

