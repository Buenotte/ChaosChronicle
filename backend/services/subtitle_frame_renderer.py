#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ChaosChronicle Karaoke Subtitle Renderer
Renders word-by-word highlighted subtitle frames as RGBA PNG files.
Each word state is rendered as its own frame with:
  - Rounded semi-transparent background box
  - Active word in highlight color (larger)
  - Inactive words in white
  - Soft shadow via blurred layer
  - Thick stroke outline
Output: PNG sequence + FFmpeg concat list
"""
import json, sys, os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

COLOR_MAP = {
    'yellow': (255, 230, 0), 'white': (255, 255, 255), 'red': (255, 42, 42),
    'cyan': (0, 240, 255), 'green': (0, 255, 102), 'orange': (255, 140, 0),
    'black': (0, 0, 0), 'blue': (29, 78, 216), 'purple': (124, 58, 237),
}

def to_rgb(color):
    if not color:
        return (255, 230, 0)
    if isinstance(color, (list, tuple)) and len(color) >= 3:
        return tuple(int(c) for c in color[:3])
    if isinstance(color, str) and color in COLOR_MAP:
        return COLOR_MAP[color]
    try:
        c = str(color).strip().lstrip('#')
        if len(c) == 3:
            c = ''.join(x * 2 for x in c)
        return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return (255, 230, 0)

def load_font(font_path, size):
    size = max(10, int(size))
    candidates = [font_path] if font_path else []
    candidates += [
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/arialbd.ttf',
        'C:/Windows/Fonts/times.ttf',
        'C:/Windows/Fonts/timesbd.ttf',
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def get_word_size(draw, text, font):
    try:
        bb = draw.textbbox((0, 0), text, font=font, anchor='lt')
        return bb[2] - bb[0], bb[3] - bb[1]
    except Exception:
        try:
            return draw.textsize(text, font=font)
        except Exception:
            return (len(text) * 20, 30)

def draw_rounded_rect(draw, xy, radius, fill):
    x1, y1, x2, y2 = xy
    r = min(radius, (x2 - x1) // 2, (y2 - y1) // 2)
    try:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill)
    except AttributeError:
        # Pillow < 8.2 fallback
        draw.rectangle([x1 + r, y1, x2 - r, y2], fill=fill)
        draw.rectangle([x1, y1 + r, x2, y2 - r], fill=fill)
        draw.ellipse([x1, y1, x1 + 2*r, y1 + 2*r], fill=fill)
        draw.ellipse([x2 - 2*r, y1, x2, y1 + 2*r], fill=fill)
        draw.ellipse([x1, y2 - 2*r, x1 + 2*r, y2], fill=fill)
        draw.ellipse([x2 - 2*r, y2 - 2*r, x2, y2], fill=fill)

def render_subtitle_frame(cfg, chunk_words, active_idx):
    """
    Render one subtitle frame as RGBA PIL Image — CapCut karaoke style.
    Active word gets its own colored highlight box behind it.
    chunk_words: list of word strings (already uppercased)
    active_idx:  index of the currently spoken word
    """
    W = int(cfg['canvas_w'])
    H = int(cfg['canvas_h'])
    pos_y = int(cfg['pos_y'])
    fs = int(cfg['font_size'])

    font_path    = cfg.get('font_path')
    font         = load_font(font_path, fs)

    active_rgb   = to_rgb(cfg.get('active_color',   'yellow'))
    inactive_rgb = to_rgb(cfg.get('inactive_color',  'white'))
    stroke_rgb   = to_rgb(cfg.get('stroke_color',    'black'))
    stroke_w     = max(0, int(cfg.get('stroke_width', 8)))
    shadow_d     = max(1, int(cfg.get('shadow_dist',  6)))
    box_mode     = cfg.get('box_mode', 'pill')  # 'pill'=highlight-box, 'glow'=glow, 'none'=no box
    box_opacity  = float(cfg.get('box_opacity', 0.88))

    # ------------------------------------------------------------------
    # 1) Measure all words and wrap into lines (max line width ~ W - 140px)
    # ------------------------------------------------------------------
    tmp   = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
    tmp_d = ImageDraw.Draw(tmp)

    word_dims = [get_word_size(tmp_d, w, font) for w in chunk_words]
    
    # If any single word with 1.15x pop is too wide, scale font down
    max_word_w = max((d[0] for d in word_dims), default=100)
    max_allowed_word = W - 200
    if max_word_w * 1.15 > max_allowed_word:
        ratio = max_allowed_word / (max_word_w * 1.15)
        fs = max(32, int(fs * ratio))
        font = load_font(font_path, fs)
        word_dims = [get_word_size(tmp_d, w, font) for w in chunk_words]

    gap = max(24, int(fs * 0.48))
    max_line_w = W - 160

    # Auto-wrap words into lines
    lines = []       # list of list of (word_index, word_str, (ww, hh))
    cur_line = []
    cur_line_w = 0

    for i, w in enumerate(chunk_words):
        ww, hh = word_dims[i]
        needed_w = ww if len(cur_line) == 0 else (gap + ww)
        if len(cur_line) > 0 and (cur_line_w + needed_w > max_line_w):
            lines.append(cur_line)
            cur_line = [(i, w, (ww, hh))]
            cur_line_w = ww
        else:
            cur_line.append((i, w, (ww, hh)))
            cur_line_w += needed_w
    if cur_line:
        lines.append(cur_line)

    line_height = max((d[1] for d in word_dims), default=fs)
    line_spacing = int(line_height * 0.25)
    num_lines = len(lines)
    total_block_h = num_lines * line_height + max(0, num_lines - 1) * line_spacing

    # Calculate line widths considering active word enlargement
    line_widths = []
    for line in lines:
        lw = 0
        for idx, item in enumerate(line):
            (i, word, (ww, hh)) = item
            if i == active_idx:
                act_fs = int(round(fs * 1.15))
                act_font = load_font(font_path, act_fs)
                aw, _ = get_word_size(tmp_d, word, act_font)
                lw += aw
            else:
                lw += ww
            if idx > 0:
                lw += gap
        line_widths.append(lw)

    max_block_w = max(line_widths, default=W - 100)
    top_y = pos_y - total_block_h // 2

    # ------------------------------------------------------------------
    # 2) Create canvas
    # ------------------------------------------------------------------
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)

    # ------------------------------------------------------------------
    # 3) Outer background pill box wrapping all lines
    # ------------------------------------------------------------------
    if box_mode != 'none':
        pad_x = max(36, int(fs * 0.55))
        pad_y = max(20, int(fs * 0.30))
        box_w = min(W - 30, max_block_w + pad_x * 2)
        box_h = total_block_h + pad_y * 2
        box_x = max(10, (W - box_w) // 2)
        box_y = pos_y - box_h // 2
        
        if box_mode == 'glow':
            glow_col = active_rgb + (200,)
            draw_rounded_rect(d, [box_x - 4, box_y - 4, box_x + box_w + 4, box_y + box_h + 4], 32, glow_col)
            
        draw_rounded_rect(d, [box_x, box_y, box_x + box_w, box_y + box_h], 28, (0, 0, 0, int(box_opacity * 255)))

    # ------------------------------------------------------------------
    # 4) Soft drop shadow
    # ------------------------------------------------------------------
    sh_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh_d     = ImageDraw.Draw(sh_layer)

    for l_idx, line in enumerate(lines):
        lw = line_widths[l_idx]
        cur_x = (W - lw) // 2
        cur_y = top_y + l_idx * (line_height + line_spacing)
        for (i, word, (ww, hh)) in line:
            sh_d.text((cur_x + shadow_d, cur_y + shadow_d), word, font=font, fill=(0, 0, 0, 240))
            cur_x += ww + gap

    sh_layer = sh_layer.filter(ImageFilter.GaussianBlur(max(2, shadow_d * 0.6)))
    img = Image.alpha_composite(img, sh_layer)

    # ------------------------------------------------------------------
    # 5) Main text rendering with active word pop
    # ------------------------------------------------------------------
    d = ImageDraw.Draw(img)

    for l_idx, line in enumerate(lines):
        lw = line_widths[l_idx]
        cur_x = (W - lw) // 2
        cur_y = top_y + l_idx * (line_height + line_spacing)
        
        for (i, word, (ww, hh)) in line:
            is_active = (i == active_idx)
            col = active_rgb if is_active else inactive_rgb
            sw = stroke_w

            if is_active:
                act_fs = int(round(fs * 1.15))
                act_font = load_font(font_path, act_fs)
                act_w, act_h = get_word_size(tmp_d, word, act_font)
                offset_x = (ww - act_w) // 2
                offset_y = (hh - act_h) // 2
                draw_x = cur_x + offset_x
                draw_y = cur_y + offset_y
                target_font = act_font
            else:
                draw_x = cur_x
                draw_y = cur_y
                target_font = font

            try:
                d.text((draw_x, draw_y), word, font=target_font,
                       fill=col + (255,), stroke_width=sw, stroke_fill=stroke_rgb + (255,))
            except TypeError:
                for ox in range(-sw, sw+1):
                    for oy in range(-sw, sw+1):
                        if ox*ox + oy*oy <= sw*sw:
                            d.text((draw_x+ox, draw_y+oy), word, font=target_font, fill=stroke_rgb+(255,))
                d.text((draw_x, draw_y), word, font=target_font, fill=col+(255,))

            cur_x += ww + gap

    return img


def make_blank(W, H):
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: subtitle_frame_renderer.py <config.json>'}))
        sys.exit(1)

    cfg_path = sys.argv[1]
    try:
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
    except Exception as e:
        print(json.dumps({'error': f'Cannot read config: {e}'}))
        sys.exit(1)

    out_dir = cfg['out_dir']
    os.makedirs(out_dir, exist_ok=True)

    W      = int(cfg['canvas_w'])
    H      = int(cfg['canvas_h'])
    events = cfg.get('word_events', [])

    if not events:
        print(json.dumps({'error': 'No word_events in config'}))
        sys.exit(1)

    concat_lines = []
    frame_idx    = 0
    cur_time     = 0.0

    def save_png(pil_img, name):
        p = os.path.join(out_dir, name).replace('\\', '/')
        pil_img.save(p, 'PNG')
        return p

    for ev_idx, event in enumerate(events):
        raw_words   = event.get('chunk_words', [])
        chunk_words = [str(w).upper() for w in raw_words]
        timings     = event.get('word_timings', [])

        if not timings or not chunk_words:
            continue

        chunk_start = float(timings[0]['active_start'])
        
        # If there is a silence/gap before this chunk, insert a blank frame
        if chunk_start > cur_time + 0.05:
            gap_dur = chunk_start - cur_time
            bp = save_png(make_blank(W, H), f'frame_{frame_idx:04d}.png')
            concat_lines += [f"file '{bp}'", f"duration {gap_dur:.3f}"]
            frame_idx += 1
            cur_time = chunk_start

        # Render each word's active frame with exact timing
        num_w = len(timings)
        for wi in range(num_w):
            t_start = float(timings[wi]['active_start'])
            t_end   = float(timings[wi]['active_end'])
            
            # Next word start determines current word duration for flawless sync
            if wi < num_w - 1:
                next_start = float(timings[wi + 1]['active_start'])
                dur = max(0.08, next_start - t_start)
            else:
                dur = max(0.08, t_end - t_start)

            frame_img = render_subtitle_frame(cfg, chunk_words, wi)
            fp = save_png(frame_img, f'frame_{frame_idx:04d}.png')
            concat_lines += [f"file '{fp}'", f"duration {dur:.3f}"]
            frame_idx += 1
            cur_time = t_start + dur

    # FFmpeg concat demuxer requires the last file to be repeated without duration
    if frame_idx > 0:
        last_file = os.path.join(out_dir, f'frame_{frame_idx-1:04d}.png').replace('\\', '/')
        concat_lines.append(f"file '{last_file}'")

    concat_path = os.path.join(out_dir, 'subtitle_concat.txt')
    with open(concat_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(concat_lines) + '\n')

    result = {
        'success': True,
        'concat_path': concat_path.replace('\\', '/'),
        'frame_count': frame_idx,
        'out_dir': out_dir,
    }
    print(json.dumps(result))

if __name__ == '__main__':
    main()
