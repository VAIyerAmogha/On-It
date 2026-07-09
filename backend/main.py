from contextlib import asynccontextmanager
from fastapi import FastAPI
from routers.auth import router as auth_router
from routers.settings import router as settings_router
from routers.contracts import router as contracts_router
from routers.milestones import router as milestones_router
from routers.invoices import router as invoices_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("startup")
    yield
    print("shutdown")

app = FastAPI(lifespan=lifespan)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
app.include_router(contracts_router, prefix="/api/contracts", tags=["contracts"])
app.include_router(milestones_router, prefix="/api/milestones", tags=["milestones"])
app.include_router(invoices_router, prefix="/api/invoices", tags=["invoices"])

@app.get("/health")
async def health():
    return {"status": "ok"}


