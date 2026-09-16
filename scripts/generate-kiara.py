#!/usr/bin/env python3
"""Generate Kiara images from the repository prompt and reference set.

Usage:
    python scripts/generate-kiara.py --scene "Kiara at a cafe..."
    python scripts/generate-kiara.py --scene "Kiara walking in Milan..." --full-body

The script calls the OpenAI Images Edits endpoint with multiple image references.
It never modifies the source references or the prompt markdown file.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable

import httpx


REPO_ROOT = Path(__file__).resolve().parents[1]
PROMPT_MD = REPO_ROOT / "kiara-image-prompt.md"

FACE_REFS = [
    REPO_ROOT / "img" / "ref-face-front.jpg",
    REPO_ROOT / "img" / "ref-face-sheet.png",
    REPO_ROOT / "img" / "ref-face-expr.png",
]
BODY_REF = REPO_ROOT / "img" / "ref-body-sheet.png"

DEFAULT_OUTPUT_DIR = REPO_ROOT / "img" / "generated"
DEFAULT_MODEL = "gpt-image-2"
DEFAULT_SIZE = "1024x1024"
API_URL = "https://api.openai.com/v1/images/edits"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a Kiara image using the canonical prompt and identity references."
    )
    parser.add_argument(
        "--scene",
        required=True,
        help="Scene description: location, outfit, gesture, lighting, framing and mood.",
    )
    parser.add_argument(
        "--full-body",
        action="store_true",
        help="Also attach img/ref-body-sheet.png and explicitly request a full-body composition.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Image model to use (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--size",
        default=DEFAULT_SIZE,
        help=f"Output size (default: {DEFAULT_SIZE}).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Exact output image path. Defaults to img/generated/<timestamp>-kiara.png.",
    )
    parser.add_argument(
        "--metadata",
        action="store_true",
        help="Save a JSON metadata file next to the generated image.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print prompt and references without calling the API.",
    )
    return parser.parse_args()


def extract_prompt(md_path: Path) -> str:
    if not md_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {md_path}")

    text = md_path.read_text(encoding="utf-8")
    match = re.search(r"```(?:text)?\s*\n(.*?)\n```", text, flags=re.DOTALL)
    if not match:
        raise ValueError(f"No fenced prompt block found in {md_path}")

    return match.group(1).strip()


def ensure_files(paths: Iterable[Path]) -> None:
    missing = [str(path.relative_to(REPO_ROOT)) for path in paths if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing reference file(s): " + ", ".join(missing))


def build_prompt(base_prompt: str, scene: str, full_body: bool) -> str:
    reference_map = [
        "Reference image 1 = primary front-face identity anchor.",
        "Reference image 2 = multi-angle face identity sheet.",
        "Reference image 3 = expression range; preserve identity while changing expression.",
    ]
    if full_body:
        reference_map.append(
            "Reference image 4 = body proportions anchor for the requested full-body composition."
        )

    composition = (
        "Full-body composition is required. Preserve the body proportions from reference image 4."
        if full_body
        else "Do not invent a different identity. Prioritize face consistency over stylistic variation."
    )

    return "\n\n".join(
        [
            base_prompt,
            "Reference priority:\n" + "\n".join(f"- {item}" for item in reference_map),
            "When textual description and the reference images conflict, preserve the visual identity from the references.",
            composition,
            f"SCENE:\n{scene.strip()}",
        ]
    )


def reference_paths(full_body: bool) -> list[Path]:
    refs = list(FACE_REFS)
    if full_body:
        refs.append(BODY_REF)
    return refs


def make_output_path(requested: Path | None) -> Path:
    if requested is not None:
        path = requested if requested.is_absolute() else REPO_ROOT / requested
    else:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = DEFAULT_OUTPUT_DIR / f"{stamp}-kiara.png"

    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def decode_response_image(payload: dict, client: httpx.Client) -> bytes:
    data = payload.get("data") or []
    if not data:
        raise RuntimeError("Image API returned no image data.")

    item = data[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])

    if item.get("url"):
        response = client.get(item["url"])
        response.raise_for_status()
        return response.content

    raise RuntimeError("Image API response contained neither b64_json nor url.")


def call_image_api(
    *,
    api_key: str,
    model: str,
    size: str,
    prompt: str,
    refs: list[Path],
) -> tuple[bytes, dict]:
    headers = {"Authorization": f"Bearer {api_key}"}
    form = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "n": "1",
    }

    files = []
    handles = []
    try:
        for ref in refs:
            mime = mimetypes.guess_type(ref.name)[0] or "application/octet-stream"
            handle = ref.open("rb")
            handles.append(handle)
            files.append(("image[]", (ref.name, handle, mime)))

        with httpx.Client(timeout=180.0, follow_redirects=True) as client:
            response = client.post(API_URL, headers=headers, data=form, files=files)
            if response.is_error:
                try:
                    detail = response.json()
                except Exception:
                    detail = response.text
                raise RuntimeError(
                    f"OpenAI image request failed ({response.status_code}): {detail}"
                )

            payload = response.json()
            image_bytes = decode_response_image(payload, client)
            return image_bytes, payload
    finally:
        for handle in handles:
            handle.close()


def main() -> int:
    args = parse_args()

    try:
        base_prompt = extract_prompt(PROMPT_MD)
        refs = reference_paths(args.full_body)
        ensure_files(refs)
        prompt = build_prompt(base_prompt, args.scene, args.full_body)
        output_path = make_output_path(args.output)

        if args.dry_run:
            print("=== REFERENCES ===")
            for index, ref in enumerate(refs, start=1):
                print(f"{index}. {ref.relative_to(REPO_ROOT)}")
            print("\n=== PROMPT ===\n")
            print(prompt)
            print(f"\n=== OUTPUT ===\n{output_path.relative_to(REPO_ROOT)}")
            return 0

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. See scripts/README.md for setup instructions."
            )

        image_bytes, payload = call_image_api(
            api_key=api_key,
            model=args.model,
            size=args.size,
            prompt=prompt,
            refs=refs,
        )
        output_path.write_bytes(image_bytes)

        print(f"Generated: {output_path}")
        print("References used:")
        for ref in refs:
            print(f"- {ref.relative_to(REPO_ROOT)}")

        if args.metadata:
            metadata_path = output_path.with_suffix(".json")
            metadata = {
                "generated_at": datetime.now().isoformat(timespec="seconds"),
                "model": args.model,
                "size": args.size,
                "full_body": args.full_body,
                "scene": args.scene,
                "references": [str(ref.relative_to(REPO_ROOT)) for ref in refs],
                "prompt_source": str(PROMPT_MD.relative_to(REPO_ROOT)),
                "prompt": prompt,
                "api_response_meta": {
                    key: value
                    for key, value in payload.items()
                    if key != "data"
                },
            }
            metadata_path.write_text(
                json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            print(f"Metadata: {metadata_path}")

        return 0

    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
