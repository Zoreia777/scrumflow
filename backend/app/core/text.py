"""Normalização de texto (convenção do ADR-002): NFC + remoção de espaços nas extremidades."""

import unicodedata


def normalize_text(value: str) -> str:
    """Normaliza para NFC e remove espaços nas extremidades; espaços internos não mudam."""
    return unicodedata.normalize("NFC", value).strip()
