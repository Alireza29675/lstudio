import { Clock } from "./Clock";
import { Project } from "./project";
import { GenericState } from "./project/types";

export abstract class Ouput<C, S extends GenericState> {
  constructor(
    readonly project: Project<C, S, string>,
    readonly clock: Clock<C>
  ) {
    this.clock.subscribe((data) => {
      this.project.tick(data)
      this.render(this.project.state)
    })
  }

  abstract render(state: S): void
}