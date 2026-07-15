from contextlib import asynccontextmanager
from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class COOPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
        return response

from routers.auth import router as auth_router
from routers.settings import router as settings_router
from routers.contracts import router as contracts_router
from routers.milestones import router as milestones_router
from routers.invoices import router as invoices_router
from routers.contract_qa import router as contract_qa_router
from routers.notifications import router as notifications_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("startup")
    yield
    print("shutdown")

app = FastAPI(lifespan=lifespan)

app.add_middleware(COOPMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
app.include_router(contracts_router, prefix="/api/contracts", tags=["contracts"])
app.include_router(milestones_router, prefix="/api/milestones", tags=["milestones"])
app.include_router(invoices_router, prefix="/api/invoices", tags=["invoices"])
app.include_router(contract_qa_router, prefix="/api/contracts", tags=["contract_qa"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])

@app.get("/health")
async def health():
    return {"status": "ok"}


