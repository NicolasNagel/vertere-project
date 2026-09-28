"""add origem to atendimentos

Revision ID: d4a8f137c9b2
Revises: 5e4f2bb2b0e6
Create Date: 2026-09-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4a8f137c9b2"
down_revision: str | Sequence[str] | None = "5e4f2bb2b0e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("atendimentos", sa.Column("numero_origem", sa.String(50), nullable=True))
    op.add_column("atendimentos", sa.Column("protocolo_origem", sa.String(100), nullable=True))
    op.create_index(
        op.f("ix_atendimentos_protocolo_origem"),
        "atendimentos",
        ["protocolo_origem"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_atendimentos_protocolo_origem"), table_name="atendimentos")
    op.drop_column("atendimentos", "protocolo_origem")
    op.drop_column("atendimentos", "numero_origem")
