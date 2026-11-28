"""Render a reviewed trip packet and hash manifest. Usage: input.json output-dir."""
import hashlib
import json
import os
import re
import sys
from datetime import date
from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit
from xml.sax.saxutils import escape, quoteattr

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image as PDFImage, PageBreak, Paragraph, SimpleDocTemplate, Spacer

INK = "#162d2f"
TEAL = "#086457"
MUTED = "#466568"
PALE = "#eaf4f0"
FONT_DIR = Path(os.environ.get("GOEAST_LATIN_FONTS", "/usr/share/fonts/truetype/dejavu"))

def setup_fonts():
    for name, suffix in [("Arrival", ""), ("ArrivalBold", "-Bold")]:
        pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / f"DejaVuSans{suffix}.ttf")))

def plain(value, limit=420):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError("Missing or oversized report text")
    if any(ord(c) < 32 for c in value):
        raise ValueError("Unexpected control characters")
    return value.strip()

def checked_date(value):
    if date.fromisoformat(value).isoformat() != value:
        raise ValueError("Invalid date")
    return value

def paragraph(value, size=11, color=INK, bold=False, markup=False):
    style = ParagraphStyle("p", fontName="ArrivalBold" if bold else "Arrival", fontSize=size,
                           leading=size * 1.36, textColor=colors.HexColor(color), spaceAfter=8)
    return Paragraph(value if markup else escape(value), style)

def validate(data):
    uuid = r"[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}"
    if not re.fullmatch(uuid, data["orderId"]) or type(data["version"]) is not int or data["version"] != 1:
        raise ValueError("Missing exact order and version")
    if data["purpose"] not in ("qa", "reviewed"):
        raise ValueError("Report purpose must be explicit")
    trip = data["trip"]
    if set(trip) != {"date", "flight", "hotel", "terminal", "localTime", "preferences"}:
        raise ValueError("Use the exact protected packetTrip snapshot")
    checked_date(trip["date"])
    plain(trip["hotel"], 120)
    if not re.fullmatch(r"[A-Z0-9]{2}\d{1,4}[A-Z]?", trip["flight"]) or trip["terminal"] not in ("T1", "T2") or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", trip["localTime"]):
        raise ValueError("Unverified trip shape")
    needs = {"no_mobile_data", "no_mobile_payments", "extra_luggage"}
    if not isinstance(trip["preferences"], list) or any(p not in needs for p in trip["preferences"]) or set(trip["preferences"]) != set(data["preferencePlans"]):
        raise ValueError("Every selected constraint needs its own plan")
    for k in ("decision", "boundary", "addressEnglish", "cnAddress", "cnPrompt", "hotelPhone"):
        plain(data[k], 230)
    for k, minimum, maximum in (("steps", 3, 5), ("fallbacks", 2, 4), ("checklist", 2, 4), ("phrases", 2, 4), ("sources", 2, 5)):
        if not isinstance(data[k], list) or not minimum <= len(data[k]) <= maximum:
            raise ValueError(f"Invalid {k} section")
    cn = re.compile(r"[\u3400-\u9fff]")
    if not cn.search(data["cnAddress"]) or not cn.search(data["cnPrompt"]):
        raise ValueError("A Chinese offline address and prompt are required")
    if not re.fullmatch(r"[+() 0-9-]{7,30}", data["hotelPhone"]):
        raise ValueError("Provide the hotel phone in dialable format")
    kinds = set()
    for s in data["sources"]:
        url = urlsplit(plain(s["url"], 500))
        checked_date(s["checked"])
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError("Invalid evidence URL")
        plain(s["name"], 80)
        plain(s["finding"], 160)
        kinds.add(s["kind"])
    if not {"hotel", "transport"} <= kinds:
        raise ValueError("Hotel and transport evidence are required")
    return trip

def chinese_font(size):
    return ImageFont.truetype(os.environ.get("GOEAST_CJK_FONT",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"), size, index=int(os.environ.get("GOEAST_CJK_INDEX","2")))

def make_card(data, path):
    card = Image.new("RGB", (1300, 360), PALE)
    draw = ImageDraw.Draw(card)
    draw.text((38, 24), "GOEAST   /   SHOW YOUR DRIVER", font=ImageFont.truetype(str(FONT_DIR/"DejaVuSans-Bold.ttf"), 30), fill=TEAL)
    for key, y, size in (("cnPrompt", 92, 53), ("cnAddress", 174, 45), ("hotelPhone", 272, 35)):
        body = data[key]
        f = chinese_font(size)
        while size > 25 and draw.textlength(body,font=f)>1218:
            size -= 1
            f = chinese_font(size)
        if draw.textlength(body,font=f)>1218:
            raise ValueError("Chinese address too long for offline card; use the verified short address")
        draw.text((38, y), body, font=f, fill=INK)
    card.save(path)
    return card

def render(data, output):
    trip = validate(data)
    setup_fonts()
    output.mkdir(parents=True, exist_ok=True)
    if any((output/name).exists() for name in ("report.pdf","address.png","manifest.json")):
        raise ValueError("Use an empty output directory; never overwrite another order packet")
    pdf, png = output/"report.pdf", output/"address.png"
    card = make_card(data,png)
    doc = SimpleDocTemplate(str(pdf), pagesize=A4, leftMargin=53, rightMargin=53, topMargin=45,
                            bottomMargin=57,title="GoEast | Your Shanghai arrival plan",author="GoEast")
    p = paragraph
    numbered = lambda items: [p(f"{i}. {plain(text,250)}") for i,text in enumerate(items,1)]
    def title(number,title_text):
        return [p("GOEAST  /  SHANGHAI ARRIVAL CHECK   ·   "+number,9.2,TEAL,True),p(title_text,27,INK,True)]
    story = title("01","Your first hour in Shanghai")
    story.extend([p(f'{trip["flight"]} · {trip["date"]} {trip["localTime"]} Shanghai time · Pudong {trip["terminal"]}',11,TEAL,True),
        p(trip["hotel"],17,INK,True),Spacer(1,8),p(plain(data["decision"],230),14,INK,True),*numbered(data["steps"]),
        Spacer(1,14),p("Before you leave",13,TEAL,True),*numbered(data["checklist"]),
        p(plain(data["boundary"],230),9,MUTED),PageBreak()])
    story.extend(title("02","If things change"))
    for fallback in data["fallbacks"]:
        story.extend([p(plain(fallback["when"],80),12,TEAL,True),p(plain(fallback["action"],230))])
    pref_names={"no_mobile_data":"No mobile data","no_mobile_payments":"No mobile payments","extra_luggage":"Extra luggage"}
    for key in trip["preferences"]:
        story.extend([p(pref_names[key],12,TEAL,True),p(plain(data["preferencePlans"][key],230))])
    story.extend([PageBreak(),*title("03","Save this offline"),PDFImage(str(png),width=476,height=132),
                  Spacer(1,7),p(plain(data["addressEnglish"],230),9,MUTED)])
    for phrase in data["phrases"]:
        en, zh = plain(phrase["en"],90), plain(phrase["zh"],56)
        image=Image.new("RGB",(1100,56),"white")
        draw=ImageDraw.Draw(image); f=chinese_font(30)
        if draw.textlength(zh,font=f)>1080: raise ValueError("Chinese phrase too long")
        draw.text((6,4),zh,font=f,fill=INK)
        png_image=BytesIO();image.save(png_image,format="PNG");png_image.seek(0)
        story.extend([p(en,9,MUTED),PDFImage(png_image,width=470,height=24,hAlign="LEFT")])
    story.extend([Spacer(1,7),p("Sources and dates checked",12,TEAL,True)])
    for source in data["sources"]:
        anchor='<link color="#086457" href='+quoteattr(source["url"])+'>'+escape(source["name"])+'</link>'
        story.append(p(anchor+" · "+escape(source["checked"])+" · "+escape(source["finding"]),8.8,MUTED,markup=True))
    def footer(canvas, d):
        canvas.setFont("Arrival",8)
        canvas.setFillColor(colors.HexColor(MUTED))
        canvas.drawString(53,33,("QA EXAMPLE · " if data["purpose"]=="qa" else "PRIVATE · ")+data["orderId"]+f" / v{data['version']}")
        canvas.drawRightString(542,33,str(d.page))
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    result={"orderId":data["orderId"],"version":data["version"],"trip":trip,"template":"arrival-v1","purpose":data["purpose"],
            "sha256":{"pdf":hashlib.sha256(pdf.read_bytes()).hexdigest(),"png":hashlib.sha256(png.read_bytes()).hexdigest()}}
    (output/"manifest.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")

if __name__=="__main__":
    render(json.loads(Path(sys.argv[1]).read_text(encoding="utf8")),Path(sys.argv[2]))
