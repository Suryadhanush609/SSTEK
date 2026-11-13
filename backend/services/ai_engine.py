"""
AI Classification and Severity Prediction Engine
"""

KEYWORD_RULES = {
    "accident": {
        "keywords": ["accident", "crash", "collision", "vehicle", "car", "truck", "injured", "road"],
        "base_severity": 3
    },
    "medical": {
        "keywords": ["cardiac", "heart", "stroke", "unconscious", "breathing", "chest pain", "seizure", "critical"],
        "base_severity": 4
    },
    "fire": {
        "keywords": ["fire", "burning", "smoke", "explosion", "flames"],
        "base_severity": 4
    },
    "flood": {
        "keywords": ["flood", "water", "trapped", "drowning", "submerged"],
        "base_severity": 3
    },
}

CRITICAL_KEYWORDS = ["critical", "severe", "multiple", "mass", "major", "emergency"]
MINOR_KEYWORDS = ["minor", "small", "single", "light", "minimal"]

PRIORITY_MAP = {
    5: "critical",
    4: "high",
    3: "medium",
    2: "low",
    1: "low",
}


def classify_incident(description: str, incident_type: str, affected_people: int = 1) -> dict:
    """
    Classify an incident and return severity, priority, and other metadata.
    Returns: {severity, priority, estimated_ambulances, needs_icu, classification_reason}
    """
    desc_lower = description.lower()
    type_lower = incident_type.lower()

    # Base severity from type
    rules = KEYWORD_RULES.get(type_lower, {"keywords": [], "base_severity": 3})
    severity = rules["base_severity"]

    matched_keywords = [kw for kw in rules["keywords"] if kw in desc_lower]
    reasons = []

    if matched_keywords:
        reasons.append(f"Matched keywords: {', '.join(matched_keywords)}")

    # Modifier: affected people
    if affected_people > 10:
        severity = min(severity + 1, 5)
        reasons.append(f"Large affected population ({affected_people} people)")

    # Modifier: critical keywords
    found_critical = [kw for kw in CRITICAL_KEYWORDS if kw in desc_lower]
    if found_critical:
        severity = min(severity + 1, 5)
        reasons.append(f"Critical indicators: {', '.join(found_critical)}")

    # Modifier: minor keywords
    found_minor = [kw for kw in MINOR_KEYWORDS if kw in desc_lower]
    if found_minor and not found_critical:
        severity = max(severity - 1, 1)
        reasons.append(f"Minor indicators: {', '.join(found_minor)}")

    # Clamp
    severity = max(1, min(5, severity))

    priority = PRIORITY_MAP[severity]
    needs_icu = severity >= 4 or type_lower == "medical"

    # Estimated ambulances
    estimated_ambulances = 1
    if severity == 5 or affected_people > 20:
        estimated_ambulances = 3
    elif severity >= 4 or affected_people > 10:
        estimated_ambulances = 2

    classification_reason = (
        f"Type '{incident_type}' (base severity {rules['base_severity']}). "
        + " ".join(reasons)
        + f" Final severity: {severity}/5."
    )

    return {
        "severity": severity,
        "priority": priority,
        "estimated_ambulances": estimated_ambulances,
        "needs_icu": needs_icu,
        "classification_reason": classification_reason,
    }
