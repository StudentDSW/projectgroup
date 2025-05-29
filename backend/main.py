from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from app.api import user as APIuser
from app.api import group as APIgroup
from app.api import post as APIpost
from app.db import Base, engine

app = FastAPI()

# Include routers
app.include_router(APIuser.router)
app.include_router(APIgroup.router)
app.include_router(APIpost.router)

# Create database tables
Base.metadata.create_all(bind=engine)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.get("/")
async def root():
    return {"message": "App is working"}
