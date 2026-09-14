import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChatMessage } from "../src/components/ai/chat-message";

describe("ChatMessage Table Rendering", () => {
  it("Caso 1 - Tabela simples", () => {
    const markdown = `| Conta    |       Saldo |
| -------- | ----------: |
| Bradesco | R$ 1.500,00 |
| Itaú     | R$ 1.500,50 |`;

    const html = renderToString(React.createElement(ChatMessage, { role: "assistant", content: markdown }));

    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("Conta");
    expect(html).toContain("Saldo");
    expect(html).toContain("Bradesco");
    expect(html).toContain("R$ 1.500,00");
    expect(html).toContain("text-right");
  });

  it("Caso 2 - Markdown dentro da tabela", () => {
    const markdown = `| Categoria      |        Valor |
| -------------- | -----------: |
| **Alimentos**  | **R$ 40,90** |
| **Transporte** |     R$ 20,00 |`;

    const html = renderToString(React.createElement(ChatMessage, { role: "assistant", content: markdown }));

    expect(html).toContain("<table");
    expect(html).toContain("<strong");
    expect(html).toContain(">Alimentos</strong>");
    expect(html).toContain(">R$ 40,90</strong>");
    expect(html).toContain(">Transporte</strong>");
  });

  it("Caso 3 - Tabela junto com texto", () => {
    const markdown = `### Resumo Financeiro

**Despesas Totais:** R$ 40,90

| Conta    | Tipo     |       Saldo |
| -------- | -------- | ----------: |
| Bradesco | Corrente | R$ 1.500,00 |
| Itaú     | Corrente | R$ 1.500,50 |`;

    const html = renderToString(React.createElement(ChatMessage, { role: "assistant", content: markdown }));

    expect(html).toContain("<h3");
    expect(html).toContain("Resumo Financeiro");
    expect(html).toContain("<strong");
    expect(html).toContain("Despesas Totais:");
    expect(html).toContain("<table");
    expect(html).toContain("Bradesco");
  });

  it("Caso 4 - Tabela com caracteres escapados", () => {
    const markdown = `| Conta | Saldo |
|---|---:|
| Bradesco | R$ 1.500,00 |`;

    const html = renderToString(React.createElement(ChatMessage, { role: "assistant", content: markdown }));

    expect(html).toContain("<table");
    expect(html).toContain("Bradesco");
    expect(html).toContain("R$ 1.500,00");
  });
});
