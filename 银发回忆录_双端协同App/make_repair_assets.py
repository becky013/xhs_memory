# 生成照片修复演示素材：破损缺角版 与 修复上色版
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import random, math

SRC = "assets/old-family.png"
random.seed(42)

img = Image.open(SRC).convert("RGB")
w, h = img.size

# ---------- 1) 破损版：缺角 + 折痕 + 霉斑 + 泛黄 ----------
dam = img.copy()
# 泛黄做旧
warm = Image.new("RGB", dam.size, (196, 178, 140))
dam = Image.blend(dam, warm, 0.22)
dam = ImageEnhance.Contrast(dam).enhance(0.86)
dam = ImageEnhance.Brightness(dam).enhance(1.04)

d = ImageDraw.Draw(dam, "RGBA")

# 缺角：右下角撕掉一块，露出纸背（毛边多边形）
cx, cy = int(w * 0.66), int(h * 0.66)
pts = [(w, int(h*0.58))]
x = w
y = int(h*0.58)
while x > cx - 40:
    x -= random.randint(26, 60)
    y += random.randint(-26, 40)
    y = max(int(h*0.55), min(h, y))
    pts.append((max(cx-60, x), y))
pts += [(cx-40, h), (w, h)]
paper_back = (222, 211, 188)
d.polygon(pts, fill=paper_back + (255,))
# 缺角内侧阴影
edge = pts[:]
for i in range(len(edge)-1):
    d.line([edge[i], edge[i+1]], fill=(120, 105, 80, 120), width=3)

# 折痕（两条斜线，一深一浅）
def crease(x0, y0, x1, y1):
    d.line([(x0, y0), (x1, y1)], fill=(255, 250, 235, 90), width=3)
    d.line([(x0+2, y0), (x1+2, y1)], fill=(60, 50, 40, 70), width=2)
crease(int(w*0.08), 0, int(w*0.42), h)
crease(int(w*0.55), 0, int(w*0.30), int(h*0.5))

# 霉斑
for _ in range(26):
    bx, by = random.randint(0, w), random.randint(0, h)
    r = random.randint(4, 26)
    d.ellipse([bx-r, by-r, bx+r, by+r], fill=(90, 75, 55, random.randint(14, 40)))

# 划痕
for _ in range(8):
    x0, y0 = random.randint(0, w), random.randint(0, h)
    x1, y1 = x0 + random.randint(-160, 160), y0 + random.randint(-160, 160)
    d.line([(x0, y0), (x1, y1)], fill=(235, 228, 210, 60), width=1)

dam = dam.filter(ImageFilter.GaussianBlur(0.4))
dam.save("assets/old-damaged.png")

# ---------- 2) 修复版：补全画面 + 柔和上色 ----------
res = img.copy()
res = ImageEnhance.Contrast(res).enhance(1.05)
res = ImageEnhance.Sharpness(res).enhance(1.3)
# 简单上色：分通道暖色调（肤色/砖墙偏暖、天空偏青）
r, g, b = res.split()
r = r.point(lambda v: min(255, int(v * 1.10 + 16)))
g = g.point(lambda v: min(255, int(v * 1.02 + 4)))
b = b.point(lambda v: max(0, int(v * 0.96)))
res = Image.merge("RGB", (r, g, b))
# 顶部天空区域偏青
top = Image.new("RGB", res.size, (168, 196, 205))
mask = Image.new("L", res.size, 0)
md = ImageDraw.Draw(mask)
for yy in range(int(h*0.30)):
    md.line([(0, yy), (w, yy)], fill=int(70 * (1 - yy/(h*0.30))))
res = Image.composite(Image.blend(res, top, 0.5), res, mask)
# 整体轻微暖滤镜 + 暗角修复感
res = ImageEnhance.Color(res).enhance(1.12)
res.save("assets/old-restored.png")
print("done", dam.size, res.size)
