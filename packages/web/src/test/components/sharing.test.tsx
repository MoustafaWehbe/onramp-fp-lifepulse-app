import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  GrantEditor,
  applyGrantRules,
  sharingSummary,
  type Grant,
} from "@/components/coaching/sharing";

const nothing: Grant = {
  shareHabits: false,
  shareProfile: false,
  editHabits: false,
};

describe("applyGrantRules", () => {
  it("drops edit permission when habits aren't shared", () => {
    expect(
      applyGrantRules({ ...nothing, editHabits: true }),
    ).toEqual(nothing);
  });

  it("keeps edit permission when habits are shared", () => {
    const grant = { ...nothing, shareHabits: true, editHabits: true };
    expect(applyGrantRules(grant)).toEqual(grant);
  });

  it("leaves the profile grant alone either way", () => {
    expect(
      applyGrantRules({ shareHabits: false, shareProfile: true, editHabits: true }),
    ).toEqual({ shareHabits: false, shareProfile: true, editHabits: false });
  });
});

describe("sharingSummary", () => {
  it("says nothing when nothing is granted", () => {
    expect(sharingSummary(nothing)).toBe("nothing");
  });

  it("calls out that habits are editable", () => {
    expect(
      sharingSummary({ shareHabits: true, shareProfile: false, editHabits: true }),
    ).toBe("habits (editable)");
  });

  it("lists both grants", () => {
    expect(
      sharingSummary({ shareHabits: true, shareProfile: true, editHabits: false }),
    ).toBe("habits, profile");
  });
});

function Harness({ initial }: { initial: Grant }) {
  const [grant, setGrant] = useState(initial);
  return <GrantEditor grant={grant} onChange={setGrant} />;
}

describe("GrantEditor", () => {
  const editToggle = () =>
    screen.getByRole("button", { name: /Let them adjust your habits/ });

  it("disables editing until habits are shared", () => {
    render(<Harness initial={nothing} />);
    expect(editToggle()).toBeDisabled();
  });

  it("enables editing once habits are shared", async () => {
    const user = userEvent.setup();
    render(<Harness initial={nothing} />);

    await user.click(screen.getByRole("button", { name: /Habits & progress/ }));

    expect(editToggle()).toBeEnabled();
  });

  it("turns editing off when habit sharing is withdrawn", async () => {
    const user = userEvent.setup();
    render(
      <Harness initial={{ shareHabits: true, shareProfile: false, editHabits: true }} />,
    );

    expect(editToggle()).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Habits & progress/ }));

    // The dependent permission goes with it rather than lingering as a grant
    // the API would reject on the next save.
    expect(editToggle()).toHaveAttribute("aria-pressed", "false");
    expect(editToggle()).toBeDisabled();
  });

  it("reports each change to its owner", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GrantEditor grant={nothing} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Profile & goals/ }));

    expect(onChange).toHaveBeenCalledWith({ ...nothing, shareProfile: true });
  });
});
