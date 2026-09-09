import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { Input } from "@fluentui/react-components";
import * as React from "react";

/**
 * Plain Number: shows and edits a Whole Number column without a thousands
 * separator. For years: 2024, not 2,024. No settings.
 *
 * This file and ControlManifest.Input.xml are the whole control; everything
 * else in the folder is what `pac pcf init` generates.
 */
export class PlainNumber implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  private notifyOutputChanged: () => void;
  private value: number | null = null;

  public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void): void {
    this.notifyOutputChanged = notifyOutputChanged;
    this.value = context.parameters.value.raw;
  }

  public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
    this.value = context.parameters.value.raw;
    const props: IPlainNumberViewProps = {
      value: this.value,
      disabled: context.mode.isControlDisabled,
      onCommit: (v) => {
        this.value = v;
        this.notifyOutputChanged();
      },
    };
    return React.createElement(PlainNumberView, props);
  }

  public getOutputs(): IOutputs {
    return { value: this.value ?? undefined };
  }

  public destroy(): void {
    // Nothing to clean up.
  }
}

interface IPlainNumberViewProps {
  value: number | null;
  disabled: boolean;
  onCommit: (value: number | null) => void;
}

const PlainNumberView: React.FC<IPlainNumberViewProps> = ({ value, disabled, onCommit }) => {
  const [text, setText] = React.useState<string>(toText(value));
  const [focused, setFocused] = React.useState(false);

  // Follow the platform value unless the user is mid-edit.
  React.useEffect(() => {
    if (!focused) setText(toText(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseText(text);
    if (parsed === undefined) {
      setText(toText(value));
      return;
    }
    setText(toText(parsed));
    if (parsed !== value) onCommit(parsed);
  };

  return React.createElement(Input, {
    type: "text",
    inputMode: "numeric",
    value: text,
    disabled,
    readOnly: disabled,
    appearance: "filled-lighter",
    style: { width: "100%" },
    onChange: (_e, data) => setText(data.value),
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      commit();
    },
    onKeyDown: (e) => {
      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      if (e.key === "Escape") setText(toText(value));
    },
    "data-testid": "plain-number",
  } as React.ComponentProps<typeof Input>);
};

/** Whole number to text with no digit grouping. Null and NaN become "". */
function toText(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return Math.trunc(value).toString();
}

/**
 * Text typed by a user to a whole number. Keeps the digits and a leading
 * minus, drops everything else (spaces, separators, letters). Empty or
 * digitless text is null. Returns undefined when nothing usable is left but
 * something was typed, so the caller can revert instead of clearing.
 */
function parseText(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const negative = trimmed.startsWith("-");
  const digits = trimmed.replace(/\D/g, "");
  if (digits === "") return undefined;
  const n = Number.parseInt(digits, 10);
  return negative ? -n : n;
}
