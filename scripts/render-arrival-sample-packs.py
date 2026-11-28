"""Build offline fictional samples from the same data used by the preview.
Dependencies: reportlab, Pillow, DejaVu Sans and Noto Sans CJK SC (override font path below if needed).
"""
import json
import os
from pathlib import Path
from xml.sax.saxutils import escape
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph

root = Path(__file__).resolve().parents[1]
packs = json.loads((root / "lib/arrival-sample-packs.json").read_text())
hotel = packs["hotel"]
out = root / "public/samples"
out.mkdir(parents=True, exist_ok=True)
ink, deep, teal, calm, mist, muted = map(HexColor, ["#102B32", "#103237", "#07695B", "#D9F2EB", "#EEF5F3", "#435E65"])
W, H, M = 390, 800, 25
latin_dir = Path(os.environ.get("GOEAST_LATIN_FONTS", "/usr/share/fonts/truetype/dejavu"))
for name, file in (("GoEastSans", "DejaVuSans.ttf"), ("GoEastSansBold", "DejaVuSans-Bold.ttf")):
    pdfmetrics.registerFont(TTFont(name, str(latin_dir / file)))

def card():
    path = out / "shanghai-driver-card.png"
    im = Image.new("RGB", (900, 1420), "#eef5f3")
    d = ImageDraw.Draw(im)
    ttf = Path(os.environ.get("GOEAST_LATIN_FONTS", "/usr/share/fonts/truetype/dejavu"))
    cjk = os.environ.get("GOEAST_CJK_FONT", "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")
    latin = lambda size, bold=False: ImageFont.truetype(str(ttf / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)
    zh = lambda size: ImageFont.truetype(cjk, size, index=2)
    d.rectangle((0,0,900,300), fill="#103237")
    d.text((56,42),"GoEast  /  OFFLINE DRIVER CARD",font=latin(29,True),fill="#b7efda")
    d.text((56,105),"Show your driver",font=latin(59,True),fill="#ffffff")
    d.text((56,205),hotel["name"],font=latin(38,True),fill="#e4f2ef")
    d.rounded_rectangle((50,330,850,730), radius=32, fill="#ffffff")
    d.text((88,361),"请送我到",font=zh(46),fill="#07695b")
    d.text((88,438),hotel["chinese"],font=zh(68),fill="#102b32")
    for index, line in enumerate(hotel["addressChinese"]):
        d.text((88,559+69*index),line,font=zh(43),fill="#102b32")
    d.rounded_rectangle((50,760,850,1090),radius=32,fill="#d9f2eb")
    d.text((88,790),"BEFORE YOU GET IN",font=latin(28,True),fill="#07695b")
    d.text((88,846),"请问可以用人民币现金付款吗？",font=zh(44),fill="#102b32")
    d.text((88,924),"可以用国际银行卡吗？",font=zh(44),fill="#102b32")
    d.text((88,1010),"Confirm an accepted payment method.",font=latin(28),fill="#102b32")
    d.text((56,1144),"Hotel phone",font=latin(31,True),fill="#07695b")
    d.text((56,1196),hotel["phone"],font=latin(53,True),fill="#102b32")
    d.text((56,1346),"FICTIONAL TRIP SAMPLE · HOTEL ADDRESS CHECKED",font=latin(23,True),fill="#435e65")
    im.save(path, optimize=True)
    return path

def para(c, value, top, *, x=M, width=W-2*M, size=12, lead=None, bold=False, color=ink):
    style=ParagraphStyle('default',fontName='GoEastSansBold' if bold else 'GoEastSans',
        fontSize=size,leading=lead or size*1.32,textColor=color,spaceAfter=0)
    p=Paragraph(escape(value), style)
    _,height=p.wrap(width, H)
    p.drawOn(c,x,top-height)
    return top-height

def shell(c, case, page, label):
    c.setFillColor(mist); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(deep); c.rect(0,H-89,W,89,fill=1,stroke=0)
    para(c,"GOEAST  /  SHANGHAI ARRIVAL CHECK",H-21,size=9,bold=True,color=calm)
    para(c,label,H-46,size=20,bold=True,color=white)
    para(c,case["label"]+"  /  "+case["time"]+" SHANGHAI TIME",H-104,size=9,bold=True,color=teal)
    c.setStrokeColor(HexColor("#C7DAD6")); c.line(M,39,W-M,39)
    para(c,"FICTIONAL SAMPLE  /  NOT A REAL BOOKING",28,size=8,bold=True,color=muted)
    para(c,f"{page:02d} / 04",28,x=W-63,width=41,size=8,bold=True,color=muted)
    return H-127

def block(c, title, body, y, i=None):
    if i is not None:
        c.setFillColor(calm); c.circle(M+12,y-12,12,fill=1,stroke=0)
        para(c,f"{i:02d}",y-6,x=M+6,width=18,size=8,bold=True,color=teal)
    offset=34 if i is not None else 0
    y=para(c,title,y,x=M+offset,width=W-2*M-offset,size=13,bold=True)-5
    return para(c,body,y,x=M+offset,width=W-2*M-offset,size=11.5,color=muted)-13

def check(y):
    if y < 47: raise ValueError(f"Content overlaps footer: {y}")

def hotel_message(c, case, y):
    y=para(c,"BEFORE YOU FLY: ONE MESSAGE TO SEND",y-7,size=9,bold=True,color=teal)-10
    y=para(c,case["hotelTask"],y,size=13,bold=True)-7
    y=para(c,case["message"],y,size=12,color=muted)-13
    y=para(c,"Send through your booking channel. This sample does not contact the hotel for you.",y,size=10,color=muted)-9
    return y

def build(case, cardpath):
    c=Canvas(str(out/(case["file"]+".pdf")),pagesize=(W,H),pageCompression=1,invariant=1)
    c.setTitle("GoEast Shanghai Arrival Check · "+case["label"])
    c.setAuthor("GoEast")

    y=shell(c,case,1,"Your arrival decision")
    y=para(c,case["context"],y,size=10,color=muted)-13
    y=para(c,case["verdict"],y,size=24,lead=28,bold=True)-12
    y=block(c,"What this check catches",case["finding"],y)
    y=block(c,"When to switch plans",case["switch"],y)
    y=para(c,"YOUR FIRST STEPS",y-3,size=9,bold=True,color=teal)-11
    for i, row in enumerate(case["route"],1): y=block(c,row["title"],row["body"],y,i)
    check(y); c.showPage()

    y=shell(c,case,2,"If your first plan breaks")
    for i, row in enumerate(case["fallback"],1): y=block(c,row["title"],row["body"],y,i)
    if phrase := case.get("deskPhrase"):
        y=para(c,phrase["heading"],y,size=11,bold=True,color=teal)-4
        y=para(c,phrase["english"],y,size=10,color=muted)-4
        strip=Image.new("RGB",(1020,108),"#eef5f3")
        font=ImageFont.truetype(os.environ.get("GOEAST_CJK_FONT","/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"),36,index=2)
        draw=ImageDraw.Draw(strip)
        for i,line in enumerate(phrase["chinese"]): draw.text((0,i*47),line,font=font,fill="#102b32")
        c.drawImage(ImageReader(strip),M,y-36,width=W-2*M,height=36)
        y-=43
    else:
        y=hotel_message(c,case,y)
    check(y); c.showPage()

    y=shell(c,case,3,"What we checked")
    y=block(c,hotel["name"],hotel["address"]+" | "+hotel["phone"],y)
    y=para(c,"Sources checked "+packs["checked"],y,size=10,bold=True,color=teal)-9
    for source_id in case["sourceIds"]:
        source=packs["sources"][source_id]
        top=y
        y=para(c,source["name"],y,size=11,bold=True,color=teal)-3
        c.linkURL(source["url"],(M,y,W-M,top+1),relative=0)
        y=para(c,source["scope"],y,size=10,color=muted)-9
    if case.get("deskPhrase"): y=hotel_message(c,case,y)
    y=block(c,"Recheck before departure",case["recheck"],y-3)
    y=para(c,"The itinerary is fictional. Sources describe public services, not your specific booking, live disruptions, card authorization or hotel policy.",y,size=9.5,color=muted)-7
    check(y); c.showPage()

    y=shell(c,case,4,"Save the address card")
    para(c,"Show the card from Photos if you cannot get online. Download as a separate image from the sample viewer.",y,size=10,color=muted)
    c.drawImage(ImageReader(cardpath),(W-286)/2,62,286,286*1420/900)
    c.showPage()
    c.save()

if __name__ == "__main__":
    image = card()
    for example in packs["cases"].values(): build(example,image)
