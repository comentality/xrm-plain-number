import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { PlainNumberView, IPlainNumberViewProps } from "./PlainNumberView";
import * as React from "react";

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
