"""Structured, readable logging configuration."""

import logging
import sys

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging(log_level: str) -> None:
    """Configure root logging once, at application startup.

    Safe to call more than once (e.g. across test runs) — handlers are reset
    each time rather than duplicated.
    """

    level = getattr(logging, log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid duplicate handlers if configure_logging runs more than once.
    root_logger.handlers.clear()

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))
    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a module-scoped logger."""

    return logging.getLogger(name)
