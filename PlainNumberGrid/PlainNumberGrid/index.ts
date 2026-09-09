/* eslint-disable react/prop-types -- cell renderers are callbacks, not components */
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { PAOneGridCustomizer, CellRendererProps, GetRendererParams } from "./types";
import { PlainColumns, toText } from "./plainColumns";
import * as React from "react";

/**
 * Power Apps grid customizer. Assign it to a table's Power Apps grid control
 * (table > Controls > Power Apps grid control > Customizer control). Whole
 * number cells on columns that carry Plain Number on one of the table's main
 * forms render without a thousands separator; every other cell falls back to
 * the stock renderer.
 */
export class PlainNumberGrid implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  public init(context: ComponentFramework.Context<IInputs>): void {
    const eventName = context.parameters.EventName.raw;
    if (!eventName) return;

    const columns = new PlainColumns(context.webAPI);
    void columns.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const entity = (): string | undefined => (context.mode as any)?.contextInfo?.entityTypeName as string | undefined;

    const customizer: PAOneGridCustomizer = {
      cellRendererOverrides: {
        Integer: (props: CellRendererProps, params: GetRendererParams) => {
          const col = params.colDefs[params.columnIndex]?.name;
          if (!columns.has(entity(), col)) return null;
          return React.createElement(
            "span",
            { "data-testid": "plain-number-cell", style: { display: "block", textAlign: props.isRightAligned ? "right" : "left" } },
            toText(props.value),
          );
        },
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
