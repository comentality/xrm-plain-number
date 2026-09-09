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
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
const entityOf = (context: ComponentFramework.Context<IInputs>): string | undefined => (context.mode as any)?.contextInfo?.entityTypeName as string | undefined;

interface ICellProps {
  columns: PlainColumns;
  entity?: string;
  column?: string;
  value: unknown;
  formatted?: string;
  right?: boolean;
}

/**
 * Used only while the column list is still loading on the very first grid of
 * a session: shows the platform's formatted text, then repaints itself plain
 * if the column turns out to be one of ours.
 */
const PendingCell: React.FC<ICellProps> = ({ columns, entity, column, value, formatted, right }) => {
  const [ready, setReady] = React.useState(columns.ready);
  React.useEffect(() => {
    if (ready) return;
    let alive = true;
    void columns.whenReady().then(() => { if (alive) setReady(true); return undefined; });
    return () => { alive = false; };
  }, [columns, ready]);
  const plain = ready && columns.has(entity, column);
  return React.createElement(
    "span",
    { "data-testid": plain ? "plain-number-cell" : undefined, style: { display: "block", textAlign: right ? "right" : "left" } },
    plain ? toText(value) : (formatted ?? toText(value)),
  );
};

export class PlainNumberGrid implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  public init(context: ComponentFramework.Context<IInputs>): void {
    const eventName = context.parameters.EventName.raw;
    if (!eventName) return;

    const columns = new PlainColumns(context.webAPI);
    void columns.refresh();

    const customizer: PAOneGridCustomizer = {
      cellRendererOverrides: {
        Integer: (props: CellRendererProps, params: GetRendererParams) => {
          const column = params.colDefs[params.columnIndex]?.name;
          const entity = entityOf(context);
          if (columns.ready) {
            if (!columns.has(entity, column)) return null; // stock renderer
            return React.createElement(
              "span",
              { "data-testid": "plain-number-cell", style: { display: "block", textAlign: props.isRightAligned ? "right" : "left" } },
              toText(props.value),
            );
          }
          return React.createElement(PendingCell, {
            columns, entity, column, value: props.value, formatted: props.formattedValue, right: props.isRightAligned,
          });
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
