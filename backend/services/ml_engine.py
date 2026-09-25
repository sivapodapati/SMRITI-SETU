import numpy as np
from datetime import datetime

MIN_SESSIONS_REQUIRED = 15

def analyze_patient_deterioration(telemetry_logs: list) -> dict:
    """
    Cognitive Trend Analysis and Early Warning Engine.
    Uses Z-score anomaly check and linear regression trends.
    Uses non-diagnostic terminology for ethical and prototype compliance.
    """
    rx_times = []
    errors = []
    dates = []

    if telemetry_logs:
        for log in telemetry_logs:
            # Handle both SQLAlchemy objects and raw dictionaries
            rx = getattr(log, 'response_time', None) if not hasattr(log, 'get') else log.get('response_time')
            err = getattr(log, 'error_count', None) if not hasattr(log, 'get') else log.get('error_count')
            if err is None:
                # Fallback to attempts - correct_answers if not set
                attempts = getattr(log, 'attempts', 1) if not hasattr(log, 'get') else log.get('attempts', 1)
                correct = getattr(log, 'correct_answers', 0) if not hasattr(log, 'get') else log.get('correct_answers', 0)
                err = max(0, attempts - correct)

            dt = getattr(log, 'completed_at', None) if not hasattr(log, 'get') else log.get('completed_at')
            if dt is None:
                dt = getattr(log, 'timestamp', datetime.utcnow()) if not hasattr(log, 'get') else log.get('timestamp', datetime.utcnow())

            if rx is not None and float(rx) > 0.05: # ignore zeroes
                # Convert response time to ms if it is in seconds (e.g. less than 120s)
                rx_ms = float(rx) * 1000.0 if float(rx) < 120.0 else float(rx)
                rx_times.append(rx_ms)
                errors.append(int(err or 0))
                dates.append(str(dt or ''))

    # Reverse to represent chronological order (telemetry logs are usually fetched desc)
    rx_times.reverse()
    errors.reverse()
    dates.reverse()

    # Minimum Session Guard
    if len(rx_times) < MIN_SESSIONS_REQUIRED:
        return {
            "status": "CALIBRATION_PHASE",
            "message": f"Cognitive baseline calibration in progress (Completed attempts: {len(rx_times)}/{MIN_SESSIONS_REQUIRED}). Numerical trend tracking only.",
            "risk_score": 0,
            "session_count": len(rx_times),
            "rolling_slope_ms_per_session": 0.0,
            "trend_direction": "CALIBRATING",
            "anomalies_detected": [],
            "anomaly_count": 0,
            "observations": [
                f"Calibrating baseline parameters. {MIN_SESSIONS_REQUIRED - len(rx_times)} more sessions required to establish clinical trend calculations."
            ],
            "recommendations": [
                "Continue standard daily cognitive routine exercises to complete baseline setup."
            ],
            "evaluated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    # 1. Rolling 7-session Reaction Time Slope (ms/session) using linear regression
    recent_rx = rx_times[-7:]
    x_indices = np.arange(len(recent_rx))
    slope, _ = np.polyfit(x_indices, recent_rx, 1)
    slope_ms_per_session = round(float(slope), 2)

    if slope_ms_per_session > 100.0:
        trend_direction = "INCREASING_LATENCY"
    elif slope_ms_per_session < -100.0:
        trend_direction = "IMPROVING_SPEED"
    else:
        trend_direction = "STABLE"

    # 2. Z-Score Anomaly Detection (Threshold Z >= 2.0)
    mean_rx = float(np.mean(rx_times))
    std_rx = float(np.std(rx_times))
    if std_rx == 0:
        std_rx = 1.0

    anomalies = []
    for idx, rx in enumerate(rx_times):
        z_score = (rx - mean_rx) / std_rx
        if z_score >= 2.0:
            anomalies.append({
                "session_index": idx + 1,
                "reaction_time_ms": round(rx, 1),
                "z_score": round(float(z_score), 2),
                "date": dates[idx] if idx < len(dates) else "Recent Session",
                "severity": "CRITICAL" if z_score >= 3.0 else "ELEVATED"
            })

    # 3. Clinical Concern Rating Score (0 - 100)
    avg_errors = float(np.mean(errors[-10:])) # last 10 sessions
    error_penalty = min(30.0, avg_errors * 10.0)
    slope_penalty = max(0.0, min(30.0, slope_ms_per_session * 0.1))
    # Multi-session anomaly check (only count if there is a pattern of anomalies)
    anomaly_count = len([a for a in anomalies if a["session_index"] > len(rx_times) - 10]) # anomalies in last 10
    anomaly_penalty = min(40.0, anomaly_count * 20.0)

    raw_concern_score = 10.0 + error_penalty + slope_penalty + anomaly_penalty
    risk_score = min(100, max(5, round(raw_concern_score)))

    # Status Classification (Non-diagnostic clinical warning tags)
    if risk_score >= 70 or anomaly_count >= 2:
        status = "REQUIRES_CLINICAL_REVIEW"
        observations = [
            f"Performance trend shows sustained response latency (rolling slope: +{slope_ms_per_session}ms) and potential concern in speed consistency.",
            f"Detected {anomaly_count} distinct reaction time spikes in recent sessions."
        ]
        recommendations = [
            "Consider a formal clinical assessment by a healthcare professional.",
            "Verify surrounding distractions or patient fatigue levels during session play."
        ]
    elif risk_score >= 35 or slope_ms_per_session > 50.0:
        status = "NEEDS_MONITORING"
        observations = [
            f"Minor increase in cognitive latency observed (+{slope_ms_per_session}ms per session). Details indicate moderate variance."
        ]
        recommendations = [
            "Maintain regular session schedules and track weekly adherence levels closely.",
            "Suggest patient plays during morning hours to ensure maximum focus."
        ]
    else:
        status = "STABLE"
        observations = [
            "Sustained performance metrics. Response speed and accuracy are within normal baseline ranges."
        ]
        recommendations = [
            "Continue existing regimen to maintain active mental agility."
        ]

    return {
        "status": status,
        "risk_score": risk_score,
        "session_count": len(rx_times),
        "rolling_slope_ms_per_session": slope_ms_per_session,
        "trend_direction": trend_direction,
        "anomalies_detected": anomalies[-3:], # return last 3
        "anomaly_count": len(anomalies),
        "observations": observations,
        "recommendations": recommendations,
        "evaluated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
