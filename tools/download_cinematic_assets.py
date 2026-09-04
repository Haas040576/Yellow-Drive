#!/usr/bin/env python3
"""Download the free source assets used by the Yellow Drive cinematic demo.

This script only touches the cinematic asset source folder. It does not modify the
production site on main.

Usage:
    python3 tools/download_cinematic_assets.py

Optional:
    YELLOW_DRIVE_ASSET_DIR="/path/to/Yellow Drive" python3 tools/download_cinematic_assets.py
"""

from __future__ import annotations

import os
import shutil
import sys
import urllib.request
from pathlib import Path

USER_AGENT = "YellowDrive-Cinematic-AssetPrep/1.0"

DOWNLOADS = {
    "hdri/sunset_forest_4k.exr": "https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/4k/sunset_forest_4k.exr",
    "textures/grass_path_3_diff_4k.jpg": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/grass_path_3/grass_path_3_diff_4k.jpg",
    "textures/grass_path_3_nor_gl_4k.jpg": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/grass_path_3/grass_path_3_nor_gl_4k.jpg",
    "textures/grass_path_3_rough_4k.jpg": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/grass_path_3/grass_path_3_rough_4k.jpg",
    "textures/grass_path_3_disp_4k.jpg": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/grass_path_3/grass_path_3_disp_4k.jpg",
}

LOCAL_SOURCE_CANDIDATES = {
    "vehicle/free_porsche_911_carrera_4s.zip": [
        "free_porsche_911_carrera_4s.zip",
    ],
    "materials/asphalt_track_4k.blend": [
        "asphalt_track_4k.blend",
    ],
    "hdri/camdeboo_road_4k.hdr": [
        "camdeboo_road_4k.hdr",
    ],
}


def find_project_root() -> Path:
    override = os.environ.get("YELLOW_DRIVE_ASSET_DIR")
    if override:
        return Path(override).expanduser().resolve()

    home = Path.home()
    candidates = [
        home / "Documents" / "Haas Saida Media" / "Yellow Drive",
        home / "Documents" / "Haas & Saida Media" / "Yellow Drive",
        home / "Desktop" / "Haas Saida Media" / "Yellow Drive",
        home / "Desktop" / "Haas & Saida Media" / "Yellow Drive",
        home / "Haas Saida Media" / "Yellow Drive",
        home / "Haas & Saida Media" / "Yellow Drive",
    ]
    for path in candidates:
        if path.exists():
            return path

    # Safe fallback: create a standalone project folder in Documents rather than
    # guessing another existing directory.
    return home / "Documents" / "Haas Saida Media" / "Yellow Drive"


def download(url: str, destination: Path) -> None:
    if destination.exists() and destination.stat().st_size > 0:
        print(f"skip  {destination.name} (already present)")
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    print(f"get   {destination.name}")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    tmp = destination.with_suffix(destination.suffix + ".part")
    try:
        with urllib.request.urlopen(request) as response, open(tmp, "wb") as fh:
            shutil.copyfileobj(response, fh)
        tmp.replace(destination)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


def copy_existing_downloads(source_root: Path) -> None:
    search_roots = [
        Path.home() / "Downloads",
        Path.home() / "Desktop",
        Path.home() / "Documents",
    ]
    for relative_dest, filenames in LOCAL_SOURCE_CANDIDATES.items():
        dest = source_root / relative_dest
        if dest.exists():
            continue
        found = None
        for root in search_roots:
            for filename in filenames:
                candidate = root / filename
                if candidate.exists():
                    found = candidate
                    break
            if found:
                break
        if found:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(found, dest)
            print(f"copy  {found.name}")
        else:
            print(f"note  {filenames[0]} not found in Downloads/Desktop/Documents")


def write_provenance(source_root: Path) -> None:
    text = """# Cinematic source assets\n\n## Final visual direction\n- Central-European / Alpine forest-road atmosphere.\n- Human-made / photographic source assets only.\n- Camdeboo Road is retained for lighting tests only and should not be visible in the final Bavaria-facing demo.\n\n## Poly Haven (CC0)\n- Sunset Forest HDRI: https://polyhaven.com/a/sunset_forest\n- Grass Path 3 texture: https://polyhaven.com/a/grass_path_3\n- Asphalt Track: https://polyhaven.com/a/asphalt_track\n\nPoly Haven states that its public asset library is CC0 and that it avoids generative AI in its asset creation.\n\n## Vehicle\n(FREE) Porsche 911 Carrera 4S by Karol Miklas\nhttps://sketchfab.com/3d-models/free-porsche-911-carrera-4s-d01b254483794de3819786d93e0e1ebf\nLicense: CC BY-SA 4.0. Author credit required; modified versions must use the same license.\n\nFor a public Yellow Drive concept demo, Porsche branding should be removed/de-emphasized so the presentation does not imply an affiliation with Porsche.\n"""
    (source_root / "SOURCES_AND_LICENSES.md").write_text(text, encoding="utf-8")


def main() -> int:
    project_root = find_project_root()
    source_root = project_root / "_cinematic_source"
    source_root.mkdir(parents=True, exist_ok=True)

    print(f"Target: {source_root}")
    copy_existing_downloads(source_root)

    failures = []
    for relative, url in DOWNLOADS.items():
        try:
            download(url, source_root / relative)
        except Exception as exc:
            failures.append((relative, exc))
            print(f"ERROR {relative}: {exc}", file=sys.stderr)

    write_provenance(source_root)
    print("\nAsset preparation complete.")
    if failures:
        print("Some network downloads failed:", file=sys.stderr)
        for relative, exc in failures:
            print(f"- {relative}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
