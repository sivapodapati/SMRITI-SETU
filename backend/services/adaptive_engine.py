import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sqlalchemy.orm import Session
from models.performance import GamePerformance
from models.game import Game
from models.patient import Patient

class CognitiveDifficultyClassifier:
    """
    Unified AI Adaptive difficulty model using a Decision Tree Classifier
    trained on synthetic calibration data (labeled for prototyping, not clinically validated).
    """
    def __init__(self):
        self.model = DecisionTreeClassifier(max_depth=4, random_state=42)
        self._train_initial_model()

    def _train_initial_model(self):
        # Features: [score, accuracy, response_time, engagement_score, hints_used, current_level]
        # Targets: 0 -> DECREASE, 1 -> MAINTAIN, 2 -> INCREASE
        X_train = []
        y_train = []

        # Generate representative synthetic training samples across levels 1-10
        # This calibration dataset mimics typical cognitive performance characteristics.
        for level in range(1, 11):
            # High Performance -> INCREASE (2)
            # High score, high accuracy, low response time, high engagement, low hints
            for score in [85.0, 90.0, 100.0]:
                for accuracy in [80.0, 90.0, 100.0]:
                    for rt in [1.0, 1.5, 2.5]:
                        X_train.append([score, accuracy, rt, 85.0, 0, level])
                        y_train.append(2)

            # Average Performance -> MAINTAIN (1)
            # Moderate score/accuracy, normal response time, moderate engagement/hints
            for score in [60.0, 70.0, 80.0]:
                for accuracy in [60.0, 70.0, 80.0]:
                    for rt in [3.0, 4.5, 6.0]:
                        X_train.append([score, accuracy, rt, 60.0, 1, level])
                        y_train.append(1)

            # Struggling Performance -> DECREASE (0)
            # Low score, low accuracy, slow response time, low engagement, high hints
            for score in [20.0, 40.0, 50.0]:
                for accuracy in [20.0, 30.0, 45.0]:
                    for rt in [7.0, 9.0, 12.0]:
                        X_train.append([score, accuracy, rt, 35.0, 3, level])
                        y_train.append(0)

        self.model.fit(X_train, y_train)
        print("CognitiveDifficultyClassifier Decision Tree trained successfully (Synthetic Calibration Data).")

    def predict_adjustment(self, score: float, accuracy: float, response_time: float, engagement_score: float, hints_used: int, current_level: int) -> dict:
        features = np.array([[score, accuracy, response_time, engagement_score, hints_used, current_level]])
        pred_class = self.model.predict(features)[0]
        probs = self.model.predict_proba(features)[0]
        confidence = float(np.max(probs))

        mapping = {0: "DECREASE", 1: "MAINTAIN", 2: "INCREASE"}
        adjustment = mapping.get(pred_class, "MAINTAIN")

        return {
            "adjustment": adjustment,
            "confidence": round(confidence, 2)
        }

# Instantiate singleton classifier
classifier = CognitiveDifficultyClassifier()

def map_difficulty_to_level(diff_str: str) -> int:
    if not diff_str:
        return 1
    try:
        level = int(diff_str)
        return max(1, min(10, level))
    except ValueError:
        pass
    diff_lower = diff_str.lower()
    if diff_lower == "easy":
        return 2
    elif diff_lower == "medium":
        return 5
    elif diff_lower == "hard":
        return 8
    return 1

def calculate_next_level(db: Session, patient_id: int, game_id: int) -> dict:
    """
    Unified Adaptive Difficulty Algorithm.
    ML Recommendation (Decision Tree Classifier) + Safety Rules + Clinician Ceiling -> Final Next Level.
    """
    # Fetch recent performance history
    performances = (
        db.query(GamePerformance)
        .filter(
            GamePerformance.patient_id == patient_id,
            GamePerformance.game_id == game_id
        )
        .order_by(GamePerformance.id.desc())
        .limit(5)
        .all()
    )

    # 1. Fetch Patient and Clinician-set ceiling/regimen settings
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {
            "current_level": 1,
            "next_level": 1,
            "decision": "maintain",
            "support_level": "medium",
            "reason": "Patient not found. Defaulting to Level 1."
        }
    
    max_ceiling = getattr(patient, "max_difficulty_ceiling", 10)

    # Fetch game
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        return {
            "current_level": 1,
            "next_level": 1,
            "decision": "maintain",
            "support_level": "medium",
            "reason": "Game not found. Defaulting to Level 1."
        }

    # Default if no previous attempts
    if not performances:
        start_level = min(1, max_ceiling)
        return {
            "current_level": start_level,
            "next_level": start_level,
            "decision": "maintain",
            "support_level": "medium",
            "reason": "No previous attempts recorded. Starting at Level 1."
        }

    latest_perf = performances[0]
    current_level = map_difficulty_to_level(latest_perf.difficulty)

    # Extract features for ML prediction
    score = latest_perf.score if latest_perf.score is not None else 50.0
    correct = latest_perf.correct_answers if latest_perf.correct_answers is not None else 0
    attempts = latest_perf.attempts if latest_perf.attempts is not None and latest_perf.attempts > 0 else 1
    accuracy = (correct / attempts) * 100.0
    response_time = latest_perf.response_time if latest_perf.response_time is not None else 3.0
    engagement_score = latest_perf.engagement_score if latest_perf.engagement_score is not None else 50.0
    hints_used = latest_perf.hints_used if latest_perf.hints_used is not None else 0

    # 2. Get ML Recommendation
    ml_res = classifier.predict_adjustment(
        score=score,
        accuracy=accuracy,
        response_time=response_time,
        engagement_score=engagement_score,
        hints_used=hints_used,
        current_level=current_level
    )
    ml_decision = ml_res["adjustment"]
    confidence = ml_res["confidence"]

    # Calculate consecutive struggles (fails or scores < 50)
    consecutive_struggles = 0
    for p in performances:
        p_correct = p.correct_answers if p.correct_answers is not None else 0
        p_attempts = p.attempts if p.attempts is not None and p.attempts > 0 else 1
        p_acc = (p_correct / p_attempts) * 100.0
        p_score = p.score if p.score is not None else 0
        if p.status == "failed" or p_score < 40 or p_acc < 40:
            consecutive_struggles += 1
        else:
            break

    # 3. Apply Decision Logic + Safety Bounds + Clinician Ceiling
    if ml_decision == "DECREASE" or latest_perf.status == "failed" or score < 40:
        decision = "decrease"
        next_level = max(1, current_level - 1)
        if consecutive_struggles >= 2:
            support_level = "high"
            reason = f"AI recommended decrease with {confidence*100}% confidence. Support increased to HIGH because patient has struggled consecutively."
        else:
            support_level = "medium"
            reason = f"AI recommended decrease with {confidence*100}% confidence. Level reduced to {next_level}."
    elif ml_decision == "INCREASE" and score >= 80 and accuracy >= 70:
        decision = "increase"
        # Check clinician ceiling
        if current_level >= max_ceiling:
            next_level = max_ceiling
            decision = "maintain"
            support_level = "medium"
            reason = f"AI recommended increase, but ceiling is locked at Level {max_ceiling} by clinician. Level maintained."
        else:
            next_level = min(10, current_level + 1)
            support_level = "low"
            reason = f"AI recommended increase with {confidence*100}% confidence. Level adjusted to {next_level}."
    else:
        decision = "maintain"
        next_level = current_level
        support_level = "medium"
        reason = f"AI recommended maintaining level with {confidence*100}% confidence for cognitive stability."

    return {
        "current_level": current_level,
        "next_level": next_level,
        "decision": decision,
        "support_level": support_level,
        "reason": reason
    }
