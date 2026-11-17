"""Crop an 8-bit, non-interlaced RGB/RGBA PNG (what Chrome writes). Standard library only.

Headless Chrome will not lay out a window narrower than 500px and its window
size includes browser chrome, so render.py captures a larger window and crops
to the exact viewport here.
"""
from __future__ import annotations

import struct
import zlib

SIG = b"\x89PNG\r\n\x1a\n"


def _chunks(data: bytes):
    pos = 8
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        yield kind, data[pos + 8:pos + 8 + length]
        pos += 12 + length


def _chunk(kind: bytes, body: bytes) -> bytes:
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)


def _paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    return a if pa <= pb and pa <= pc else b if pb <= pc else c


def crop(data: bytes, width: int, height: int) -> bytes:
    """Top-left *width* x *height* of the PNG *data* (clamped to the image)."""
    if not data.startswith(SIG):
        raise ValueError("not a PNG")
    ihdr = b""
    idat = []
    for kind, body in _chunks(data):
        if kind == b"IHDR":
            ihdr = body
        elif kind == b"IDAT":
            idat.append(body)
    w, h, depth, ctype, _comp, _filt, interlace = struct.unpack(">IIBBBBB", ihdr)
    if depth != 8 or ctype not in (2, 6) or interlace:
        raise ValueError("unsupported PNG format")
    bpp = 3 if ctype == 2 else 4
    stride = w * bpp
    raw = zlib.decompress(b"".join(idat))
    cw, ch = min(width, w), min(height, h)
    prev = bytearray(stride)
    out = bytearray()
    pos = 0
    for _y in range(ch):
        ftype = raw[pos]
        line = bytearray(raw[pos + 1:pos + 1 + stride])
        pos += 1 + stride
        if ftype == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                up_left = prev[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + _paeth(left, prev[i], up_left)) & 0xFF
        out += b"\x00" + line[:cw * bpp]
        prev = line
    new_ihdr = struct.pack(">IIBBBBB", cw, ch, 8, ctype, 0, 0, 0)
    return SIG + _chunk(b"IHDR", new_ihdr) + _chunk(b"IDAT", zlib.compress(bytes(out), 9)) + _chunk(b"IEND", b"")
