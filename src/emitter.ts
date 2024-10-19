export class Emitter {
  #listeners: Map<string | symbol, Set<Function>> = new Map()

  on(tag: string | symbol, listener: Function) {
    const listeners = this.#listeners.get(tag) || new Set()
    listeners.add(listener)
    this.#listeners.set(tag, listeners)
  }

  async emit(tag: string | symbol, data: unknown) {
    const listeners = this.#listeners.get(tag)

    if (!listeners) {
      return
    }

    for (const listener of listeners) {
      await listener(data)
    }
  }

  has(tag: string | symbol) {
    return this.#listeners.has(tag)
  }

  clear() {
    this.#listeners.clear()
  }
}
