import urllib.request
import json
import urllib.error
import ssl

# Bypass SSL verification if needed (for debugging only, though Render has valid certs)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://cixus.onrender.com/api/v1/players/"
data = {"username": "Commander-Debug-Script-01"}
headers = {"Content-Type": "application/json"}

# Reset DB First
reset_url = "https://cixus.onrender.com/reset-db"
print(f"Triggering DB Reset at {reset_url}...")
try:
    with urllib.request.urlopen(reset_url, context=ctx) as response:
        print(f"Reset Status: {response.status}")
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Reset Failed: {e}")

print(f"\nSending POST to {url}...")
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        print(f"Status: {response.status}")
        print("Response Body:")
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Error Body:")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"General Error: {e}")
