from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import user, group, post
from app.db import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(user.router)
app.include_router(group.router)
app.include_router(post.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the API"} 