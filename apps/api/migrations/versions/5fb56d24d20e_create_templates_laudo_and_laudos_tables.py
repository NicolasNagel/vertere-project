"""create templates_laudo and laudos tables

Revision ID: 5fb56d24d20e
Revises: b4e3cf8d7186
Create Date: 2026-09-20 19:43:32.997188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5fb56d24d20e'
down_revision: Union[str, Sequence[str], None] = 'b4e3cf8d7186'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('templates_laudo',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('categoria', sa.String(length=100), nullable=False),
    sa.Column('campos', sa.JSON(), nullable=False),
    sa.Column('ativo', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('laudos',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('atendimento_id', sa.String(length=36), nullable=False),
    sa.Column('exame_id', sa.String(length=36), nullable=False),
    sa.Column('template_id', sa.String(length=36), nullable=False),
    sa.Column('valores', sa.JSON(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('criado_por', sa.String(length=36), nullable=False),
    sa.Column('criado_em', sa.DateTime(), nullable=False),
    sa.Column('finalizado_por', sa.String(length=36), nullable=True),
    sa.Column('finalizado_em', sa.DateTime(), nullable=True),
    sa.Column('enviado_em', sa.DateTime(), nullable=True),
    sa.Column('erro_envio', sa.String(length=500), nullable=True),
    sa.ForeignKeyConstraint(['atendimento_id'], ['atendimentos.id'], ),
    sa.ForeignKeyConstraint(['exame_id'], ['exames.id'], ),
    sa.ForeignKeyConstraint(['template_id'], ['templates_laudo.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('laudos')
    op.drop_table('templates_laudo')
    # ### end Alembic commands ###
