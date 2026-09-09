// The slice of the Power Apps grid customizer contract this control uses.
// Shapes follow the documented interface at
// https://learn.microsoft.com/en-us/power-apps/developer/component-framework/customize-editable-grid-control
import * as React from "react";

/** Data types the grid names in cell renderer overrides; only the one we override is listed. */
export type ColumnDataType = "Integer";

export interface CellRendererProps {
  /** Raw value of the cell. */
  readonly value: unknown;
  /** Formatted value the stock renderer would show. */
  readonly formattedValue?: string;
  /** True when the cell should be right aligned. */
  readonly isRightAligned?: boolean;
  /** Cell column data type. */
  readonly columnDataType?: string;
}

export interface ColumnDefinition {
  readonly name: string;
  readonly displayName?: string;
  readonly dataType: string;
  readonly isPrimary: boolean;
}

export interface GetRendererParams {
  readonly colDefs: ColumnDefinition[];
  readonly columnIndex: number;
}

export type CellRenderer = (props: CellRendererProps, params: GetRendererParams) => React.ReactElement | null | undefined;

export type CellRendererOverrides = Partial<Record<ColumnDataType, CellRenderer>>;

/** Object handed to the grid through factory.fireEvent(eventName, ...). */
export interface PAOneGridCustomizer {
  cellRendererOverrides?: CellRendererOverrides;
}
