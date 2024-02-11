import { FPSClock, FPSClockPayloadType } from "@lstudio/clocks";

export const clock = new FPSClock(60)
export type ClockPayloadType = FPSClockPayloadType
