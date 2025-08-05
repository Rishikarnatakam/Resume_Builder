from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Dict, Any, List
from pydantic import BaseModel
from services.geolocation_service import detect_country
from services.pricing_service import (
    get_pack_pricing, 
    get_all_packs_for_country, 
    get_supported_countries,
    validate_country_support,
    is_payment_restricted_to_india,
    clear_ppp_cache
)
from routes.auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Models ---
class PricingRequest(BaseModel):
    pack_id: str
    country_code: str = None  # Optional, will auto-detect if not provided

class CountryDetectionResponse(BaseModel):
    country_code: str
    country_name: str
    currency: str
    symbol: str

# --- Endpoints ---

@router.get("/detect-country")
async def detect_user_country(request: Request) -> CountryDetectionResponse:
    """
    Detect user's country and return currency information
    """
    try:
        country_code = await detect_country(request)
        
        # Get currency info for the detected country
        from services.pricing_service import get_currency_info
        currency_info = get_currency_info(country_code)
        
        if not currency_info:
            # Fallback to US
            country_code = "US"
            currency_info = get_currency_info("US")
        
        # Get country name
        supported_countries = get_supported_countries()
        country_name = supported_countries.get(country_code, "Unknown")
        
        return CountryDetectionResponse(
            country_code=country_code,
            country_name=country_name,
            currency=currency_info["currency"],
            symbol=currency_info["symbol"]
        )
        
    except Exception as e:
        logger.error(f"Error detecting country: {e}")
        # Return US as fallback
        return CountryDetectionResponse(
            country_code="US",
            country_name="United States",
            currency="USD",
            symbol="$"
        )

@router.get("/packs/{country_code}")
async def get_packs_for_country(country_code: str) -> Dict[str, Any]:
    """
    Get all available packs for a specific country
    """
    try:
        if not validate_country_support(country_code):
            raise HTTPException(status_code=400, detail=f"Country {country_code} not supported")
        
        packs = get_all_packs_for_country(country_code)
        
        # Get country info
        from services.pricing_service import get_currency_info
        currency_info = get_currency_info(country_code)
        supported_countries = get_supported_countries()
        country_name = supported_countries.get(country_code, "Unknown")
        
        return {
            "country_code": country_code,
            "country_name": country_name,
            "currency": currency_info["currency"],
            "symbol": currency_info["symbol"],
            "packs": list(packs.values())
        }
        
    except Exception as e:
        logger.error(f"Error getting packs for country {country_code}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get pricing information")

@router.get("/pack/{pack_id}")
async def get_pack_pricing_by_country(
    pack_id: str, 
    request: Request,
    country_code: str = None
) -> Dict[str, Any]:
    """
    Get pricing for a specific pack, auto-detecting country if not provided
    """
    try:
        # Auto-detect country if not provided
        if not country_code:
            country_code = await detect_country(request)
        
        if not validate_country_support(country_code):
            # Fallback to US
            country_code = "US"
        
        pricing = get_pack_pricing(pack_id, country_code)
        
        # Add country info
        supported_countries = get_supported_countries()
        country_name = supported_countries.get(country_code, "Unknown")
        
        return {
            "pack_id": pack_id,
            "country_code": country_code,
            "country_name": country_name,
            "pricing": pricing
        }
        
    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting pack pricing: {e}")
        raise HTTPException(status_code=500, detail="Failed to get pricing information")

@router.get("/supported-countries")
async def get_supported_countries_list() -> Dict[str, str]:
    """
    Get list of all supported countries
    """
    try:
        return get_supported_countries()
    except Exception as e:
        logger.error(f"Error getting supported countries: {e}")
        raise HTTPException(status_code=500, detail="Failed to get supported countries")

@router.get("/payment-restriction")
async def get_payment_restriction_status() -> Dict[str, bool]:
    """
    Get payment restriction status
    """
    try:
        return {"india_only": is_payment_restricted_to_india()}
    except Exception as e:
        logger.error(f"Error getting payment restriction status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment restriction status")

@router.post("/clear-cache")
async def clear_pricing_cache() -> Dict[str, str]:
    """
    Clear the pricing cache to force reload of PPP data
    """
    try:
        clear_ppp_cache()
        return {"message": "Pricing cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing pricing cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear pricing cache")

@router.get("/debug-config")
async def debug_config() -> Dict[str, Any]:
    """
    Debug endpoint to check current configuration
    """
    try:
        import os
        from services.pricing_service import load_ppp_data
        ppp_data = load_ppp_data()
        return {
            "india_only_payments": os.getenv("INDIA_ONLY_PAYMENTS", "false"),
            "total_countries": len(ppp_data),
            "environment": os.getenv("ENVIRONMENT", "development")
        }
    except Exception as e:
        logger.error(f"Error getting debug config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get debug config")

@router.post("/pack/{pack_id}/pricing")
async def get_pack_pricing_with_request(
    pack_id: str,
    request: PricingRequest,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get pricing for a specific pack with explicit country code
    Requires authentication
    """
    try:
        country_code = request.country_code or "US"
        
        if not validate_country_support(country_code):
            raise HTTPException(status_code=400, detail=f"Country {country_code} not supported")
        
        pricing = get_pack_pricing(pack_id, country_code)
        
        # Add user context
        supported_countries = get_supported_countries()
        country_name = supported_countries.get(country_code, "Unknown")
        
        return {
            "pack_id": pack_id,
            "user_id": current_user["id"],
            "country_code": country_code,
            "country_name": country_name,
            "pricing": pricing
        }
        
    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting pack pricing: {e}")
        raise HTTPException(status_code=500, detail="Failed to get pricing information") 