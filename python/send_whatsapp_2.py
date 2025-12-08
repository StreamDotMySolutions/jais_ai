import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
TO_NUMBER = os.getenv("WHATSAPP_TO")

url = f"https://graph.facebook.com/v22.0/{PHONE_ID}/messages"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "messaging_product": "whatsapp",
    "to": TO_NUMBER,
    "type": "template",
    "template": {
                    "name": "hello_world",
                    "language": {
                                    "code": "en_US"
                                }
                }
    }

response = requests.post(url, headers=headers, data=json.dumps(payload))

print("Status Code:", response.status_code)
print("Response:", response.text)