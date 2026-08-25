"""Backward-compatible entrypoint for the integration validator."""
from validate_integration import main

if __name__ == "__main__":
    raise SystemExit(main())
