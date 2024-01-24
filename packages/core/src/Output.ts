import { Clock } from "./Clock";
import { Project } from "./project";

export abstract class Ouput<ClockData = unknown> {
  constructor(
    readonly project: Project<ClockData, string>,
    readonly clock: Clock<ClockData>
  ) {
    this.clock.subscribe((data) => this.project.tick(data))
  }
}