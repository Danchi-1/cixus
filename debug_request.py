import urllib.request
import json
import urllib.error
import ssl
import time

# Bypass SSL verification if needed
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = "http://localhost:8000"

def run_debug():
    print(f"Probing {BASE_URL}...")
    
    # 1. Check Health
    try:
        with urllib.request.urlopen(f"{BASE_URL}/", context=ctx) as response:
            print(f"Health Check: {response.status}")
    except Exception as e:
        print(f"Health Check Failed: {e}")

    # 2. Try to Create Player (Triggers DB)
    print("Attempting to Create Player...")
    url = f"{BASE_URL}/api/v1/players/"
    data = {"username": f"Commander-Debug-{int(time.time())}"}
    headers = {"Content-Type": "application/json"}
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Player Creation Status: {response.status}")
            print(f"Response: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Player Creation Error: {e.code} - {e.reason}")
        print(f"Error Body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Player Creation Exception: {e}")

if __name__ == "__main__":
    run_debug()
