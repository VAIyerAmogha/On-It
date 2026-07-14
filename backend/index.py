import sys
import os

# Ensure the project root is on sys.path so sibling modules (lib/, routers/, etc.)
# are importable. Vercel deploys all backend files to /var/task, so we add it
# explicitly in case __file__ resolves to the vendor path instead of /var/task.
_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)
if "/var/task" not in sys.path:
    sys.path.insert(0, "/var/task")

from main import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")