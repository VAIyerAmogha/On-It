import sys
import os

# Add the backend root (/var/task on Vercel) to sys.path so that
# lib/, routers/, models/, config.py, db.py etc. are all importable.
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from main import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")