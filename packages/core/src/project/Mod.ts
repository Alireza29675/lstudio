import { GenericState } from "./types";

export abstract class Mod<C, S extends GenericState> {
  state: S = {} as S
  abstract init?(): void
  abstract update(clockData: C): void
  abstract setInitialState(state: S): void
}
