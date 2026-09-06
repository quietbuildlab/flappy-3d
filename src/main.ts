import { mount } from './mount'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
declare global {
  interface Window { deferredInstallPrompt?: BeforeInstallPromptEvent }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.deferredInstallPrompt = e as BeforeInstallPromptEvent
})
const root = document.createElement('div')
root.style.cssText = 'height:100dvh;width:100%;'
document.body.style.cssText = 'margin:0;overflow:hidden;background:#000'
document.body.replaceChildren(root)
try {
  mount(root, { standalone: true })
  root.focus({ preventScroll: true })
} catch (error) {
  root.textContent = error instanceof Error ? error.message : 'Unable to start Flappy.'
}
