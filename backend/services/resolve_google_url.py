import sys
try:
    from googlenewsdecoder import gnewsdecoder
    if len(sys.argv) > 1:
        res = gnewsdecoder(sys.argv[1])
        if isinstance(res, dict) and res.get("status") and res.get("decoded_url"):
            print(res["decoded_url"])
            sys.exit(0)
except Exception:
    pass
sys.exit(1)
