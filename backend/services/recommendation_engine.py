from sqlalchemy.orm import Session
from models.performance import GamePerformance
from models.game import Game
from models.recommendation import RecommendationHistory
from services.adaptive_engine import calculate_next_level
from datetime import datetime

# Domain mapping for all 5 games
DOMAINS = {
    1: {
        "key": "working_memory",
        "name": "Working Memory",
        "game_title": "Remember the Sequence"
    },
    2: {
        "key": "visual_recognition",
        "name": "Visual Recognition",
        "game_title": "Familiar Landmark & Picture Match"
    },
    3: {
        "key": "object_recognition",
        "name": "Logical Sequencing",
        "game_title": "Traditional Recipe Sequencer"
    },
    4: {
        "key": "attention_concentration",
        "name": "Auditory Recognition",
        "game_title": "Folk Rhythm Match"
    },
    5: {
        "key": "emotional_engagement",
        "name": "Verbal Memory & Recall",
        "game_title": "Mood & Memory Stories"
    }
}


def calculate_attempt_score(p: GamePerformance) -> float:
    """
    Computes a performance score for a single attempt based on score, accuracy,
    hints used, engagement, and completion status.
    """
    score = p.score if p.score is not None else 50.0
    correct = p.correct_answers if p.correct_answers is not None else 0
    attempts = p.attempts if p.attempts is not None and p.attempts > 0 else 1
    accuracy = (correct / attempts) * 100.0
    engagement = p.engagement_score if p.engagement_score is not None else 50.0
    hints = p.hints_used if p.hints_used is not None else 0
    
    # Base score is a combination of points scored and accuracy
    base = 0.6 * score + 0.4 * accuracy
    
    # Adjustments
    if p.status in ["failed", "abandoned", "incomplete"]:
        base = min(base, 30.0)
    
    # Penalty for using hints (deduct up to 15 points)
    if hints > 2:
        base -= min(15.0, (hints - 2) * 5.0)
        
    # Penalty for low engagement or bonus for high engagement
    if engagement < 40:
        base -= 10.0
    elif engagement > 80:
        base += 5.0
        
    return max(0.0, min(100.0, base))

def get_domain_profiles(db: Session, patient_id: int) -> dict:
    """
    Analyzes historical performance for all 5 cognitive domains.
    Returns scores, trends, and classifications for each domain.
    """
    profiles = {}
    
    for game_id, info in DOMAINS.items():
        domain_key = info["key"]
        
        # Get last 5 attempts
        attempts = (
            db.query(GamePerformance)
            .filter(
                GamePerformance.patient_id == patient_id,
                GamePerformance.game_id == game_id
            )
            .order_by(GamePerformance.id.desc())
            .limit(5)
            .all()
        )
        
        if not attempts:
            profiles[domain_key] = {
                "game_id": game_id,
                "domain_name": info["name"],
                "score": 70.0,  # default baseline
                "trend": "stable",
                "classification": "stable",
                "engagement": 50.0,
                "history_count": 0
            }
            continue
            
        # Calculate attempt scores
        scores = [calculate_attempt_score(p) for p in attempts]
        
        # Weighted average score (higher weight to recent attempts)
        weights = [1.0, 0.8, 0.6, 0.4, 0.2][:len(scores)]
        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        total_weight = sum(weights)
        domain_score = weighted_sum / total_weight
        
        # Calculate average engagement
        avg_engagement = sum(p.engagement_score for p in attempts if p.engagement_score is not None) / len(attempts)
        
        # Determine trend
        trend = "stable"
        if len(scores) >= 2:
            latest_score = scores[0]
            prev_avg = sum(scores[1:]) / len(scores[1:])
            diff = latest_score - prev_avg
            if diff <= -15.0:
                trend = "declining"
            elif diff >= 15.0:
                trend = "improving"
                
        # Classify domain classification state
        if trend == "declining":
            classification = "declining"
        elif domain_score < 50.0:
            classification = "weak"
        elif avg_engagement < 40.0:
            classification = "low_engagement"
        elif domain_score >= 80.0:
            classification = "strong"
        else:
            classification = "stable"
            
        profiles[domain_key] = {
            "game_id": game_id,
            "domain_name": info["name"],
            "score": round(domain_score, 2),
            "trend": trend,
            "classification": classification,
            "engagement": round(avg_engagement, 2),
            "history_count": len(attempts)
        }
        
    return profiles

def get_patient_recommendation(db: Session, patient_id: int) -> dict:
    """
    Main entry point for intelligent game selection and comfortable challenge logic.
    Analyzes domain performance and logs / returns the next activity.
    """
    profiles = get_domain_profiles(db, patient_id)
    
    # Fetch recent overall play history and recommendation history (to prevent repetition)
    overall_history = (
        db.query(GamePerformance)
        .filter(GamePerformance.patient_id == patient_id)
        .order_by(GamePerformance.id.desc())
        .limit(5)
        .all()
    )
    played_game_ids = [p.game_id for p in overall_history]

    recent_recs = (
        db.query(RecommendationHistory)
        .filter(RecommendationHistory.patient_id == patient_id)
        .order_by(RecommendationHistory.id.desc())
        .limit(3)
        .all()
    )
    recent_rec_game_ids = [r.recommended_game_id for r in recent_recs]
    
    # Calculate selection priority score for each game
    priorities = {}
    for game_id, info in DOMAINS.items():
        domain_key = info["key"]
        prof = profiles[domain_key]
        
        # Base priority is reverse of score
        priority = 100.0 - prof["score"]
        
        # Decline bonus
        if prof["classification"] == "declining":
            priority += 30.0
            
        # Low engagement bonus
        if prof["classification"] == "low_engagement":
            priority += 15.0
            
        # Repetition penalty (check both recent recommendations and gameplay)
        penalty = 0.0
        if (len(recent_rec_game_ids) > 0 and recent_rec_game_ids[0] == game_id):
            penalty = 95.0
        elif (len(recent_rec_game_ids) > 1 and recent_rec_game_ids[1] == game_id):
            penalty = 45.0
        elif len(played_game_ids) > 1 and played_game_ids[0] == game_id and played_game_ids[1] == game_id:
            penalty = 60.0
        elif len(played_game_ids) > 0 and played_game_ids[0] == game_id and len(recent_rec_game_ids) > 0:
            penalty = 60.0
            
        priority -= penalty
        priorities[game_id] = priority
        
    # Select game with highest priority
    recommended_game_id = max(priorities, key=priorities.get)
    rec_info = DOMAINS[recommended_game_id]
    rec_profile = profiles[rec_info["key"]]
    
    # 1. Call the EXISTING adaptive engine to get the appropriate level and support
    adaptive_res = calculate_next_level(db, patient_id, recommended_game_id)
    
    # 2. Flow zone and Confidence mapping
    flow_zone = "comfortable_challenge"
    confidence = 0.8
    
    # Check latest attempt for recommended game to adjust flow state
    latest_game_perf = (
        db.query(GamePerformance)
        .filter(
            GamePerformance.patient_id == patient_id,
            GamePerformance.game_id == recommended_game_id
        )
        .order_by(GamePerformance.id.desc())
        .first()
    )
    
    if latest_game_perf:
        score = latest_game_perf.score if latest_game_perf.score is not None else 0
        correct = latest_game_perf.correct_answers if latest_game_perf.correct_answers is not None else 0
        attempts = latest_game_perf.attempts if latest_game_perf.attempts is not None and latest_game_perf.attempts > 0 else 1
        accuracy = (correct / attempts) * 100.0
        
        if latest_game_perf.status in ["failed", "abandoned"] or score < 50 or accuracy < 40:
            flow_zone = "support_offered"
            confidence = 0.7
        elif score >= 80 and accuracy >= 75:
            flow_zone = "comfortable_challenge"
            confidence = 0.9
        elif rec_profile["engagement"] < 50.0:
            flow_zone = "engagement_focus"
    elif rec_profile["engagement"] < 50.0:
        flow_zone = "engagement_focus"
        
    # Check if there is NO performance history at all across all games
    has_any_history = db.query(GamePerformance).filter(GamePerformance.patient_id == patient_id).first() is not None
    
    # 3. Framing non-clinical, explainable reasons
    if not has_any_history:
        reason = "Let's try a gentle cognitive activity today to start your brain exercise routine."
        confidence = 0.5
    elif rec_profile["classification"] == "declining":
        reason = "Observed performance in this activity area shows a slight decline. Additional practice may be helpful."
    elif rec_profile["classification"] == "weak":
        reason = "Recent game performance in this activity area is lower than other areas. Additional practice is recommended."
    elif rec_profile["classification"] == "low_engagement":
        reason = "This game features themes designed to support focus and visual engagement."
    else:
        reason = "Recommended to maintain balanced cognitive engagement across all activity areas."
        
    # 4. Save to RecommendationHistory log
    new_rec = RecommendationHistory(
        patient_id=patient_id,
        recommended_game_id=recommended_game_id,
        target_domain=rec_info["key"],
        recommended_level=adaptive_res["next_level"],
        support_level=adaptive_res["support_level"],
        reason=reason,
        flow_zone=flow_zone,
        confidence=confidence
    )
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)
    
    return {
        "patient_id": patient_id,
        "recommended_game_id": recommended_game_id,
        "game_id": recommended_game_id,  # backward compatibility
        "recommended_game": rec_info["game_title"],
        "recommended_game_title": rec_info["game_title"],
        "domain": rec_info["key"],
        "domain_name": rec_info["name"],
        "recommended_level": adaptive_res["next_level"],
        "difficulty": str(adaptive_res["next_level"]),  # backward compatibility
        "support_level": adaptive_res["support_level"],
        "reason": reason,
        "flow_zone": flow_zone,
        "confidence": confidence,
        "domain_profiles": profiles
    }
