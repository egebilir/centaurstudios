# Pusula Screenshots

Source PNGs live here (`1.png`–`5.png`, ~1284×2778, straight from the App Store screenshot set).
The landing page (`pusula/index.html`) doesn't use these directly — it uses the
optimized copies in `web/` (WebP, resized to 1000px wide, ~95% smaller) so the
page stays fast. If you replace a source PNG, regenerate its WebP:

```python
from PIL import Image
im = Image.open("pusula/screenshots/N.png").convert("RGB")
w, h = im.size
im.resize((1000, round(h * 1000 / w)), Image.LANCZOS).save(
    "pusula/screenshots/web/N.webp", "WEBP", quality=82, method=6
)
```

## Where each one is used

| File | Shows | Used in |
|------|-------|---------|
| `1.png` | Home screen overview (Ayet Bul, Manevi Rehber, Kıssalar, Dua'lar, 14 Günlük Yolculuk) | Hero |
| `2.png` | Verse + audio + "Pusula Yorumu" AI reflection | Showcase |
| `3.png` | "Derin Rehberlik" (Deep Guidance) — has the PRO badge | Pusula Pro section |
| `4.png` | Dua generator ("İsteğiniz için Dua") | Showcase |
| `5.png` | Manevi Rehber chat | Showcase |

If you add more screenshots later, drop the PNG here, generate its WebP the
same way, and reference `screenshots/web/<name>.webp` from the page.
