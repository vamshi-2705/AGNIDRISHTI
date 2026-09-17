"""
AGNIDRISHTI - SQLAlchemy Database Models with PostGIS Spatial Extensions
Smart India Hackathon (SIH 2026) | Problem Statement 26162 (NTRO)

Defines relational models for thermal anomaly clusters (thermal_events)
and multi-satellite sensor passes (observations) with PostGIS GEOMETRY(Point, 4326)
and GiST spatial indexes.
"""

from sqlalchemy import (
    Column, String, Float, Integer, ForeignKey, Index, Text, JSON
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from database import Base


class ThermalEvent(Base):
    __tablename__ = "thermal_events"

    event_id = Column(String(64), primary_key=True, index=True)
    centroid_lat = Column(Float, nullable=False, index=True)
    centroid_lon = Column(Float, nullable=False, index=True)
    geom = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)

    first_detected = Column(String(64), nullable=True)
    latest_detection = Column(String(64), nullable=True)
    first_acq_date = Column(String(32), nullable=True)
    latest_acq_date = Column(String(32), nullable=True)

    peak_frp = Column(Float, nullable=True)
    latest_frp = Column(Float, nullable=True)
    latest_brightness = Column(Float, nullable=True)
    observation_count = Column(Integer, default=1)

    trend = Column(String(64), default="INSUFFICIENT DATA")
    trend_direction = Column(String(16), default="flat")
    duration_min = Column(Integer, default=0)
    active_satellites = Column(String(128), nullable=True)
    updated_at = Column(Float, nullable=True)

    # Relationships
    observations = relationship(
        "Observation",
        back_populates="event",
        cascade="all, delete-orphan",
        order_by="Observation.acq_date.asc(), Observation.acq_time.asc()"
    )

    __table_args__ = (
        Index("idx_events_coords", "centroid_lat", "centroid_lon"),
    )

    def to_dict(self):
        return {
            "event_id": self.event_id,
            "centroid_lat": self.centroid_lat,
            "centroid_lon": self.centroid_lon,
            "first_detected": self.first_detected,
            "latest_detection": self.latest_detection,
            "first_acq_date": self.first_acq_date,
            "latest_acq_date": self.latest_acq_date,
            "peak_frp": self.peak_frp,
            "latest_frp": self.latest_frp,
            "latest_brightness": self.latest_brightness,
            "observation_count": self.observation_count,
            "trend": self.trend,
            "trend_direction": self.trend_direction,
            "duration_min": self.duration_min,
            "active_satellites": self.active_satellites,
            "updated_at": self.updated_at
        }


class Observation(Base):
    __tablename__ = "observations"

    obs_id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), ForeignKey("thermal_events.event_id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    geom = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)

    brightness = Column(Float, nullable=True)
    scan = Column(Float, nullable=True)
    track = Column(Float, nullable=True)
    acq_date = Column(String(32), nullable=True, index=True)
    acq_time = Column(String(16), nullable=True)
    satellite = Column(String(64), nullable=True)
    instrument = Column(String(64), default="VIIRS (375m)")
    confidence = Column(String(32), nullable=True)
    version = Column(String(32), default="2.0NRT")
    bright_t31 = Column(Float, nullable=True)
    frp = Column(Float, nullable=True)
    daynight = Column(String(8), default="D")
    source = Column(String(64), default="NASA FIRMS NRT")
    received_at = Column(String(64), nullable=True)

    # Relationships
    event = relationship("ThermalEvent", back_populates="observations")

    __table_args__ = (
        Index("idx_obs_event_id", "event_id"),
        Index("idx_obs_datetime", "acq_date", "acq_time"),
        Index("idx_obs_coords", "latitude", "longitude"),
    )

    def to_dict(self):
        return {
            "obs_id": self.obs_id,
            "event_id": self.event_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "brightness": self.brightness,
            "scan": self.scan,
            "track": self.track,
            "acq_date": self.acq_date,
            "acq_time": self.acq_time,
            "satellite": self.satellite,
            "instrument": self.instrument,
            "confidence": self.confidence,
            "version": self.version,
            "bright_t31": self.bright_t31,
            "frp": self.frp,
            "daynight": self.daynight,
            "source": self.source,
            "received_at": self.received_at
        }


class IngestionStatus(Base):
    __tablename__ = "ingestion_status"

    id = Column(Integer, primary_key=True, default=1)
    status = Column(String(32), default="IDLE")  # IDLE, RUNNING, SUCCESS, FAILED
    last_attempt_utc = Column(String(64), nullable=True)
    last_success_utc = Column(String(64), nullable=True)
    latest_observation_utc = Column(String(64), nullable=True)
    records_fetched = Column(Integer, default=0)
    observations_count = Column(Integer, default=0)
    events_count = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    last_error = Column(Text, nullable=True)
    sync_metadata = Column(JSON, nullable=True)
    processed_data = Column(JSON, nullable=True)
    updated_at = Column(Float, nullable=True)

    def to_dict(self):
        return {
            "status": self.status,
            "last_attempt_utc": self.last_attempt_utc,
            "last_success_utc": self.last_success_utc,
            "latest_observation_utc": self.latest_observation_utc,
            "records_fetched": self.records_fetched,
            "observations_count": self.observations_count,
            "events_count": self.events_count,
            "duration_seconds": self.duration_seconds,
            "last_error": self.last_error,
            "updated_at": self.updated_at
        }
