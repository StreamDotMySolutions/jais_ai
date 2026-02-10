import json
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = Path(r"d:\A_ZULFAZDLI\B_Freelance\Jais\Data Jais\Zoho Data\KES - REKOD KESELURUHAN - LAPORAN TINDAKAN ZOHO.csv")
OUT_JSON = ROOT / "frontend" / "src" / "app" / "modules" / "aduan" / "laporanTindakanTemplates.json"


def resolve_key_from_kesalahan(kesalahan: str) -> str:
    s = (kesalahan or "").strip()
    upper = s.upper()

    # Examples seen: "EJSS / Sec.29. Khalwat.", "EJSS / Sec.17. Berjudi."
    m = re.search(r"\bEJSS\b.*?\bSEC\.?\s*([0-9]{1,3})\b", upper)
    if m:
        num = m.group(1)
        if num in ("32", "33", "34"):
            return "seksyen_32_33_34"
        return f"seksyen_{num}"

    # EPAIS
    m = re.search(r"\bEPAIS\b.*?\bSEC\.?\s*([0-9]{1,3})\b", upper)
    if m:
        return f"epais_{m.group(1)}"

    # Fallback: "Seksyen 29", "Sec 29", etc.
    m = re.search(r"\b(?:SEKSYEN|SEC)\.?\s*([0-9]{1,3})\b", upper)
    if m:
        num = m.group(1)
        if num in ("32", "33", "34"):
            return "seksyen_32_33_34"
        return f"seksyen_{num}"

    return "generic"


def _replace_patterns(text: str) -> str:
    t = (text or "").strip()
    if not t:
        return ""

    # Normalize whitespace
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"\n{3,}", "\n\n", t)

    # Replace aduan/case references (keep placeholder)
    t = re.sub(r"\bAJ-[A-Z]+-[0-9]{1,6}/[0-9]{4}\b", "{{NO_ADUAN}}", t, flags=re.IGNORECASE)
    t = re.sub(r"\bAK-[A-Z]+-[0-9]{1,6}/[0-9]{4}\b", "{{NO_ADUAN}}", t, flags=re.IGNORECASE)
    t = re.sub(r"\b[A-Z]{2}-[A-Z]+-[0-9]{1,6}/[0-9]{4}\b", "{{NO_ADUAN}}", t, flags=re.IGNORECASE)

    # Replace explicit dates like 3/2/2026, 28/1/2026, 01-01-2026
    t = re.sub(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b", "__________", t)

    # Replace time like 5.28, 9.13, 04.00 (optionally followed by AM/PM/PAGI/PETANG/MALAM/PG)
    t = re.sub(r"\b(\d{1,2})[.:](\d{2})\s*(AM|PM|PAGI|PETANG|MALAM|PG)?\b", "_____", t, flags=re.IGNORECASE)

    # Replace phone-like sequences
    t = re.sub(r"\b0\d{1,2}-?\d{6,8}\b", "__________", t)

    # Replace MyKad-like IDs (very rough)
    t = re.sub(r"\b\d{6}-\d{2}-\d{4}\b", "__________", t)

    # Replace passport/ID after common labels
    t = re.sub(r"(\bNO\.?\s*(?:K/P|KP|KAD PENGENALAN)\s*:?)\s*[A-Z0-9-]{6,}\b", r"\1 __________", t, flags=re.IGNORECASE)
    t = re.sub(r"(\bNO\.?\s*PASSPORT\s*:?)\s*[A-Z0-9-]{5,}\b", r"\1 __________", t, flags=re.IGNORECASE)

    # Replace "SAYA BERSAMA ..." list with placeholder (keep sentence structure)
    t = re.sub(r"\bSAYA\s+BERSAMA\b[^.\n]{0,300}", "SAYA BERSAMA __________", t, flags=re.IGNORECASE)

    # Replace "PPA <name>" occurrences
    t = re.sub(r"\bPPA\s+[A-Z][A-Z \.@']{3,}", "PPA __________", t)

    # Replace OYDS blocks and related lines (keep structure, mask values).
    # Example:
    #   OYDS (L) : NAMA...
    #   NO. K/P : 123...
    #   PAKAIAN : ...
    # Standardize OYDS lines to: "OYDS (L/P) : _______" (keep numbering prefix if present)
    t = re.sub(
        r"(?mi)^(\s*\d+\)\s*)?OYDS\s*\(([LP])\)\s*:\s*.*$",
        lambda m: f"{m.group(1) or ''}OYDS ({m.group(2)}) : _______",
        t,
    )
    # Common variants: "OYDS(L) BERNAMA : <name>", "OYDS (P) BERNAMA : <name>", etc.
    t = re.sub(
        r"(?mi)^(\s*\d+\)\s*)?OYDS\s*\(\s*([LP])\s*\)\s*BERNAMA\s*:\s*.*$",
        lambda m: f"{m.group(1) or ''}OYDS ({m.group(2)}) : _______",
        t,
    )
    t = re.sub(
        r"(?mi)^(\s*\d+\)\s*)?OYDS\(\s*([LP])\s*\)\s*BERNAMA\s*:\s*.*$",
        lambda m: f"{m.group(1) or ''}OYDS ({m.group(2)}) : _______",
        t,
    )
    t = re.sub(r"(?mi)^(OYDS\s*\([LP]\))\s+BERNAMA\s*:\s*.*$", r"\1 : _______", t)
    t = re.sub(r"(?mi)^OYDS\s*\(\s*([LP])\s*\)\s*:\s*.*$", r"OYDS (\1) : _______", t)
    # Variant: "OYDS <name>" on its own line
    t = re.sub(r"(?mi)^(OYDS)\s+[A-Z][A-Z \.@'/()-]{3,}\s*$", r"\1 : _______", t)
    # Generic OYDS line (no (L/P)): keep as field line placeholder
    t = re.sub(r"(?mi)^(OYDS\s*:\s*).+$", r"\1_______", t)

    # Convert common "KETIKA ITU ... BERPAKAIAN ..." narrative lines into a clean field
    t = re.sub(r"(?mi)^.*KETIKA\s+ITU\s+KELIHATAN\s+BERPAKAIAN.*$", "PAKAIAN : _______", t)

    # Standardize name / clothing / IDs field lines
    t = re.sub(r"(?mi)^(PAKAIAN\s*:\s*).+$", r"\1_______", t)
    t = re.sub(r"(?mi)^(NAMA\s*:\s*).+$", r"\1_______", t)
    t = re.sub(r"(?mi)^(NAMA OYDS\s*:\s*).+$", r"\1_______", t)

    # Normalize MyKad label variations to a consistent form
    t = re.sub(r"(?mi)^(NO\.?\s*(?:K/P|K/?P|KP|KAD PENGENALAN)\s*:?).*$", "NO. K/P : __________", t)
    t = re.sub(r"(?mi)^(NO\.?\s*PASSPORT\s*:?).*$", "NO. PASSPORT : __________", t)
    t = re.sub(r"(?mi)^(NO\.?\s*TEL(?:EFON)?\s*:?).*$", "NO. TELEFON : __________", t)

    # If a standalone name line is followed by a MyKad line, mask the name line too.
    t = re.sub(
        r"(?ms)^(?P<name>[A-Z][A-Z \.@'/()-]{3,})\s*\nNO\. K/P\s*:\s*__________",
        "OYDS : _______\nNO. K/P : __________",
        t,
    )

    # Normalize long underscore runs on label lines (avoid touching ID lines above).
    t = re.sub(r"(?mi)^((?:OYDS|NAMA|PAKAIAN)[^\n:]{0,40}:\s*)_+\s*$", r"\1_______", t)

    # NOTE: Avoid aggressive inline OYDS replacements (can corrupt sentences like "OYDS TELAH DITANGKAP...").

    # If template doesn't already contain OFFENSE placeholder, add a line after first paragraph.
    if "{{OFFENSE}}" not in t and "KESALAHAN" not in t.upper():
        parts = t.split("\n\n", 1)
        if len(parts) == 2:
            t = parts[0] + "\n\nKESALAHAN DISYAKI: {{OFFENSE}}\n\n" + parts[1]
        else:
            t = t + "\n\nKESALAHAN DISYAKI: {{OFFENSE}}"

    return t.strip()


def main() -> int:
    if not CSV_PATH.exists():
        raise FileNotFoundError(str(CSV_PATH))

    df = pd.read_csv(CSV_PATH, dtype=str, keep_default_na=False)
    cols = {c.strip(): c for c in df.columns}
    if "Kesalahan" not in cols or "Laporan" not in cols:
        raise RuntimeError(f"CSV missing required columns. Found: {list(df.columns)}")

    key_to_best = {}
    for _, row in df.iterrows():
        kesalahan = (row.get(cols["Kesalahan"]) or "").strip()
        laporan = (row.get(cols["Laporan"]) or "").strip()
        if not kesalahan or not laporan:
            continue

        key = resolve_key_from_kesalahan(kesalahan)
        text = _replace_patterns(laporan)
        if not text:
            continue

        existing = key_to_best.get(key)
        # keep the longest as "best" example for that key
        if not existing or len(text) > len(existing["text"]):
            key_to_best[key] = {
                "key": key,
                "label": kesalahan,
                "text": text,
            }

    # Ensure generic exists
    if "generic" not in key_to_best:
        key_to_best["generic"] = {
            "key": "generic",
            "label": "Umum - Template Laporan Tindakan (Fallback)",
            "text": "PADA __________ JAM LEBIH KURANG _____, SAYA TELAH MENERIMA MAKLUMAT/ADUAN BERKENAAN __________.\n\nKESALAHAN DISYAKI: {{OFFENSE}}\n\nLOKASI KEJADIAN: __________\n\nBUTIRAN RINGKAS:\n__________\n\nMOHON TINDAKAN LANJUT DARIPADA BAHAGIAN PENGURUSAN PENGUATKUASAAN, JAIS.\n\nSEKIAN, LAPORAN SAYA.",
        }

    # Sort: keep generic last
    items = list(key_to_best.values())
    items.sort(key=lambda x: (x["key"] == "generic", x["key"]))

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(items, ensure_ascii=False, indent=4), encoding="utf-8")
    print(f"Wrote {OUT_JSON} ({len(items)} templates)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
