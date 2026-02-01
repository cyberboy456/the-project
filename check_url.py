#!/usr/bin/env python3

import re
import sys
import json
from urllib.parse import urlparse

# === Blacklists ===
MALICIOUS_KEYWORDS = [
    "phish", "login", "verify", "update", "account", "secure", "banking",
    "password", "signin", "malware", "scam", "confirm", "credentials", "support", "webscr", "spyware"
]

SUSPICIOUS_TLDS = [
    ".zip", ".click", ".tk", ".ml", ".ga", ".cf", ".gq", ".ru", ".cn", ".xyz", ".top", ".buzz"
]

SUSPICIOUS_SHORTENERS = [
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "shorte.st", "ow.ly", "is.gd", "cutt.ly", "rebrand.ly"
]

BLACKLISTED_DOMAINS = [
    "trycloudflare.com",  # ⛔ often abused for phishing
]

HOMOGRAPH_CHARS = {
    'а': 'a', 'е': 'e', 'і': 'i', 'ο': 'o', 'ѕ': 's', 'ʋ': 'v', 'ɡ': 'g', 'ɩ': 'i', 'Ɩ': 'l'
}

def contains_homograph(domain):
    return any(char in HOMOGRAPH_CHARS for char in domain)

def is_ip_address(domain):
    return re.match(r'^\d{1,3}(\.\d{1,3}){3}$', domain) is not None

def is_valid_url(url):
    regex = re.compile(
        r'^(https?|ftp):\/\/'      # http or https
        r'([\w\-\.]+)'             # domain
        r'(:\d+)?'                 # optional port
        r'(\/[\w\-\.~:\/?#\[\]@!$&\'()*+,;=]*)?$',
        re.IGNORECASE
    )
    return re.match(regex, url) is not None

def check_url_safety(url):
    url = url.strip()
    if not is_valid_url(url):
        return {"safe": False, "level": "critical", "reason": "Invalid URL format"}

    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    full_url = url.lower()

    # 1. HTTPS Check
    if not url.startswith("https://"):
        return {"safe": False, "level": "medium", "reason": "Connection is not secure (missing HTTPS)"}

    # 2. IP Address
    if is_ip_address(domain):
        return {"safe": False, "level": "high", "reason": "Domain is an IP address (often used in phishing)"}

    # 3. Known shortened URLs
    if any(shortener in domain for shortener in SUSPICIOUS_SHORTENERS):
        return {"safe": False, "level": "high", "reason": "URL uses known link shortener"}

    # 4. Malicious keywords
    for keyword in MALICIOUS_KEYWORDS:
        if keyword in full_url:
            return {"safe": False, "level": "high", "reason": f"Contains suspicious keyword: '{keyword}'"}

    # 5. TLD check
    if any(domain.endswith(tld) for tld in SUSPICIOUS_TLDS):
        return {"safe": False, "level": "high", "reason": f"Suspicious domain extension: '{domain[-4:]}'"}

    # 6. Homograph attack detection
    if contains_homograph(domain):
        return {"safe": False, "level": "high", "reason": "Possible homograph attack (lookalike characters used)"}

    # 7. Blacklisted domain check
    for blocked in BLACKLISTED_DOMAINS:
        if domain.endswith(blocked):
            return {"safe": False, "level": "critical", "reason": f"Domain is blacklisted: '{blocked}'"}

    return {"safe": True, "level": "none", "reason": "URL appears to be safe"}

# ==== MAIN ENTRY POINT ====
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"safe": False, "level": "critical", "reason": "No URL provided"}))
        sys.exit(1)

    user_url = sys.argv[1]
    try:
        result = check_url_safety(user_url)
    except Exception as e:
        result = {"safe": False, "level": "critical", "reason": f"Internal error: {str(e)}"}

    print(json.dumps(result))