import httpx
import logging
from fastapi import Request
from typing import Optional

logger = logging.getLogger(__name__)

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    # Check for forwarded headers (behind proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host
    
    return client_ip

async def detect_country(request: Request) -> str:
    """
    Detect user country using IP geolocation with fallback to browser locale
    Returns country code (e.g., 'US', 'IN', 'GB')
    """
    try:
        # Get client IP
        client_ip = get_client_ip(request)
        
        # Skip localhost/private IPs
        if client_ip in ['127.0.0.1', 'localhost', '::1'] or client_ip.startswith('192.168.') or client_ip.startswith('10.'):
            logger.info(f"Local/private IP detected: {client_ip}, using browser locale fallback")
            return _parse_browser_locale(request)
        
        # Use free IP geolocation API
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"http://ip-api.com/json/{client_ip}")
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "success":
                country_code = data.get("countryCode", "IN")
                logger.info(f"Country detected via IP: {country_code} for IP: {client_ip}")
                return country_code
            else:
                logger.warning(f"IP geolocation failed for {client_ip}, using browser locale fallback")
                return _parse_browser_locale(request)
                
    except Exception as e:
        logger.error(f"Error detecting country: {e}")
        return _parse_browser_locale(request)

def _parse_browser_locale(request: Request) -> str:
    """
    Parse browser Accept-Language header to get country
    Fallback method when IP geolocation fails
    """
    try:
        accept_language = request.headers.get("Accept-Language", "")
        
        # Common language-country mappings
        locale_mappings = {
            "en-US": "US",
            "en-GB": "GB", 
            "en-CA": "CA",
            "en-AU": "AU",
            "en-IN": "IN",  # English (India)
            "de-DE": "DE",
            "fr-FR": "FR",
            "ja-JP": "JP",
            "zh-CN": "CN",
            "ar-AE": "AE",
            "en-SG": "SG"
        }
        
        # Parse Accept-Language header
        # Format: "en-US,en;q=0.9,es;q=0.8"
        languages = accept_language.split(",")
        for lang in languages:
            lang = lang.strip().split(";")[0]  # Remove quality value
            if lang in locale_mappings:
                country_code = locale_mappings[lang]
                logger.info(f"Country detected via browser locale: {country_code}")
                return country_code
        
        # If no specific country found, check for general language
        for lang in languages:
            lang = lang.strip().split(";")[0]
            if lang.startswith("en"):
                return "US"  # Default English to US
            elif lang.startswith("de"):
                return "DE"
            elif lang.startswith("fr"):
                return "FR"
            elif lang.startswith("ja"):
                return "JP"
            elif lang.startswith("zh"):
                return "CN"
            elif lang.startswith("ar"):
                return "AE"
        
        # Default to US if no match found
        logger.info("No country detected, defaulting to US")
        return "US"
        
    except Exception as e:
        logger.error(f"Error parsing browser locale: {e}")
        return "US"  # Default to US

async def get_country_info(country_code: str) -> dict:
    """
    Get additional country information
    Returns country name, currency info, etc.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"http://ip-api.com/json/?fields=country,countryCode,regionName,city")
            response.raise_for_status()
            data = response.json()
            
            return {
                "country_code": data.get("countryCode", country_code),
                "country_name": data.get("country", "Unknown"),
                "region": data.get("regionName", ""),
                "city": data.get("city", "")
            }
    except Exception as e:
        logger.error(f"Error getting country info: {e}")
        return {
            "country_code": country_code,
            "country_name": "Unknown",
            "region": "",
            "city": ""
        } 