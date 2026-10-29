// The learning app shows one section at a time, chosen by the URL hash; the landing page simply scrolls to it.
export function showSection(id: string) {
  if (window.location.hash === `#${id}`) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  else window.location.hash = id
}
