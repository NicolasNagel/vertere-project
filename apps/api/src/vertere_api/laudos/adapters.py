import smtplib
from email.message import EmailMessage

from fpdf import FPDF

from vertere_api.laudos.domain import DadosLaudo
from vertere_api.settings import settings


class FpdfGeradorPdfLaudo:
    """Implementação real de `GeradorPdfLaudo` usando `fpdf2` (biblioteca pura Python)."""

    def gerar(self, dados: DadosLaudo) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, "Laudo - Laboratorio Vertere", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 8, f"Paciente: {dados.paciente_nome}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Clinica: {dados.clinica_nome}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(
            0, 8, f"Veterinario: {dados.veterinario_nome} (CRMV {dados.veterinario_crmv})",
            new_x="LMARGIN", new_y="NEXT",
        )
        pdf.cell(0, 8, f"Exame: {dados.exame_nome} ({dados.exame_categoria})", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(
            0, 8, f"Data do atendimento: {dados.data_atendimento:%d/%m/%Y %H:%M}",
            new_x="LMARGIN", new_y="NEXT",
        )
        pdf.ln(4)

        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Resultados", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 11)
        for campo in dados.campos:
            unidade = f" {campo.unidade}" if campo.unidade else ""
            faixa = f" (ref.: {campo.faixa_referencia})" if campo.faixa_referencia else ""
            pdf.cell(0, 7, f"{campo.nome}: {campo.valor}{unidade}{faixa}", new_x="LMARGIN", new_y="NEXT")

        return bytes(pdf.output())


class SmtpEnvioLaudoGateway:
    """Implementação real de `EnvioLaudoGateway` via SMTP (`smtplib`, biblioteca padrão)."""

    def enviar(
        self, destinatario: str, assunto: str, corpo: str, anexo_pdf: bytes, nome_anexo: str
    ) -> None:
        mensagem = EmailMessage()
        mensagem["From"] = settings.smtp_remetente
        mensagem["To"] = destinatario
        mensagem["Subject"] = assunto
        mensagem.set_content(corpo)
        mensagem.add_attachment(
            anexo_pdf, maintype="application", subtype="pdf", filename=nome_anexo
        )

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            if settings.smtp_usuario and settings.smtp_senha:
                smtp.starttls()
                smtp.login(settings.smtp_usuario, settings.smtp_senha)
            smtp.send_message(mensagem)
