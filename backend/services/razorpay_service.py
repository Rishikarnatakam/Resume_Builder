
import razorpay
import os
from dotenv import load_dotenv
import time

load_dotenv()

# Check if mock mode is enabled
RAZORPAY_MOCK_MODE = os.getenv("RAZORPAY_MOCK_MODE", "false").lower() == "true"

# Initialize Razorpay client
# Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in your .env file
# For local testing, use your Test Key ID and Secret.
razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

def create_razorpay_order(amount: int, user_id: str, pack_id: str, currency: str = "INR") -> dict:
    # Ensure receipt is <= 40 chars
    short_user_id = user_id[:8]
    short_time = str(int(time.time()))
    receipt = f"topup_{short_user_id}_{short_time}"[:40]
    data = {
        "amount": amount,  # in paise
        "currency": currency,
        "receipt": receipt,
        "notes": {"user_id": user_id, "pack_id": pack_id}
    }
    return razorpay_client.order.create(data)

def create_razorpay_subscription(plan_id: str, user_id: str, total_count: int = 12) -> dict:
    """
    Creates a Razorpay subscription for a given plan.
    total_count: number of billing cycles (e.g., 12 for 12 months)
    user_id: your app's user ID to be passed in notes for webhook identification
    """
    if RAZORPAY_MOCK_MODE:
        # Debug logging removed for production
        return {
            "id": f"sub_mock_{plan_id}_{os.urandom(4).hex()}",
            "entity": "subscription",
            "plan_id": plan_id,
            "status": "created",
            "current_start": 1678886400,
            "current_end": 1709424000,
            "start_at": 1678886400,
            "charge_at": 1678886400,
            "ended_at": None,
            "quantity": 1,
            "customer_id": f"cust_mock_{os.urandom(4).hex()}",
            "total_count": total_count,
            "paid_count": 0,
            "remaining_count": total_count,
            "notes": {"user_id": user_id},
            "cancel_by": None,
            "addons": [],
            "offer_id": None,
            "short_url": "https://mock.razorpay.com/subscription/link",
            "has_scheduled_changes": False,
            "created_at": 1678886400,
            "expire_by": None
        }
    data = {
        "plan_id": plan_id,
        "total_count": total_count,
        "customer_notify": 1,
        "notes": {
            "user_id": user_id
        }
    }
    return razorpay_client.subscription.create(data)

def fetch_razorpay_subscription(subscription_id: str) -> dict:
    """
    Fetches details of a Razorpay subscription.
    """
    if RAZORPAY_MOCK_MODE:
        # Debug logging removed for production
        return {"id": subscription_id, "status": "active", "plan_id": "plan_mock_fetched"} # Mock data
    return razorpay_client.subscription.fetch(subscription_id)

def cancel_razorpay_subscription(subscription_id: str, at_cycle_end: bool = False) -> dict:
    """
    Cancels a Razorpay subscription.
    If at_cycle_end is True, the subscription will be cancelled at the end of the current billing cycle.
    """
    if RAZORPAY_MOCK_MODE:
        # Debug logging removed for production
        return {"id": subscription_id, "status": "cancelled", "cancel_by": "user"} # Mock data
    return razorpay_client.subscription.cancel(subscription_id, {"cancel_at_cycle_end": 1 if at_cycle_end else 0})

def verify_razorpay_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """
    Verifies the Razorpay webhook signature.
    """
    if RAZORPAY_MOCK_MODE:
        # Debug logging removed for production
        return True # Always return true in mock mode
    try:
        razorpay_client.utility.verify_webhook_signature(payload, signature, secret)
        return True
    except Exception as e:
        # Debug logging removed for production
        return False 