import * as React from "react";
import { Input } from "@fluentui/react-components";
import { toText, parseText } from "./plainNumber";

export interface IPlainNumberViewProps {
  value: number | null;
  disabled: boolean;
  onCommit: (value: number | null) => void;
}

export const PlainNumberView: React.FC<IPlainNumberViewProps> = ({ value, disabled, onCommit }) => {
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

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={text}
      disabled={disabled}
      readOnly={disabled}
      appearance="filled-lighter"
      style={{ width: "100%" }}
      onChange={(_e, data) => setText(data.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setText(toText(value));
      }}
      data-testid="plain-number"
    />
  );
};
