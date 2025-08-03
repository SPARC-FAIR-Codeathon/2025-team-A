from fastapi import FastAPI
from app.routes.signal_generation import router as signal_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title=f"SYNAPSE API",
    version="1.0.0",
)
app.include_router(signal_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)