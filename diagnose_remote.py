import urllib.request
import json
import ssl

# Bypass SSL verification
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = "https://cixus.onrender.com"

def check_endpoint(path):
    print(f"--- Checking {path} ---")
    try:
        url = f"{BASE_URL}{path}"
        req = urllib.request.Request(url, headers={"User-Agent": "DebugScript/1.0"})
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Status: {response.status}")
            body = response.read().decode('utf-8')
            try:
                print(json.dumps(json.loads(body), indent=2))
            except:
                print(body)
    except Exception as e:
        print(f"FAILED: {e}")
        if hasattr(e, 'read'):
             print(e.read().decode('utf-8'))

if __name__ == "__main__":
    check_endpoint("/")
    check_endpoint("/reset-db") # FORCE RESET
    check_endpoint("/debug-db")
    
    print("\n--- Attempting to Create Player ---")
    try:
        url = f"{BASE_URL}/api/v1/players/"
        data = json.dumps({"username": "TestCommander_Debug_1"}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "DebugScript"})
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Status: {response.status}")
            print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"FAILED: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"ERROR: {e}")
