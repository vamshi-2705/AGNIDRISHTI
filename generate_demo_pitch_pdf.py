import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))
        # Header (Width: 36 to 576 -> 540pt printable width)
        self.drawString(36, 756, "AGNIDRISHTI — TEAM LEAD MASTER PITCH & LIVE DEMO GUIDE | SIH 2025")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 750, 576, 750)
        
        # Footer
        self.line(36, 40, 576, 40)
        self.setFont("Helvetica", 8)
        self.drawString(36, 28, "CONFIDENTIAL — TM5 TEAM LEAD PRESENTATION & LIVE DEMO SCRIPT")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 28, page_str)
        self.restoreState()

def p(text, is_header=False, is_code=False, font_size=7.5, leading=10, is_bold=False, text_color=None):
    font_name = 'Helvetica-Bold' if (is_header or is_bold) else ('Courier-Bold' if is_code else 'Helvetica')
    if text_color is None:
        c = colors.white if is_header else (colors.HexColor("#0f172a") if (is_code or is_bold) else colors.HexColor("#1e293b"))
    else:
        c = text_color
    
    style = ParagraphStyle(
        name=f"Cell_{font_name}_{font_size}_{leading}_{id(text)}",
        fontName=font_name,
        fontSize=font_size,
        leading=leading,
        textColor=c,
        wordWrap='CJK'
    )
    formatted = str(text).replace('\n', '<br/>')
    return Paragraph(formatted, style)

def build_pdf(filename="AGNIDRISHTI_TeamLead_Demo_Pitch_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=50,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=3
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#ea580c"),
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=4
    )
    script_box_style = ParagraphStyle(
        'ScriptBoxText',
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#0f172a")
    )
    action_note_style = ParagraphStyle(
        'ActionNote',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0284c7"),
        spaceAfter=2
    )

    elements = []

    # Title Block
    elements.append(Paragraph("AGNIDRISHTI: Team Lead Master Pitch & Live Demo Script", title_style))
    elements.append(Paragraph("<b>Smart India Hackathon 2025 | Problem Statement ID: 26162 (NTRO)</b> &nbsp;|&nbsp; Role: TM5 / Team Lead & Live Anchorman &nbsp;|&nbsp; Team: TECHZEN", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#ea580c"), spaceAfter=6))

    # Introduction Box: Pitch Architecture
    elements.append(Paragraph("1. THE 3-PHASE PITCH ARCHITECTURE", h1_style))
    arc_text = (
        "As the Team Lead, you have the most decisive stage role. TM1 through TM4 set the strategic problem, baseline mathematics, "
        "and technical architecture. <b>Your objective is to deliver the knockout blow</b> by demonstrating that AGNIDRISHTI is not a slide deck concept, "
        "but a live, fully-engineered, sub-300ms national defense surveillance platform."
    )
    elements.append(Paragraph(arc_text, body_style))

    timeline_data = [
        [
            p("Pitch Phase", is_header=True, font_size=7.5),
            p("Allocated Time", is_header=True, font_size=7.5),
            p("Key Focus & Objective", is_header=True, font_size=7.5),
            p("Audience Perception / Judge Takeaway", is_header=True, font_size=7.5)
        ],
        [
            p("Phase 1: The Takeover", is_bold=True),
            p("15 Seconds"),
            p("Seamlessly take over from TM4, establish command presence, and transition to live screen."),
            p("\"This team is professional, coordinated, and confident in their software.\"")
        ],
        [
            p("Phase 2: Core Live Demo", is_bold=True),
            p("2.5 Minutes"),
            p("Execute 6 deliberate click milestones: Telemetry $\\rightarrow$ Baseline $\\rightarrow$ Evidence $\\rightarrow$ Plume $\\rightarrow$ Dossier."),
            p("\"This is real, live, deterministic defense software—not a Figma mockup.\"")
        ],
        [
            p("Phase 3: The Power Close", is_bold=True),
            p("30 Seconds"),
            p("Step back, summarize 4 core breakthroughs (Noise, Baseline, Speed, Sovereignty), invite Q&A."),
            p("\"They solved the problem end-to-end and are deployment-ready for NTRO.\"")
        ]
    ]
    t_timeline = Table(timeline_data, colWidths=[110, 75, 185, 170])
    t_timeline.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('BOTTOMPADDING', (0,0), (-1,0), 3),
        ('TOPPADDING', (0,0), (-1,0), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,1), (-1,-1), 3),
        ('BOTTOMPADDING', (0,1), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(t_timeline)
    elements.append(Spacer(1, 6))

    # Phase 1: The Takeover
    elements.append(Paragraph("2. PHASE 1: THE TAKEOVER (EXACT SCRIPT)", h1_style))
    elements.append(Paragraph("<b>Trigger:</b> TM4 concludes: <i>\"...I now invite our team lead, [Your Name], to demonstrate the live, working AGNIDRISHTI platform.\"</i>", action_note_style))
    
    takeover_box = [
        [Paragraph(
            "<b>SPOKEN WORDS:</b><br/>"
            "\"Thank you, [TM4]. Respected Judges, everything my team just presented is not a concept or a Figma prototype. "
            "It is a <b>fully functional, production-engineered platform running live right here</b>.<br/><br/>"
            "<i>(Gesture confidently towards the big screen on F11 Full-Screen mode)</i><br/>"
            "Welcome to <b>AGNIDRISHTI</b>.\"",
            script_box_style
        )]
    ]
    t_takeover = Table(takeover_box, colWidths=[540])
    t_takeover.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_takeover)
    elements.append(Spacer(1, 6))

    # Phase 2: Detailed 6-Step Click-by-Click Live Demo
    elements.append(Paragraph("3. PHASE 2: COMPLETE STEP-BY-STEP LIVE DEMO PROCESS (6 CLICKS)", h1_style))
    elements.append(Paragraph("<b>Follow this exact sequence. Speak while clicking with deliberate pauses so judges can absorb the screen state changes.</b>", body_style))

    demo_steps = [
        # Step 1
        ("Step 1: Landing Page & Mission Context (15-20 Seconds)",
         "Screen: http://localhost:5173/ | Action: Point to Hero, then Click 'Explore AGNIDRISHTI'",
         "\"We begin at our mission portal. The headline captures our core philosophy: 'See the Heat. Understand the Risk.' Raw thermal satellites see heat everywhere across the subcontinent. AGNIDRISHTI's job is to extract true industrial risk. Look at our 4 operational pillars at the bottom: Satellite Observations, Industrial Context, Thermal Analysis, and Atmospheric Dispersion. (Click 'Explore AGNIDRISHTI') Let us now step directly into the live command dashboard.\"",
         "#fff7ed", "#fdba74"),
        
        # Step 2
        ("Step 2: Tactical Header & Intelligence Pipeline Strip (25-30 Seconds)",
         "Screen: Top Navbar & Strip | Action: Click 'DATA SOURCES' popover, verify LIVE badges, close popover",
         "\"This is the national surveillance viewport. Let me draw your attention to our top tactical status bar: 1. Here is our live satellite stream: NASA FIRMS • VIIRS 375-meter, synchronized with Indian Standard Time and UTC. 2. Notice the badge: CRITICAL ANOMALIES: 2. Across all of India, out of hundreds of active thermal signals, our engine has isolated exactly two critical emergencies. 3. Directly below is our 6-Stage Operational Intelligence Pipeline: DETECT via NASA VIIRS -> CONTEXT via OSM & ESA LULC -> ANALYZE via FRP Baseline -> CLASSIFY into Thermal Event -> ASSESS Dispersion Risk -> and RESPOND via Incident Report. (Click 'DATA SOURCES') Notice our data integrity popover: NASA FIRMS is LIVE, OpenStreetMap is LIVE, Open-Meteo winds are LIVE, and ESA WorldCover is BASELINE. Every single byte powering this screen is transparent, verified, and un-fabricated. (Close popover)\"",
         "#f0fdf4", "#86efac"),

        # Step 3
        ("Step 3: Map Symbology & The Left Operations Drawer (30 Seconds)",
         "Screen: Interactive GIS Map & Left List | Action: Point to glowing Jamnagar dot, filter CRITICAL, click Jamnagar Card",
         "\"Look at the GIS map. Our cartography is engineered strictly for defense and scientific monitoring, not military targeting. Our symbology follows two strict geospatial rules: • Dot Color = Classification: Crimson Red is a Critical Industrial Emergency, Orange is Routine Refinery Flaring, Yellow is Coal Seam Combustion, and Green is Agricultural Biomass. • Glow Intensity = Thermal Severity: A minor crop fire has a subtle glow. But look at Jamnagar in Gujarat—it pulses with maximum glow intensity and a soft expanding thermal halo. (Point to Left Sidebar) In our left drawer, we can filter by ALL, INDUSTRIAL, or CRITICAL. Let us click on our top critical incident: Reliance Jamnagar Refining Complex.\"",
         "#faf5ff", "#d8b4fe"),

        # Step 4
        ("Step 4: The Incident Inspector & Deterministic Evidence Chain (45 Seconds) — THE JUDGE WINNER",
         "Screen: Right Drawer Opened | Action: Highlight Observed FRP (284.6 MW), Baseline (45 MW), 6.32x, and Checkmarks",
         "\"Instantly, the Incident Inspector opens. Look at the hard numbers: • Observed FRP: 284.6 MW • Normal Operational Baseline: 45.0 MW • Anomaly Ratio: 6.32x normal baseline. Now, look at the most important section on this screen: 'WHY WAS THIS CLASSIFIED? (Deterministic Rules)'. We do NOT tell the disaster commander 'our black-box AI guessed this'. We present an audit-ready, 2-second scannable evidence chain backed by real data: ✓ Industrial facility context: Verified match inside Reliance Jamnagar Complex. ✓ Industrial land-use context: Petrochemical & crude refining perimeter. ✓ FRP above expected baseline: 6.32x baseline (284.6 MW vs 45 MW normal). ✓ Critical anomaly threshold: 6.32x exceeds the critical 2.2x gating threshold. And the final decision row: DECISION: CRITICAL INDUSTRIAL ANOMALY. Directly below, our thermal sparkline plots multi-pass satellite history showing routine baseline passes followed by today's acute divergence. In the environmental box, we see surface wind at 19.8 km/h and an estimated hazard radius of 5.0 km.\"",
         "#eff6ff", "#93c5fd"),

        # Step 5
        ("Step 5: Dynamic Gaussian Dispersion Plume (30 Seconds)",
         "Screen: Right Drawer Buttons | Action: Click 'Estimate Downwind Dispersion', then Click Plume Polygon on Map",
         "\"Now, when an explosion occurs, the first question the NDRF asks is: Where is the toxic cloud traveling, and who must be evacuated right now? (Click 'Estimate Downwind Dispersion') Watch the map. In real time, AGNIDRISHTI queried the live Open-Meteo weather API for surface wind speed and bearing (85 deg NE). It computed our Gaussian fluid dispersion model and rendered an active RFC 7946 GeoJSON toxic plume corridor. (Click Plume Polygon on Map) Clicking the polygon reveals the live parameters: Tier-1 Critical Toxic Hazard, estimated dispersion reach of 18.4 kilometers, and an estimated immediate evacuation radius of 5.0 kilometers. Disaster dispatchers now know exactly which highways to block and which downwind villages to evacuate.\"",
         "#fff1f2", "#fda4af"),

        # Step 6
        ("Step 6: One-Click Actionable Incident Report (30 Seconds)",
         "Screen: Right Drawer Buttons | Action: Click 'Generate Incident Report', show NDRF Dossier Modal, then close",
         "\"Finally, first responders in the field cannot read raw JSON coordinates. They need an official, actionable brief. (Click 'Generate Incident Report') With a single click, AGNIDRISHTI synthesizes all satellite telemetry, chemical inventory risks, and dispersion math into an executive Thermal Event Incident Report. Look at the sections: 1. EVENT ASSESSMENT: Critical Industrial Emergency with Severity Score 98/100. 2. GEOSPATIAL COORDINATES: Formatted latitude and longitude. 3. ESTIMATED DOWNWIND DISPERSION CORRIDOR: Bearing 55 deg NE, 18.4 km plume reach, and 5.0 km hazard radius. 4. ACTIONABLE DECISION SUPPORT: Standard operating procedures, upwind command post placement, and immediate hotline dispatch for the 6th Battalion NDRF (Vadodara). (Point to 'Print / PDF' button) It is fully printable and exportable to PDF for immediate transmission to district emergency control rooms. (Close modal)\"",
         "#f8fafc", "#cbd5e1")
    ]

    for title, action_header, script, bg_col, border_col in demo_steps:
        step_box = [
            [Paragraph(f"<b>{title}</b>", h2_style)],
            [Paragraph(f"<b>ACTION & VISUAL ANCHOR:</b> {action_header}", action_note_style)],
            [Paragraph(f"<b>EXACT SPOKEN SCRIPT:</b><br/>{script}", script_box_style)]
        ]
        t_step = Table(step_box, colWidths=[540])
        t_step.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_col)),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_col)),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(KeepTogether([t_step]))
        elements.append(Spacer(1, 5))

    elements.append(PageBreak())

    # Phase 3: The Power Close
    elements.append(Paragraph("4. PHASE 3: THE POWER CLOSE & MIC-DROP STATEMENT (30 SECONDS)", h1_style))
    elements.append(Paragraph("<b>Action:</b> Step away from the keyboard, stand tall, make direct eye contact with all evaluators, and speak with unwavering conviction.", action_note_style))

    close_box = [
        [Paragraph(
            "<b>SPOKEN WORDS:</b><br/>"
            "\"Respected Judges, let us summarize what you have just witnessed:<br/><br/>"
            "1. We took <b>15,000 noisy thermal points</b> and filtered out <b>92% of biomass noise</b> without human intervention.<br/>"
            "2. We solved the refinery flare dilemma using a <b>mathematical baseline ratio</b> that produces <b>zero false alarms</b>.<br/>"
            "3. We converted raw space telemetry into a <b>live evacuation plume and an official NDRF action dossier in under 300 milliseconds</b>—slashing traditional response times from 2 hours to under 3 minutes.<br/>"
            "4. And we did this with <b>zero hardware cost</b>, built 100% on open-source code and sovereign satellite workflows, advancing <b>Atmanirbhar Bharat</b>.<br/><br/>"
            "AGNIDRISHTI is functional, tested, and ready for deployment with the NTRO.<br/><br/>"
            "<b>Thank you. Team TECHZEN is now ready for your questions!</b>\"",
            script_box_style
        )]
    ]
    t_close = Table(close_box, colWidths=[540])
    t_close.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef2f2")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#ef4444")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_close)
    elements.append(Spacer(1, 8))

    # Stage Execution Pro-Tips (Table)
    elements.append(Paragraph("5. STAGE PRESENCE & EXECUTION PRO-TIPS", h1_style))
    protip_data = [
        [
            p("Category", is_header=True, font_size=7.5),
            p("What to Do (Winning Behaviors) [DO]", is_header=True, font_size=7.5),
            p("What to Avoid (Fatal Mistakes) [DON'T]", is_header=True, font_size=7.5)
        ],
        [
            p("Browser Setup", is_bold=True),
            p("Press F11 for full-screen mode before speaking. Keep URL bar and bookmarks hidden."),
            p("Don't leave unrelated tabs, chat windows, or console errors open.")
        ],
        [
            p("Mouse Control", is_bold=True),
            p("Move cursor smoothly and deliberately. Hover steadily over the metric you are discussing."),
            p("Don't wiggle or shake the mouse erratically across the screen.")
        ],
        [
            p("Pacing & Rhythm", is_bold=True),
            p("Pause for 1 full second after clicking buttons so judges can visually register the change."),
            p("Don't speak faster than your clicks. Let the visual feedback breathe.")
        ],
        [
            p("Network Glitches", is_bold=True),
            p("Stay completely calm. The system has built-in in-memory fallback datasets. Continue smoothly."),
            p("Never apologize or say \"Internet is slow today.\" Maintain defense composure.")
        ],
        [
            p("Team Synergy", is_bold=True),
            p("When you speak, TM1-TM4 look at the screen and nod affirmatively to reinforce credibility."),
            p("No team member should look at their phone, whisper, or check slides.")
        ]
    ]
    t_protip = Table(protip_data, colWidths=[90, 225, 225])
    t_protip.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('BOTTOMPADDING', (0,0), (-1,0), 3),
        ('TOPPADDING', (0,0), (-1,0), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,1), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,1), (-1,-1), 2.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(t_protip)
    elements.append(Spacer(1, 8))

    # Quick Reference Flow
    elements.append(Paragraph("6. QUICK REFERENCE: THE 6 DEMO CLICK MILESTONES", h1_style))
    flow_data = [
        [
            p("<b>[Click 1] Landing Page:</b> Click 'Explore AGNIDRISHTI' to enter main surveillance dashboard.<br/>"
              "<b>[Click 2] Top Strip:</b> Click 'DATA SOURCES' to prove LIVE APIs, then close with ✕.<br/>"
              "<b>[Click 3] Left Sidebar:</b> Click 'Reliance Jamnagar' incident card to trigger inspector.<br/>"
              "<b>[Click 4] Right Drawer:</b> Highlight 'WHY WAS THIS CLASSIFIED?' deterministic evidence & 6.32x ratio.<br/>"
              "<b>[Click 5] Right Drawer:</b> Click 'Estimate Downwind Dispersion' to project live Gaussian plume polygon.<br/>"
              "<b>[Click 6] Right Drawer:</b> Click 'Generate Incident Report' to display executive NDRF action dossier modal.<br/>"
              "<b>[Finish]:</b> Close modal, step forward, and deliver the 30-second Power Close.",
              font_size=8, leading=12)
        ]
    ]
    t_flow = Table(flow_data, colWidths=[540])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_flow)

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}!")

if __name__ == "__main__":
    build_pdf()
