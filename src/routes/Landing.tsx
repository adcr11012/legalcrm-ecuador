import { useState } from 'react'
import { Link } from 'react-router-dom'
import { VideoLogoModal } from '@/components/VideoLogoModal'

const FEATURES = [
  {
    n: '01',
    t: 'Casos y expedientes',
    d: 'Cada caso agrupa partes, documentos, plazos, tareas, comentarios internos e historial en un solo lugar. Vista de lista o Kanban por etapa, con filtros por urgencia y materia.',
  },
  {
    n: '02',
    t: 'Documentos en tu propio Drive',
    d: 'Los archivos se guardan en la cuenta de Google Drive del despacho, no en nuestros servidores. El despacho conserva la propiedad y el control total de sus documentos.',
  },
  {
    n: '03',
    t: 'Agenda, plazos y SATJE',
    d: 'Términos procesales sincronizados con Google Calendar, recordatorios escalonados por correo, y revisión automática de novedades judiciales en el Consejo de la Judicatura.',
  },
  {
    n: '04',
    t: 'Calculadoras legales',
    d: 'Liquidación laboral conforme al Código del Trabajo y contador de días hábiles COGEP con feriados y vacancia judicial — fórmulas fijas, no estimaciones de IA.',
  },
  {
    n: '05',
    t: 'Temis, asistente de IA',
    d: 'Responde sobre tus casos, clientes y plazos usando los datos reales de tu workspace, y puede leer el contenido de los documentos que subas.',
  },
  {
    n: '06',
    t: 'Roles y control de acceso',
    d: 'Administrador, Master y Limitado — cada despacho decide quién ve qué caso. Aislamiento total entre espacios de trabajo de distintos despachos.',
  },
]

const PLANES = [
  {
    nombre: 'Free',
    precio: '$0',
    periodo: '/mes',
    detalle: '1 usuario · 5 casos · 5 clientes',
    items: ['Documentos ilimitados', 'Calculadoras habilitadas', 'Temis · 100 consultas/mes', 'Búsqueda y Reportes'],
    cta: 'Empezar gratis',
    to: '/register',
    destacado: false,
  },
  {
    nombre: 'Pro',
    precio: '$29',
    periodo: '/mes',
    detalle: 'Incluye 3 usuarios · usuario adicional $7/mes',
    items: ['Casos y clientes ilimitados', 'SATJE automático', 'Temis · 400 consultas/mes', 'Soporte estándar'],
    cta: 'Consultar',
    to: '/register',
    destacado: true,
  },
  {
    nombre: 'Enterprise',
    precio: '$99',
    periodo: '/mes',
    detalle: 'Incluye 15 usuarios · usuario adicional $5/mes',
    items: ['Todo ilimitado', 'SATJE automático', 'Temis · 1500 consultas/mes', 'Soporte prioritario'],
    cta: 'Consultar',
    to: '/register',
    destacado: false,
  },
]

export default function Landing() {
  const [videoAbierto, setVideoAbierto] = useState(false)
  return (
    <div className="tx">
      <style>{CSS}</style>

      <header className="tx-nav">
        <div className="tx-shell tx-nav__inner">
          <div className="tx-nav__brand">
            <img src="/LOGO_1.png" alt="" className="tx-nav__mark tx-mark--claro" />
            <img src="/LOGO_2.png" alt="" className="tx-nav__mark tx-mark--oscuro" />
            <span>TSADOQ</span>
          </div>
          <nav className="tx-nav__links">
            <a href="#producto">Producto</a>
            <a href="#planes">Planes</a>
            <Link to="/login">Ingresar</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="tx-hero">
          <div className="tx-shell tx-hero__grid">
            <div>
              <p className="tx-eyebrow">Sistema de gestión legal · Ecuador</p>
              <h1 className="tx-hero__title">
                El expediente de tu despacho,<br />en orden.
              </h1>
              <p className="tx-hero__lede">
                Casos, clientes, plazos procesales y documentos en un solo sistema — con un asistente de
                inteligencia artificial que conoce tus datos, y una calculadora de términos que sabe contar
                días hábiles como los cuenta el COGEP.
              </p>
              <div className="tx-hero__cta">
                <Link to="/register" className="tx-btn tx-btn--primary">Crear cuenta gratis</Link>
                <a href="#producto" className="tx-btn tx-btn--ghost">Ver qué incluye</a>
              </div>
              <button onClick={() => setVideoAbierto(true)} className="tx-video-link">
                <i className="ti ti-player-play-filled" /> Ver video
              </button>
            </div>
            <div className="tx-hero__mark" aria-hidden="true">
              <div className="tx-scale">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </section>

        <section id="producto" className="tx-section">
          <div className="tx-shell">
            <p className="tx-eyebrow">Qué incluye</p>
            <h2 className="tx-section__title">Un sistema, no una colección de pestañas sueltas</h2>
            <div className="tx-grid">
              {FEATURES.map((f) => (
                <article key={f.n} className="tx-card">
                  <span className="tx-card__n">{f.n}</span>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="tx-section tx-section--dark">
          <div className="tx-shell tx-quote">
            <p className="tx-eyebrow">Sobre el nombre</p>
            <blockquote>
              "Temis" — la diosa griega del orden y la justicia — es quien responde tus preguntas.
              "Tsadoq" — el sacerdote hebreo conocido por su rectitud — le da nombre al sistema.
              Dos tradiciones, un mismo valor: la balanza en equilibrio.
            </blockquote>
          </div>
        </section>

        <section id="planes" className="tx-section">
          <div className="tx-shell">
            <p className="tx-eyebrow">Honorarios del servicio</p>
            <h2 className="tx-section__title">Planes según el tamaño de tu equipo</h2>
            <p className="tx-section__sub">
              Se cobra por usuarios, no por cantidad de casos — un despacho con más casos activos no debería
              pagar más solo por tener más trabajo.
            </p>
            <div className="tx-planes">
              {PLANES.map((p) => (
                <div key={p.nombre} className={`tx-plan ${p.destacado ? 'tx-plan--destacado' : ''}`}>
                  {p.destacado && <span className="tx-plan__badge">Más elegido</span>}
                  <h3>{p.nombre}</h3>
                  <div className="tx-plan__precio">
                    <span className="tx-plan__monto">{p.precio}</span>
                    <span className="tx-plan__periodo">{p.periodo}</span>
                  </div>
                  <p className="tx-plan__detalle">{p.detalle}</p>
                  <ul>
                    {p.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                  <Link to={p.to} className={`tx-btn ${p.destacado ? 'tx-btn--primary' : 'tx-btn--ghost'} tx-plan__cta`}>
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="tx-cta">
          <div className="tx-shell tx-cta__inner">
            <h2>Tu despacho merece un expediente que no se pierde.</h2>
            <Link to="/register" className="tx-btn tx-btn--primary tx-btn--lg">Crear cuenta gratis</Link>
          </div>
        </section>
      </main>

      <footer className="tx-footer">
        <div className="tx-shell tx-footer__inner">
          <div className="tx-footer__brand">
            <img src="/LOGO_1.png" alt="" className="tx-nav__mark tx-mark--claro" />
            <img src="/LOGO_2.png" alt="" className="tx-nav__mark tx-mark--oscuro" />
            <span>TSADOQ</span>
          </div>
          <div className="tx-footer__links">
            <Link to="/terminos">Términos y condiciones</Link>
            <Link to="/privacidad">Política de privacidad</Link>
            <Link to="/login">Ingresar</Link>
          </div>
        </div>
      </footer>
      <VideoLogoModal open={videoAbierto} onClose={() => setVideoAbierto(false)} src="/v_tsadoq_2.mp4" />
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Source+Sans+3:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

.tx {
  --tx-navy: #1B2E4C;
  --tx-navy-deep: #0F1A2E;
  --tx-gold: #A9803E;
  --tx-gold-bright: #C79A4E;
  --tx-paper: #EDEEF1;
  --tx-paper-alt: #E3E5EA;
  --tx-ink: #14213A;
  --tx-muted: #4B5568;
  --tx-border: rgba(20,33,58,0.14);
  --tx-surface: #FFFFFF;
  --tx-radius: 4px;
  font-family: var(--tx-font-body);
  background: var(--tx-paper);
  color: var(--tx-ink);
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
}
@media (prefers-color-scheme: dark) {
  .tx {
    --tx-navy: #0F1A2E;
    --tx-navy-deep: #08101f;
    --tx-gold: #D9B36C;
    --tx-gold-bright: #EACB8A;
    --tx-paper: #0F1A2E;
    --tx-paper-alt: #16233C;
    --tx-ink: #EDEEF1;
    --tx-muted: #A7B0C2;
    --tx-border: rgba(237,238,241,0.14);
    --tx-surface: #16233C;
  }
}
:root[data-theme="dark"] .tx {
  --tx-navy: #0F1A2E;
  --tx-navy-deep: #08101f;
  --tx-gold: #D9B36C;
  --tx-gold-bright: #EACB8A;
  --tx-paper: #0F1A2E;
  --tx-paper-alt: #16233C;
  --tx-ink: #EDEEF1;
  --tx-muted: #A7B0C2;
  --tx-border: rgba(237,238,241,0.14);
  --tx-surface: #16233C;
}
:root[data-theme="light"] .tx {
  --tx-navy: #1B2E4C;
  --tx-navy-deep: #0F1A2E;
  --tx-gold: #A9803E;
  --tx-gold-bright: #C79A4E;
  --tx-paper: #EDEEF1;
  --tx-paper-alt: #E3E5EA;
  --tx-ink: #14213A;
  --tx-muted: #4B5568;
  --tx-border: rgba(20,33,58,0.14);
  --tx-surface: #FFFFFF;
}

.tx { --tx-font-display: 'Fraunces', Georgia, serif; --tx-font-body: 'Source Sans 3', system-ui, sans-serif; --tx-font-mono: 'IBM Plex Mono', ui-monospace, monospace; }

.tx * { box-sizing: border-box; }
.tx h1, .tx h2, .tx h3 { font-family: var(--tx-font-display); text-wrap: balance; margin: 0; color: var(--tx-ink); }
.tx p { margin: 0; }
.tx a { color: inherit; text-decoration: none; }

.tx-shell { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

.tx-eyebrow {
  font-family: var(--tx-font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tx-gold);
  margin: 0 0 14px;
}

/* Nav */
.tx-nav { border-bottom: 1px solid var(--tx-border); background: var(--tx-paper); position: sticky; top: 0; z-index: 20; }
.tx-nav__inner { display: flex; align-items: center; justify-content: space-between; height: 68px; }
.tx-nav__brand { display: flex; align-items: center; gap: 10px; font-family: var(--tx-font-display); font-weight: 600; font-size: 19px; }
.tx-nav__mark { height: 26px; width: 26px; border-radius: 3px; object-fit: cover; }
.tx-mark--claro { display: block; }
.tx-mark--oscuro { display: none; }
@media (prefers-color-scheme: dark) { .tx-mark--claro { display: none; } .tx-mark--oscuro { display: block; } }
:root[data-theme="dark"] .tx-mark--claro { display: none; }
:root[data-theme="dark"] .tx-mark--oscuro { display: block; }
:root[data-theme="light"] .tx-mark--claro { display: block; }
:root[data-theme="light"] .tx-mark--oscuro { display: none; }
.tx-nav__links { display: flex; align-items: center; gap: 28px; font-size: 14px; }
.tx-nav__links a:hover { color: var(--tx-gold); }
.tx-nav__links a:last-child {
  padding: 8px 18px; border: 1px solid var(--tx-ink); border-radius: var(--tx-radius);
}

/* Hero */
.tx-hero { padding: 84px 0 96px; overflow: hidden; }
.tx-hero__grid { display: grid; grid-template-columns: 1.15fr 0.85fr; align-items: center; gap: 48px; }
.tx-hero__title { font-size: clamp(34px, 5vw, 54px); line-height: 1.08; font-weight: 600; letter-spacing: -0.01em; }
.tx-hero__lede { margin-top: 22px; max-width: 46ch; font-size: 17px; line-height: 1.6; color: var(--tx-muted); }
.tx-hero__cta { display: flex; gap: 14px; margin-top: 34px; flex-wrap: wrap; }
.tx-video-link { display: inline-flex; align-items: center; gap: 7px; margin-top: 18px; font-size: 13px; font-weight: 600; color: var(--tx-gold); }
.tx-video-link i { font-size: 12px; }
.tx-video-link:hover { text-decoration: underline; }

.tx-scale { position: relative; height: 260px; display: flex; align-items: center; justify-content: center; }
.tx-scale span {
  width: 108px; height: 108px; border-radius: 50%; background: var(--tx-navy);
  box-shadow: 0 12px 30px rgba(20,33,58,0.18);
}
:root[data-theme="dark"] .tx-scale span { background: var(--tx-gold); }
:root[data-theme="light"] .tx-scale span { background: var(--tx-navy); }
.tx-scale span:nth-child(1) { margin-right: -22px; opacity: 0.55; }
.tx-scale span:nth-child(3) { margin-left: -22px; opacity: 0.55; }
.tx-scale span:nth-child(2) { z-index: 1; background: var(--tx-gold); box-shadow: 0 16px 34px rgba(169,128,62,0.35); }

/* Buttons */
.tx-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 22px; border-radius: var(--tx-radius); font-size: 14px; font-weight: 600;
  transition: transform .15s ease, opacity .15s ease; border: 1px solid transparent;
}
.tx-btn:hover { transform: translateY(-1px); }
.tx-btn.tx-btn--primary { background: var(--tx-navy); color: #F3F1EA; }
@media (prefers-color-scheme: dark) { .tx-btn.tx-btn--primary { background: var(--tx-gold); color: var(--tx-navy-deep); } }
:root[data-theme="dark"] .tx-btn.tx-btn--primary { background: var(--tx-gold); color: var(--tx-navy-deep); }
:root[data-theme="light"] .tx-btn.tx-btn--primary { background: var(--tx-navy); color: #F3F1EA; }
.tx-btn.tx-btn--ghost { border-color: var(--tx-ink); color: var(--tx-ink); }
.tx-btn--lg { padding: 15px 30px; font-size: 15px; }

/* Sections */
.tx-section { padding: 88px 0; }
.tx-section__title { font-size: clamp(26px, 3.4vw, 36px); font-weight: 600; max-width: 22ch; }
.tx-section__sub { margin-top: 14px; max-width: 56ch; color: var(--tx-muted); font-size: 16px; line-height: 1.6; }

.tx-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 44px; background: var(--tx-border); border: 1px solid var(--tx-border); }
.tx-card { background: var(--tx-paper); padding: 30px 26px; }
.tx-card__n { font-family: var(--tx-font-mono); font-size: 12px; color: var(--tx-gold); letter-spacing: 0.08em; }
.tx-card h3 { font-size: 18px; margin-top: 14px; font-weight: 600; }
.tx-card p { margin-top: 10px; font-size: 14px; line-height: 1.6; color: var(--tx-muted); }

.tx-section--dark { background: var(--tx-navy); color: #F3F1EA; }
.tx-section--dark .tx-eyebrow { color: var(--tx-gold-bright); }
.tx-quote blockquote { margin: 0; font-family: var(--tx-font-display); font-size: clamp(22px, 3vw, 30px); line-height: 1.45; font-weight: 500; max-width: 46ch; text-wrap: balance; }

.tx-planes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 44px; }
.tx-plan { border: 1px solid var(--tx-border); border-radius: 6px; padding: 28px; background: var(--tx-surface); position: relative; display: flex; flex-direction: column; }
.tx-plan--destacado { border-color: var(--tx-gold); box-shadow: 0 0 0 1px var(--tx-gold); }
.tx-plan__badge { position: absolute; top: -12px; right: 22px; background: var(--tx-gold); color: var(--tx-navy-deep); font-family: var(--tx-font-mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; border-radius: 3px; }
.tx-plan h3 { font-size: 20px; font-weight: 600; }
.tx-plan__precio { display: flex; align-items: baseline; gap: 6px; margin-top: 14px; font-family: var(--tx-font-mono); }
.tx-plan__monto { font-size: 34px; font-weight: 600; font-variant-numeric: tabular-nums; }
.tx-plan__periodo { color: var(--tx-muted); font-size: 13px; }
.tx-plan__detalle { margin-top: 6px; font-size: 12.5px; color: var(--tx-muted); }
.tx-plan ul { list-style: none; margin: 20px 0 0; padding: 0; display: flex; flex-direction: column; gap: 9px; flex: 1; }
.tx-plan li { font-size: 13.5px; padding-left: 18px; position: relative; color: var(--tx-ink); }
.tx-plan li::before { content: '—'; position: absolute; left: 0; color: var(--tx-gold); }
.tx-plan__cta { margin-top: 24px; width: 100%; }

.tx-cta { background: var(--tx-navy-deep); padding: 90px 0; }
.tx-cta__inner { display: flex; flex-direction: column; align-items: flex-start; gap: 26px; }
.tx-cta h2 { color: #F3F1EA; font-size: clamp(26px, 3.6vw, 38px); max-width: 20ch; }

.tx-footer { border-top: 1px solid var(--tx-border); padding: 30px 0; }
.tx-footer__inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.tx-footer__brand { display: flex; align-items: center; gap: 9px; font-family: var(--tx-font-display); font-weight: 600; font-size: 15px; color: var(--tx-muted); }
.tx-footer__brand .tx-nav__mark { height: 20px; width: 20px; opacity: 0.85; }
.tx-footer__links { display: flex; gap: 22px; font-size: 13px; color: var(--tx-muted); }
.tx-footer__links a:hover { color: var(--tx-gold); }

@media (max-width: 860px) {
  .tx-hero__grid { grid-template-columns: 1fr; }
  .tx-hero__mark { order: -1; }
  .tx-grid { grid-template-columns: 1fr; }
  .tx-planes { grid-template-columns: 1fr; }
  .tx-nav__links a:not(:last-child) { display: none; }
}
`
