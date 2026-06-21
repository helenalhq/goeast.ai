#!/usr/bin/env python3
"""Generate and edit images with an Azure OpenAI GPT Image deployment."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Iterable

DEFAULT_API_VERSION = "2024-02-01"
DEFAULT_OUTPUT_FORMAT = "png"
DEFAULT_SIZE = "1024x1024"
DEFAULT_QUALITY = "low"
DEFAULT_OUTPUT_COMPRESSION = 100
DEFAULT_IMAGE_ENDPOINT_ENV = "AZURE_GPT_IMAGE_ENDPOINT"
DEFAULT_API_KEY_ENV = "AZURE_OPENAI_API_KEY"
API_KEY_FALLBACKS = ("AZURE_OPENAI_API_KEY", "AZURE_API_KEY")
ENDPOINT_FALLBACKS = (
    "AZURE_GPT_IMAGE_ENDPOINT",
    "AZURE_OPENAI_GPT_IMAGE_ENDPOINT",
    "AZURE_OPENAI_ENDPOINT",
)
DEPLOYMENT_FALLBACKS = ("AZURE_GPT_IMAGE_DEPLOYMENT", "AZURE_OPENAI_DEPLOYMENT")


def get_env(names: Iterable[str]) -> tuple[str | None, str | None]:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value, name
    return None, None


def resolve_endpoint() -> tuple[str, str]:
    endpoint, endpoint_env = get_env(ENDPOINT_FALLBACKS)
    if not endpoint:
        names = ", ".join(ENDPOINT_FALLBACKS)
        raise SystemExit(f"Missing Azure endpoint. Set one of: {names}")

    endpoint = endpoint.rstrip("/")
    parsed = urllib.parse.urlsplit(endpoint)
    if parsed.query:
        endpoint = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
    for operation_path in ("/images/generations", "/images/edits"):
        if endpoint.endswith(operation_path):
            endpoint = endpoint[: -len(operation_path)]

    if "/openai/deployments/" in endpoint:
        return endpoint, endpoint_env or DEFAULT_IMAGE_ENDPOINT_ENV

    deployment, deployment_env = get_env(DEPLOYMENT_FALLBACKS)
    if not deployment:
        names = ", ".join(DEPLOYMENT_FALLBACKS)
        raise SystemExit(
            "Endpoint does not include a deployment path. "
            f"Set one of {names} or provide a full deployment endpoint."
        )

    base = endpoint.rstrip("/")
    return (
        f"{base}/openai/deployments/{deployment}",
        deployment_env or DEFAULT_IMAGE_ENDPOINT_ENV,
    )


def resolve_api_key() -> tuple[str, str]:
    api_key, api_key_env = get_env(API_KEY_FALLBACKS)
    if not api_key:
        names = ", ".join(API_KEY_FALLBACKS)
        raise SystemExit(f"Missing Azure API key. Set one of: {names}")
    return api_key, api_key_env or DEFAULT_API_KEY_ENV


def resolve_api_version() -> str:
    return os.environ.get("AZURE_OPENAI_API_VERSION", DEFAULT_API_VERSION)


def build_url(base_endpoint: str, path: str) -> str:
    query = urllib.parse.urlencode({"api-version": resolve_api_version()})
    return f"{base_endpoint}/{path}?{query}"


def request_json(url: str, api_key: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url=url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "api-key": api_key,
        },
    )
    return load_json_response(request)


def multipart_form_data(fields: list[tuple[str, str]], files: list[tuple[str, Path]]) -> tuple[bytes, str]:
    boundary = f"----codex-azure-gpt-image-{uuid.uuid4().hex}"
    chunks: list[bytes] = []

    for name, value in fields:
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )

    for name, path in files:
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                (
                    f'Content-Disposition: form-data; name="{name}"; '
                    f'filename="{path.name}"\r\n'
                ).encode(),
                f"Content-Type: {mime_type}\r\n\r\n".encode(),
                path.read_bytes(),
                b"\r\n",
            ]
        )

    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def request_multipart(url: str, api_key: str, fields: list[tuple[str, str]], files: list[tuple[str, Path]]) -> dict:
    body, content_type = multipart_form_data(fields, files)
    request = urllib.request.Request(
        url=url,
        data=body,
        method="POST",
        headers={
            "Content-Type": content_type,
            "api-key": api_key,
        },
    )
    return load_json_response(request)


def load_json_response(request: urllib.request.Request) -> dict:
    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Azure request failed with HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Azure request failed: {exc.reason}") from exc


def write_image_from_response(payload: dict, output_path: Path) -> None:
    data = payload.get("data") or []
    if not data:
        raise SystemExit(f"Azure response did not include image data: {json.dumps(payload, ensure_ascii=False)}")
    first = data[0]
    b64_data = first.get("b64_json")
    if not b64_data:
        raise SystemExit(f"Azure response did not include b64_json: {json.dumps(first, ensure_ascii=False)}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(base64.b64decode(b64_data))


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate or edit images with an Azure OpenAI GPT Image deployment."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the resolved request without calling Azure.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    generate = subparsers.add_parser("generate", help="Generate a new image from a prompt.")
    generate.add_argument("--prompt", required=True, help="Prompt describing the image to create.")
    generate.add_argument("--output", required=True, help="Output image path.")
    generate.add_argument("--size", default=DEFAULT_SIZE, help="Image size, e.g. 1024x1024.")
    generate.add_argument("--quality", default=DEFAULT_QUALITY, help="Generation quality, e.g. low/high.")
    generate.add_argument(
        "--output-compression",
        type=positive_int,
        default=DEFAULT_OUTPUT_COMPRESSION,
        help="Output compression percentage.",
    )
    generate.add_argument(
        "--output-format",
        default=DEFAULT_OUTPUT_FORMAT,
        help="Output format, e.g. png or jpeg.",
    )
    generate.add_argument("--n", type=positive_int, default=1, help="Number of images to request.")

    edit = subparsers.add_parser("edit", help="Edit an image, optionally using a mask.")
    edit.add_argument("--image", required=True, help="Input image path.")
    edit.add_argument("--prompt", required=True, help="Prompt describing the requested edit.")
    edit.add_argument("--output", required=True, help="Output image path.")
    edit.add_argument("--mask", help="Optional mask image path.")
    edit.add_argument("--size", default=DEFAULT_SIZE, help="Image size, e.g. 1024x1024.")
    edit.add_argument("--quality", default=DEFAULT_QUALITY, help="Edit quality, e.g. low/high.")
    edit.add_argument(
        "--output-format",
        default=DEFAULT_OUTPUT_FORMAT,
        help="Output format, e.g. png or jpeg.",
    )

    return parser.parse_args()


def handle_generate(args: argparse.Namespace, endpoint: str, api_key: str) -> None:
    url = build_url(endpoint, "images/generations")
    payload = {
        "prompt": args.prompt,
        "size": args.size,
        "quality": args.quality,
        "output_compression": args.output_compression,
        "output_format": args.output_format,
        "n": args.n,
    }

    if args.dry_run:
        print(json.dumps({"url": url, "payload": payload}, ensure_ascii=False, indent=2))
        return

    response = request_json(url, api_key, payload)
    write_image_from_response(response, Path(args.output))
    print(Path(args.output).resolve())


def handle_edit(args: argparse.Namespace, endpoint: str, api_key: str) -> None:
    image_path = Path(args.image)
    if not image_path.is_file():
        raise SystemExit(f"Input image does not exist: {image_path}")

    files: list[tuple[str, Path]] = [("image", image_path)]
    if args.mask:
        mask_path = Path(args.mask)
        if not mask_path.is_file():
            raise SystemExit(f"Mask image does not exist: {mask_path}")
        files.append(("mask", mask_path))

    url = build_url(endpoint, "images/edits")
    fields = [
        ("prompt", args.prompt),
        ("size", args.size),
        ("quality", args.quality),
        ("output_format", args.output_format),
    ]

    if args.dry_run:
        print(
            json.dumps(
                {
                    "url": url,
                    "fields": dict(fields),
                    "files": {name: str(path) for name, path in files},
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    response = request_multipart(url, api_key, fields, files)
    write_image_from_response(response, Path(args.output))
    print(Path(args.output).resolve())


def main() -> None:
    args = parse_args()
    endpoint, endpoint_source = resolve_endpoint()
    api_key, api_key_source = resolve_api_key()

    if args.dry_run:
        sys.stderr.write(
            f"Using endpoint from {endpoint_source}, key from {api_key_source}, "
            f"api-version {resolve_api_version()}\n"
        )

    if args.command == "generate":
        handle_generate(args, endpoint, api_key)
        return

    if args.command == "edit":
        handle_edit(args, endpoint, api_key)
        return

    raise SystemExit(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()
