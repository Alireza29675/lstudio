import { Mod } from "./Mod";
import { GenericState } from "./types";

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
    
    if (mod.init) {
      this._state = mod.init(this.state)
    }
  }

  tick(data: C): void {
    const newState = this.getMod().update(this.state, data);
    
    if (newState === this.state) {
      throw new Error(`❗ [mod "${this.currentMod}"] The returned state must not be the same object as the input state.`)
    }

    this._state = newState
  }
}
