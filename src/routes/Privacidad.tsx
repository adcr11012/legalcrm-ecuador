import { LegalLayout } from '@/components/legal/LegalLayout'

export default function Privacidad() {
  return (
    <LegalLayout eyebrow="TSADOQ · LOPDP" titulo="Política de Privacidad y Tratamiento de Datos Personales">
      <p>Esta Política se emite en cumplimiento de la Ley Orgánica de Protección de Datos Personales (Registro Oficial Suplemento 459, 26 de mayo de 2021, en adelante "LOPDP") y su Reglamento General.</p>

      <h2>1. Responsable del tratamiento</h2>
      <p><span className="txl-placeholder">[Razón social o nombre del titular]</span>, RUC N.º <span className="txl-placeholder">[número]</span>, domicilio en <span className="txl-placeholder">[dirección, ciudad, Ecuador]</span>, correo de contacto para asuntos de protección de datos: <span className="txl-placeholder">[correo]</span>.</p>

      <h2>2. Roles frente a los datos: responsable y encargado</h2>
      <p><strong>2.1.</strong> Respecto de los datos de los Usuarios de la Plataforma (datos de registro, credenciales, datos de facturación, registros técnicos), el Proveedor actúa como responsable del tratamiento.</p>
      <p><strong>2.2.</strong> Respecto de los datos que cada Usuario carga en su espacio de trabajo (datos de sus clientes, contrapartes, casos y documentos), el Usuario es el responsable del tratamiento y el Proveedor actúa como encargado del tratamiento por cuenta del Usuario, limitándose a tratarlos conforme a esta Política y a las instrucciones implícitas en el uso normal del Servicio. Corresponde al Usuario, en su calidad de responsable, contar con la base de legitimación adecuada frente a los titulares de esos datos (por regla general, la ejecución del encargo profesional).</p>

      <h2>3. Categorías de datos tratados</h2>
      <table>
        <thead><tr><th>Categoría</th><th>Ejemplos</th><th>Rol del Proveedor</th></tr></thead>
        <tbody>
          <tr><td>Datos de registro y cuenta</td><td>Nombre, correo electrónico, nombre del despacho, rol</td><td>Responsable</td></tr>
          <tr><td>Datos técnicos y de seguridad</td><td>Dirección IP, registros de acceso y auditoría, identificadores de sesión</td><td>Responsable</td></tr>
          <tr><td>Datos de facturación</td><td>Plan contratado, historial de pagos</td><td>Responsable</td></tr>
          <tr><td>Contenido del espacio de trabajo</td><td>Datos de clientes del Usuario, casos, número de causa, agenda, notas, honorarios</td><td>Encargado</td></tr>
          <tr><td>Contenido documental</td><td>Texto extraído de documentos cuya lectura por IA active el Usuario</td><td>Encargado</td></tr>
        </tbody>
      </table>
      <p><strong>3.1. Datos sensibles.</strong> El Proveedor reconoce que el contenido gestionado por los Usuarios puede incluir datos sensibles y datos de categorías especiales en los términos de la LOPDP (información judicial y de procesos penales, datos de salud, datos de niños, niñas y adolescentes, según la materia del caso). Por esta razón la Plataforma aplica las medidas reforzadas descritas en la sección 8.</p>

      <h2>4. Finalidades y bases de legitimación</h2>
      <table>
        <thead><tr><th>Finalidad</th><th>Base de legitimación (art. 7 LOPDP)</th></tr></thead>
        <tbody>
          <tr><td>Creación y gestión de la cuenta; prestación del Servicio</td><td>Ejecución del contrato</td></tr>
          <tr><td>Soporte técnico solicitado por el Usuario</td><td>Ejecución del contrato</td></tr>
          <tr><td>Seguridad de la Plataforma, prevención de fraude y de usos prohibidos</td><td>Interés legítimo del responsable</td></tr>
          <tr><td>Auditoría de accesos administrativos</td><td>Interés legítimo y responsabilidad proactiva</td></tr>
          <tr><td>Cumplimiento de requerimientos de autoridad competente</td><td>Obligación legal</td></tr>
          <tr><td>Comunicaciones operativas sobre el Servicio</td><td>Ejecución del contrato</td></tr>
          <tr><td>Comunicaciones promocionales</td><td>Consentimiento (revocable en cualquier momento)</td></tr>
          <tr><td>Mejora del Servicio con información agregada o anonimizada</td><td>Interés legítimo</td></tr>
        </tbody>
      </table>

      <h2>5. Acceso administrativo a los espacios de trabajo — declaración de transparencia</h2>
      <p><strong>5.1.</strong> El personal autorizado del Proveedor con rol de superadministrador dispone de capacidad técnica de acceso a información de los espacios de trabajo, la cual se ejerce exclusivamente para:</p>
      <ul>
        <li>Atender solicitudes de soporte formuladas por el propio Usuario;</li>
        <li>Investigar y mitigar incidentes de seguridad;</li>
        <li>Atender órdenes o requerimientos de autoridad competente legalmente vinculantes;</li>
        <li>Investigar reportes fundamentados de uso prohibido de la Plataforma.</li>
      </ul>
      <p><strong>5.2.</strong> Dicho acceso no se ejerce de manera rutinaria ni con fines de exploración del contenido de los casos de los Usuarios.</p>
      <p><strong>5.3. Registro de auditoría.</strong> La Plataforma mantiene un registro automático e inalterable por los operadores de los accesos administrativos a los espacios de trabajo (identidad del operador, espacio de trabajo consultado, acción y fecha/hora), como medida de responsabilidad proactiva. Adicionalmente, los accesos a documentos dentro de la Plataforma quedan registrados en la auditoría de documentos de cada espacio de trabajo.</p>

      <h2>6. Comunicación de datos a terceros y subencargados</h2>
      <p><strong>6.1.</strong> El Proveedor no vende ni cede datos personales a terceros con fines comerciales.</p>
      <p><strong>6.2.</strong> Para prestar el Servicio, el Proveedor se apoya en los siguientes subencargados, con los que existen términos contractuales de protección de datos:</p>
      <table>
        <thead><tr><th>Subencargado</th><th>Función</th><th>Datos implicados</th></tr></thead>
        <tbody>
          <tr><td>Supabase (infraestructura sobre AWS)</td><td>Base de datos, autenticación y funciones del Servicio</td><td>Todas las categorías de la sección 3</td></tr>
          <tr><td>Google LLC (Drive / Calendar)</td><td>Almacenamiento documental y agenda, en la cuenta del propio Usuario</td><td>Documentos y eventos del Usuario</td></tr>
          <tr><td>Vercel Inc.</td><td>Alojamiento de la aplicación web</td><td>Datos técnicos de conexión</td></tr>
          <tr><td>Proveedores de modelos de IA (Groq; OpenRouter si el Usuario lo conecta)</td><td>Funciones de asistencia por IA</td><td>Consultas a Temis y texto de documentos cuya lectura active el Usuario</td></tr>
        </tbody>
      </table>
      <p><strong>6.3. Transferencias internacionales.</strong> Los subencargados indicados pueden tratar datos en servidores ubicados fuera del Ecuador. El Proveedor procura que dichas transferencias se amparen en garantías adecuadas conforme al régimen de transferencias internacionales de la LOPDP y su Reglamento.</p>
      <p><strong>6.4.</strong> Solo se divulgará información a autoridades cuando medie requerimiento legalmente vinculante, y en la medida estrictamente requerida.</p>

      <h2>7. Derechos de los titulares</h2>
      <p><strong>7.1.</strong> Conforme a los artículos 12 y siguientes de la LOPDP, los titulares pueden ejercer los derechos de acceso, rectificación y actualización, eliminación, oposición, portabilidad, suspensión del tratamiento y a no ser objeto de decisiones basadas únicamente en tratamientos automatizados.</p>
      <p><strong>7.2.</strong> Las solicitudes se presentan al correo <span className="txl-placeholder">[correo]</span> o mediante el módulo de Soporte, y serán atendidas dentro del plazo de quince (15) días previsto en la LOPDP.</p>
      <p><strong>7.3.</strong> Cuando la solicitud provenga de un titular cuyos datos fueron cargados por un Usuario (por ejemplo, un cliente de un despacho), el Proveedor —en su calidad de encargado— canalizará la solicitud al Usuario responsable y cooperará con este para su atención.</p>
      <p><strong>7.4.</strong> El titular tiene además derecho a presentar reclamos ante la Superintendencia de Protección de Datos Personales del Ecuador.</p>

      <h2>8. Medidas de seguridad</h2>
      <p>El Proveedor aplica, entre otras, las siguientes medidas técnicas y organizativas:</p>
      <ul>
        <li>Aislamiento lógico de los espacios de trabajo mediante políticas de seguridad a nivel de fila (Row Level Security) en la base de datos;</li>
        <li>Control de acceso basado en roles dentro de cada espacio de trabajo;</li>
        <li>Cifrado del canal de comunicaciones (TLS) y cifrado de credenciales y claves de integración sensibles almacenadas;</li>
        <li>Registro de auditoría de accesos a documentos y de accesos administrativos (sección 5.3);</li>
        <li>Principio de mínimo privilegio para el personal del Proveedor;</li>
        <li>Procedimiento de gestión de incidentes; en caso de vulneración de seguridad que afecte datos personales, el Proveedor notificará a la autoridad de protección de datos y a los titulares afectados en los términos y plazos de la LOPDP y su Reglamento.</li>
      </ul>

      <h2>9. Plazos de conservación</h2>
      <p><strong>9.1.</strong> Los datos de la cuenta y el contenido del espacio de trabajo se conservan mientras la cuenta permanezca activa.</p>
      <p><strong>9.2.</strong> Eliminada la cuenta o terminado el Servicio, la información se elimina o anonimiza dentro de los noventa (90) días siguientes al vencimiento del período de exportación, salvo la que deba conservarse por más tiempo para el cumplimiento de obligaciones legales (por ejemplo, información tributaria y contable, por siete (7) años conforme a la normativa tributaria) o para la formulación o defensa de reclamaciones.</p>
      <p><strong>9.3.</strong> Los registros de auditoría se conservan por un mínimo de dos (2) años.</p>

      <h2>10. Cookies y tecnologías similares</h2>
      <p>La Plataforma utiliza únicamente el almacenamiento local y las cookies técnicas estrictamente necesarias para la autenticación y el funcionamiento de la sesión. No se emplean cookies publicitarias ni de seguimiento de terceros. De incorporarse en el futuro, esta Política será actualizada y se solicitará el consentimiento que corresponda.</p>

      <h2>11. Actualizaciones de esta Política</h2>
      <p>Las modificaciones de esta Política se comunicarán por los mismos medios y con la misma anticipación previstos para los Términos. La versión vigente estará siempre disponible en la Plataforma con indicación de su fecha.</p>

      <h2>12. Contacto</h2>
      <p>Para consultas sobre esta Política o el ejercicio de derechos: <span className="txl-placeholder">[correo oficial]</span> — <span className="txl-placeholder">[dirección]</span>.</p>
    </LegalLayout>
  )
}
