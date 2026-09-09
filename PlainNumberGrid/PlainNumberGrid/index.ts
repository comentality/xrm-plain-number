/* eslint-disable react/prop-types -- cell renderers are callbacks, not components */
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { PAOneGridCustomizer, CellRendererProps } from "./types";
import * as React from "react";

/**
 * Power Apps grid customizer. Assign it to a table's Power Apps grid control
 * (table > Controls > Power Apps grid control > Customizer control). Every
 * whole-number cell in that table's grids renders without a thousands
 * separator. No settings, no network calls.
 */
export class PlainNumberGrid implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  public init(context: ComponentFramework.Context<IInputs>): void {
    const eventName = context.parameters.EventName.raw;
    if (!eventName) return;
    const customizer: PAOneGridCustomizer = {
      cellRendererOverrides: {
        Integer: (props: CellRendererProps) =>
          React.createElement(
            "span",
            { "data-testid": "plain-number-cell", style: { display: "block", textAlign: props.isRightAligned ? "right" : "left" } },
            toText(props.value),
          ),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (context as any).factory.fireEvent(eventName, customizer);
  }

  public updateView(): React.ReactElement {
    return React.createElement(React.Fragment);
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    // Nothing to clean up.
  }
}

/** Whole number to text with no digit grouping. */
function toText(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value).toString() : "";
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d-]/g, ""));
    return value.trim() !== "" && Number.isFinite(n) ? Math.trunc(n).toString() : value;
  }
  return "";
}
