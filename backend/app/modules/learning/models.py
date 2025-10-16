"""Database models for the learning and optimization module."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Time
from sqlalchemy.orm import relationship

from ...core.database import Base


class LearningSnapshot(Base):
    """Stores aggregated model parameters for later analysis."""

    __tablename__ = "learning_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    clusters = Column(JSON, nullable=False)
    average_mood = Column(Float, nullable=True)
    average_xp = Column(Float, nullable=True)
    total_events = Column(Integer, nullable=False)
    feedback_samples = Column(Integer, nullable=False, default=0)
    xp_samples = Column(Integer, nullable=False, default=0)

    optimizations = relationship(
        "TemplateOptimizationLog",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )


class TemplateOptimizationLog(Base):
    """Audit trail for template adjustments proposed by the learner."""

    __tablename__ = "template_optimization_log"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("template_blocks.id"), nullable=False)
    template_id = Column(Integer, nullable=False)
    old_start_time = Column(Time, nullable=False)
    old_end_time = Column(Time, nullable=False)
    new_start_time = Column(Time, nullable=False)
    new_end_time = Column(Time, nullable=False)
    delta_minutes = Column(Integer, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    snapshot_id = Column(Integer, ForeignKey("learning_snapshots.id"), nullable=True)

    snapshot = relationship("LearningSnapshot", back_populates="optimizations")
