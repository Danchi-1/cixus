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

# ... player creation ...
# ... player creation ...
print(f"Creating Player...")
player_req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(player_req, context=ctx) as response:
        player_data = json.loads(response.read().decode('utf-8'))
        player_id = player_data["id"]
        print(f"Player Created: {player_id}")

        # 3. Start War
        war_url = "https://cixus.onrender.com/api/v1/war/start"
        war_data = {"player_id": player_id, "difficulty": 1}
        print(f"Starting War at {war_url}...")
        
        war_req = urllib.request.Request(war_url, data=json.dumps(war_data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(war_req, context=ctx) as war_response:
            war_resp = json.loads(war_response.read().decode('utf-8'))
            war_id = war_resp["war_id"]
            print(f"War Started: {war_id}")
            
            # 4. Submit Command
            cmd_url = f"https://cixus.onrender.com/api/v1/war/{war_id}/command"
            cmd_data = {"type": "text", "content": "attack left flank"}
            print(f"Sending Command to {cmd_url}...")
            
            cmd_req = urllib.request.Request(cmd_url, data=json.dumps(cmd_data).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(cmd_req, context=ctx) as cmd_response:
                print("Command Success!")
                print(cmd_response.read().decode('utf-8'))

except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Error Body:")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"General Error: {e}")
