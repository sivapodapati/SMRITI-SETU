from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal, get_db
from models.patient import Patient
from models.performance import GamePerformance
from models.reminder import Reminder
from services.ml_engine import analyze_patient_deterioration
from datetime import datetime

router = APIRouter(
    prefix="/doctor",
    tags=["Clinician Portal"]
)

class RegimenLockRequest(BaseModel):
    patient_id: int
    max_difficulty_ceiling: int
    target_sessions: int

# Database session utility helper
def get_database_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/cognitive-deterioration/{patient_id}")
def get_cognitive_deterioration(
    patient_id: int,
    db: Session = Depends(get_database_session)
):
    # Verify patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch performance telemetry logs
    logs = (
        db.query(GamePerformance)
        .filter(GamePerformance.patient_id == patient_id)
        .order_by(GamePerformance.id.desc())
        .all()
    )

    analysis = analyze_patient_deterioration(logs)
    return {
        "status": "success",
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "state": patient.state,
            "language": patient.language
        },
        "deterioration_analysis": analysis
    }

@router.get("/patient-summary/{patient_id}")
def get_patient_summary(
    patient_id: int,
    db: Session = Depends(get_database_session)
):
    # Verify patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Telemetries
    logs = (
        db.query(GamePerformance)
        .filter(GamePerformance.patient_id == patient_id)
        .order_by(GamePerformance.id.desc())
        .all()
    )

    # Reminders
    reminders = db.query(Reminder).filter(Reminder.patient_id == patient_id).all()

    total_sessions = len(logs)
    if total_sessions > 0:
        avg_score = sum(log.score for log in logs if log.score is not None) / total_sessions
        avg_rt = sum(log.response_time for log in logs if log.response_time is not None) / total_sessions
        
        acc_values = []
        for log in logs:
            att = log.attempts if log.attempts is not None and log.attempts > 0 else 1
            corr = log.correct_answers if log.correct_answers is not None else 0
            acc_values.append((corr / att) * 100)
        avg_accuracy = sum(acc_values) / len(acc_values)
    else:
        avg_score = 0.0
        avg_rt = 0.0
        avg_accuracy = 100.0

    metrics = {
        "total_sessions": total_sessions,
        "average_score": round(avg_score, 1),
        "average_reaction_time_seconds": round(avg_rt, 2),
        "overall_accuracy_percentage": round(avg_accuracy, 1),
        "clinical_status": "STABLE" if avg_accuracy >= 75.0 else "NEEDS_MONITORING"
    }

    return {
        "status": "success",
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "state": patient.state,
            "language": patient.language,
            "max_difficulty_ceiling": patient.max_difficulty_ceiling,
            "target_sessions": patient.target_sessions
        },
        "metrics": metrics,
        "active_reminders": [
            {
                "id": r.id,
                "title": r.title,
                "reminder_type": r.reminder_type,
                "scheduled_time": r.scheduled_time,
                "completed": r.completed
            } for r in reminders
        ],
        "recent_telemetry": [
            {
                "id": log.id,
                "game_id": log.game_id,
                "score": log.score,
                "response_time": log.response_time,
                "difficulty": log.difficulty,
                "status": log.status,
                "timestamp": log.reason
            } for log in logs[:10]
        ]
    }

@router.post("/regimen-lock")
def update_regimen_lock(
    req: RegimenLockRequest,
    db: Session = Depends(get_database_session)
):
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.max_difficulty_ceiling = req.max_difficulty_ceiling
    patient.target_sessions = req.target_sessions
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully locked regimen: Level {req.max_difficulty_ceiling} max ceiling, {req.target_sessions} daily sessions.",
        "max_difficulty_ceiling": patient.max_difficulty_ceiling,
        "target_sessions": patient.target_sessions
    }


GAME_NAMES = {
    1: "Remember the Sequence",
    2: "Familiar Landmark & Picture Match",
    3: "Traditional Recipe Sequencer",
    4: "Folk Rhythm Match",
    5: "Mood & Memory Stories",
    6: "Family Member Recognition"
}

def generate_patient_pdf_bytes(patient: Patient, logs: list, reminders: list, det_analysis: dict, rec: dict = None) -> bytes:
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F766E') # Teal-700
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569') # Slate-600
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#1E293B'), # Slate-800
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#334155')
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748B')
    )

    story = []

    # 1. Header & Title Banner
    story.append(Paragraph("SmritiSetu Cognitive Assistance Platform", title_style))
    story.append(Paragraph("Clinical Cognitive Summary & Telemetry Analytics Report", subtitle_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')} | Confidential Medical Record", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0F766E'), spaceBefore=2, spaceAfter=8))

    # 2. Patient Demographics Box
    story.append(Paragraph("1. Patient Profile & Demographics", section_heading))
    demo_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_style), Paragraph(str(patient.name), body_bold),
            Paragraph("<b>Patient ID:</b>", body_style), Paragraph(f"#{patient.id}", body_bold)
        ],
        [
            Paragraph("<b>Age / Gender:</b>", body_style), Paragraph(f"{patient.age or 'N/A'} yrs / {patient.gender or 'N/A'}", body_style),
            Paragraph("<b>Preferred Language:</b>", body_style), Paragraph(str(patient.language), body_style)
        ],
        [
            Paragraph("<b>State / Region:</b>", body_style), Paragraph(str(patient.state), body_style),
            Paragraph("<b>Emergency Contact:</b>", body_style), Paragraph(str(patient.emergency_contact or "N/A"), body_style)
        ],
        [
            Paragraph("<b>Target Daily Sessions:</b>", body_style), Paragraph(f"{patient.target_sessions} activities/day", body_style),
            Paragraph("<b>Max Difficulty Ceiling:</b>", body_style), Paragraph(f"Level {patient.max_difficulty_ceiling}", body_style)
        ]
    ]
    demo_table = Table(demo_data, colWidths=[110, 150, 110, 150])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#EDF2F7')),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(demo_table)
    story.append(Spacer(1, 8))

    # 3. Clinical Metrics Summary
    story.append(Paragraph("2. Clinical Performance & Early Concern Status", section_heading))
    total_sessions = len(logs)
    if total_sessions > 0:
        avg_score = sum(log.score for log in logs if log.score is not None) / total_sessions
        avg_rt = sum(log.response_time for log in logs if log.response_time is not None) / total_sessions
        accs = []
        for log in logs:
            att = log.attempts if log.attempts and log.attempts > 0 else 1
            corr = log.correct_answers if log.correct_answers is not None else 0
            accs.append((corr / att) * 100)
        avg_acc = sum(accs) / len(accs)
    else:
        avg_score = 0.0
        avg_rt = 0.0
        avg_acc = 100.0

    det_status = det_analysis.get("status", "STABLE").replace("_", " ")
    det_color = colors.HexColor('#15803D') if "STABLE" in det_status else colors.HexColor('#B45309')

    metrics_data = [
        [
            Paragraph("<b>Total Sessions Logged:</b>", body_style), Paragraph(f"{total_sessions}", body_bold),
            Paragraph("<b>Average Score:</b>", body_style), Paragraph(f"{avg_score:.1f}%", body_bold)
        ],
        [
            Paragraph("<b>Overall Accuracy:</b>", body_style), Paragraph(f"{avg_acc:.1f}%", body_bold),
            Paragraph("<b>Average Reaction Time:</b>", body_style), Paragraph(f"{avg_rt:.2f} seconds", body_bold)
        ],
        [
            Paragraph("<b>Trend Direction:</b>", body_style), Paragraph(f"{det_analysis.get('trend_direction', 'STABLE')}", body_style),
            Paragraph("<b>Concern Status:</b>", body_style), Paragraph(f"<b>{det_status}</b>", ParagraphStyle('DetStatus', parent=body_bold, textColor=det_color))
        ]
    ]
    metrics_table = Table(metrics_data, colWidths=[110, 150, 110, 150])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0FDF4') if "STABLE" in det_status else colors.HexColor('#FFFBEB')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#BBF7D0') if "STABLE" in det_status else colors.HexColor('#FDE68A')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 8))

    # 4. Adaptive AI Supportive Analytics
    story.append(Paragraph("3. Adaptive AI Support & Activity Recommendation", section_heading))
    if rec:
        rec_game = rec.get("recommended_game", "Remember the Sequence")
        rec_level = rec.get("recommended_level", 1)
        rec_support = rec.get("support_level", "Medium").capitalize()
        rec_reason = rec.get("reason", "Selected to maintain cognitive engagement.")
        
        rec_data = [
            [Paragraph("<b>Next Recommended Activity:</b>", body_style), Paragraph(f"{rec_game} (Level {rec_level})", body_bold)],
            [Paragraph("<b>Cognitive Support Tier:</b>", body_style), Paragraph(f"{rec_support} Support Mode", body_style)],
            [Paragraph("<b>Supportive Rationale:</b>", body_style), Paragraph(f'<i>"{rec_reason}"</i>', body_style)],
        ]
        rec_table = Table(rec_data, colWidths=[140, 380])
        rec_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(rec_table)
    else:
        story.append(Paragraph("Standard cognitive activity regimen active.", body_style))
    story.append(Spacer(1, 8))

    # 5. Historical Cognitive Sessions (Last 10 sessions)
    story.append(Paragraph("4. Recent Cognitive Activity Telemetry (Last 10 Sessions)", section_heading))
    table_rows = [
        [
            Paragraph("<b>#</b>", body_bold),
            Paragraph("<b>Game Activity</b>", body_bold),
            Paragraph("<b>Level</b>", body_bold),
            Paragraph("<b>Score</b>", body_bold),
            Paragraph("<b>Reaction Time</b>", body_bold),
            Paragraph("<b>Remarks / Context</b>", body_bold)
        ]
    ]

    for idx, log in enumerate(logs[:10], start=1):
        gname = GAME_NAMES.get(log.game_id, f"Activity #{log.game_id}")
        table_rows.append([
            Paragraph(str(idx), body_style),
            Paragraph(gname, body_style),
            Paragraph(f"Level {log.difficulty}", body_style),
            Paragraph(f"{log.score:.0f}%" if log.score is not None else "-", body_style),
            Paragraph(f"{log.response_time:.1f}s" if log.response_time is not None else "-", body_style),
            Paragraph(log.reason or "Standard completion", body_style)
        ])

    if len(table_rows) == 1:
        table_rows.append([Paragraph("No session history recorded yet.", body_style), "", "", "", "", ""])

    hist_table = Table(table_rows, colWidths=[20, 150, 45, 45, 65, 195])
    hist_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F766E')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('PADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(hist_table)
    story.append(Spacer(1, 10))

    # 6. Medical Disclaimer & Footer
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#CBD5E1'), spaceBefore=4, spaceAfter=6))
    story.append(Paragraph(
        "<b>Clinical Notice:</b> This automated summary report is compiled by the SmritiSetu Cognitive Assistance Platform. "
        "All telemetry scores and adaptive difficulty tiers are supportive/assistive analytics to aid clinical observation and do NOT represent a diagnostic medical evaluation.",
        disclaimer_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

@router.get("/patients/{patient_id}/report")
def download_patient_clinical_report(
    patient_id: int,
    db: Session = Depends(get_database_session)
):
    from fastapi.responses import Response
    from services.recommendation_engine import get_patient_recommendation

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found or you are not authorized to access this patient report."
        )

    logs = (
        db.query(GamePerformance)
        .filter(GamePerformance.patient_id == patient_id)
        .order_by(GamePerformance.id.desc())
        .all()
    )
    reminders = db.query(Reminder).filter(Reminder.patient_id == patient_id).all()
    det_analysis = analyze_patient_deterioration(logs)

    try:
        rec = get_patient_recommendation(db, patient_id)
    except Exception:
        rec = None

    try:
        pdf_bytes = generate_patient_pdf_bytes(patient, logs, reminders, det_analysis, rec)
    except Exception as e:
        print("PDF generation error:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to generate report. Please try again."
        )

    safe_name = patient.name.replace(" ", "_").replace("·", "").replace("'", "")
    filename = f"SmritiSetu_Patient_{safe_name}_Report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
