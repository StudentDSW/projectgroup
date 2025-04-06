from fastapi import FastAPI
import app.api.user as APIuser
import app.api.group as APIgroup
from  app.db import Base, engine
import app.api.post as APIpost


app = FastAPI()
app.include_router(APIuser.router)
app.include_router(APIgroup.router)
app.include_router(APIpost.router)
Base.metadata.create_all(bind=engine)


@app.get("/")
async def root():
    return {"message": "App is working"}
