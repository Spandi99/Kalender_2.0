from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ..calendar.schemas import EventRead
from .schemas import DayTemplateCreate, DayTemplateOut
from .service import (
    TemplateNotFoundError,
    apply_template_to_day,
    create_template,
    delete_template,
    list_templates,
)

router = APIRouter()


@router.get("/", response_model=list[DayTemplateOut])
def read_templates(db: Session = Depends(get_db)) -> list[DayTemplateOut]:
    templates = list_templates(db)
    return [DayTemplateOut.from_orm(template) for template in templates]


@router.post("/", response_model=DayTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template_route(
    payload: DayTemplateCreate, db: Session = Depends(get_db)
) -> DayTemplateOut:
    try:
        template = create_template(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return DayTemplateOut.from_orm(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template_route(template_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_template(db, template_id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{template_id}/apply", response_model=list[EventRead])
def apply_template_route(
    template_id: int,
    date: date = Query(..., description="Date to apply the template (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> list[EventRead]:
    try:
        events = apply_template_to_day(db, template_id, date)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return [EventRead.from_orm(event) for event in events]
