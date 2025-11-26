import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class WhatsAppMessenger:
    """
    A simple class to send WhatsApp messages using the WhatsApp Business API
    """
    
    def __init__(self):
        self.token = os.getenv('WHATSAPP_TOKEN')
        self.phone_id = os.getenv('WHATSAPP_PHONE_ID')
        self.to_number = os.getenv('WHATSAPP_TO')
        self.api_url = f"https://graph.instagram.com/v18.0/{self.phone_id}/messages"
        
        if not all([self.token, self.phone_id, self.to_number]):
            raise ValueError("Missing required environment variables: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, or WHATSAPP_TO")
    
    def send_message(self, message_text):
        """
        Send a text message via WhatsApp
        
        Args:
            message_text (str): The message content to send
            
        Returns:
            dict: Response from the API
        """
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
        }
        
        payload = {
            'messaging_product': 'whatsapp',
            'to': self.to_number,
            'type': 'text',
            'text': {
                'preview_url': False,
                'body': message_text
            }
        }
        
        try:
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()  # Raise an exception for bad status codes
            
            print(f"✓ Message sent successfully!")
            print(f"Response: {response.json()}")
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"✗ Error sending message: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            return None
    
    def send_template_message(self, template_name, language='en'):
        """
        Send a template message via WhatsApp
        
        Args:
            template_name (str): Name of the template
            language (str): Language code (default: 'en')
            
        Returns:
            dict: Response from the API
        """
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
        }
        
        payload = {
            'messaging_product': 'whatsapp',
            'to': self.to_number,
            'type': 'template',
            'template': {
                'name': template_name,
                'language': {
                    'code': language
                }
            }
        }
        
        try:
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            
            print(f"✓ Template message sent successfully!")
            print(f"Response: {response.json()}")
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"✗ Error sending template message: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            return None


def main():
    """
    Example usage of the WhatsAppMessenger class
    """
    try:
        messenger = WhatsAppMessenger()
        
        # Send a simple text message
        message = "Hello! This is a test message from JAIS AI."
        messenger.send_message(message)
        
        # Uncomment below to send a template message
        # messenger.send_template_message('hello_world')
        
    except ValueError as e:
        print(f"Configuration Error: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == '__main__':
    main()
