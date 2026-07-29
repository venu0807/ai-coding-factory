import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/lib/AuthContext";
import Navbar from "../src/components/Navbar";

describe("Navbar", () => {
  it("renders brand name", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("AI Coding Factory")).toBeDefined();
  });

  it("shows loading state initially", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Loading...")).toBeDefined();
  });
});
