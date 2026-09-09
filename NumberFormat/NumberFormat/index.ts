import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { NumberFormatView, INumberFormatViewProps } from "./NumberFormatView";
import { formatWholeNumber, FormatSpec } from "./format";
import * as React from "react";

export class NumberFormat implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  public init(): void {
    // Nothing to initialise; everything is derived in updateView.
  }

  public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
    const spec = resolveSpec(context);
    const props: INumberFormatViewProps = {
      text: formatWholeNumber(context.parameters.value.raw, spec),
      disabled: context.mode.isControlDisabled,
    };
    return React.createElement(NumberFormatView, props);
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    // Nothing to clean up.
  }
}

function resolveSpec(context: ComponentFramework.Context<IInputs>): FormatSpec {
  const info = context.userSettings.numberFormattingInfo;
  const userSizes = info?.numberGroupSizes?.length ? info.numberGroupSizes : [3];
  const mode = context.parameters.separatorMode.raw ?? "user";
  switch (mode) {
    case "none":
      return { separator: "", groupSizes: userSizes };
    case "custom":
      return { separator: context.parameters.groupSeparator.raw ?? "", groupSizes: userSizes };
    default:
      return { separator: info?.numberGroupSeparator ?? ",", groupSizes: userSizes };
  }
}
