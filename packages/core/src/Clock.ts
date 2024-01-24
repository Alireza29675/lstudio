type ClockSubscribeFn<T> = (data: T) => void
type UnsubscribeFn = () => void

export abstract class Clock<T> {
  private subscribers: ClockSubscribeFn<T>[] = []

  public subscribe(fn: ClockSubscribeFn<T>): UnsubscribeFn {
    this.subscribers.push(fn)

    // unsubscribe
    return () => this.subscribers.splice(this.subscribers.indexOf(fn), 1)
  }

  protected tick(data: T) {
    this.subscribers.forEach(fn => fn(data))
  }
}
