from twilio.rest import Client
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_otp_sms(phone_number, otp_code):
    """
    Sends an OTP SMS using Twilio with enhanced connectivity and error handling.
    """
    if not settings.USE_TWILIO:
        print(f"--- [SMS_SYSTEM] Twilio not configured. OTP for {phone_number} is {otp_code} ---")
        return False

    # Standardize phone number for Twilio (ensure it starts with + and has country code)
    to_number = phone_number
    if not to_number.startswith('+'):
        # Only add +91 if it's a 10-digit number
        clean_digits = "".join([c for c in phone_number if c.isdigit()])
        if len(clean_digits) == 10:
            to_number = f"+91{clean_digits}"
        else:
            to_number = f"+{clean_digits}"

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # Prepare message parameters
        message_params = {
            "body": f"Your HealthChain OTP is: {otp_code}. Valid for 5 minutes. Do not share this with anyone.",
            "to": to_number
        }
        
        # Priority 1: Messaging Service SID (Best for production)
        # Priority 2: Standard Phone Number
        if settings.TWILIO_MESSAGING_SERVICE_SID:
            message_params["messaging_service_sid"] = settings.TWILIO_MESSAGING_SERVICE_SID
        else:
            message_params["from_"] = settings.TWILIO_PHONE_NUMBER

        message = client.messages.create(**message_params)
        
        logger.info(f"SMS SENT | TO: {to_number} | SID: {message.sid}")
        print(f"--- [SMS_SYSTEM] Real SMS sent to {to_number} ---")
        return True
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"SMS FAILED | TO: {phone_number} | ERROR: {error_msg}")
        
        # Diagnostic print for the developer
        print(f"--- [SMS_SYSTEM] Twilio Connectivity Error: {error_msg} ---")
        
        if "is not a Twilio phone number" in error_msg:
            print("TIP: Check your .env file. The TWILIO_PHONE_NUMBER must be the number GIVEN by Twilio (starts with +1 usually), not your personal number.")
        elif "unverified" in error_msg.lower():
            print("TIP: You are using a Twilio Trial account. You must VERIFY the recipient's phone number in the Twilio Console before you can send to it.")
            
        return False
