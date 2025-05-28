from fastapi import FastAPI
import app.api.user as APIuser
import app.api.group as APIgroup
from  app.db import Base, engine
import app.api.post as APIpost
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.include_router(APIuser.router)
app.include_router(APIgroup.router)
app.include_router(APIpost.router)
Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:5173",  # Frontend development server
    "http://127.0.0.1:5173"   # Alternative frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,  # Changed to False since we're using token auth
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "App is working"}
