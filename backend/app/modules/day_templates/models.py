from sqlalchemy import Column, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship

from ...core.database import Base


class DayTemplate(Base):
    __tablename__ = "day_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    blocks = relationship(
        "TemplateBlock",
        back_populates="template",
        cascade="all, delete",
        order_by="TemplateBlock.start_time",
    )


class TemplateBlock(Base):
    __tablename__ = "template_blocks"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("day_templates.id", ondelete="CASCADE"))
    label = Column(String, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    category = Column(String, nullable=True)
    color = Column(String(20), nullable=True)

    template = relationship("DayTemplate", back_populates="blocks")
