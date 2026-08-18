import os
from pathlib import Path

# Simulate backend.py paths
ROOT = Path("c:/Users/AdityaJi/OneDrive/Desktop/Stream/sdk/test_harness")
LOCAL_ROOT = Path("c:/Users/AdityaJi/OneDrive/Desktop/Stream/sdk/storage")

video_id = "0515df35-19b8-4c5f-969c-af0d695228ea"
path = "master.m3u8"

target = (LOCAL_ROOT / "videos" / video_id / path).resolve()
root_resolved = LOCAL_ROOT.resolve()

print("LOCAL_ROOT:", LOCAL_ROOT)
print("LOCAL_ROOT resolved:", root_resolved)
print("target:", target)
print("target resolved:", target.resolve())
print("target.exists():", target.exists())

startswith_check = str(target).lower().startswith(str(root_resolved).lower())
print("startswith_check:", startswith_check)

# Now, let's find the backend.py file on disk and see what it actually has
backend_path = Path("c:/Users/AdityaJi/OneDrive/Desktop/Stream/sdk/test_harness/backend.py")
print("backend.py exists:", backend_path.exists())
if backend_path.exists():
    with open(backend_path) as f:
        content = f.read()
    print("LOCAL_ROOT definition in backend.py:")
    for line in content.splitlines():
        if "LOCAL_ROOT =" in line:
            print("  ", line)
