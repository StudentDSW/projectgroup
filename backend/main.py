from fastapi import FastAPI
import app.api.user as APIuser
import app.api.group as APIgroup
from  app.db import Base, engine


app = FastAPI()
app.include_router(APIuser.router)
app.include_router(APIgroup.router)
Base.metadata.create_all(bind=engine)


@app.get("/")
async def root():
    return {"message": "App is working"}
