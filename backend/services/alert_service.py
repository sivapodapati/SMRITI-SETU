from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.performance import GamePerformance
from models.alert import CaregiverAlert
from models.patient import Patient
from models.game import Game


def check_and_generate_alerts(db: Session, perf: GamePerformance, adapt_res: dict):
    # Fetch recent performance history for this patient and game (excluding the current one)
    history = (
        db.query(GamePerformance)
        .filter(
            GamePerformance.patient_id == perf.patient_id,
            GamePerformance.game_id == perf.game_id,
            GamePerformance.id != perf.id
        )
        .order_by(desc(GamePerformance.id))
        .limit(5)
        .all()
    )

    current_level = int(perf.difficulty) if perf.difficulty.isdigit() else 1

    # 1. Repeated Failures (HIGH Severity)
    # Check if this attempt and the previous 2 attempts were failed or low score
    consec_failures = 0
    if perf.status == "failed" or perf.score < 40:
        consec_failures = 1
        for prev in history[:2]:
            if prev.status == "failed" or prev.score < 40:
                consec_failures += 1
            else:
                break
                
    if consec_failures >= 3:
        alert = CaregiverAlert(
            patient_id=perf.patient_id,
            game_id=perf.game_id,
            alert_type="Repeated Failures",
            severity="HIGH",
            reason=f"Patient failed or scored low (<40%) on 3 consecutive attempts at Level {current_level}.",
            current_level=current_level,
            recommended_action="Patient is repeatedly failing. Consider caregiver guidance or manually reducing starting level."
        )
        db.add(alert)
        db.commit()

    # 2. Sudden Performance Decline (HIGH Severity)
    if len(history) >= 2:
        prev_scores = [p.score for p in history[:3] if p.score is not None]
        if prev_scores:
            avg_prev = sum(prev_scores) / len(prev_scores)
            if (avg_prev - perf.score) >= 40:
                alert = CaregiverAlert(
                    patient_id=perf.patient_id,
                    game_id=perf.game_id,
                    alert_type="Performance Decline",
                    severity="HIGH",
                    reason=f"Score dropped suddenly to {perf.score}% compared to recent average of {round(avg_prev, 1)}%.",
                    current_level=current_level,
                    recommended_action="Sudden decline in performance. Check on the patient's wellness, fatigue, or surrounding distractions."
                )
                db.add(alert)
                db.commit()

    # 3. Repeated easier_variant activation (MEDIUM Severity)
    # Check if support level is high on this and the previous attempt
    if adapt_res.get("support_level") == "high" and len(history) >= 1:
        if history[0].cognitive_support_level == "high":
            alert = CaregiverAlert(
                patient_id=perf.patient_id,
                game_id=perf.game_id,
                alert_type="Support Activated",
                severity="MEDIUM",
                reason=f"Easier variant (cognitive support) activated consecutively at Level {current_level}.",
                current_level=current_level,
                recommended_action="Easier variant active. Patient is struggling and receiving simplified visual/time configurations."
            )
            db.add(alert)
            db.commit()

    # 4. Increased Response Time (MEDIUM Severity)
    if len(history) >= 2:
        prev_times = [p.response_time for p in history[:3] if p.response_time is not None]
        if prev_times:
            avg_time = sum(prev_times) / len(prev_times)
            if avg_time > 0 and perf.response_time > (1.5 * avg_time):
                alert = CaregiverAlert(
                    patient_id=perf.patient_id,
                    game_id=perf.game_id,
                    alert_type="Slow Response",
                    severity="MEDIUM",
                    reason=f"Response time of {perf.response_time}s is 50%+ slower than recent average of {round(avg_time, 1)}s.",
                    current_level=current_level,
                    recommended_action="Response time increased significantly. Patient may be experiencing cognitive lag or distraction."
                )
                db.add(alert)
                db.commit()

    # 5. Low Engagement (MEDIUM Severity)
    if perf.engagement_score is not None and perf.engagement_score < 40:
        alert = CaregiverAlert(
            patient_id=perf.patient_id,
            game_id=perf.game_id,
            alert_type="Engagement Drop",
            severity="MEDIUM",
            reason=f"Engagement score was measured low at {perf.engagement_score}%.",
            current_level=current_level,
            recommended_action="Low engagement. Consider changing the game or introducing audio assistance prompts to grab attention."
        )
        db.add(alert)
        db.commit()

    # 6. Excessive Hints (LOW / INFO Severity)
    if perf.hints_used is not None and perf.hints_used >= 3:
        alert = CaregiverAlert(
            patient_id=perf.patient_id,
            game_id=perf.game_id,
            alert_type="Excessive Hints",
            severity="LOW",
            reason=f"Patient used {perf.hints_used} hints in this session.",
            current_level=current_level,
            recommended_action="Thorough hint usage. Encourage the patient to try solving tasks independently when comfortable."
        )
        db.add(alert)
        db.commit()

    # 7. Milestone Improvement / Progress (LOW / INFO Severity)
    # Check if patient reached level 10 or score is 100% on high difficulty (level >= 5)
    if perf.score == 100.0 and current_level >= 5:
        alert = CaregiverAlert(
            patient_id=perf.patient_id,
            game_id=perf.game_id,
            alert_type="Milestone Improvement",
            severity="LOW",
            reason=f"Patient completed Level {current_level} with a perfect 100% score!",
            current_level=current_level,
            recommended_action="Perfect score milestone reached! Offer praise and positive verbal validation to encourage them."
        )
        db.add(alert)
        db.commit()
    elif current_level == 10 and perf.score >= 80.0:
        alert = CaregiverAlert(
            patient_id=perf.patient_id,
            game_id=perf.game_id,
            alert_type="Milestone Improvement",
            severity="LOW",
            reason="Patient successfully completed the highest difficulty (Level 10)!",
            current_level=current_level,
            recommended_action="Patient achieved the highest difficulty level. Commend their focus and memory!"
        )
        db.add(alert)
        db.commit()
