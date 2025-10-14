from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Iterable, List, Sequence, Tuple

from sqlalchemy.orm import Session, selectinload

from ..calendar.models import Event
from ..calendar.schemas import EventCreate
from ..calendar.service import create_event
from .models import DayTemplate, TemplateBlock
from .schemas import DayTemplateCreate

class TemplateNotFoundError(ValueError):
    """Raised when a requested day template cannot be found."""


TimeSlot = Tuple[datetime, datetime]


def list_templates(db: Session) -> List[DayTemplate]:
    return (
        db.query(DayTemplate)
        .options(selectinload(DayTemplate.blocks))
        .order_by(DayTemplate.name.asc())
        .all()
    )


def _validate_blocks(blocks: Sequence[TemplateBlock]) -> None:
    for block in blocks:
        if block.end_time <= block.start_time:
            raise ValueError("Block end_time must be after start_time")


def create_template(db: Session, payload: DayTemplateCreate) -> DayTemplate:
    if not payload.blocks:
        raise ValueError("Template must include at least one block")

    block_models = [
        TemplateBlock(
            label=block.label,
            start_time=block.start_time,
            end_time=block.end_time,
            category=block.category,
        )
        for block in sorted(payload.blocks, key=lambda b: b.start_time)
    ]

    _validate_blocks(block_models)

    template = DayTemplate(
        name=payload.name,
        description=payload.description,
        blocks=block_models,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def delete_template(db: Session, template_id: int) -> None:
    template = db.query(DayTemplate).filter(DayTemplate.id == template_id).first()
    if not template:
        raise TemplateNotFoundError("Template not found")

    db.delete(template)
    db.commit()


def _load_template(db: Session, template_id: int) -> DayTemplate:
    template = (
        db.query(DayTemplate)
        .options(selectinload(DayTemplate.blocks))
        .filter(DayTemplate.id == template_id)
        .first()
    )
    if not template:
        raise TemplateNotFoundError("Template not found")
    _validate_blocks(template.blocks)
    return template


def _times_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and start_b < end_a


def _subtract_conflicts(slot: TimeSlot, conflicts: Iterable[Event]) -> List[TimeSlot]:
    remaining: List[TimeSlot] = [slot]
    for event in sorted(conflicts, key=lambda item: item.start):
        next_remaining: List[TimeSlot] = []
        for current_start, current_end in remaining:
            if not _times_overlap(current_start, current_end, event.start, event.end):
                next_remaining.append((current_start, current_end))
                continue

            overlap_start = max(current_start, event.start)
            overlap_end = min(current_end, event.end)

            if overlap_start > current_start:
                next_remaining.append((current_start, overlap_start))
            if overlap_end < current_end:
                next_remaining.append((overlap_end, current_end))
        remaining = next_remaining
        if not remaining:
            break
    return remaining


def apply_template_to_day(db: Session, template_id: int, target_date: date) -> List[Event]:
    template = _load_template(db, template_id)

    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)

    scheduled_events: List[Event] = (
        db.query(Event)
        .filter(Event.start < day_end, Event.end > day_start)
        .order_by(Event.start.asc())
        .all()
    )

    created_events: List[Event] = []

    for block in sorted(template.blocks, key=lambda item: item.start_time):
        block_start = datetime.combine(target_date, block.start_time)
        block_end = datetime.combine(target_date, block.end_time)
        if block_end <= block_start:
            continue

        conflicts = [
            event
            for event in scheduled_events
            if _times_overlap(block_start, block_end, event.start, event.end)
        ]
        free_slots = _subtract_conflicts((block_start, block_end), conflicts)

        for slot_start, slot_end in free_slots:
            payload = EventCreate(
                title=block.label,
                description=None,
                start=slot_start,
                end=slot_end,
                category=block.category or "work",
            )
            new_event = create_event(db, payload)
            created_events.append(new_event)
            scheduled_events.append(new_event)

    return created_events
