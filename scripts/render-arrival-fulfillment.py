"""Render an reviewed GoEast order packet from structured order-specific data."""
import sys, json, os
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image, ImageDraw, ImageFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image as PdfImage

latin = Path(os.getenv("GOEAST_LATIN_FONTS", "/usr/share/fonts/truetype/dejavu"))
cjk = os.getenv("GOEAST_CJK_FONT", "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")
cjk_index = int(os.getenv("GOEAST_CJK_INDEX", "2"))
pdfmetrics.registerFont(TTFont("ArrivalSans", str(latin / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("ArrivalSansBold", str(latin / "DejaVuSans-Bold.ttf")))
INK, TEAL, MUTED, PALE = "#162d2f", "#086457", "#466568", "#eaf4f0"
def p(value, size=10.5, color=INK, bold=False, leading=None):
    return Paragraph(escape(str(value)),ParagraphStyle("txt",fontName="ArrivalSansBold" if bold else "ArrivalSans",fontSize=size,leading=leading or size*1.36,textColor=colors.HexColor(color),alignment=TA_LEFT,splitLongWords=1,spaceAfter=5))

def box(*content):
    t=Table([[list(content)]],colWidths=[487])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor(PALE)),("LEFTPADDING",(0,0),(-1,-1),16),("RIGHTPADDING",(0,0),(-1,-1),16),("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    return t

def checks(record):
    trip=record["trip"]
    if trip.get("synthetic") is not True:
        raise ValueError("This renderer is currently restricted to synthetic QA")
    if not record["id"].startswith("ar_") or record["version"]<1:
        raise ValueError("missing order/version")
    if record["preparedFor"]!=[trip[k] for k in ("flight","localArrival","terminal","hotel")]:
        raise ValueError("report does not match paid itinerary")
    if any(x not in record["coveredPreferences"] for x in trip["preferences"]):
        raise ValueError("traveler need not addressed")
    if not all(record.get(k) for k in ("decision","steps","backup","boundary","showChinese","cnAddress","hotelPhone","sources")):
        raise ValueError("missing delivery content")
    required = {"hotel","transport"}
    if not required.issubset({s["kind"] for s in record["sources"]}):
        raise ValueError("missing key evidence")
    if not all(s["url"].startswith("https://") and s["checked"] and s["finding"] for s in record["sources"]):
        raise ValueError("invalid source ledger")
    return trip

def driver_card(record, filename):
    # Rasterize the text as well as shipping the standalone card. This eliminates
    # dependence on the traveler's offline PDF viewer having a Chinese font.
    strip = Image.new("RGB", (1200, 220), PALE)
    draw = ImageDraw.Draw(strip)
    title = ImageFont.truetype(cjk, 40, index=cjk_index)
    body = ImageFont.truetype(cjk, 34, index=cjk_index)
    phone = ImageFont.truetype(str(latin / "DejaVuSans.ttf"), 26)
    for content, font, y in [(record["showChinese"],title,24),(record["cnAddress"],body,100),(record["hotelPhone"],phone,168)]:
        if draw.textlength(content,font=font)>1100:
            raise ValueError("address card line too wide; verify and split the address")
        draw.text((31,y),content,font=font,fill=INK)
    strip.save(filename, format="PNG")
    buffer=BytesIO()
    strip.save(buffer,format="PNG")
    buffer.seek(0)
    return buffer

def render(record, file):
    trip=checks(record)
    d=SimpleDocTemplate(str(file),pagesize=A4,leftMargin=54,rightMargin=54,topMargin=43,bottomMargin=55,title="GoEast | Your Shanghai arrival plan",author="GoEast")
    story=[p("GOEAST / SHANGHAI ARRIVAL CHECK",9.5,TEAL,True),Spacer(1,5),p("Your first hour in Shanghai",29,INK,True),p("Personalized rehearsal · fictional flight · not a live itinerary",9,MUTED),Spacer(1,8)]
    story += [box(p(trip["flight"]+"   |   "+trip["terminal"]+"   |   "+trip["localArrival"]+" Shanghai time",10.7,TEAL,True),p(trip["hotel"],18,INK,True),p("Your priorities: "+", ".join(trip["preferences"]),10,MUTED)),Spacer(1,12)]
    story += [p("01   What to do on arrival",11,TEAL,True),p(record["decision"],15,INK,True)]
    story += [p(f"{index}. {step}",10.2) for index,step in enumerate(record["steps"],1)]
    story += [Spacer(1,3),p("02   If Plan A fails",11,TEAL,True),p(record["backup"],10.2),p(record["boundary"],8.8,MUTED)]
    card=driver_card(record,file.with_suffix(".png"))
    story += [Spacer(1,5),KeepTogether([p("03   Show your driver · save offline",11,TEAL,True),PdfImage(card,width=487,height=89.28),p(record["addressEnglish"],8.8,MUTED)])]
    refs=[p("Checked sources",9.6,TEAL,True)]
    for s in record["sources"]:
        refs.extend([p(f'{s["name"]} ({s["checked"]}): {s["finding"]}',8.25,MUTED),p(s["url"],7.4,MUTED)])
    story.extend([Spacer(1,9), *refs])
    def footer(canvas,doc):
        canvas.setStrokeColor(colors.HexColor("#bcd2ca"));canvas.line(54,41,541,41)
        canvas.setFillColor(colors.HexColor(MUTED));canvas.setFont("ArrivalSans",8)
        canvas.drawString(54,28,f'TEST ONLY  /  {record["id"]}  /  v{record["version"]}')
        canvas.drawRightString(541,28,str(doc.page))
    d.build(story,onFirstPage=footer,onLaterPages=footer)

if __name__=="__main__":
    render(json.loads(Path(sys.argv[1]).read_text(encoding="utf8")),Path(sys.argv[2]))
