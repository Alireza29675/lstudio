import { IControlsAPI } from "./IControlsAPI";
import { IOutputAPI } from "./IOutputAPI";
import { ISettingsAPI } from "./ISettingsAPI";

export class LStudioClientAPI {
  constructor(
    public readonly controls: IControlsAPI,
    public readonly output: IOutputAPI,
    public readonly settings: ISettingsAPI
  ) {}
}
