import math
from PIL import Image, ImageDraw

def generate_icons():
    size = 512
    scale = 4  # 4x supersampling for ultra smooth rendering
    ss_size = size * scale
    ss_img = Image.new('RGBA', (ss_size, ss_size), (0, 0, 0, 0))
    ss_draw = ImageDraw.Draw(ss_img)

    ss_cx = ss_size // 2
    ss_cy = int(ss_size * 0.55)  # center slightly lower to leave room for pin
    ss_r = int(ss_size * 0.38)   # wheel radius

    # Vibrant romantic pastel palette
    colors = [
        (255, 107, 138, 255),  # Wedge 1: #FF6B8A
        (178, 112, 238, 255),  # Wedge 2: #B270EE
        (255, 204, 213, 255),  # Wedge 3: #FFCCD5
        (255, 77, 115, 255),   # Wedge 4: #FF4D73
        (199, 146, 240, 255),  # Wedge 5: #C792F0
        (255, 51, 102, 255),   # Wedge 6: #FF3366
    ]

    # 1. Outer soft glow / shadow under wheel
    for offset in range(8, 0, -2):
        alpha = int(22 * (1 - offset / 10))
        ss_draw.ellipse(
            [ss_cx - ss_r - 12 * scale, ss_cy - ss_r - 12 * scale + offset * scale,
             ss_cx + ss_r + 12 * scale, ss_cy + ss_r + 12 * scale + offset * scale],
            fill=(255, 51, 102, alpha)
        )

    # 2. White base rim + Rose outline
    rim_thick = 14 * scale
    ss_draw.ellipse(
        [ss_cx - ss_r - rim_thick, ss_cy - ss_r - rim_thick,
         ss_cx + ss_r + rim_thick, ss_cy + ss_r + rim_thick],
        fill=(255, 255, 255, 255),
        outline=(255, 60, 110, 255),
        width=8 * scale
    )

    # 3. Six Roulette Wedges
    num_slices = len(colors)
    slice_deg = 360 / num_slices
    start_offset = -90

    for i, color in enumerate(colors):
        start = start_offset + i * slice_deg
        end = start + slice_deg
        ss_draw.pieslice(
            [ss_cx - ss_r, ss_cy - ss_r, ss_cx + ss_r, ss_cy + ss_r],
            start=start,
            end=end,
            fill=color,
            outline=(255, 255, 255, 255),
            width=5 * scale
        )

    # 4. Cute white rim dots
    for d in range(num_slices):
        ang = math.radians(start_offset + d * slice_deg + slice_deg / 2)
        dot_dist = ss_r + 7 * scale
        dx = ss_cx + dot_dist * math.cos(ang)
        dy = ss_cy + dot_dist * math.sin(ang)
        dot_r = 4.5 * scale
        ss_draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=(255, 255, 255, 255))

    # 5. Center Hub Circle
    r_inner = int(ss_r * 0.44)
    # Hub shadow
    ss_draw.ellipse(
        [ss_cx - r_inner - 2 * scale, ss_cy - r_inner + 4 * scale,
         ss_cx + r_inner + 2 * scale, ss_cy + r_inner + 8 * scale],
        fill=(0, 0, 0, 35)
    )
    # Hub white disc
    ss_draw.ellipse(
        [ss_cx - r_inner, ss_cy - r_inner, ss_cx + r_inner, ss_cy + r_inner],
        fill=(255, 255, 255, 255),
        outline=(255, 175, 195, 255),
        width=7 * scale
    )

    # 6. Center Heart
    heart_scale = scale * 3.4
    hcx, hcy = ss_cx, ss_cy - 2 * scale
    heart_pts = []
    for t in range(0, 360, 1):
        rad = math.radians(t)
        hx = 16 * (math.sin(rad) ** 3)
        hy = -(13 * math.cos(rad) - 5 * math.cos(2 * rad) - 2 * math.cos(3 * rad) - math.cos(4 * rad))
        heart_pts.append((hcx + hx * heart_scale, hcy + hy * heart_scale))

    ss_draw.polygon(heart_pts, fill=(255, 42, 100, 255))
    
    # Specular shine dot on heart
    shine_x = hcx - 11 * scale
    shine_y = hcy - 11 * scale
    ss_draw.ellipse([shine_x - 4 * scale, shine_y - 4 * scale, shine_x + 4 * scale, shine_y + 4 * scale], fill=(255, 210, 225, 240))

    # 7. Perfect Top Pin Pointer (Teardrop pointer)
    tip_y = ss_cy - ss_r + 16 * scale
    head_cy = 45 * scale
    head_r = 18 * scale
    H = tip_y - head_cy

    sin_a = head_r / H
    cos_a = math.sqrt(1 - sin_a * sin_a)
    angle_tangent = math.asin(sin_a)

    pin_pts = []
    # Point at tip
    pin_pts.append((ss_cx, tip_y))
    # Right tangent point
    pin_pts.append((ss_cx + head_r * cos_a, head_cy + head_r * sin_a))

    # Arc around top
    t_start = angle_tangent
    t_end = math.pi - angle_tangent
    steps = 40
    for s in range(steps + 1):
        ang = t_start - (s / steps) * (2 * math.pi - (t_end - t_start))
        pin_pts.append((ss_cx + head_r * math.cos(ang), head_cy + head_r * math.sin(ang)))

    # Left tangent point
    pin_pts.append((ss_cx - head_r * cos_a, head_cy + head_r * sin_a))

    # Pointer shadow
    pin_shadow = [(p[0], p[1] + 5 * scale) for p in pin_pts]
    ss_draw.polygon(pin_shadow, fill=(0, 0, 0, 45))

    # Pointer body
    ss_draw.polygon(pin_pts, fill=(255, 42, 100, 255), outline=(255, 255, 255, 255), width=5 * scale)

    # Small white circle inside pointer head
    ss_draw.ellipse([ss_cx - 6 * scale, head_cy - 6 * scale, ss_cx + 6 * scale, head_cy + 6 * scale], fill=(255, 255, 255, 255))

    # Downscale to 512
    base_512 = ss_img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Save multi-resolution ICO file
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base_512.save('app/favicon.ico', format='ICO', sizes=sizes)
    base_512.save('public/favicon.ico', format='ICO', sizes=sizes)

    # Save Apple Touch Icon (180x180 PNG)
    apple_180 = base_512.resize((180, 180), Image.Resampling.LANCZOS)
    apple_180.save('app/apple-icon.png', format='PNG')
    apple_180.save('public/apple-touch-icon.png', format='PNG')

    # Save preview
    base_512.save('icon_preview.png', format='PNG')
    print('All favicon and icon assets generated successfully!')

if __name__ == '__main__':
    generate_icons()
