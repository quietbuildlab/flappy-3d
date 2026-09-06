import { mount } from './mount'

export class FlappyElement extends HTMLElement {
  private session?: ReturnType<typeof mount>

  connectedCallback(): void {
    if (this.session) return
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = ':host { display:block; width:100%; height:100%; }'
    const root = document.createElement('div')
    shadow.replaceChildren(style, root)
    try {
      this.session = mount(root, {
        storageKey: 'pma:flappy:v1',
        onRoundEnded: (detail) => this.emit('pma-round-ended', detail),
      })
      this.emit('pma-ready')
    } catch (error) {
      shadow.replaceChildren()
      this.emit('pma-error', { message: error instanceof Error ? error.message : 'Unable to start Flappy.' })
    }
  }

  disconnectedCallback(): void {
    this.session?.dispose()
    this.session = undefined
    this.shadowRoot?.replaceChildren()
  }

  pause(): void { this.session?.pause() }

  private emit(name: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: { gameId: 'flappy', ...detail } }))
  }
}

if (!customElements.get('pma-flappy')) customElements.define('pma-flappy', FlappyElement)
