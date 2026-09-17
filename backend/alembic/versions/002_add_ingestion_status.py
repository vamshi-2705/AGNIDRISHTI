"""add_ingestion_status_table

Revision ID: 002_ingestion_status
Revises: 001_postgis
Create Date: 2026-09-17 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_ingestion_status'
down_revision: Union[str, None] = '001_postgis'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ingestion_status',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='IDLE'),
        sa.Column('last_attempt_utc', sa.String(length=64), nullable=True),
        sa.Column('last_success_utc', sa.String(length=64), nullable=True),
        sa.Column('latest_observation_utc', sa.String(length=64), nullable=True),
        sa.Column('records_fetched', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('observations_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('events_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duration_seconds', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('sync_metadata', sa.JSON(), nullable=True),
        sa.Column('processed_data', sa.JSON(), nullable=True),
        sa.Column('updated_at', sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('ingestion_status')
