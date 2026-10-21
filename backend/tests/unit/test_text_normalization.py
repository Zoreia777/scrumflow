from app.core.text import normalize_text


def test_strips_whitespace_at_the_edges() -> None:
    assert normalize_text("  \t Projeto \n ") == "Projeto"


def test_keeps_internal_spacing() -> None:
    assert normalize_text("Meu   projeto  novo") == "Meu   projeto  novo"


def test_normalizes_decomposed_accents_to_nfc() -> None:
    decomposed = "Educação"  # c + cedilha e a + til combinantes
    composed = "Educação"

    assert len(decomposed) > len(composed)
    assert normalize_text(decomposed) == composed


def test_strips_non_breaking_space() -> None:
    assert normalize_text(" Projeto ") == "Projeto"


def test_blank_text_becomes_empty() -> None:
    assert normalize_text("   \n\t ") == ""
