from fastapi import APIRouter, Depends, HTTPException, Request, Header
from typing import Dict, Any, List
from pydantic import BaseModel
from services.razorpay_service import create_razorpay_order, verify_razorpay_webhook_signature, RAZORPAY_MOCK_MODE
from services.pricing_service import get_pack_pricing, is_payment_restricted_to_india
from services.geolocation_service import detect_country
# Removed old topup_packs import - now using pricing_service
from database import get_db, create_user_subscription, update_user_subscription, get_user_subscription, AsyncSession, UserSubscription
from sqlalchemy.future import select
from datetime import datetime, timezone
import os
import json
import logging
from routes.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Models ---
class TopupRequest(BaseModel):
    pack_id: str

# --- Endpoints ---

@router.get("/topup-packs")
async def get_topup_packs(request: Request):
    # Auto-detect country and return packs for that country
    country_code = await detect_country(request) if request else "IN"
    
    try:
        packs = get_all_packs_for_country(country_code)
        return list(packs.values())
    except Exception:
        # Fallback to India packs
        packs = get_all_packs_for_country("IN")
        return list(packs.values())

@router.post("/purchase/topup")
async def purchase_topup(
    request: TopupRequest,
    current_user: dict = Depends(get_current_user),
    http_request: Request = None
):
    user_id = current_user['id']
    
    # Detect user's country
    country_code = await detect_country(http_request) if http_request else "IN"
    
    # Check if payments are restricted to India only
    if is_payment_restricted_to_india() and country_code != "IN":
        raise HTTPException(
            status_code=403, 
            detail=f"Payments are currently only available in India. Your country ({country_code}) will be supported soon!"
        )
    
    # Get country-specific pricing
    try:
        pricing = get_pack_pricing(request.pack_id, country_code)
        amount = pricing["amount"]
        currency = pricing["currency"]
    except ValueError:
        # Fallback to India pricing if pack not available in detected country
        pricing = get_pack_pricing(request.pack_id, "IN")
        amount = pricing["amount"]
        currency = pricing["currency"]
        country_code = "IN"
    
    # Store country_code in order notes for webhook processing
    order = create_razorpay_order(amount, user_id, request.pack_id, currency, country_code)
    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": currency,
        "country_code": country_code,
        "key_id": os.getenv("RAZORPAY_KEY_ID")
    }

@router.post("/webhook")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.error("RAZORPAY_WEBHOOK_SECRET not configured.")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    payload = await request.body()
    payload_str = payload.decode("utf-8")

    if not verify_razorpay_webhook_signature(payload_str, x_razorpay_signature, webhook_secret):
        logger.warning("Invalid Razorpay webhook signature.")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_data = json.loads(payload_str)
    event_type = event_data.get("event")

    logger.info(f"Received Razorpay webhook event: {event_type}")

    try:
        if event_type == "payment.captured":
            payment_entity = event_data["payload"]["payment"]["entity"]
            notes = payment_entity.get("notes", {})
            user_id = notes.get("user_id")
            pack_id = notes.get("pack_id")
            country_code = notes.get("country_code", "IN")  # Get country from order notes, default to IN
            
            # Get pack info from PPP data using the correct country
            try:
                pack_info = get_pack_pricing(pack_id, country_code)
                messages_purchased = pack_info["messages"]
                logger.info(f"User {user_id} purchased {pack_id} from {country_code} - {messages_purchased} messages")
            except ValueError:
                logger.error(f"Pack not found for pack_id: {pack_id} in country: {country_code}")
                raise HTTPException(status_code=404, detail="Pack not found in webhook")

            subscription = await get_user_subscription(user_id, db)
            if subscription:
                # Persist latest order_id as well as updated quota so we always
                # have a reference to the most recent successful purchase.
                await update_user_subscription(
                    db,
                    subscription.id,
                    message_quota=subscription.message_quota + messages_purchased,
                    razorpay_order_id=payment_entity["order_id"]
                )
                logger.info(f"Added {messages_purchased} messages to user {user_id} (now {subscription.message_quota + messages_purchased})")
            else:
                await create_user_subscription(
                    db,
                    user_id=user_id,
                    razorpay_order_id=payment_entity["order_id"],
                    plan_id=pack_id,
                    message_quota=messages_purchased
                )
                logger.info(f"Created new topup record for user {user_id} with {messages_purchased} messages.")

    except Exception as e:
        logger.error(f"Error processing Razorpay webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Webhook processing failed")

    return {"status": "success"}

@router.get("/current-subscription", response_model=Dict[str, Any])
async def get_current_user_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user['id']
    subscription = await get_user_subscription(user_id, db)
    if not subscription:
        return {"messages_used": 0, "message_quota": 0, "plan_name": "Free Trial"}
    # The original code had get_plan_by_id here, which is removed.
    # Assuming the intent was to return a placeholder or remove this endpoint
    # if no plan details are available.
    # For now, returning a placeholder as per the original file's structure.
    return {
        "plan_id": subscription.plan_id,
        "plan_name": "Unknown Plan", # Placeholder as get_plan_by_id is removed
        "messages_used": subscription.messages_used,
        "message_quota": subscription.message_quota,
        "razorpay_order_id": subscription.razorpay_order_id
    } 