---
name: azure-gpt-image
description: Generate and edit raster images through a Microsoft Azure OpenAI GPT Image deployment. Use when Codex needs to create a brand-new image from a prompt, modify an existing image with a prompt, apply a masked edit, or produce image assets through Azure instead of the built-in image tools. This skill expects the Azure endpoint and API key to come from environment variables.
---

# Azure GPT Image

Use the bundled script instead of rewriting HTTP requests by hand.

## Quick Start

Set environment variables before using the skill:

```bash
export AZURE_GPT_IMAGE_ENDPOINT="https://<resource>.openai.azure.com/openai/deployments/<deployment>"
export AZURE_OPENAI_API_KEY="<api-key>"
```

Optional environment variables:

- `AZURE_OPENAI_API_VERSION`: defaults to `2024-02-01`
- `AZURE_GPT_IMAGE_DEPLOYMENT`: only needed when the endpoint is just the Azure resource root instead of the full deployment URL
- `AZURE_API_KEY`: accepted as a fallback for the API key

The script follows the REST shape shown in the Azure portal screenshot:

- `POST {deployment-endpoint}/images/generations?api-version=...`
- `POST {deployment-endpoint}/images/edits?api-version=...`
- `api-key: <api-key>`

## Generate

Create a new image from a prompt:

```bash
python3 scripts/azure_gpt_image.py generate \
  --prompt "A cinematic portrait of a red fox in an autumn forest" \
  --size 1024x1024 \
  --quality low \
  --output-format png \
  --output-compression 100 \
  --n 1 \
  --output outputs/fox.png
```

Use `--dry-run` first when you need to verify the resolved endpoint, API version, or payload without sending a request.

## Edit

Edit an existing image:

```bash
python3 scripts/azure_gpt_image.py edit \
  --image input.png \
  --prompt "Make this black and white" \
  --output outputs/edited.png
```

Apply a masked edit:

```bash
python3 scripts/azure_gpt_image.py edit \
  --image input.png \
  --mask mask.png \
  --prompt "Replace the background with a snowy mountain range" \
  --output outputs/masked-edit.png
```

## Workflow

1. Confirm the Azure endpoint points at the image deployment, not just the resource.
2. Preserve the original source image. Write generated files to a new output path.
3. Prefer `--dry-run` when the environment may be misconfigured.
4. If Azure returns an HTTP error, surface the exact response body to the user because deployment names, API versions, and auth headers are the most common failure points.
5. Use `png` unless the user explicitly wants a lossy format.

## Script

- `scripts/azure_gpt_image.py`: zero-dependency Python wrapper for generation and edits. It decodes the Azure `b64_json` response and writes the output image to disk.
