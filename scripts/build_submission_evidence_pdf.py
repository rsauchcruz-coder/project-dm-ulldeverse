from pathlib import Path

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "project-dm-build-week-evidence.pdf"
MEDIA = ROOT / "docs" / "media"

DEMO_URL = "https://project-dm-ulldeverse.rsauchcruz.chatgpt.site"
REPO_URL = "https://github.com/rsauchcruz-coder/project-dm-ulldeverse"
RULES_URL = "https://openai.devpost.com/rules"

DARK = colors.HexColor("#071523")
INK = colors.HexColor("#22303D")
GOLD = colors.HexColor("#A67C31")
GOLD_LIGHT = colors.HexColor("#E9DDC6")
PAPER = colors.HexColor("#F8F6F0")
MUTED = colors.HexColor("#5F6A72")
LINE = colors.HexColor("#D7D1C6")
WHITE = colors.white


def qr_flowable(url: str, size: float = 28 * mm) -> Drawing:
    widget = QrCodeWidget(url)
    bounds = widget.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(widget)
    return drawing


def image(path: Path, width: float) -> Image:
    item = Image(str(path))
    ratio = item.imageHeight / float(item.imageWidth)
    item.drawWidth = width
    item.drawHeight = width * ratio
    return item


def styled_table(data, widths, style_commands, repeat_rows=0):
    table = Table(data, colWidths=widths, repeatRows=repeat_rows, hAlign="LEFT")
    table.setStyle(TableStyle(style_commands))
    return table


def page_frame(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.7)
    canvas.rect(12 * mm, 12 * mm, A4[0] - 24 * mm, A4[1] - 24 * mm, stroke=1, fill=0)

    if doc.page > 1:
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(GOLD)
        canvas.drawString(18 * mm, A4[1] - 16 * mm, "PROJECT DM  /  OPENAI BUILD WEEK")
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 16 * mm, f"EVIDENCE PACK  /  {doc.page}")

    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(
        A4[0] / 2,
        8 * mm,
        "Public-safe evidence. The required primary Codex Session ID is supplied privately in Devpost.",
    )
    canvas.restoreState()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=27,
        leading=29,
        textColor=DARK,
        alignment=TA_LEFT,
        spaceAfter=4 * mm,
    )
    subtitle = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=14.5,
        leading=19,
        textColor=INK,
        spaceAfter=4 * mm,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=22,
        textColor=DARK,
        spaceBefore=1 * mm,
        spaceAfter=4 * mm,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=14,
        textColor=GOLD,
        spaceBefore=2 * mm,
        spaceAfter=2 * mm,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=13,
        textColor=INK,
        spaceAfter=2.2 * mm,
    )
    body_small = ParagraphStyle(
        "BodySmall",
        parent=body,
        fontSize=8.1,
        leading=10.5,
        spaceAfter=1.4 * mm,
    )
    note = ParagraphStyle(
        "Note",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=GOLD,
    )
    centered = ParagraphStyle(
        "Centered",
        parent=body_small,
        alignment=TA_CENTER,
    )
    metric_number = ParagraphStyle(
        "MetricNumber",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=21,
        textColor=DARK,
        alignment=TA_CENTER,
    )
    metric_label = ParagraphStyle(
        "MetricLabel",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9,
        textColor=MUTED,
        alignment=TA_CENTER,
    )
    quote = ParagraphStyle(
        "Quote",
        parent=body,
        fontName="Times-Italic",
        fontSize=10.5,
        leading=14,
        leftIndent=5 * mm,
        rightIndent=5 * mm,
        borderColor=GOLD,
        borderWidth=1,
        borderPadding=3 * mm,
        backColor=colors.HexColor("#FBF7EF"),
    )

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=21 * mm,
        bottomMargin=17 * mm,
        title="Project DM - OpenAI Build Week Evidence",
        author="Project DM",
        subject="Public submission evidence for Project DM and ULLDE:VERSE",
    )

    story = []

    # Page 1 - cover
    story.append(Spacer(1, 9 * mm))
    story.append(Paragraph("PROJECT DM / ULLDE:VERSE", title))
    story.append(
        Paragraph(
            "An AI-assisted factory for coherent, testable story worlds.",
            subtitle,
        )
    )
    story.append(
        Paragraph(
            "OpenAI Build Week - Apps for Your Life - Public evidence pack",
            note,
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(image(MEDIA / "devpost-thumbnail.png", 174 * mm))
    story.append(Spacer(1, 5 * mm))

    metric_cells = []
    for value, label in [
        ("28", "NARRATIVE NODES"),
        ("88", "CONCRETE ACTIONS"),
        ("1,143", "VERIFIED ROUTES"),
        ("9", "REACHABLE ENDINGS"),
        ("37", "PUBLISHED ASSETS"),
    ]:
        metric_cells.append(
            [
                Paragraph(value, metric_number),
                Paragraph(label, metric_label),
            ]
        )

    metric_table = styled_table(
        [[Table([[cell[0]], [cell[1]]], colWidths=[32 * mm]) for cell in metric_cells]],
        [34.6 * mm] * 5,
        [
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), 0.8, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 1 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ],
    )
    story.append(metric_table)
    story.append(Spacer(1, 5 * mm))

    demo_link = Paragraph(
        f"<b>PLAY</b><br/><link href='{DEMO_URL}' color='#22303D'>{DEMO_URL}</link>",
        centered,
    )
    repo_link = Paragraph(
        f"<b>INSPECT</b><br/><link href='{REPO_URL}' color='#22303D'>{REPO_URL}</link>",
        centered,
    )
    qr_table = styled_table(
        [
            [qr_flowable(DEMO_URL), qr_flowable(REPO_URL)],
            [demo_link, repo_link],
        ],
        [87 * mm, 87 * mm],
        [
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1 * mm),
        ],
    )
    story.append(qr_table)

    # Page 2 - player experience
    story.append(PageBreak())
    story.append(Paragraph("The judged experience", h1))
    story.append(
        Paragraph(
            "ULLDE:VERSE turns a canonical narrative state into a mobile investigation dossier. "
            "The public demo is available without login, credentials, API key or runtime model call.",
            body,
        )
    )

    gallery_one = image(MEDIA / "gallery" / "01-case-not-chat.png", 84 * mm)
    gallery_two = image(MEDIA / "gallery" / "02-visible-commitment.png", 84 * mm)
    story.append(
        styled_table(
            [
                [gallery_one, gallery_two],
                [
                    Paragraph("<b>1. A case, not a chat</b><br/>The player enters a readable world with objective, pressure, place and known characters.", centered),
                    Paragraph("<b>2. A visible commitment</b><br/>A concrete decision highlights before execution, so confirmation is explicit.", centered),
                ],
            ],
            [87 * mm, 87 * mm],
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ],
        )
    )
    story.append(Spacer(1, 3 * mm))

    consequence = image(MEDIA / "gallery" / "03-consequences-persist.png", 96 * mm)
    story.append(
        styled_table(
            [
                [
                    consequence,
                    [
                        Paragraph("3. Consequences that persist", h2),
                        Paragraph(
                            "After one action, the location changes from the cell to the cistern corridor. "
                            "The route gains a new step, Miquel becomes known and pressure advances.",
                            body,
                        ),
                        Paragraph(
                            "The same canonical state controls later options, characters, evidence, resources, relationships and endings.",
                            body,
                        ),
                    ],
                ]
            ],
            [101 * mm, 73 * mm],
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1 * mm),
            ],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("90-second judge path", h2))
    story.append(Spacer(1, 1.5 * mm))
    story.append(
        Paragraph(
            "Open the public demo, keep <b>Corto guiado</b> selected, choose <b>Jugar este mundo</b>, "
            "then select <i>Sacar a Mateu de la celda y llevarlo primero a la cisterna.</i> "
            "The selection changes visibly before execution. After pressing <b>Ejecutar</b>, inspect the new location, route and known character.",
            quote,
        )
    )

    # Page 3 - before/after
    story.append(PageBreak())
    story.append(Paragraph("Meaningful Build Week extension", h1))
    story.append(
        Paragraph(
            "Project DM existed before the Submission Period as a private experimental engine with prototype worlds "
            "and evolving factory contracts. The submission does not claim that baseline as Build Week output.",
            body,
        )
    )

    before_after = [
        [
            Paragraph("<b>PRE-EXISTING BASELINE</b>", body_small),
            Paragraph("<b>EVALUATED BUILD WEEK EXTENSION</b>", body_small),
        ],
        [
            Paragraph(
                "Experimental local narrative engine<br/>Prototype and unrelated worlds<br/>Private runtime state and workshop material<br/>Evolving contracts and prompts",
                body_small,
            ),
            Paragraph(
                "Curated vertical-slice repository<br/>Project DM / ULLDE:VERSE identity<br/>Mobile dossier redesign and visible choice state<br/>Fictionalized names and portraits<br/>No-login deterministic browser runtime<br/>Production deployment package<br/>Security, repository and hosted-artifact QA<br/>English submission and judge documentation",
                body_small,
            ),
        ],
    ]
    story.append(
        styled_table(
            before_after,
            [87 * mm, 87 * mm],
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#ECE8E0")),
                ("BACKGROUND", (1, 0), (1, 0), GOLD_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ],
            repeat_rows=1,
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Dated public extension trail", h2))

    timeline_rows = [
        ["COMMIT", "RESULT"],
        ["91c339e", "Curated submission baseline and reproducible vertical-slice repository"],
        ["4a071fb", "Contest interface, identity and privacy-facing content polish"],
        ["b9a1002", "Explicit choice feedback and logo spacing correction"],
        ["63972b8", "Repository hygiene, security policy and public release gate"],
        ["43af5cb", "Browser-only public guided runtime and deployment QA"],
        ["b4d448e", "Production Worker package"],
        ["e7a2a18", "Contest readiness, video runbook and before/after documentation"],
        ["8cdaf19", "Devpost copy, judge quickstart and gallery thumbnail"],
    ]
    story.append(
        styled_table(
            timeline_rows,
            [26 * mm, 148 * mm],
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 1), (0, -1), "Courier-Bold"),
                ("FONTNAME", (1, 1), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 7.8),
                ("LEADING", (0, 1), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F3EFE7")]),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ],
            repeat_rows=1,
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Codex and GPT-5.6 evidence", h2))
    story.append(
        Paragraph(
            "The required primary <b>/feedback Codex Session ID</b> is supplied directly in the private Devpost field. "
            "The README and dated commit trail identify where Codex accelerated product, engineering, design, privacy and deployment decisions. "
            "GPT-5.6 was the model used inside the core Codex build workflow; the guided judged runtime remains deterministic.",
            body,
        )
    )

    # Page 4 - visible evolution
    story.append(PageBreak())
    story.append(Paragraph("Visible Build Week evolution", h1))
    story.append(
        Paragraph(
            "This public-safe comparison deliberately distinguishes the earlier private prototype from the "
            "submitted vertical slice. Browser chrome, local paths and identity-bearing material are excluded. "
            "It is evidence of scope and productization, not a claim that the baseline itself was built during Build Week.",
            body,
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(image(MEDIA / "evidence" / "build-week-evolution.jpg", 174 * mm))
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "The evaluated extension makes the player journey legible: a mobile dossier, visible case state, deliberate choices, "
            "evidence, persistent consequences and reproducible QA around one public world.",
            quote,
        )
    )

    # Page 5 - technical evidence
    story.append(PageBreak())
    story.append(Paragraph("Technical evidence", h1))
    story.append(Paragraph("One traceable artifact chain", h2))
    flow_items = [
        "Human intent",
        "Experience seed",
        "Causal world architecture",
        "Compiler",
        "Canonical world JSON",
        "Automated QA gates",
        "ULLDE:VERSE runtime",
    ]
    flow_cells = []
    for index, item in enumerate(flow_items):
        flow_cells.append(Paragraph(f"<b>{item}</b>", centered))
        if index != len(flow_items) - 1:
            flow_cells.append(Paragraph("&gt;", centered))
    story.append(
        styled_table(
            [flow_cells],
            [22.5 * mm, 4 * mm, 22.5 * mm, 4 * mm, 22.5 * mm, 4 * mm, 24 * mm, 4 * mm, 24 * mm, 4 * mm, 24 * mm, 4 * mm, 24 * mm],
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0.7 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0.7 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ],
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Executable claims", h2))

    evidence_rows = [
        ["CLAIM", "EXECUTABLE EVIDENCE"],
        ["World is structurally valid", "qa:world validates schema and visible narrative"],
        ["Choices reach distinct endings", "qa:agency enumerates 1,143 routes and 9 endings"],
        ["Resources are causal", "qa:resources checks acquisition, use and later reads"],
        ["Earlier decisions persist", "qa:causal verifies five declared promises"],
        ["Runtime matches the schema", "qa:runtime executes all verified routes"],
        ["Presentation is mobile-safe", "qa:mobile checks viewport, scroll and panels"],
        ["Visuals are complete", "media:qa and media:coverage validate 37 assets"],
        ["Public artifact matches source", "qa:static compares the hosted world and Worker package"],
        ["Guided play works over HTTP", "qa:http executes three declared routes"],
        ["Repository is public-safe", "qa:repo rejects secrets, paths and runtime state"],
    ]
    story.append(
        styled_table(
            evidence_rows,
            [63 * mm, 111 * mm],
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 1), (1, -1), "Courier"),
                ("FONTSIZE", (0, 1), (-1, -1), 7.6),
                ("LEADING", (0, 1), (-1, -1), 9.5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F3EFE7")]),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.8 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
            ],
            repeat_rows=1,
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Reproduce the release gate", h2))
    story.append(Spacer(1, 1.5 * mm))
    story.append(
        Paragraph(
            "<font name='Courier'>npm ci<br/>npm test<br/>npm start</font><br/><br/>"
            "Node.js 20 or newer. No API key is required for the guided experience. "
            "The expected final line is <b>PROJECT DM SUBMISSION: ALL CHECKS PASSED</b>.",
            quote,
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            f"<b>Sources:</b> <link href='{RULES_URL}' color='#A67C31'>Official Build Week Rules</link>  |  "
            f"<link href='{DEMO_URL}' color='#A67C31'>Public demo</link>  |  "
            f"<link href='{REPO_URL}' color='#A67C31'>Public repository</link>",
            body_small,
        )
    )

    doc.build(story, onFirstPage=page_frame, onLaterPages=page_frame)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    build()
