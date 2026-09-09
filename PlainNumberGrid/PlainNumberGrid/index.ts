/* eslint-disable react/prop-types -- cell renderers are callbacks, not components */
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";

/**
 * Plain Number Grid: a Power Apps grid customizer. Assign it to a table's
 * Power Apps grid control (table > Controls > Power Apps grid control >
 * Customizer control). Every whole-number cell in that table's grids renders
 * without a thousands separator. No settings, no network calls.
 *
 * This file and ControlManifest.Input.xml are the whole control; everything
 * else in the folder is what `pac pcf init` generates.
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

// The slice of the grid customizer contract this control uses. Shapes follow
// https://learn.microsoft.com/en-us/power-apps/developer/component-framework/customize-editable-grid-control

interface CellRendererProps {
  /** Raw value of the cell. */
  readonly value: unknown;
  /** Formatted value the stock renderer would show. */
  readonly formattedValue?: string;
  /** True when the cell should be right aligned. */
  readonly isRightAligned?: boolean;
}

interface GetRendererParams {
  readonly colDefs: { readonly name: string; readonly dataType: string }[];
  readonly columnIndex: number;
}

type CellRenderer = (props: CellRendererProps, params: GetRendererParams) => React.ReactElement | null | undefined;

/** Object handed to the grid through factory.fireEvent(eventName, ...). */
interface PAOneGridCustomizer {
  cellRendererOverrides?: Partial<Record<"Integer", CellRenderer>>;
}
