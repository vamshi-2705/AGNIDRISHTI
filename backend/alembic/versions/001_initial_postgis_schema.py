"""initial_postgis_schema

Revision ID: 001_postgis
Revises: 
Create Date: 2026-09-17 21:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = '001_postgis'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure PostGIS extension is active
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # 2. Create thermal_events table
    op.create_table(
        'thermal_events',
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('centroid_lat', sa.Float(), nullable=False),
        sa.Column('centroid_lon', sa.Float(), nullable=False),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.Column('first_detected', sa.String(length=64), nullable=True),
        sa.Column('latest_detection', sa.String(length=64), nullable=True),
        sa.Column('first_acq_date', sa.String(length=32), nullable=True),
        sa.Column('latest_acq_date', sa.String(length=32), nullable=True),
        sa.Column('peak_frp', sa.Float(), nullable=True),
        sa.Column('latest_frp', sa.Float(), nullable=True),
        sa.Column('latest_brightness', sa.Float(), nullable=True),
        sa.Column('observation_count', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('trend', sa.String(length=64), nullable=True, server_default='INSUFFICIENT DATA'),
        sa.Column('trend_direction', sa.String(length=16), nullable=True, server_default='flat'),
        sa.Column('duration_min', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('active_satellites', sa.String(length=128), nullable=True),
        sa.Column('updated_at', sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint('event_id')
    )
    op.create_index(op.f('ix_thermal_events_event_id'), 'thermal_events', ['event_id'], unique=False)
    op.create_index(op.f('ix_thermal_events_centroid_lat'), 'thermal_events', ['centroid_lat'], unique=False)
    op.create_index(op.f('ix_thermal_events_centroid_lon'), 'thermal_events', ['centroid_lon'], unique=False)
    op.create_index('idx_events_coords', 'thermal_events', ['centroid_lat', 'centroid_lon'], unique=False)
    op.execute("CREATE INDEX IF NOT EXISTS idx_events_geom ON thermal_events USING GIST (geom);")

    # 3. Create observations table
    op.create_table(
        'observations',
        sa.Column('obs_id', sa.String(length=64), nullable=False),
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.Column('brightness', sa.Float(), nullable=True),
        sa.Column('scan', sa.Float(), nullable=True),
        sa.Column('track', sa.Float(), nullable=True),
        sa.Column('acq_date', sa.String(length=32), nullable=True),
        sa.Column('acq_time', sa.String(length=16), nullable=True),
        sa.Column('satellite', sa.String(length=64), nullable=True),
        sa.Column('instrument', sa.String(length=64), nullable=True, server_default='VIIRS (375m)'),
        sa.Column('confidence', sa.String(length=32), nullable=True),
        sa.Column('version', sa.String(length=32), nullable=True, server_default='2.0NRT'),
        sa.Column('bright_t31', sa.Float(), nullable=True),
        sa.Column('frp', sa.Float(), nullable=True),
        sa.Column('daynight', sa.String(length=8), nullable=True, server_default='D'),
        sa.Column('source', sa.String(length=64), nullable=True, server_default='NASA FIRMS NRT'),
        sa.Column('received_at', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['thermal_events.event_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('obs_id')
    )
    op.create_index(op.f('ix_observations_obs_id'), 'observations', ['obs_id'], unique=False)
    op.create_index(op.f('ix_observations_event_id'), 'observations', ['event_id'], unique=False)
    op.create_index(op.f('ix_observations_latitude'), 'observations', ['latitude'], unique=False)
    op.create_index(op.f('ix_observations_longitude'), 'observations', ['longitude'], unique=False)
    op.create_index(op.f('ix_observations_acq_date'), 'observations', ['acq_date'], unique=False)
    op.create_index('idx_obs_datetime', 'observations', ['acq_date', 'acq_time'], unique=False)
    op.create_index('idx_obs_coords', 'observations', ['latitude', 'longitude'], unique=False)
    op.execute("CREATE INDEX IF NOT EXISTS idx_obs_geom ON observations USING GIST (geom);")


def downgrade() -> None:
    op.drop_table('observations')
    op.drop_table('thermal_events')
