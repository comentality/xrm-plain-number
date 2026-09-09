import * as React from "react";
import { Input } from "@fluentui/react-components";

export interface INumberFormatViewProps {
  text: string;
  disabled: boolean;
}

export const NumberFormatView: React.FC<INumberFormatViewProps> = ({ text, disabled }) => (
  <Input
    readOnly
    disabled={disabled}
    value={text}
    appearance="filled-lighter"
    style={{ width: "100%" }}
    data-testid="number-format-value"
  />
);
