import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from .schemas import (
    EventCategoryRead,
    EventCompleteResponse,
    EventCreate,
    EventRead,
    EventUpdate,
)
from .service import (
    complete_event,
    create_event,
    delete_event,
    list_categories,
    list_events,
    update_event,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Events"])


@router.get("/", response_model=list[EventRead])
def read_events(db: Session = Depends(get_db)) -> list[EventRead]:
    events = list_events(db)
    return [EventRead.from_orm(event) for event in events]


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event_route(payload: EventCreate, db: Session = Depends(get_db)) -> EventRead:
    try:
        event = create_event(db, payload)
    except ValueError as exc:
        logger.debug("Invalid event payload rejected: %s", exc)
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
