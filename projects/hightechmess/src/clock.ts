import { FPSClock, FPSClockPayloadType } from "@lstudio/clocks";

export const clock = new FPSClock(30)
export type ClockPayload = FPSClockPayloadType
