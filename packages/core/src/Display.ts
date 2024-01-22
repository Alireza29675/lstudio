import { Clock } from "./Clock";
import { Project } from "./project";

export abstract class Display<ClockData = null> {
  constructor(
    readonly project: Project<ClockData>,
    readonly clock: Clock<ClockData>
  ) {
    this.clock.subscribe(this.project.tick)
  }
}