from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ..ical_import.models import ImportedEvent
from .models import Event
from .schemas import (
    EventCategoryRead,
    EventCompleteResponse,
    EventCreate,
    EventOut,
    EventRead,
    EventUpdate,
)
from .service import (
    complete_event,
    create_event,
    delete_event,
    list_categories,
    update_event,
)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[EventOut])
def read_events(db: Session = Depends(get_db)) -> list[EventOut]:
    imported_events = (
        db.query(ImportedEvent)
        .order_by(ImportedEvent.start)
        .all()
    )
    local_events = db.query(Event).order_by(Event.start).all()

    combined: list[EventOut] = []

    for imported in imported_events:
        combined.append(
            EventOut(
                id=f"ext-{imported.id}",
                title=imported.title or "(Kein Titel)",
                start=imported.start,
                end=imported.end,
                category="External",
                completed=False,
                description=(
                    f"Imported from iCal source #{imported.source_calendar_id}"
                    if imported.source_calendar_id
                    else None
                ),
                readonly=True,
            )
        )

    for event in local_events:
        combined.append(
            EventOut(
                id=str(event.id),
                title=event.title,
                start=event.start,
                end=event.end,
                category=event.category,
                completed=event.completed,
                description=event.description,
                readonly=False,
            )
        )

    combined.sort(key=lambda entry: entry.start or datetime.max)

    return combined


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event_route(payload: EventCreate, db: Session = Depends(get_db)) -> EventRead:
    try:
        event = create_event(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return EventRead.from_orm(event)


@router.get("/categories", response_model=list[EventCategoryRead])
def read_categories(db: Session = Depends(get_db)) -> list[EventCategoryRead]:
    categories = list_categories(db)
    return [EventCategoryRead.from_orm(category) for category in categories]


@router.put("/{event_id}", response_model=EventRead)
def update_event_route(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)) -> EventRead:
    try:
        event = update_event(db, event_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return EventRead.from_orm(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_route(event_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_event(db, event_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{event_id}/complete", response_model=EventCompleteResponse)
def complete_event_route(event_id: int, db: Session = Depends(get_db)) -> EventCompleteResponse:
    try:
        event, xp_awarded = complete_event(db, event_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return EventCompleteResponse(event=EventRead.from_orm(event), xp_awarded=xp_awarded)
