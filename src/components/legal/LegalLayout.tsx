import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function LegalLayout({ eyebrow, titulo, children }: { eyebrow: string; titulo: string; children: ReactNode }) {
  return (
    <div className="txl">
      <style>{CSS}</style>
      <header className="txl-nav">
        <div className="txl-shell txl-nav__inner">
          <Link to="/" className="txl-nav__brand">
            <img src="/LOGO_1.png" alt="" className="txl-mark txl-mark--claro" />
            <img src="/LOGO_2.png" alt="" className="txl-mark txl-mark--oscuro" />
            <span>TSADOQ</span>
          </Link>
          <nav className="txl-nav__links">
            <Link to="/terminos">Términos</Link>
            <Link to="/privacidad">Privacidad</Link>
            <Link to="/login">Ingresar</Link>
          </nav>
        </div>
      </header>

      <main className="txl-shell txl-main">
        <p className="txl-eyebrow">{eyebrow}</p>
        <h1>{titulo}</h1>
        <div className="txl-banner">
          Este documento está en revisión legal — algunos datos (razón social, RUC, correo oficial) todavía
          no están completos y el texto puede cambiar antes de su versión definitiva.
        </div>
        <div className="txl-body">{children}</div>
      </main>

      <footer className="txl-footer">
        <div className="txl-shell txl-footer__inner">
          <span>TSADOQ</span>
          <div className="txl-footer__links">
            <Link to="/terminos">Términos y condiciones</Link>
            <Link to="/privacidad">Política de privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Source+Sans+3:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

.txl {
  --tx-navy: #1B2E4C; --tx-gold: #A9803E; --tx-paper: #EDEEF1; --tx-paper-alt: #E3E5EA;
  --tx-ink: #14213A; --tx-muted: #4B5568; --tx-border: rgba(20,33,58,0.16); --tx-surface: #FFFFFF;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  background: var(--tx-paper); color: var(--tx-ink); height: 100vh; height: 100dvh; overflow-y: auto; display: flex; flex-direction: column;
}
@media (prefers-color-scheme: dark) {
  .txl { --tx-navy: #0F1A2E; --tx-gold: #D9B36C; --tx-paper: #0F1A2E; --tx-paper-alt: #16233C; --tx-ink: #EDEEF1; --tx-muted: #A7B0C2; --tx-border: rgba(237,238,241,0.14); --tx-surface: #16233C; }
}
:root[data-theme="dark"] .txl { --tx-navy: #0F1A2E; --tx-gold: #D9B36C; --tx-paper: #0F1A2E; --tx-paper-alt: #16233C; --tx-ink: #EDEEF1; --tx-muted: #A7B0C2; --tx-border: rgba(237,238,241,0.14); --tx-surface: #16233C; }
:root[data-theme="light"] .txl { --tx-navy: #1B2E4C; --tx-gold: #A9803E; --tx-paper: #EDEEF1; --tx-paper-alt: #E3E5EA; --tx-ink: #14213A; --tx-muted: #4B5568; --tx-border: rgba(20,33,58,0.16); --tx-surface: #FFFFFF; }

.txl * { box-sizing: border-box; }
.txl a { color: inherit; text-decoration: none; }
.txl-shell { max-width: 760px; margin: 0 auto; padding: 0 24px; width: 100%; }

.txl-nav { border-bottom: 1px solid var(--tx-border); }
.txl-nav__inner { display: flex; align-items: center; justify-content: space-between; height: 64px; max-width: 900px; }
.txl-nav__brand { display: flex; align-items: center; gap: 9px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 17px; }
.txl-mark { height: 24px; width: 24px; border-radius: 3px; }
.txl-mark--claro { display: block; }
.txl-mark--oscuro { display: none; }
@media (prefers-color-scheme: dark) { .txl-mark--claro { display: none; } .txl-mark--oscuro { display: block; } }
:root[data-theme="dark"] .txl-mark--claro { display: none; }
:root[data-theme="dark"] .txl-mark--oscuro { display: block; }
:root[data-theme="light"] .txl-mark--claro { display: block; }
:root[data-theme="light"] .txl-mark--oscuro { display: none; }
.txl-nav__links { display: flex; gap: 22px; font-size: 13.5px; color: var(--tx-muted); }
.txl-nav__links a:hover { color: var(--tx-gold); }

.txl-main { flex: 1; padding: 56px 24px 80px; }
.txl-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--tx-gold); margin: 0 0 10px; }
.txl-main h1 { font-family: 'Fraunces', serif; font-weight: 700; font-size: clamp(26px, 4vw, 36px); line-height: 1.15; margin: 0 0 24px; text-wrap: balance; }

.txl-banner { border: 1px solid var(--tx-gold); background: var(--tx-paper-alt); border-radius: 5px; padding: 14px 16px; font-size: 13px; line-height: 1.5; color: var(--tx-muted); margin-bottom: 40px; }

.txl-body { font-size: 15px; line-height: 1.75; color: var(--tx-ink); }
.txl-body h2 { font-family: 'Fraunces', serif; font-size: 21px; font-weight: 600; margin: 44px 0 14px; padding-top: 20px; border-top: 1px solid var(--tx-border); }
.txl-body h2:first-child { margin-top: 0; padding-top: 0; border-top: none; }
.txl-body h3 { font-size: 15.5px; font-weight: 700; margin: 22px 0 8px; }
.txl-body p { margin: 0 0 14px; color: var(--tx-ink); }
.txl-body ul, .txl-body ol { margin: 0 0 14px; padding-left: 22px; display: flex; flex-direction: column; gap: 6px; }
.txl-body strong { font-weight: 700; }
.txl-body table { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 13.5px; }
.txl-body th, .txl-body td { border: 1px solid var(--tx-border); padding: 8px 10px; text-align: left; vertical-align: top; }
.txl-body th { background: var(--tx-paper-alt); font-family: 'IBM Plex Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.txl-body blockquote { margin: 0 0 14px; padding-left: 16px; border-left: 2px solid var(--tx-gold); color: var(--tx-muted); font-size: 13.5px; }
.txl-body table + p, .txl-body ul + p { margin-top: 10px; }
.txl-placeholder { color: var(--tx-gold); font-style: italic; }

.txl-footer { border-top: 1px solid var(--tx-border); padding: 24px 0; }
.txl-footer__inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; font-size: 12.5px; color: var(--tx-muted); max-width: 900px; }
.txl-footer__links { display: flex; gap: 18px; }
.txl-footer__links a:hover { color: var(--tx-gold); }
`
