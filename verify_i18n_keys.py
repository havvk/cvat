#!/usr/bin/env python3
"""Validate CVAT UI locale parity and statically referenced translation keys."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
UI_SOURCE = ROOT / "cvat-ui" / "src"
LOCALES = {
    "en-US": ROOT / "cvat-ui" / "public" / "locales" / "en-US" / "translation.json",
    "zh": ROOT / "cvat-ui" / "public" / "locales" / "zh" / "translation.json",
}

KEY_PATTERNS = (
    re.compile(r"(?<![\w$])t\(\s*(['\"])([^'\"]+)\1"),
    re.compile(r"\bi18n\.t\(\s*(['\"])([^'\"]+)\1"),
    re.compile(r"\bi18nKey\s*=\s*(['\"])([^'\"]+)\1"),
)


def flatten(value: Any, prefix: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {}
    if isinstance(value, dict):
        for key, child in value.items():
            child_prefix = f"{prefix}.{key}" if prefix else key
            result.update(flatten(child, child_prefix))
    else:
        result[prefix] = value
    return result


def read_locales() -> dict[str, dict[str, Any]]:
    locales: dict[str, dict[str, Any]] = {}
    for language, path in LOCALES.items():
        with path.open(encoding="utf-8") as stream:
            locales[language] = flatten(json.load(stream))
    return locales


def referenced_keys() -> dict[str, set[str]]:
    references: dict[str, set[str]] = {}
    for path in UI_SOURCE.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        content = path.read_text(encoding="utf-8")
        for pattern in KEY_PATTERNS:
            for match in pattern.finditer(content):
                key = match.group(2)
                # Template strings and natural-language fallback arguments are dynamic/non-key values.
                if "${" not in key and "{{" not in key and " " not in key:
                    references.setdefault(key, set()).add(path.relative_to(ROOT).as_posix())
    return references


def main() -> int:
    try:
        locales = read_locales()
    except (OSError, json.JSONDecodeError) as error:
        print(f"Locale loading failed: {error}", file=sys.stderr)
        return 1

    failed = False
    languages = tuple(locales)
    all_locale_keys = set().union(*(set(locale) for locale in locales.values()))

    for language in languages:
        missing = sorted(all_locale_keys - set(locales[language]))
        if missing:
            failed = True
            print(f"{language} is missing {len(missing)} key(s):")
            for key in missing:
                print(f"  {key}")

    references = referenced_keys()
    for key, files in sorted(references.items()):
        missing_languages = [language for language in languages if key not in locales[language]]
        if missing_languages:
            failed = True
            print(f"Referenced key '{key}' is missing from {', '.join(missing_languages)}:")
            for path in sorted(files):
                print(f"  {path}")

    if failed:
        return 1

    print(
        f"i18n verification passed: {len(all_locale_keys)} locale keys, "
        f"{len(references)} statically referenced keys, {len(languages)} languages."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
