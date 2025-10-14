"""Service logic for analysing user behaviour to produce AI insights."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from ..feedback.models import Feedback
from .schemas import AIInsightsResponse, Recommendation

RECENT_DAYS_WINDOW = 30

MOOD_EMOJI_ALIASES: dict[str, str] = {
    "😊": "happy",
    "😐": "neutral",
    "😞": "sad",
}


def _enum_to_value(value: Optional[object]) -> Optional[str]:
    """Convert enum instances to their primitive representation."""

    if value is None:
        return None
    return getattr(value, "value", str(value))


def _safe_average(values: Iterable[int | float]) -> Optional[float]:
    """Return the average of *values* or ``None`` when empty."""

    items = list(values)
    if not items:
        return None
    return sum(items) / len(items)


def analyze_user_behavior(db: Session) -> AIInsightsResponse:
    """Aggregate recent feedback into actionable insights and recommendations."""

    cutoff = datetime.utcnow() - timedelta(days=RECENT_DAYS_WINDOW)

    feedbacks: list[Feedback] = (
        db.query(Feedback)
        .filter(Feedback.created_at >= cutoff)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    total_feedback = len(feedbacks)
    completed_feedback = sum(1 for feedback in feedbacks if feedback.completed)
    completion_rate = completed_feedback / total_feedback if total_feedback else 0.0

    punctuality_counter: Counter[str] = Counter()
    reason_counter: Counter[str] = Counter()
    mood_counter: Counter[str] = Counter()
    ratings: list[int] = []

    for feedback in feedbacks:
        punctuality_value = _enum_to_value(feedback.punctuality)
        if punctuality_value:
            punctuality_counter[punctuality_value] += 1

        reason_value = _enum_to_value(feedback.reason)
        if reason_value:
            reason_counter[reason_value] += 1

        if feedback.mood:
            mood_counter[feedback.mood] += 1

        if feedback.rating is not None:
            ratings.append(feedback.rating)

    average_rating = _safe_average(ratings)

    recommendations: list[Recommendation] = []

    if total_feedback >= 3 and completion_rate < 0.7:
        recommendations.append(
            Recommendation(
                title="Erledigungsrate verbessern",
                description=(
                    "Viele Aufgaben bleiben unvollständig. Plane kleinere, realistische Schritte "
                    "und nutze Erinnerungen, um den Fokus zu halten."
                ),
                priority="high",
            )
        )

    if punctuality_counter:
        late_count = punctuality_counter.get("late", 0)
        on_time_count = punctuality_counter.get("on_time", 0)
        if late_count > on_time_count:
            recommendations.append(
                Recommendation(
                    title="Mehr Pufferzeit einplanen",
                    description=(
                        "Die Auswertungen zeigen häufige Verspätungen. Plane zusätzliche Weg- oder Vorbereitungszeit "
                        "von 10–15 Minuten ein, um entspannter anzukommen."
                    ),
                    priority="medium",
                )
            )

        early_count = punctuality_counter.get("early", 0)
        if early_count >= max(late_count, on_time_count) and early_count >= 3:
            recommendations.append(
                Recommendation(
                    title="Zeitfenster optimieren",
                    description=(
                        "Du bist häufig früher fertig oder vor Ort. Prüfe, ob Startzeiten oder Dauer besser angepasst "
                        "werden können, um Leerlauf zu reduzieren."
                    ),
                    priority="low",
                )
            )

    if reason_counter.get("too_tired", 0) >= 3:
        recommendations.append(
            Recommendation(
                title="Energie-Timing optimieren",
                description=(
                    "Mehrere Aufgaben scheitern wegen Müdigkeit. Plane anspruchsvolle Tasks in energiegeladenen Phasen "
                    "und sichere dir erholsame Pausen."
                ),
                priority="medium",
            )
        )

    if reason_counter.get("no_time", 0) >= 3:
        recommendations.append(
            Recommendation(
                title="Zeitbudget prüfen",
                description=(
                    "Der Grund \"keine Zeit\" tritt häufig auf. Überprüfe, ob Termine überlappen und blockiere bewusst "
                    "freie Fokusfenster im Kalender."
                ),
                priority="medium",
            )
        )

    if average_rating is not None and average_rating < 3:
        recommendations.append(
            Recommendation(
                title="Qualität der Termine steigern",
                description=(
                    "Die durchschnittliche Bewertung liegt im unteren Bereich. Identifiziere, welche Termine wenig Mehrwert "
                    "bringen, und justiere Inhalte oder Teilnehmer."
                ),
                priority="medium",
            )
        )

    negative_moods = {"tired", "stressed", "overwhelmed", "sad"}
    negative_mood_hits = sum(
        count
        for mood, count in mood_counter.items()
        if _normalize_mood(mood) in negative_moods
    )
    if negative_mood_hits >= 3:
        recommendations.append(
            Recommendation(
                title="Wohlbefinden priorisieren",
                description=(
                    "Dein Feedback signalisiert häufige negative Stimmungen. Plane gezielte Erholungszeiten oder kürzere "
                    "Sessions, um Energie zurückzugewinnen."
                ),
                priority="medium",
            )
        )

    if not recommendations and total_feedback:
        recommendations.append(
            Recommendation(
                title="Weiter so!",
                description=(
                    "Deine Routinen wirken stabil. Nutze die positiven Muster der letzten Wochen, um langfristig dranzubleiben."
                ),
                priority="low",
            )
        )

    return AIInsightsResponse(
        total_events=total_feedback,
        completed_events=completed_feedback,
        completion_rate=completion_rate,
        punctuality_stats=dict(punctuality_counter),
        frequent_reasons=dict(reason_counter),
        average_rating=average_rating,
        recommendations=recommendations,
    )


def _normalize_mood(mood: str) -> str:
    """Return a case-folded mood value while mapping known emoji choices."""

    return MOOD_EMOJI_ALIASES.get(mood, mood).lower()
