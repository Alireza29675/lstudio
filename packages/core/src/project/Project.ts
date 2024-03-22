import cloneDeepWith from "lodash/cloneDeepWith";
import { Mod } from "./Mod";
import { GenericState } from "./types";
import { Color } from "../utils/Color";

function cloneState<S extends GenericState>(state: S): S {
  // cloneDeepWith is used to clone the state object and keep the Color instances as they are
  return cloneDeepWith(state, (val) => {
      if (val instanceof Color) return val;
  });
}

export class Project<C, S extends GenericState, ModList extends string = ''> {
  private currentMod?: ModList

  constructor(
    private _state: S,
    readonly mods: Record<ModList, Mod<C, S>>
  ) {
    const modNames = Object.keys(mods);
    
    if (!modNames.length) {
      console.warn('You must have at least one mod for this project.');
    }

    this.setMod(modNames[0] as ModList)
  }

  public get state(): S {
    return this._state
  }

  getMod(): Mod<C, S> {
    if (!this.mods[this.currentMod || '' as ModList]) {
      throw new Error('You should define at least one mod for your project')
    }

    return this.mods[this.currentMod as ModList]
  }

  setMod(name: ModList) {
    if (name === this.currentMod) return;
    
    this.currentMod = name;
    const mod = this.getMod()
    mod.setInitialState(cloneState(this._state))
    
    if (mod.init) {
      mod.init()
      this._state = cloneState(mod.state)
    }
  }

  tick(clockData: C): void {
    const mod = this.getMod()

    mod.update(clockData)

    this._state = cloneState(mod.state)
  }
}
