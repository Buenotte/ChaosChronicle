import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
import subprocess

WIDTH = 1050
HEIGHT = 160
FPS = 30
DURATION = 6.0  # seconds
TOTAL_FRAMES = int(DURATION * FPS)

def get_font(size, bold=True):
    font_paths = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/tahomabd.ttf" if bold else "C:/Windows/Fonts/tahoma.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

def draw_bell(draw_ctx, cx, cy, size, angle_deg, is_active=False):
    """Draw a rotated red/golden bell at (cx, cy)"""
    bell_img = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bell_img)
    
    bcx = size
    bcy = size
    
    # Red & Gold bell
    color = (255, 45, 45, 255) if is_active else (255, 90, 90, 255)
    inner_gold = (255, 215, 0, 255) if is_active else None
    
    # Top small loop
    bdraw.ellipse([bcx - 6, bcy - 34, bcx + 6, bcy - 22], outline=color, width=4)
    
    # Bell dome
    dome_box = [bcx - 22, bcy - 22, bcx + 22, bcy + 18]
    bdraw.chord(dome_box, start=180, end=0, fill=inner_gold, outline=color, width=5)
    
    # Flared bottom rim
    bdraw.rounded_rectangle([bcx - 28, bcy + 12, bcx + 28, bcy + 24], radius=5, fill=inner_gold, outline=color, width=5)
    
    # Clapper (ball at bottom)
    bdraw.ellipse([bcx - 8, bcy + 24, bcx + 8, bcy + 36], fill=(255, 215, 0, 255) if is_active else color)
    
    # Rotate bell
    rotated = bell_img.rotate(angle_deg, resample=Image.BICUBIC, center=(bcx, bcy))
    return rotated

def render_frame(frame_idx):
    t = frame_idx / FPS  # time in seconds
    
    # Overall Opacity / Fade (0-1s fade in, 4.5-5.5s fade out)
    if t < 1.0:
        alpha_mult = t / 1.0
        offset_y = int((1.0 - t) * 25)
    elif t > 4.5:
        alpha_mult = max(0.0, (5.5 - t) / 1.0)
        offset_y = int((t - 4.5) * 20)
    else:
        alpha_mult = 1.0
        offset_y = 0

    # Canvas RGBA - 100% transparent base (no dark/black background box)
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Red YouTube Avatar Icon (x: 40, y: 35)
    av_x, av_y, av_r = 40, 35 + offset_y, 45
    # Avatar drop shadow
    draw.ellipse([av_x + 3, av_y + 3, av_x + av_r * 2 + 3, av_y + av_r * 2 + 3], fill=(0, 0, 0, int(130 * alpha_mult)))
    # Avatar red circle
    draw.ellipse([av_x, av_y, av_x + av_r * 2, av_y + av_r * 2], fill=(255, 0, 0, int(255 * alpha_mult)), outline=(255, 255, 255, int(240 * alpha_mult)), width=3)
    # White Play triangle in avatar
    tri_pts = [(av_x + 36, av_y + 28), (av_x + 36, av_y + 62), (av_x + 62, av_y + 45)]
    draw.polygon(tri_pts, fill=(255, 255, 255, int(255 * alpha_mult)))
    
    # Channel Info Text (Red Branding Theme)
    font_name = get_font(28, bold=True)
    font_sub = get_font(18, bold=True)
    
    # Text Shadows
    draw.text((158, 40 + offset_y), "Chaos Chronicle", font=font_name, fill=(0, 0, 0, int(200 * alpha_mult)))
    draw.text((158, 80 + offset_y), "YouTube • Подпишись", font=font_sub, fill=(0, 0, 0, int(180 * alpha_mult)))
    
    # Red Title & Subtitle
    draw.text((156, 38 + offset_y), "Chaos Chronicle", font=font_name, fill=(255, 30, 30, int(255 * alpha_mult)))
    draw.text((156, 78 + offset_y), "YouTube • Подпишись", font=font_sub, fill=(255, 230, 230, int(255 * alpha_mult)))
    
    # 2. Large Red Subscribe Button (Transition at t = 2.0s)
    btn_x1, btn_y1, btn_x2, btn_y2 = 570, 40 + offset_y, 880, 120 + offset_y
    is_subscribed = t >= 2.0
    
    if not is_subscribed:
        # Vibrant Red Subscribe Button
        btn_color = (255, 0, 0, int(255 * alpha_mult))
        btn_border = (255, 255, 255, int(240 * alpha_mult))
        text_btn = "ПОДПИСАТЬСЯ"
        text_col = (255, 255, 255, int(255 * alpha_mult))
    else:
        # Deep Ruby Red Active Subscribed Button
        btn_color = (180, 15, 35, int(255 * alpha_mult))
        btn_border = (255, 60, 80, int(255 * alpha_mult))
        text_btn = "ВЫ ПОДПИСАНЫ ✓"
        text_col = (255, 255, 255, int(255 * alpha_mult))
        
    # Button drop shadow
    draw.rounded_rectangle([btn_x1 + 3, btn_y1 + 3, btn_x2 + 3, btn_y2 + 3], radius=40, fill=(0, 0, 0, int(140 * alpha_mult)))
    # Button body
    draw.rounded_rectangle([btn_x1, btn_y1, btn_x2, btn_y2], radius=40, fill=btn_color, outline=btn_border, width=3)
    font_btn = get_font(21, bold=True)
    
    # Center text in button
    bbox = font_btn.getbbox(text_btn)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = btn_x1 + (btn_x2 - btn_x1 - tw) // 2
    ty = btn_y1 + (btn_y2 - btn_y1 - th) // 2 - 3
    draw.text((tx, ty), text_btn, font=font_btn, fill=text_col)
    
    # 3. Red & Gold Bell Icon (Ring between t = 2.8s and 4.2s)
    bell_cx = 955
    bell_cy = 80 + offset_y
    
    if 2.8 <= t <= 4.2:
        ring_t = t - 2.8
        freq = 3.5
        decay = max(0.0, 1.0 - (ring_t / 1.4))
        angle = 15.0 * math.sin(2 * math.pi * freq * ring_t) * decay
        bell_active = True
    elif t > 4.2:
        angle = 0.0
        bell_active = True
    else:
        angle = 0.0
        bell_active = False
        
    bell_img = draw_bell(draw, bell_cx, bell_cy, 52, angle, is_active=bell_active)
    
    if alpha_mult < 1.0:
        r, g, b, a = bell_img.split()
        a = a.point(lambda p: int(p * alpha_mult))
        bell_img = Image.merge("RGBA", (r, g, b, a))
        
    img.paste(bell_img, (bell_cx - 52, bell_cy - 52), bell_img)
    
    # 4. Animated Mouse Cursor Click
    if 1.5 <= t <= 3.6:
        cursor_alpha = int(255 * alpha_mult)
        if t < 2.0:
            progress = (t - 1.5) / 0.5
            cx = int(420 + progress * (btn_x1 + 140 - 420))
            cy = int(125 + progress * (btn_y1 + 40 - 125) + offset_y)
            clicking = t >= 1.9
        elif t < 2.6:
            cx = btn_x1 + 140
            cy = btn_y1 + 40 + offset_y
            clicking = t < 2.2
        elif t < 3.2:
            progress = (t - 2.6) / 0.6
            cx = int(btn_x1 + 140 + progress * (bell_cx - (btn_x1 + 140)))
            cy = int(btn_y1 + 40 + progress * (bell_cy - (btn_y1 + 40)) + offset_y)
            clicking = t >= 3.0
        else:
            cx = bell_cx
            cy = bell_cy + offset_y
            clicking = True
            
        cur_pts = [(cx, cy), (cx, cy + 24), (cx + 7, cy + 19), (cx + 14, cy + 29), (cx + 18, cy + 27), (cx + 11, cy + 16), (cx + 19, cy + 16)]
        draw.polygon(cur_pts, fill=(255, 255, 255, cursor_alpha), outline=(0, 0, 0, cursor_alpha))
        if clicking:
            # Red click ripple
            draw.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], outline=(255, 40, 40, int(220 * alpha_mult)), width=3)
            
    return img

def main():
    print(f"Rendere {TOTAL_FRAMES} Frames fuer YouTube Abonnieren-Animation (600x120px)...")
    
    target_dir = os.path.abspath("assets/banner")
    os.makedirs(target_dir, exist_ok=True)
    
    frames_dir = os.path.join(target_dir, "temp_frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # 1. Generate all RGBA PNG frames
    for i in range(TOTAL_FRAMES):
        frame = render_frame(i)
        frame.save(os.path.join(frames_dir, f"frame_{i:04d}.png"))
        if i % 30 == 0:
            print(f"  Frame {i}/{TOTAL_FRAMES} gerendert...")
            
    print("Alle Frames gerendert. Erstelle finale Videos in assets/banner/...")
    
    output_mp4 = os.path.join(target_dir, "sub_animation.mp4")
    output_mov = os.path.join(target_dir, "sub_animation_transparent.mov")
    output_webm = os.path.join(target_dir, "sub_animation_transparent.webm")
    output_chroma = os.path.join(target_dir, "sub_animation_greenscreen.mp4")
    
    # Root copy as requested in prompt
    output_root_mp4 = os.path.abspath("sub_animation.mp4")
    
    input_pattern = os.path.join(frames_dir, "frame_%04d.png")
    
    # 1. Transparentes MOV (QuickTime Animation mit echtem Alpha)
    cmd_mov = [
        "ffmpeg", "-y", "-framerate", str(FPS),
        "-i", input_pattern,
        "-c:v", "qtrle",
        "-pix_fmt", "argb",
        output_mov
    ]
    subprocess.run(cmd_mov, check=True)
    print(f"[OK] Transparentes MOV gespeichert: {output_mov}")
    
    # 2. Transparentes WebM (VP9 mit Alpha yuva420p)
    cmd_webm = [
        "ffmpeg", "-y", "-framerate", str(FPS),
        "-i", input_pattern,
        "-c:v", "libvpx-vp9",
        "-pix_fmt", "yuva420p",
        "-b:v", "2M",
        output_webm
    ]
    subprocess.run(cmd_webm, check=True)
    print(f"[OK] Transparentes WebM gespeichert: {output_webm}")
    
    # 3. sub_animation.mp4 (H.264 high-quality fuer direkten Einsatz)
    cmd_mp4 = [
        "ffmpeg", "-y", "-framerate", str(FPS),
        "-i", input_pattern,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "slow",
        "-crf", "18",
        output_mp4
    ]
    subprocess.run(cmd_mp4, check=True)
    print(f"[OK] sub_animation.mp4 gespeichert: {output_mp4}")
    
    # Also save in root
    import shutil
    shutil.copyfile(output_mp4, output_root_mp4)
    print(f"[OK] sub_animation.mp4 (Root) gespeichert: {output_root_mp4}")
    
    # 4. Greenscreen MP4 (Chromakey #00FF00) fuer Videoeditoren (CapCut, Premiere, DaVinci)
    cmd_chroma = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=0x00FF00:s={WIDTH}x{HEIGHT}:r={FPS}:d={DURATION}",
        "-framerate", str(FPS), "-i", input_pattern,
        "-filter_complex", "[0:v][1:v]overlay=0:0[v]",
        "-map", "[v]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "slow",
        "-crf", "18",
        output_chroma
    ]
    subprocess.run(cmd_chroma, check=True)
    print(f"[OK] Greenscreen MP4 gespeichert: {output_chroma}")
    
    # Cleanup temp frames
    for f in os.listdir(frames_dir):
        os.remove(os.path.join(frames_dir, f))
    os.rmdir(frames_dir)
    print("Fertig! Alle Formate erfolgreich in assets/banner gespeichert.")

if __name__ == "__main__":
    main()

if __name__ == "__main__":
    main()
