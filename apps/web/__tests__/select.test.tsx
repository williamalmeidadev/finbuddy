// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../src/components/ui/select"

describe("Select Component", () => {
  it("displays the item label instead of value when closed", () => {
    render(
      <Select value="CHECKING">
        <SelectTrigger>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CHECKING">Conta Corrente</SelectItem>
          <SelectItem value="SAVINGS">Conta Poupança</SelectItem>
        </SelectContent>
      </Select>
    )

    // Should display "Conta Corrente" and NOT "CHECKING"
    expect(screen.getByText("Conta Corrente")).toBeDefined()
    expect(screen.queryByText("CHECKING")).toBeNull()
  })

  it("displays item label for dynamic mapping when closed", () => {
    const categories = [
      { id: "cat-1", name: "Alimentação" },
      { id: "cat-2", name: "Moradia" },
    ]

    render(
      <Select value="cat-1">
        <SelectTrigger>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )

    expect(screen.getByText("Alimentação")).toBeDefined()
    expect(screen.queryByText("cat-1")).toBeNull()
  })
})
