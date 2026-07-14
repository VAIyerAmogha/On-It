import sys
import os

# Add the backend root to sys.path so all imports resolve correctly
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

# Also add the directory containing routers, lib, etc.
sys.path.insert(0, os.path.join(backend_root, "backend") if os.path.exists(os.path.join(backend_root, "backend")) else backend_root)

from main import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")