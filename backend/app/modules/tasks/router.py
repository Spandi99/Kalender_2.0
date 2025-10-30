
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from .schemas import (
    OptimalTaskTimeResponse,
    ScheduleTasksResponse,
    TaskCreate,
    TaskRead,
    TaskStats,
    TaskUpdate,
)
from .service import (
    create_task,
    delete_task,
    get_optimal_task_time,
    get_task_stats,
    list_tasks,
    schedule_tasks,
    update_task,
)

router = APIRouter(tags=["Tasks"])


@router.get("/", response_model=list[TaskRead])
def read_tasks(db: Session = Depends(get_db)) -> list[TaskRead]:
    tasks = list_tasks(db)
    return [TaskRead.from_orm(task) for task in tasks]


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task_route(payload: TaskCreate, db: Session = Depends(get_db)) -> TaskRead:
    task = create_task(db, payload)
    return TaskRead.from_orm(task)


@router.put("/{task_id}", response_model=TaskRead)
def update_task_route(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)) -> TaskRead:
    try:
        task = update_task(db, task_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return TaskRead.from_orm(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_route(task_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_task(db, task_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/schedule", response_model=ScheduleTasksResponse)
def schedule_tasks_route(db: Session = Depends(get_db)) -> ScheduleTasksResponse:
    return schedule_tasks(db)


@router.get("/stats", response_model=TaskStats)
def task_stats_route(db: Session = Depends(get_db)) -> TaskStats:
    return get_task_stats(db)


@router.get("/optimal-time", response_model=OptimalTaskTimeResponse)
def optimal_time_route(
    category: str | None = Query(None, description="Optional category slug to tailor the suggestion."),
    db: Session = Depends(get_db),
) -> OptimalTaskTimeResponse:
    return get_optimal_task_time(db, category)
