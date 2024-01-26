import { GenericState } from "./types";

export abstract class Mod<C, S extends GenericState> {
  abstract init?(state: S): S
  abstract update(state: S, clockData: C): S
}
