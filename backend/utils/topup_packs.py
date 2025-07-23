TOPUP_PACKS = {
    "basic": {
        "id": "basic",
        "name": "Basic",
        "price": 2900,  # paise
        "messages": 5,
        "description": "30 AI messages"
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": 4900,
        "messages": 5,
        "description": "100 AI messages"
    },
    "ultra": {
        "id": "ultra",
        "name": "Ultra",
        "price": 9900,
        "messages": 10,
        "description": "300 AI messages"
    }
}

def get_topup_pack_by_id(pack_id: str):
    return TOPUP_PACKS.get(pack_id)

def get_all_topup_packs():
    return list(TOPUP_PACKS.values()) 