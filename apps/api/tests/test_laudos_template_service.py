import pytest

from vertere_api.laudos.domain import CampoTemplate, TemplateLaudo
from vertere_api.laudos.service import (
    TemplateLaudoNaoEncontrado,
    cadastrar_template_laudo,
    editar_template_laudo,
    inativar_template_laudo,
    listar_templates_laudo,
    reativar_template_laudo,
)


class TemplateLaudoRepositorioFake:
    def __init__(self, templates: list[TemplateLaudo] | None = None) -> None:
        self._por_id = {t.id: t for t in (templates or [])}

    def buscar_por_id(self, template_id: str) -> TemplateLaudo | None:
        return self._por_id.get(template_id)

    def listar_todas(self) -> list[TemplateLaudo]:
        return list(self._por_id.values())

    def salvar(self, template: TemplateLaudo) -> None:
        self._por_id[template.id] = template


def _campos() -> list[CampoTemplate]:
    return [
        CampoTemplate(nome="Hemácias", unidade="milhões/µL", faixa_referencia="5.5 – 8.5"),
        CampoTemplate(nome="Leucócitos", unidade="/µL", faixa_referencia="6000 – 17000"),
    ]


class TestCadastrarTemplateLaudo:
    def test_cadastra_template_com_campos(self) -> None:
        repo = TemplateLaudoRepositorioFake()

        template = cadastrar_template_laudo("Hematologia", _campos(), repo)

        assert template.categoria == "Hematologia"
        assert len(template.campos) == 2
        assert template.ativo is True
        assert repo.buscar_por_id(template.id) == template


class TestEditarTemplateLaudo:
    def test_edita_template_existente(self) -> None:
        template = TemplateLaudo(id="tpl-1", categoria="Hematologia", campos=_campos(), ativo=True)
        repo = TemplateLaudoRepositorioFake([template])
        novos_campos = [CampoTemplate(nome="Plaquetas", unidade="/µL", faixa_referencia="200000 – 500000")]

        atualizado = editar_template_laudo("tpl-1", "Hematologia", novos_campos, repo)

        assert atualizado.campos == novos_campos

    def test_editar_template_inexistente_levanta_erro(self) -> None:
        repo = TemplateLaudoRepositorioFake()

        with pytest.raises(TemplateLaudoNaoEncontrado):
            editar_template_laudo("inexistente", "X", [], repo)


class TestInativarReativarTemplateLaudo:
    def test_inativa_template(self) -> None:
        template = TemplateLaudo(id="tpl-1", categoria="Hematologia", campos=_campos(), ativo=True)
        repo = TemplateLaudoRepositorioFake([template])

        inativado = inativar_template_laudo("tpl-1", repo)

        assert inativado.ativo is False

    def test_reativa_template(self) -> None:
        template = TemplateLaudo(id="tpl-1", categoria="Hematologia", campos=_campos(), ativo=False)
        repo = TemplateLaudoRepositorioFake([template])

        reativado = reativar_template_laudo("tpl-1", repo)

        assert reativado.ativo is True

    def test_inativar_template_inexistente_levanta_erro(self) -> None:
        repo = TemplateLaudoRepositorioFake()

        with pytest.raises(TemplateLaudoNaoEncontrado):
            inativar_template_laudo("inexistente", repo)


class TestListarTemplatesLaudo:
    def _repo(self) -> TemplateLaudoRepositorioFake:
        return TemplateLaudoRepositorioFake(
            [
                TemplateLaudo(id="tpl-1", categoria="Hematologia", campos=_campos(), ativo=True),
                TemplateLaudo(id="tpl-2", categoria="Bioquímica", campos=[], ativo=False),
                TemplateLaudo(id="tpl-3", categoria="Hematologia", campos=[], ativo=True),
            ]
        )

    def test_lista_todos(self) -> None:
        assert len(listar_templates_laudo(self._repo())) == 3

    def test_lista_filtrando_categoria(self) -> None:
        resultado = listar_templates_laudo(self._repo(), categoria="Hematologia")

        assert {t.id for t in resultado} == {"tpl-1", "tpl-3"}

    def test_lista_filtrando_apenas_ativos(self) -> None:
        resultado = listar_templates_laudo(self._repo(), apenas_ativos=True)

        assert {t.id for t in resultado} == {"tpl-1", "tpl-3"}
