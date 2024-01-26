type ClockSubscribeFn<C> = (data: C) => void
type UnsubscribeFn = () => void

export abstract class Clock<C> {
  private subscribers: ClockSubscribeFn<C>[] = []

  public subscribe(fn: ClockSubscribeFn<C>): UnsubscribeFn {
    this.subscribers.push(fn)

    // unsubscribe
    return () => this.subscribers.splice(this.subscribers.indexOf(fn), 1)
  }

  protected tick(data: C) {
    this.subscribers.forEach(fn => fn(data))
  }
}
