"""
Pipeline step 1 — normalize blog input into plain article text for Claude (Stage 5).

Supports: url | text | tiptap_json | brief (see docs/blog-to-video-spec.md).
"""

from __future__ import annotations

import ipaddress
import json
import os
import re
import socket
from typing import Any, List
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

_DEFAULT_FETCH_TIMEOUT_S = 30.0
_DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024  # 2 MiB


def extract_article_text(input_type: str, content: str) -> str:
    """
    Return cleaned plain text. Raises ValueError on invalid input or empty result.
    """
    it = (input_type or "").strip().lower()
    if it not in ("url", "text", "tiptap_json", "brief"):
        raise ValueError(f"Unsupported input_type: {input_type!r}")

    if it == "url":
        raw = _text_from_url(content)
    elif it == "text":
        raw = _text_from_plain(content)
    elif it == "tiptap_json":
        raw = _text_from_tiptap(content)
    else:
        raw = _text_from_plain(content)

    cleaned = _normalize_whitespace(raw)
    max_chars = int(os.environ.get("VIDEO_MAX_ARTICLE_CHARS", "500000"))
    if len(cleaned) > max_chars:
        raise ValueError(f"Article text exceeds max length ({max_chars} characters)")
    if not cleaned.strip():
        raise ValueError("No article text could be extracted from the input")
    return cleaned


def _normalize_whitespace(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = []
    for line in text.split("\n"):
        lines.append(" ".join(line.split()))
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _text_from_plain(content: str) -> str:
    if not content or not str(content).strip():
        raise ValueError("content is empty")
    return str(content)


def _text_from_tiptap(content: str) -> str:
    if not content or not str(content).strip():
        raise ValueError("tiptap_json content is empty")
    try:
        doc = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid Tiptap JSON: {e}") from e
    if not isinstance(doc, dict):
        raise ValueError("Tiptap document must be a JSON object")

    if doc.get("type") != "doc":
        doc = {"type": "doc", "content": [doc]}
    text = _tiptap_doc_to_text(doc)
    if not text.strip():
        raise ValueError("No text found in Tiptap document")
    return text


def _tiptap_inline_text(nodes: Any) -> str:
    if not isinstance(nodes, list):
        return ""
    parts: List[str] = []
    for n in nodes:
        if not isinstance(n, dict):
            continue
        t = n.get("type")
        if t == "text":
            parts.append(n.get("text") or "")
        elif t in ("hardBreak", "hard_break"):
            parts.append("\n")
        elif "content" in n:
            parts.append(_tiptap_inline_text(n["content"]))
    return "".join(parts)


def _tiptap_doc_to_text(doc: dict) -> str:
    lines: List[str] = []

    def walk_blocks(nodes: Any) -> None:
        if not isinstance(nodes, list):
            return
        for n in nodes:
            if not isinstance(n, dict):
                continue
            t = n.get("type")
            if t == "paragraph":
                s = _tiptap_inline_text(n.get("content")).strip()
                if s:
                    lines.append(s)
            elif t in ("heading", "blockquote"):
                s = _tiptap_inline_text(n.get("content")).strip()
                if s:
                    lines.append(s)
            elif t == "codeBlock":
                raw = n.get("text")
                if isinstance(raw, str) and raw.strip():
                    lines.append(raw.strip())
                else:
                    s = _tiptap_inline_text(n.get("content")).strip()
                    if s:
                        lines.append(s)
            elif t in ("bulletList", "orderedList"):
                for item in n.get("content") or []:
                    if not isinstance(item, dict) or item.get("type") != "listItem":
                        continue
                    for block in item.get("content") or []:
                        if isinstance(block, dict) and block.get("type") == "paragraph":
                            s = _tiptap_inline_text(block.get("content")).strip()
                            if s:
                                lines.append(f"- {s}")
            elif t == "horizontalRule":
                lines.append("---")
            elif t == "doc":
                walk_blocks(n.get("content"))
            elif "content" in n:
                walk_blocks(n["content"])

    walk_blocks(doc.get("content"))
    return "\n\n".join(lines)


def _assert_url_safe(url: str) -> None:
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http(s) URLs are allowed")
    host = parsed.hostname
    if not host:
        raise ValueError("Invalid URL: missing host")

    hl = host.lower()
    if hl in ("localhost",) or hl.endswith(".localhost"):
        raise ValueError("URL host is not allowed")
    if hl in ("127.0.0.1", "::1"):
        raise ValueError("URL host is not allowed")

    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise ValueError(f"Could not resolve host: {e}") from e

    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
        ):
            raise ValueError("URL resolves to a disallowed network address")


def _httpx_safe_request_hook(request: httpx.Request) -> None:
    """Validate every hop (including redirects) against SSRF rules."""
    _assert_url_safe(str(request.url))


def _text_from_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        raise ValueError("url is empty")
    _assert_url_safe(raw)

    timeout = float(os.environ.get("VIDEO_URL_FETCH_TIMEOUT_S", str(_DEFAULT_FETCH_TIMEOUT_S)))
    max_bytes = int(os.environ.get("VIDEO_URL_MAX_BYTES", str(_DEFAULT_MAX_RESPONSE_BYTES)))

    headers = {
        "User-Agent": "SharklyBlogToVideo/1.0 (+https://sharkly.co)",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    }
    with httpx.Client(
        follow_redirects=True,
        max_redirects=8,
        timeout=timeout,
        event_hooks={"request": [_httpx_safe_request_hook]},
    ) as client:
        with client.stream("GET", raw, headers=headers) as resp:
            resp.raise_for_status()
            chunks: List[bytes] = []
            total = 0
            for chunk in resp.iter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(f"Page exceeds max download size ({max_bytes} bytes)")
                chunks.append(chunk)
    html = b"".join(chunks).decode("utf-8", errors="replace")

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    main = soup.find("article") or soup.find("main") or soup.body
    if main:
        text = main.get_text(separator="\n", strip=True)
    else:
        text = soup.get_text(separator="\n", strip=True)

    return text
