export function isControlTarget(event: Event): boolean {
  return event.composedPath().some((target) => target instanceof Element &&
    target.matches('button, input, textarea, select, a, [contenteditable]:not([contenteditable="false"]), dialog, [role="switch"]'))
}

export class InputManager {
  private controller = new AbortController()
  private flapCallbacks: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
    const { signal } = this.controller

    root.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === ' ' && !isControlTarget(e)) {
          e.preventDefault()
          this.triggerFlap()
        }
      },
      { signal },
    )

    canvas.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        if (!e.isPrimary) return
        this.triggerFlap()
      },
      { signal },
    )
  }

  onFlap(cb: () => void): void {
    this.flapCallbacks.push(cb)
  }

  destroy(): void {
    this.controller.abort()
    this.flapCallbacks = []
  }

  private triggerFlap(): void {
    for (const cb of this.flapCallbacks) {
      cb()
    }
  }
}
