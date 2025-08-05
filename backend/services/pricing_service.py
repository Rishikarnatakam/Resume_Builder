import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Cache for PPP data to avoid repeated file reads
_ppp_data_cache = None

def load_ppp_data() -> Dict[str, Any]:
    """
    Load PPP data from JSON file with caching
    """
    global _ppp_data_cache
    
    if _ppp_data_cache is not None:
        return _ppp_data_cache
    
    try:
        # Get the path to the config directory
        config_path = Path(__file__).parent.parent / "config" / "ppp_data.json"
        
        with open(config_path, 'r', encoding='utf-8') as f:
            _ppp_data_cache = json.load(f)
            logger.info(f"Loaded PPP data for {len(_ppp_data_cache)} countries")
            return _ppp_data_cache
            
    except FileNotFoundError:
        logger.error(f"PPP data file not found at {config_path}")
        # Return default US-only data
        return {
            "US": {
                "currency": "USD",
                "symbol": "$",
                "smallest_unit": "cents",
                "packs": {
                    "basic": {"price": 499, "messages": 5},
                    "pro": {"price": 799, "messages": 5},
                    "ultra": {"price": 1499, "messages": 30}
                }
            }
        }
    except Exception as e:
        logger.error(f"Error loading PPP data: {e}")
        return {}

def get_pack_pricing(pack_id: str, country_code: str) -> Dict[str, Any]:
    """
    Get pricing for a specific pack in a specific country
    Returns pricing information with amount, currency, symbol, and display price
    """
    ppp_data = load_ppp_data()
    
    # Get country info, default to US if not found
    country_info = ppp_data.get(country_code, ppp_data.get("US"))
    
    if not country_info:
        logger.error(f"Country info not found for {country_code}")
        raise ValueError(f"Country {country_code} not supported")
    
    # Get pack info
    pack_info = country_info["packs"].get(pack_id)
    if not pack_info:
        logger.error(f"Pack {pack_id} not found for country {country_code}")
        raise ValueError(f"Pack {pack_id} not available for country {country_code}")
    
    # Format display price
    display_price = format_currency_display(
        pack_info["price"], 
        country_info["currency"], 
        country_info["symbol"]
    )
    
    return {
        "amount": pack_info["price"],  # Amount in smallest currency unit
        "currency": country_info["currency"],
        "symbol": country_info["symbol"],
        "messages": pack_info["messages"],
        "display_price": display_price,
        "country_code": country_code,
        "smallest_unit": country_info["smallest_unit"]
    }

def format_currency_display(amount: int, currency: str, symbol: str) -> str:
    """
    Convert amount from smallest unit to display format
    """
    try:
        if currency == "INR":
            # Convert paise to rupees (no decimals for INR)
            return f"{symbol}{amount / 100:.0f}"
        elif currency == "JPY":
            # Yen doesn't have smaller units
            return f"{symbol}{amount}"
        elif currency == "AED":
            # Convert fils to dirhams
            return f"{symbol}{amount / 100:.2f}"
        else:
            # Convert cents to main currency (USD, EUR, GBP, etc.)
            return f"{symbol}{amount / 100:.2f}"
    except Exception as e:
        logger.error(f"Error formatting currency display: {e}")
        return f"{symbol}{amount}"

def get_all_packs_for_country(country_code: str) -> Dict[str, Any]:
    """
    Get all available packs for a specific country
    """
    ppp_data = load_ppp_data()
    country_info = ppp_data.get(country_code, ppp_data.get("US"))
    
    if not country_info:
        logger.error(f"Country info not found for {country_code}")
        return {}
    
    packs = {}
    for pack_id, pack_info in country_info["packs"].items():
        display_price = format_currency_display(
            pack_info["price"],
            country_info["currency"],
            country_info["symbol"]
        )
        
        packs[pack_id] = {
            "id": pack_id,
            "price": pack_info["price"],
            "messages": pack_info["messages"],
            "currency": country_info["currency"],
            "symbol": country_info["symbol"],
            "display_price": display_price
        }
    
    return packs

def get_supported_countries() -> Dict[str, str]:
    """
    Get list of supported countries with their names
    """
    ppp_data = load_ppp_data()
    
    # Country code to name mapping
    country_names = {
        "IN": "India",
        "US": "United States",
        "GB": "United Kingdom",
        "CA": "Canada",
        "AU": "Australia",
        "DE": "Germany",
        "FR": "France",
        "SG": "Singapore",
        "AE": "United Arab Emirates",
        "JP": "Japan"
    }
    
    supported = {}
    for country_code in ppp_data.keys():
        if country_code in country_names:
            supported[country_code] = country_names[country_code]
    
    return supported

def validate_country_support(country_code: str) -> bool:
    """
    Check if a country is supported
    """
    ppp_data = load_ppp_data()
    return country_code in ppp_data

def get_currency_info(country_code: str) -> Optional[Dict[str, str]]:
    """
    Get currency information for a country
    """
    ppp_data = load_ppp_data()
    country_info = ppp_data.get(country_code)
    
    if not country_info:
        return None
    
    return {
        "currency": country_info["currency"],
        "symbol": country_info["symbol"],
        "smallest_unit": country_info["smallest_unit"]
    }

def is_payment_restricted_to_india() -> bool:
    """
    Check if payments are restricted to India only
    """
    import os
    env_setting = os.getenv("INDIA_ONLY_PAYMENTS", "false")
    return env_setting.lower() == "true"

def clear_ppp_cache():
    """
    Clear the PPP data cache to force reload
    """
    global _ppp_data_cache
    _ppp_data_cache = None
    logger.info("PPP data cache cleared") 