import hashlib
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

import httpx

from src.common.logging.logger import get_logger


logger = get_logger(__name__)

IMAGE_PATTERN = re.compile(r"!\[([^\]]*)\]\(([^)]+\.(?:jpg|jpeg|png))[^)]*\)", re.IGNORECASE)
ALL_IMAGE_PATTERN = re.compile(r"!\[([^\]]*)\]\([^)]+\)")
LINK_PATTERN = re.compile(r"\[([^\]]*)\]\([^)]+\)")

STORAGE_ROOT = Path(__file__).resolve().parents[3] / "storage" / "images"


def _url_to_filename(url: str) -> str:
    parsed = urlparse(url)
    ext = Path(parsed.path).suffix or ".jpg"
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
    return f"{url_hash}{ext}"


def _article_dir(site_id: str, article_url: str) -> Path:
    article_hash = hashlib.md5(article_url.encode()).hexdigest()[:10]
    return STORAGE_ROOT / site_id / article_hash


def _clean_markdown(content: str) -> str:
    """Remove all image tags and hyperlinks, keep only text."""
    # ![alt](url) -> remove entirely
    content = ALL_IMAGE_PATTERN.sub("", content)
    # [text](url) -> text
    content = LINK_PATTERN.sub(r"\1", content)
    return content


def download_images(
    content_markdown: str,
    site_id: str,
    article_url: str,
) -> tuple[str, list[dict[str, str]]]:
    """Download images and strip image links from markdown content."""
    matches = IMAGE_PATTERN.findall(content_markdown)
    if not matches:
        return _clean_markdown(content_markdown), []

    save_dir = _article_dir(site_id, article_url)
    save_dir.mkdir(parents=True, exist_ok=True)

    saved_images: list[dict[str, str]] = []

    with httpx.Client(timeout=15, follow_redirects=True) as client:
        for alt_text, img_url in matches:
            try:
                resp = client.get(img_url)
                resp.raise_for_status()
            except Exception:
                logger.warning("Failed to download image: %s", img_url)
                continue

            filename = _url_to_filename(img_url)
            file_path = save_dir / filename
            file_path.write_bytes(resp.content)

            local_path = file_path.relative_to(STORAGE_ROOT.parent.parent).as_posix()
            saved_images.append({
                "original_url": img_url,
                "local_path": local_path,
                "size_bytes": len(resp.content),
            })
            logger.info("Saved image: %s -> %s", img_url, local_path)

    cleaned = _clean_markdown(content_markdown)

    return cleaned, saved_images


def cleanup_images(site_id: str, article_url: str) -> None:
    """Delete local images after upload."""
    save_dir = _article_dir(site_id, article_url)
    if save_dir.exists():
        shutil.rmtree(save_dir)
        logger.info("Cleaned up images: %s", save_dir)
