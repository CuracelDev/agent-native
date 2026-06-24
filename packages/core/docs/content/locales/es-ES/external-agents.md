---
title: "Agentes externos: Claude, ChatGPT, Codex, Cursor, Cowork"
description: "Conecte Claude, ChatGPT, Codex, Cursor, Claude Cowork o cualquier host compatible con MCP a una aplicación nativa del agente alojada y luego envíe los artefactos de ida y vuelta al UI en ejecución con aplicaciones MCP y enlaces profundos."
search: "Claude ChatGPT Claude Código Codex Cursor Claude Cowork MCP Aplicaciones agente nativo conectar herramientas de agente local agentes externos"
---

# Agentes externos

**Esta página: conecte un agente externo o un host MCP a su aplicación.** Utilícela cuando Claude, ChatGPT, Codex, Cursor, Claude Cowork u otro host compatible con MCP deba impulsar una aplicación nativa del agente alojado y enviar el resultado de ida y vuelta al UI en ejecución.

| Si quieres…                                              | Leer                               |
| ------------------------------------------------------------ | ---------------------------------- |
| Conecte un agente/host externo a su aplicación                   | **Esta página** — Agentes externos    |
| Dale a tu agente más herramientas (consume otros servidores MCP)       | [MCP Clients](/docs/mcp-clients)   |
| Construya UI en línea que se representen en Claude/ChatGPT               | [MCP Apps](/docs/mcp-apps)         |
| Referencia del servidor MCP de nivel inferior (autenticación, herramientas, montaje personalizado) | [MCP Protocol](/docs/mcp-protocol) |

Cualquier host compatible con MCP puede acceder a una aplicación nativa del agente: Claude, Claude Desktop, Claude Code, aplicaciones MCP personalizadas ChatGPT, Codex, Cursor, Claude Cowork, VS Code GitHub Copilot, Goose, Postman, MCPJam y futuros clientes que implementen la estándar. Los agentes externos son excelentes para producir artefactos (un borrador, un evento, un panel), pero a menudo viven en una terminal u otra aplicación. Sin un puente, el usuario obtiene un muro de JSON y tiene que ir a buscarlo.

El puente del agente externo cierra el ciclo. Primero, conecta su propio agente a una aplicación **alojada**, ya sea pegando el MCP URL remoto de la aplicación en un host de chat como Claude o ChatGPT, o ejecutando el flujo de desarrollador CLI para agentes de codificación locales. Luego, el agente hace el trabajo sobre MCP y entrega al usuario una **Aplicación MCP** UI en línea en hosts compatibles o un único enlace **"Abrir en <aplicación> →"** que abre la aplicación real centrada exactamente en lo que se produjo. Reutiliza el contrato `navigate` / `application_state` existente; el UI ya drena cada 2 segundos (ver [Context Awareness](/docs/context-awareness)); no hay un segundo mecanismo de navegación.

```an-diagram title="The external-agent round-trip" summary="An external host calls a tool over MCP; the app returns an artifact plus an Open link. Clicking it resolves the browser session and focuses the artifact in the running UI — the link carries no privileged state."
{
  "html": "<div class=\"xa-trip\"><div class=\"diagram-box\" data-rough>External host<br><small class=\"diagram-muted\">Claude &middot; ChatGPT &middot; Codex &middot; Cursor</small></div><div class=\"diagram-arrow diagram-muted\" aria-hidden=\"true\">&rarr;</div><div class=\"diagram-panel center\" data-rough><span class=\"diagram-pill accent\">MCP tool call</span><small class=\"diagram-muted\">e.g. <code>manage-draft</code></small></div><div class=\"diagram-arrow diagram-muted\" aria-hidden=\"true\">&rarr;</div><div class=\"diagram-box\" data-rough>App produces artifact<br><small class=\"diagram-muted\">+ <code>Open in &lt;app&gt; &rarr;</code> deep link / MCP App</small></div><div class=\"diagram-arrow diagram-muted\" aria-hidden=\"true\">&darr;</div><div class=\"diagram-box\" data-rough>User clicks link</div><div class=\"diagram-arrow diagram-muted\" aria-hidden=\"true\">&rarr;</div><div class=\"diagram-panel center\" data-rough><span class=\"diagram-pill ok\"><code>/_agent-native/open</code></span><small class=\"diagram-muted\">resolves the <strong>browser</strong> session</small></div><div class=\"diagram-arrow diagram-muted\" aria-hidden=\"true\">&rarr;</div><div class=\"diagram-box\" data-rough>Writes <code>navigate</code> app-state<br><small class=\"diagram-muted\">UI focuses the artifact</small></div></div>",
  "css": ".xa-trip{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.xa-trip .center{display:flex;flex-direction:column;align-items:center;gap:4px}.xa-trip .diagram-arrow{font-size:22px;line-height:1}.xa-trip code{font-size:.85em}"
}
```

La regla de identidad es la bisagra de seguridad: el enlace es solo `view` + identificadores de registro + filtros, y la escritura `navigate` centrada en el registro está dirigida a quien haya iniciado sesión en el **navegador**, nunca al token MCP del agente externo. Es por eso que es seguro pegar el enlace en una terminal o en la transcripción del chat.

## ¿Qué ruta de agente necesitas? {#which-agent-path}

- **Host externo MCP:** use esta página cuando Claude, ChatGPT, Codex, Cursor, OpenCode, GitHub Copilot/VS Code u otro host compatible con MCP llame a su aplicación nativa del agente alojado.
- **Su propio tiempo de ejecución detrás del chat Agent-Native:** consulte [Agent Surfaces](/docs/agent-surfaces#byo-agent) y [Native Chat UI](/docs/native-chat-ui#byo-agent-runtimes) cuando un agente creado con otro marco debería impulsar `<AssistantChat runtime={...}>`.
- **Su aplicación consume herramientas MCP:** consulte [MCP Clients](/docs/mcp-clients) cuando una aplicación nativa del agente necesita llamar a herramientas expuestas por otro servidor MCP.
- **Otra aplicación o agente a través de A2A:** use [Agent Mentions](/docs/agent-mentions) y [A2A](/docs/a2a-protocol) cuando las aplicaciones nativas del agente deban descubrirse y delegarse entre sí.
- **Subagentes personalizados locales:** use [Workspace](/docs/workspace) cuando desee perfiles de agente personalizados dentro del propio espacio de trabajo nativo del agente.

## Fácil configuración {#easy-setup}

Agregue un conector MCP remoto al host donde desea utilizar Agent-Native.

Para trabajos en espacios de trabajo o entre aplicaciones, utilice Dispatch:

```text
https://dispatch.agent-native.com/_agent-native/mcp
```

Dispatch es la puerta de enlace única para Mail, Calendar, Analytics, Brain y tu
aplicaciones de espacio de trabajo. En la página **Agentes** de Dispatch, elija si la puerta de enlace puede
llegar a todas las aplicaciones o solo a las seleccionadas. El host conectado obtiene
`list_apps`, `ask_app` y `open_app`, filtrados según ese conjunto concedido.

Para una aplicación aislada intencionalmente, úsela directamente:

```text
https://mail.agent-native.com/_agent-native/mcp
https://<your-app>.agent-native.com/_agent-native/mcp
```

Cada aplicación alojada también tiene una página de ayuda en
`https://<app>/_agent-native/mcp/connect` con el URL copiable y
pestañas específicas del host para Claude, ChatGPT, Cursor, Código Claude, Codex y Otros.

### Claude y ChatGPT OAuth {#oauth}

Escritorio Claude / Claude: agregue un conector personalizado, pegue el MCP URL, haga clic
**Conéctese**, inicie sesión con su cuenta Agent-Native, apruebe los alcances MCP,
y habilitar el conector en un chat. El código Claude usa el mismo URL: agréguelo como
servidor remoto HTTP MCP, ejecute `/mcp` y luego elija **Autenticar**.

ChatGPT: utilice un espacio de trabajo donde se encuentren conectores MCP personalizados o aplicaciones en modo desarrollador
habilitado, cree un conector/aplicación personalizado, pegue el mismo MCP URL, elija OAuth,
escanear/descubrir herramientas, iniciar sesión con Agent-Native, aprobar los ámbitos y habilitar
el conector en un chat.

Las concesiones OAuth son por host y por usuario. El host almacena los tokens y
media llamadas de herramientas/recursos, por lo que las vistas previas en línea de la aplicación MCP nunca se reciben sin formato
Fichas OAuth. ChatGPT puede mantener una herramienta de conector revisada o publicada
instantánea hasta que la actualices/revises nuevamente, así que vuelve a escanear el conector después de MCP
 o de la aplicación MCP. Si todavía tienes conectores antiguos por aplicación
habilitado junto con Dispatch, actualiza o vuelve a conectar cada conector obsoleto; actualizando
Dispatch no reescribe el calendario/correo/etc. almacenados en caché de ChatGPT o Claude.
instantáneas. Los alcances son:

| Alcance       | Qué permite                                      |
| ----------- | ---------------------------------------------------- |
| `mcp:read`  | Herramientas de solo lectura y descubrimiento de herramientas/recursos          |
| `mcp:write` | Redacción, actualización y otras mutaciones actions       |
| `mcp:apps`  | Aplicaciones, gráficos, paneles, borradores y UI MCP en línea |

Cursor, Goose, Postman, MCPJam y VS Code GitHub Copilot usan el mismo control remoto
MCP URL a través de su propio servidor MCP UI cuando su compilación admite OAuth remoto
Servidores MCP.

### Mensaje de prueba rápida {#quick-test}

Después de conectarte, prueba uno de estos:

```text
Use Agent-Native Analytics to generate a weekly conversion-rate bar chart and show it inline.
```

```text
Use Agent-Native Mail to draft a short follow-up email to me, but do not send it.
```

En los hosts que admiten aplicaciones MCP, Analytics puede representar el panel real y las rutas de análisis en línea, y Mail puede representar la redacción real de UI en línea para su revisión en borrador. En los hosts que no procesan aplicaciones MCP, la misma llamada a la herramienta aún devuelve un vínculo profundo como **Abrir borrador en Mail →** o **Abrir panel en Analytics →**.

## Configuración avanzada: agentes locales {#connect}

Utilice este flujo para clientes de agentes locales en su máquina: Código Claude, Código Claude, CLI, Codex, Claude Cowork, Cursor, OpenCode y GitHub Copilot/VS Code. Cursor y otros clientes nativos de OAuth también pueden usar el flujo pegar-URL anterior cuando su UI admite MCP OAuth remoto.

Ejecute el comando de conexión a través de npm:

```bash
npx @agent-native/core@latest connect https://dispatch.agent-native.com
```

El comando pregunta qué clientes de agentes locales deben recibir la configuración MCP. Todos los clientes son preseleccionados la primera vez; después de elegir, la selección se guarda en `~/.agent-native/connect.json` para que la siguiente ejecución pueda reutilizarla con Enter, o puede editar los elementos marcados.

Para el código Claude, el código Claude, CLI, el cursor, OpenCode y el copiloto/código VS GitHub, `connect` escribe una entrada remota estándar HTTP MCP sin encabezados estáticos. Reinicie el cliente y autentíquese desde su MCP UI cuando se le solicite. Para Codex y Claude Cowork, `connect` utiliza el flujo de código de dispositivo de compatibilidad: abre su navegador en la aplicación, hace clic en **Autorizar** una vez y el comando escribe una entrada de token de portador con alcance. Si elige una combinación de clientes, hace ambas cosas.

Mantenga el comando `connect` ejecutándose hasta que se complete la aprobación del navegador. Si el
El proceso de espera se detiene antes de tiempo, la aprobación puede realizarse correctamente en el navegador, pero
la configuración del cliente local no recibirá el token.

Si anteriormente conectó el código Claude a través del antiguo flujo de token de portador, simplemente ejecute el mismo comando `npx @agent-native/core@latest connect ... --client claude-code` nuevamente. El CLI reemplaza los encabezados `Authorization` heredados con la entrada OAuth exclusiva para URL y le indica que se vuelva a autenticar desde `/mcp`.

| Cliente local                  | Configuración escrita por `connect`                             | Flujo de autenticación                                       |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| Código Claude / Código Claude CLI | `.mcp.json` o `~/.claude.json`, dependiendo de `--scope` | Remoto estándar MCP OAuth en `/mcp` UI de Claude |
| Cursor                        | `.cursor/mcp.json` o `~/.cursor/mcp.json`              | Remoto estándar MCP OAuth en MCP UI del Cursor    |
| Código abierto                      | `opencode.json` o `~/.config/opencode/opencode.json`   | MCP OAuth remoto estándar en MCP UI de OpenCode  |
| GitHub Copiloto / Código VS      | Configuración `.vscode/mcp.json` o usuario de VS Code MCP           | Remoto estándar MCP OAuth en MCP UI de VS Code   |
| Codex                         | `$CODEX_HOME/config.toml` o `~/.codex/config.toml`     | Reserva del portador autorizado por el navegador              |
| Claude Cotrabajo                 | `~/.cowork/mcp.json` usando la forma Claude Código MCP    | Reserva del portador autorizado por el navegador              |

Reinicie el cliente del agente después de conectarse para que seleccione el nuevo servidor MCP; Los clientes nativos de OAuth pueden solicitarle que se autentique desde su MCP UI.

Al solucionar problemas de configuración local de MCP, omita `Authorization`, `http_headers`,
y valores de token antes de compartir registros. No utilices rizos crudos como sustituto de un
sesión del host MCP; después de conectarse, use las herramientas expuestas al host o reinicie el
cliente si el nuevo servidor aún no está visible.

Utilice `--client codex` (o `--client claude-code`, `--client claude-code-cli`, `--client cursor`, `--client opencode`, `--client github-copilot`, `--client cowork`, `--client all`) para omitir el selector de scripts o instalaciones únicas.

La aplicación propia skills instala las instrucciones y el conector MCP alojado junto con el Agent Native CLI:

```bash
npx @agent-native/core@latest skills add assets              # alias: image-generation
```

La ruta Vercel/open Skills CLI también está disponible cuando solo quieres portátil
instrucciones:

```bash
npx skills@latest add BuilderIO/agent-native --skill assets
```

El archivo `skills` CLI sin formato instala únicamente archivos `SKILL.md`; Clientes locales MCP todavía
necesita un conector como `npx @agent-native/core@latest connect https://assets.agent-native.com`.

| Habilidad    | Alias              | Para                    |
| -------- | ------------------ | ---------------------- |
| `assets` | `image-generation` | generación de imagen/vídeo |

La selección de clientes predeterminada son todos los clientes locales compatibles; agregue `--client codex`, `--client claude-code` u otro objetivo específico para limitar la configuración. Los hosts en línea (ChatGPT, Claude.ai, chat principal de escritorio Claude) representan la cuadrícula de selección/variante en el chat; Los hosts CLI/solo enlace (Codex, Código Claude, pestaña "Código" del escritorio Claude) devuelven un enlace "Abrir en... →" donde el usuario elige en el navegador y pega un resumen de la transferencia.

Cuando realmente necesitas una aplicación aislada en lugar de la puerta de enlace del espacio de trabajo de Dispatch,
ejecute el mismo comando con el host de esa aplicación:

```bash
npx @agent-native/core@latest connect https://mail.agent-native.com
```

`connect --all` todavía existe para configuraciones de cliente por aplicación heredadas, pero es nuevo
Las configuraciones del espacio de trabajo deberían preferir el conector de envío único.

La conexión es **por usuario, de ámbito y revocable**. En la ruta OAuth, el host almacena los tokens después de la autenticación `/mcp`; en la ruta alternativa, la sesión del navegador con la que usted autorizó es la identidad con la que actúa el agente. Nada expone el secreto compartido de la implementación.

### Reautenticación después de un 401 {#reconnect}

Una vez conectado, la autenticación debe persistir a largo plazo: los tokens de acceso duran 30 días de forma predeterminada (anular con `MCP_OAUTH_ACCESS_TOKEN_TTL` en el servidor, por ejemplo, `7d` o `12h`) con una ventana deslizante de actualización de 365 días, por lo que los 401 aleatorios deberían ser raros. Cuando esto suceda, utilice el comando ligero de reconexión en lugar de reinstalar:

```bash
npx -y @agent-native/core@latest reconnect https://plan.agent-native.com --client codex
```

`reconnect` encuentra cualquier entrada de configuración MCP cuyo URL termine en `/_agent-native/mcp` para el host dado y el cliente seleccionado (que coincida con URL independientemente del nombre del conector), luego actualiza o reemplaza el material de autenticación sin tocar su skills instalado ni volver a ejecutar el flujo de instalación completo. Pase la aplicación base URL (por ejemplo, `https://plan.agent-native.com`): se infiere el sufijo `/_agent-native/mcp`. La autenticación y la carga de herramientas son por cliente, así que reinicie/recargue ese cliente después; Codex necesita una nueva sesión antes de que aparezcan las herramientas recién cargadas.

En el código Claude, la ruta equivalente a UI es: ejecute `/mcp` y elija **Autenticar** (o **Reconectar**) para el conector correspondiente.

Nunca reinstale la habilidad desde cero solo para arreglar un 401: `reconnect` es la herramienta adecuada.

### Conectar página alternativa {#connect-page-fallback}

Para clientes MCP que no pueden agregar un OAuth URL remoto directamente, abra la aplicación en su navegador y use su opción **Connect** (servida en `https://<app>/_agent-native/mcp/connect`). Una vez que haya iniciado sesión, haga clic en **Conectar/Autorizar**. La página le ofrece un enlace profundo de un solo clic que configura un agente detectado o un bloque `.mcp.json` listo para pegar:

```jsonc
// .mcp.json
{
  "mcpServers": {
    "mail": {
      "type": "http",
      "url": "https://mail.agent-native.com/_agent-native/mcp",
      "headers": { "Authorization": "Bearer <minted-token>" },
    },
  },
}
```

Reinicie el cliente del agente después de conectarse para que seleccione el nuevo servidor MCP.

Utilice este bloque de portador manual para clientes MCP que no pueden completar el flujo remoto estándar MCP OAuth, o para una depuración única cuando desee pegar explícitamente un token.

### Remoto estándar MCP OAuth {#standard-oauth}

Las aplicaciones nativas del agente alojadas también admiten el flujo remoto estándar MCP OAuth. Para los clientes que implementan MCP OAuth, agregue el servidor remoto HTTP URL sin encabezados estáticos:

```bash
claude mcp add --transport http agent-native \
  https://dispatch.agent-native.com/_agent-native/mcp
```

Esta es la misma entrada exclusiva para URL que `npx @agent-native/core@latest connect https://dispatch.agent-native.com --client claude-code` escribe para usted. Luego ejecute `/mcp` en el código Claude y elija **Autenticar**. El cliente descubre la autenticación del desafío `401 WWW-Authenticate` del servidor MCP, recupera `/.well-known/oauth-protected-resource` y `/.well-known/oauth-authorization-server`, registra dinámicamente un cliente público OAuth, abre la página de autorización de la aplicación y almacena el token resultante de forma segura. Los conectores en modo desarrollador ChatGPT utilizan el mismo servidor URL:

```text
https://dispatch.agent-native.com/_agent-native/mcp
```

El flujo OAuth es código de autorización + PKCE con rotación de token de actualización. Los tokens de acceso están vinculados a la audiencia al recurso MCP exacto, URL, y llevan la identidad de usuario/organización firmada, por lo que las llamadas a herramientas, `resources/read` y `tools/call` iniciado por iframe de la aplicación MCP se ejecutan a través del mismo alcance de inquilino `runWithRequestContext` que la ruta JWT creada por conexión existente. El iframe nunca recibe tokens OAuth sin procesar; el host media las llamadas a través de la conexión MCP autenticada.

Los alcances actuales son:

| Alcance       | Permite                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| `mcp:read`  | MCP actions de solo lectura y descubrimiento de herramientas/recursos ordinarios                |
| `mcp:write` | mutando actions y la metaherramienta `ask-agent`                            |
| `mcp:apps`  | Lista/lectura de recursos de aplicaciones MCP y representación en línea de UI donde sea compatible |

Cuando el cliente no solicita ningún alcance explícito, la aplicación concede los tres para que el conector se comporte como el flujo de Connect autorizado por el navegador. Mantenga la página de conexión del token de portador y el respaldo `npx @agent-native/core@latest connect --token <token>` para desarrolladores locales, hosts de respaldo y clientes donde necesite un bloque de configuración listo para pegar.

## Niveles del catálogo {#catalog-tiers}

Esta es la explicación canónica de los niveles del catálogo MCP; otras páginas enlazan aquí.

El servidor MCP ofrece un **catálogo compacto de forma predeterminada para cada persona que llama**: conectores alojados (ChatGPT, Claude), clientes de código (Código Claude, Cursor, Codex) y el proxy local CLI/stdio por igual. La superficie de acción completa se ofrece solo mediante suscripción explícita. El catálogo nunca se deduce del nombre del cliente o del agente de usuario.

```an-diagram title="Two catalog tiers" summary="Every caller gets the compact tier by default; the full ~105-tool surface is opt-in only. tool-search bridges the gap so nothing is ever truly hidden."
{
  "html": "<div class=\"xa-tiers\"><div class=\"diagram-card\" data-rough><span class=\"diagram-pill ok\">Compact / connector tier &middot; default</span><strong>~20&ndash;30 tools</strong><small class=\"diagram-muted\">Template-declared app actions + cross-app builtins (<code>list_apps</code>, <code>open_app</code>, <code>ask_app</code>, <code>create_embed_session</code>) + always-present <code>tool-search</code>.</small></div><div class=\"diagram-arrow diagram-muted\" aria-hidden=\"true\">&harr;</div><div class=\"diagram-card\" data-rough><span class=\"diagram-pill accent\">Full tier &middot; opt-in</span><strong>~105 tools</strong><small class=\"diagram-muted\">Explicit opt-in only: <code>--full-catalog</code> token or <code>AGENT_NATIVE_MCP_FULL_CATALOG=1</code>.</small></div></div><p class=\"diagram-muted note\"><code>tool-search</code> reaches any full-tier tool on demand &mdash; so the compact default keeps context small without hiding capability.</p>",
  "css": ".xa-tiers{display:flex;align-items:stretch;gap:14px;flex-wrap:wrap}.xa-tiers .diagram-card{display:flex;flex-direction:column;gap:6px;padding:14px 16px;flex:1;min-width:240px}.xa-tiers .diagram-arrow{align-self:center;font-size:24px;line-height:1}.xa-tiers .note{flex-basis:100%;margin:4px 0 0;font-size:.85em}.xa-tiers code{font-size:.85em}"
}
```

### Nivel compacto/conector (predeterminado) {#connector-tier}

De forma predeterminada, cada agente conectado ve un catálogo pequeño y seleccionado (entre 20 y 30 herramientas frente a 105 en la superficie completa):

- **Aplicación declarada por plantilla actions**: la lista de aplicaciones seguras permitidas a nivel. Para Plan que es `create-visual-plan`, `get-visual-plan`, `share-resource`, `navigate`, `tool-search` y similares.
- **Herramientas integradas entre aplicaciones**: `list_apps`, `open_app`, `ask_app`, `create_embed_session`.
- **`tool-search`** siempre está presente, por lo que todo lo que esté fuera de la lista permanece accesible bajo demanda (ver más abajo).

Las herramientas fuera de la lista (por ejemplo, `db-exec`, `seed-*`, el conjunto de extensiones, las herramientas de sesión del navegador y las herramientas de rayos X de contexto) no se anuncian y las llamadas a ellas se rechazan con "Herramienta desconocida" a menos que la persona que llama haya optado por el catálogo completo. Esto mantiene pequeña la ventana de contexto de cada agente conectado y elimina las barreras que solo son seguras para el desarrollo local de un solo inquilino. El nivel del conector está activo **siempre que una plantilla declara un `connectorCatalog`**; no está cerrado detrás de una variable de entorno.

`tool-search` funciona de dos maneras: llámelo con **sin consulta** para ver el menú completo de nombres de herramientas más descripciones de una línea (barato, sin esquemas), o con una consulta para coincidencias clasificadas con resúmenes de parámetros. Así es como un cliente compactado descubre y carga cualquier herramienta de superficie completa cuando la necesita.

### Nivel completo (solo suscripción explícita) {#full-tier}

La superficie de acción completa de ~105 herramientas se ofrece solo mediante suscripción explícita, de dos maneras:

- **Por token**: perfecto con `--full-catalog`, que incorpora un reclamo de `catalog_scope: "full"` en el JWT. Las solicitudes posteriores omiten el filtro compacto para ese token:

  ```bash
  npx @agent-native/core@latest connect https://plan.agent-native.com --códice del cliente --catálogo completo
  ```

- **Por implementación**: configure `AGENT_NATIVE_MCP_FULL_CATALOG=1` (entorno de proceso del servidor) para ofrecer toda la superficie a todas las personas que llaman. Úselo para instancias alojadas de un solo inquilino que desean la superficie completa sin opción de suscripción por token.

### Declaración de plantilla {#catalog-declaration}

Las plantillas declaran su catálogo de conectores en las opciones de `createAgentChatPlugin`:

```ts
export default createAgentChatPlugin({
  appId: "plan",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  connectorCatalog: [
    "create-visual-plan",
    "get-visual-plan",
    "list-visual-plans",
    "update-visual-plan",
    // … other safe app-level actions
    "set-resource-visibility",
    "share-resource",
    "upload-image",
    "navigate",
    "view-screen",
    "manage-automations",
    "tool-search",
  ],
});
```

Las herramientas integradas entre aplicaciones (`list_apps`, `open_app`, `ask_app`,
`create_embed_session`, `create_workspace_app`, `list_templates`) son siempre
incluido independientemente de la lista declarada.

## Qué puedes hacer una vez conectado {#what-you-can-do}

Una vez que su agente está conectado, cada persona que llama recibe el catálogo compacto de forma predeterminada
(ver [Catalog tiers](#catalog-tiers)) — clientes de desarrollador de código/stdio, el local
Proxy CLI y hosts de chat como Claude y ChatGPT por igual. Esa superficie es la
aplicación declarada por plantilla actions más los verbos integrados entre aplicaciones (`list_apps`,
`open_app`, `ask_app` y el asistente de inserción exclusivo de la aplicación). Utilice `ask_app` para enrutar un
tarea en lenguaje natural a través de un agente de aplicación (el mismo punto de entrada entre aplicaciones
usos [A2A](/docs/a2a-protocol)). `tool-search` siempre está presente, por lo que cualquier herramienta
fuera de la lista compacta permanece accesible bajo demanda. Para obtener la ~105-herramienta completa
aparece desde el principio, inscríbete explícitamente con `--full-catalog` o
`AGENT_NATIVE_MCP_FULL_CATALOG=1`. En todos los casos, pídele al agente que haga un trabajo real
y devuelve un enlace directamente a la aplicación en ejecución:

```
> draft an email to John about the Q3 report

Claude Code calls: manage-draft(to: "john@example.com", subject: "Q3 Report", body: "…")
→ Open draft in Mail → https://mail.agent-native.com/_agent-native/open?app=mail&view=inbox&compose=…
```

Haga clic en ese enlace y Mail se abrirá con el borrador restaurado, enfocado exactamente donde se encuentra usted, el usuario que inició sesión. El agente nunca tuvo que conocer su sesión; simplemente produjo el artefacto.

### Compatibilidad de aplicaciones MCP {#mcp-apps-compatibility}

Las aplicaciones nativas del agente también utilizan la extensión oficial de aplicaciones MCP. Cuando cualquier acción
declara `mcpApp`, el servidor anuncia
`extensions["io.modelcontextprotocol/ui"]`, incluye `_meta.ui.resourceUri` /
`_meta["ui/resourceUri"]` en `tools/list`, y sirve al HTML UI hasta
`resources/list` + `resources/read` como `text/html;profile=mcp-app`. Recurso
los metadatos de seguridad, como CSP y los permisos de zona de pruebas, se encuentran en el recurso
entradas y contenido `resources/read`, no en el descriptor de la herramienta.

Para los hosts de aplicaciones OAuth de estilo ChatGPT/Claude, la superficie de descubrimiento es compacta de forma predeterminada: `tools/list` y `resources/list` anuncian la ruta de inserción genérica de `open_app` en lugar de cada recurso de aplicación MCP específico de la acción (consulte [Catalog tiers](#catalog-tiers)). Marque una acción individual con `mcpApp.compactCatalog: true` solo cuando realmente necesite permanecer visible en el descubrimiento de host de chat.

Esto hace que la misma superficie de aplicación esté disponible para todos los hosts compatibles en lugar de crear correcciones por cliente. Los hosts que procesan las aplicaciones MCP en línea (y el problema de la caché del conector después de los cambios de metadatos) residen en [MCP Apps → Client support and caching](/docs/mcp-apps#client-support): esa página es el hogar único para la matriz del cliente.

En la práctica, cada aplicación nativa del agente debe crearse con ambas: aplicaciones MCP para revisión/edición en línea en hosts compatibles y `link` para retorno universal a la aplicación completa. Los clientes CLI/editor de código que no representan un iframe recurren al enlace profundo. Las herramientas de selección humana pueden agregar un paso de pegado a ese recurso alternativo: por ejemplo, el selector de Recursos se abre desde el enlace alternativo, permite al usuario elegir medios en el navegador y luego copia un resumen de transferencia que el usuario vuelve a pegar en el chat.

### Puente de aplicación MCP de primera clase {#mcp-app-bridge}

`embedApp()` comienza desde el objetivo `link` de la acción, crea una sesión de inserción de corta duración e inicia esa ruta de aplicación firmada. La web Claude utiliza una ruta de trasplante de un solo cuadro; ChatGPT obtiene un iframe de ruta controlada con el host `window.openai` API. Todas las rutas representan la ruta normal React. Las rutas directamente hidratadas llaman a `ui/update-model-context`, `ui/message`, `ui/open-link` y `ui/request-display-mode` a través del puente de host; la ruta ChatGPT transmite las mismas solicitudes a través de `agentNative.mcpHost.*` postMessage. `embedApp({ height })` está predeterminado en `560px` y se fija en `320-900px`.

Consulte [MCP Apps](/docs/mcp-apps) para obtener detalles completos del puente: trasplante frente a marco controlado, modos de inserción, tablas `ui/*` y postMessage, reglas `embedStartUrl`, CSP, incorporación de extensión `srcDoc`, fijación de altura y el cliente de puente host completo API.

### Verbos genéricos entre aplicaciones {#cross-app}

Además de las herramientas por acción, el servidor MCP expone un conjunto de verbos estables, por lo que un agente externo tiene una superficie predecible sin adivinar los nombres de acción por aplicación:

| Herramienta                                               | Efectos secundarios | Devoluciones                                                                                     |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `list_apps`                                        | ninguno         | aplicaciones de espacio de trabajo + sus URL/estado de ejecución                                                 |
| `open_app({ app, view?, path?, params?, embed? })` | ninguno         | un enlace profundo o una ruta del mismo origen; `embed: true` renderiza la aplicación completa en línea donde sea compatible |
| `ask_app({ app, message })`                        | bucle de agente   | enruta una tarea en lenguaje natural al agente dentro de la aplicación de esa aplicación (delega a `ask-agent`)        |
| `create_workspace_app({ name, template })`         | andamios    | una nueva aplicación iniciada a través de la ruta del espacio de trabajo, además de su URL en ejecución + enlace profundo                   |
| `list_templates`                                   | ninguno         | solo las plantillas incluidas en la lista permitida                                                             |

`create_workspace_app` rechaza cualquier plantilla no incluida en la lista de permitidos: la lista de plantillas públicas permitidas en `packages/shared-app-config/templates.ts` tiene autoridad y está protegida por CI; un agente externo no puede ampliarlo. Una acción de plantilla con el mismo nombre anula una acción incorporada (precedencia de plantilla sobre núcleo). Desactive todo el conjunto con `MCPConfig.builtinCrossAppTools: false`.

Los catálogos de herramientas y recursos para hosts de aplicaciones son compactos de forma predeterminada; consulte [Catalog tiers](#catalog-tiers). `publicAgent.expose` sigue siendo la opción para herramientas de lectura/ingesta seguras fuera de ese catálogo compacto; configure `mcpApp.compactCatalog: true` solo como una rara excepción para actions que debe aparecer en el descubrimiento de host de chat.

Para transferencias rápidas de ChatGPT/Claude, la ruta ideal es directa: llame a la acción que crea o abre el artefacto, luego deje que la aplicación MCP inicie la ruta. Una solicitud de correo debe llamar a `manage_draft` y representar la ruta de redacción real. Una solicitud de panel debe llamar a `open_app({ path, embed: true })` o una acción de panel con `mcpApp` y representar la ruta de análisis completa. Calendario, formularios, contenido, diapositivas, diseño y clips deben seguir el mismo patrón con su borrador/creación/búsqueda actions. `list_apps` es útil cuando el modelo debe elegir entre las aplicaciones otorgadas; `resources/list` amplio, descubrimiento de catálogo completo o delegación de `ask_app` no deberían ser la ruta normal para una transferencia obvia de UI.

### Recorrido por aplicación {#tour}

Cada plantilla incluida en la lista permitida que produce o enumera un recurso navegable incluye un generador `link`, y las de ingesta pesada incluyen una acción GET + `publicAgent` para que un agente conectado pueda obtener el estado en vivo:

- **Correo**: `manage-draft` devuelve un enlace profundo codificado con `compose`; al hacer clic en él, se abre la bandeja de entrada con el borrador restaurado en un `compose-<id>`. `list-emails` / `search-emails` apuntan a una vista de bandeja de entrada filtrada.
- **Calendario**: `manage-event-draft` devuelve un enlace profundo `calendarDraft` + `eventDraftId`; al hacer clic en él, se abre un marcador de posición borrador visible en el calendario con el editor de eventos nativo para revisar/enviar. `create-event` todavía devuelve `buildDeepLink({ app: "calendar", view: "calendar", params: { eventId, date } })`; el clic llega al calendario con ese evento centrado en su fecha.
- **Análisis** — `update-dashboard` / `save-analysis` devuelve `buildDeepLink({ app: "analytics", view: "adhoc", params: { dashboardId } })`; el agente crea un panel sobre MCP y devuelve "Abrir panel en Analytics".
- **Diseño**: `get-design-snapshot` es la acción de ingesta GET + `publicAgent`: devuelve el contenido del archivo Yjs **en vivo** más los valores de ajuste resueltos para que el agente continúe desde el diseño optimizado, no los tokens originales. `apply-tweaks` regresa con un enlace del editor "Abrir diseño".
- **Contenido**: `pull-document` es la acción de ingesta GET + `publicAgent`: envía cualquier sesión colaborativa en vivo abierta a SQL primero para que el agente externo ingiera exactamente lo que ve el usuario y luego muestre un vínculo profundo al documento.
- **Cerebro**: `ask-brain` / `search-everything` devuelven una respuesta citada más un vínculo profundo al conocimiento/captura subyacente, por lo que la búsqueda de un agente terminal se vincula directamente a la fuente en la aplicación en ejecución.

## Autoría (para autores de plantillas) {#authoring}

Todo lo anterior es para **usuarios finales** que se conectan y usan una aplicación. El resto de esta página es para **autores de plantillas** cómo configurar una aplicación para que sea un buen ciudadano de agente externo: el creador `link`, las aplicaciones MCP opcionales, UI, las rutas internas `/_agent-native/open` y la ingesta de actions.

### El constructor `link` {#link-builder}

`defineAction` acepta un constructor `link` opcional. Cuando se configura, cada resultado de MCP/A2A para esa herramienta agrega automáticamente un bloque de rebajas `[label →](absoluteUrl)` y un `_meta["agent-native/openLink"] = { label, view, webUrl, desktopUrl, vscodeUrl }` estructurado. `tools/list` agrega `annotations["agent-native/producesOpenLink"]` y un sufijo de descripción para que el agente externo sepa que la herramienta genera un enlace que se puede abrir y debería mostrarlo.

Compile el URL con `buildDeepLink(...)`: es la única fuente de confianza para el formato de ruta abierta. Nunca formatee manualmente el `/_agent-native/open` URL.

Ejemplo real: `manage-draft` (`templates/mail/actions/manage-draft.ts`) del correo:

```ts
import { buildDeepLink } from "@agent-native/core/server";

function composeDeepLink(draft: Record<string, string>): string {
  return buildDeepLink({
    app: "mail",
    view: "inbox",
    compose: encodeComposeDraft(draft), // base64url JSON → compose-<id> draft
  });
}

export default defineAction({
  // ...schema, run...
  link: ({ result }) => {
    if (!result || typeof result !== "object") return null;
    const draft = (result as { draft?: Record<string, string> }).draft;
    const id = (result as { id?: string }).id;
    if (!draft || !id) return null;
    return {
      url: composeDeepLink(draft),
      label: "Open draft in Mail",
      view: "inbox",
    };
  },
});
```

Enumerar/buscar puntos actions en una vista centrada en registros de la misma manera, p. El `create-event` del calendario devuelve `buildDeepLink({ app: "calendar", view: "calendar", params: { eventId, date } })` con la etiqueta `"Open event in Calendar"`. El borrador del calendario actions usa el mismo patrón: `manage-event-draft` devuelve `buildDeepLink({ app: "calendar", view: "calendar", to: "/", params: { eventDraftId, calendarDraft, date } })` con la etiqueta `"Review invite in Calendar"`, por lo que los agentes externos pueden devolver un enlace directo de revisión del borrador sin crear el evento primero.

### Aplicaciones MCP opcionales UI {#mcp-apps}

Actions puede anunciar un recurso UI en línea con `mcpApp` para hosts que admitan la extensión de aplicaciones MCP. Utilice `embedRoute({ title, openLabel, path })` como contenedor de conveniencia o asigne `embedApp(...)` a `mcpApp.resource` directamente. Cada aplicación MCP es una ruta React real, no un widget simple-HTML separado. Conserve siempre el constructor `link`: los hosts exclusivos de CLI, los clientes más antiguos y los hosts de aplicaciones que no son MCP lo utilizan como respaldo.

Consulte [MCP Apps](/docs/mcp-apps) para obtener la guía de creación completa: `embedRoute` vs `embedApp`, la forma de configuración de `mcpApp`, CSP, la altura, la ruta de inserción de `sendToAgentChat()` y los asistentes del cliente de puente host.

### El contrato `link` {#link-contract}

El constructor `link` es **puro y sincrónico: sin E/S, sin esperas**. Se ejecuta con el mejor esfuerzo: un lanzamiento, `null` o `undefined` se traga y **nunca** falla la llamada a la herramienta. Sólo lee los `args` y `result` de la llamada; no debe consultar la base de datos, leer el estado de la aplicación ni llamar a otro actions. Devuelve `null` cuando no haya nada que abrir.

`buildDeepLink({ app, view, params?, to?, compose? })` devuelve la ruta relativa a la aplicación `/_agent-native/open?app=…&view=…&<recordId>=…`. La capa MCP convierte eso en un URL web absoluto (`toAbsoluteOpenUrl`, usando el origen de la solicitud), un `agentnative://open?…` de escritorio URL (`toDesktopOpenUrl`) y una extensión de VS Code URL (`toVsCodeOpenUrl`) para `vscode://builder.agent-native/open?url=…`; el enlace de rebajas utiliza el URL de escritorio cuando el cliente señala `target: "desktop"`.

### La ruta `/_agent-native/open` {#open-route}

Cuando el usuario hace clic en el enlace en cualquier navegador o vista web en línea, `GET /_agent-native/open` (`createOpenRouteHandler`, montado por el complemento de rutas principales) ejecuta los pasos siguientes.

```an-api
{
  "method": "GET",
  "path": "/_agent-native/open",
  "summary": "Deep-link open route — focuses the browser UI on a record",
  "description": "Resolves the browser session, writes a one-shot `navigate` application-state command scoped to that session, and 302-redirects to a safe same-origin path. Always build the URL with `buildDeepLink(...)`; never hand-format it. Can be disabled per app with `disableOpenRoute`.",
  "auth": "Browser session via `getSession`. The auth guard bypasses this exact path; if unauthenticated it serves login HTML at the same URL, and the form reload re-enters authenticated (no `?next=` plumbing).",
  "params": [
    { "name": "app", "in": "query", "type": "string", "description": "Target app id (e.g. `mail`)." },
    { "name": "view", "in": "query", "type": "string", "description": "View to focus; also folded into the `navigate` payload." },
    { "name": "to", "in": "query", "type": "string", "description": "Optional explicit same-origin relative redirect target. Falls back to `/<view>`, then a per-template `resolveOpenPath`." },
    { "name": "compose", "in": "query", "type": "string", "description": "base64url-encoded draft, decoded into a `compose-<id>` application-state key." },
    { "name": "f_*", "in": "query", "type": "string", "description": "Filter params forwarded to the redirect so lists/dashboards open pre-filtered." }
  ],
  "responses": [
    { "status": "302", "description": "Redirect to a safe same-origin relative path. Cross-origin, scheme-relative `//host`, and control-char redirects are rejected (open-redirect guard)." },
    { "status": "200", "description": "Login HTML served at the same URL when the browser session is unauthenticated." }
  ]
}
```

1. Resuelve la sesión del **navegador** a través de `getSession` (el guardia de autenticación omite la ruta exacta `/_agent-native/open`).
2. Si no está autenticado, sirve el inicio de sesión configurado HTML **en el mismo URL**; el controlador de éxito del formulario recarga `window.location` y vuelve a ingresar la ruta autenticada, sin plomería `?next=`.
3. Escribe el comando de estado de aplicación `navigate` existente (carga útil = cada parámetro de consulta no reservado + `view`) con alcance en el correo electrónico de la sesión del navegador con `requestSource: "deep-link"` y decodifica un borrador de URL base64 de `compose` en una clave `compose-<id>`.
4. 302-redirecciones a una ruta relativa segura del mismo origen (`to=`, si no, `/<view>`, si no, un `resolveOpenPath` por plantilla), reenviando los parámetros de filtro `f_*` para que las listas/paneles se abran prefiltrados incluso antes de que se agote el comando `navigate`.

Se rechazan las redirecciones de origen cruzado, `//host` relativas al esquema y caracteres de control (protección de redireccionamiento abierto). La ruta se puede desactivar por aplicación a través de `disableOpenRoute`.

#### La regla de identidad de la sesión del navegador {#identity-rule}

El enlace **no tiene estado privilegiado**; es solo `view` + identificadores de registro + filtros. La escritura `navigate` centrada en registros está dirigida a quien haya iniciado sesión en el **navegador**, nunca al token MCP del agente externo. Entonces, un agente autenticado como una identidad puede entregarle a un usuario un enlace, y cuando ese usuario hace clic en él, se abre el registro donde _el usuario_ ha iniciado sesión. Esto es lo que hace que el enlace profundo sea seguro para aparecer en una terminal o en una transcripción de chat. Consulte [Context Awareness](/docs/context-awareness) para conocer el contrato `navigate` / `application_state` al que sirve de puente.

### Ingerir actions {#ingest}

Una acción que lee un agente externo para llevar el estado de la aplicación en vivo a su propio contexto debe ser:

```ts
export default defineAction({
  description: "…",
  schema: z.object({ id: z.string() }),
  http: { method: "GET" },
  readOnly: true,
  publicAgent: { expose: true, readOnly: true, requiresAuth: true },
  run: async ({ id }) => {
    /* read LIVE state, not the stale DB snapshot column */
  },
});
```

`GET` + `readOnly` mantiene la acción libre de efectos secundarios y fuera del evento de cambio de actualización de pantalla. `publicAgent` es la **aceptación explícita**: una ruta web pública nunca implica exposición pública a MCP/A2A; ver [Actions](/docs/actions). La ingesta de diseño/contenido actions MUST lee el estado **en vivo** (el documento colaborativo de Yjs, no la columna de instantánea de base de datos obsoleta) para que el agente externo vea lo que el usuario realmente tiene en la pantalla. El `pull-document` de Content descarga cualquier sesión abierta de colaboración en vivo al SQL primero; El `get-design-snapshot` de diseño devuelve el contenido del archivo Yjs en vivo más los valores de ajuste resueltos por el usuario.

## Avanzado: desarrollo local y configuración manual {#advanced}

El flujo alojado `connect` anterior es la ruta recomendada. Las siguientes opciones son para desarrollo local y configuraciones hechas a mano.

### Desarrollo local {#local-dev}

Ejecute su aplicación localmente (`pnpm dev` / `npx @agent-native/core@latest dev`), luego apunte a un agente local con un comando:

```bash
npx @agent-native/core@latest mcp install --client claude-code|claude-code-cli|codex|cowork \
  [--app <id>] [--scope user|project]
```

Aprovisiona un token (un `ACCESS_TOKEN` aleatorio en el espacio de trabajo `.env` para el desarrollador local, o un JWT firmado si detecta un origen alojado) y escribe una entrada de servidor stdio idempotente:

- **claude-code / claude-code-cli**: una entrada `mcpServers` en `.mcp.json` (alcance del proyecto, predeterminado) o `~/.claude.json` (`--scope user`).
- **cowork**: la misma forma del código Claude JSON en `~/.cowork/mcp.json`.
- **codex**: un bloque `[mcp_servers.<name>]` en `~/.codex/config.toml`.

La entrada ejecuta `npx @agent-native/core@latest mcp serve --app <id>`, que de forma predeterminada es un **proxy stdio ligero** para el `/_agent-native/mcp` de la aplicación local en ejecución, por lo que el registro de acciones en vivo, HMR y los enlaces profundos correctos siguen siendo la única fuente de verdad. Pase `--standalone` para crear el registro en proceso. Cuando `npx @agent-native/core@latest mcp install` detecta un origen alojado (un `APP_URL` / `BETTER_AUTH_URL` / `AGENT_NATIVE_MCP_URL` que no es un host local en el espacio de trabajo `.env`), escribe una entrada de cliente `http` que apunta a `<origin>/_agent-native/mcp` con un `Bearer` JWT en lugar de una entrada stdio.

Subcomandos complementarios:

| Comando                                                    | Qué hace                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `npx @agent-native/core@latest mcp serve [--app <id>]`     | Ejecute el transporte estándar MCP (qué configuraciones del cliente generan).            |
| `npx @agent-native/core@latest mcp install --client <c>`   | Aprovisionar un token + escribir la configuración MCP del cliente (idempotente).     |
| `npx @agent-native/core@latest mcp uninstall --client <c>` | Elimine la entrada denominada MCP de la configuración de un cliente (idempotente).     |
| `npx @agent-native/core@latest mcp status`                 | Mostrar MCP URL/puerto, estado del token y entradas por cliente resueltas.    |
| `npx @agent-native/core@latest mcp token [--rotate]`       | Imprime (o rota) el `ACCESS_TOKEN` local en el espacio de trabajo `.env`. |

Reinicie el cliente después de `install` para que seleccione el nuevo servidor MCP.

### Entrada manual de `.mcp.json` HTTP {#manual-entry}

También puede escribir la configuración del cliente MCP a mano en cualquier punto final implementado con un token que usted mismo proporcione (un `ACCESS_TOKEN` o un JWT firmado por `A2A_SECRET` que lleve el `sub` + `org_domain` de la persona que llama para que las herramientas se ejecuten en el ámbito del inquilino):

```jsonc
// .mcp.json
{
  "mcpServers": {
    "analytics": {
      "type": "http",
      "url": "https://analytics.agent-native.com/_agent-native/mcp",
      "headers": { "Authorization": "Bearer <ACCESS_TOKEN-or-JWT>" },
    },
  },
}
```

Este es el equivalente no administrado de lo que `connect` escribe para usted. Consulte [MCP Protocol](/docs/mcp-protocol) para obtener la matriz de var-entorno de autenticación completa.

### Superficie de herramientas de desarrollo versus producción {#dev-vs-prod}

En desarrollo local simple (`NODE_ENV=development` y `AGENT_MODE !== "production"`), MCP `tools/list` expone deliberadamente solo las funciones integradas genéricas más actions con `publicAgent.requiresAuth === false`: la ingesta por aplicación actions (`requiresAuth: true`) y la mutación actions (no `publicAgent`) se filtran (`filterPublicAgentActions`). El catálogo compacto es el predeterminado para cada persona que llama después de la autenticación (clientes stdio/code que usan el proxy `agent-native`, el CLI local y las personas que llaman HTTP remotas estilo chat por igual), por lo que ChatGPT/Claude (o cualquier cliente) no pueden volcar un enorme catálogo de acciones completo en la conversación. El catálogo completo de desarrolladores se ofrece solo con suscripción explícita (token `--full-catalog` o `AGENT_NATIVE_MCP_FULL_CATALOG=1`); Mientras tanto, `tool-search` mantiene todas las herramientas accesibles.

### Cambiar aplicaciones propias entre producción y desarrollo {#dev-switch}

Cuando ya tenga aplicaciones alojadas propias conectadas y desee probar los cambios del marco local a través de `pnpm dev:lazy`, utilice el selector de desarrollador:

```bash
pnpm dev:lazy -- --apps mail,calendar,analytics

npx @agent-native/core@latest connect dev --apps mail,calendar,analytics --client codex
```

`connect dev` reescribe los mismos nombres de servidor MCP estables (`agent-native-mail`, `agent-native-calendar`, etc.) en la puerta de enlace de desarrollo diferido local, por lo que los nombres de las herramientas no cambian. Realiza una copia de seguridad de las entradas de producción actuales en `~/.agent-native/connect-profiles.json` antes de escribir las entradas de desarrollo. La puerta de enlace predeterminada es `http://127.0.0.1:8080`; use `--gateway <url>` o `--port <n>` si su puerta de enlace se mudó.

Volver a cambiar con:

```bash
npx @agent-native/core@latest connect prod --apps mail,calendar,analytics --client codex
```

Si `connect dev` no puede inferir su identidad de propietario local a partir de un JWT conectado existente, pase `--owner-email you@example.com`; esto mantiene las herramientas de desarrollo local en la superficie MCP completamente autenticada en lugar de la escasa superficie de desarrollo no autenticada.

## Cómo funciona y seguridad {#how-it-works}

La ruta estándar OAuth nunca expone tokens a las aplicaciones MCP: el host almacena tokens de acceso/actualización OAuth y media las llamadas a herramientas y `resources/read` a través de la conexión MCP autenticada. Los iframes integrados reciben datos de aplicaciones y resultados de herramientas, no secretos del portador.

Las inserciones de aplicaciones completas también evitan entregar el token de portador MCP al navegador. La persona que llama MCP genera un ticket de inserción único en SQL; la ruta de inicio del iframe lo consume y establece una cookie de sesión de navegador de corta duración y segura para el iframe. El aterrizaje URL lleva un parámetro de consulta temporal `__an_embed_token` solo el tiempo suficiente para que el cliente lo capture, lo elimine de la barra de direcciones y lo adjunte a llamadas `fetch` del mismo origen cuando se bloquean las cookies de terceros. Las sesiones de inserción tienen un alcance de ruta; Las recuperaciones de la aplicación incluyen el objetivo incrustado actual y el servidor rechaza la reutilización del token fuera de la ruta acuñada. Las páginas de aplicaciones no emiten intencionalmente `X-Frame-Options` o CSP `frame-ancestors`, por lo que los hosts de aplicaciones Builder, Design y MCP pueden incluirlas en marcos iframe. Las navegaciones de iframe del navegador también optan por COEP/CORP cuando sea necesario para hosts aislados de origen cruzado.

El flujo `connect` alojado de reserva nunca copia el secreto compartido de la implementación. En lugar de ello:

- Una sesión de navegador iniciada genera un token **por usuario, con alcance y revocable**: un JWT firmado por `A2A_SECRET` que lleva el `sub` + `org_domain` de la persona que llama y un `jti` único, por lo que cada ejecución de herramienta permanece dentro del alcance del inquilino a través de `runWithRequestContext`.
- El punto final `/_agent-native/mcp` existente acepta ese token como cualquier otro portador (ver [MCP Protocol](/docs/mcp-protocol)): ni punto final nuevo, ni transporte nuevo.
- La misma página de Connect enumera todos los tokens que ha acuñado y le permite **revocar** cualquiera de ellos mediante `jti`. Trátelos como tokens de acceso personal: uno por cliente agente y revoque cuando se desmantele una máquina.
- El vínculo profundo que el agente devuelve no conlleva ningún estado privilegiado. La escritura `navigate` centrada en registros siempre tiene como alcance la sesión del **navegador**, nunca el token del agente, por lo que es seguro pegar un vínculo en una terminal o en la transcripción del chat.

## Hacer/No hacer {#do-dont}

**Hacer**

- Conecte su propio agente a Dispatch con `npx @agent-native/core@latest connect https://dispatch.agent-native.com`; use una aplicación directa URL solo cuando desee una aplicación aislada.
- Agregue un constructor `link` a cualquier acción que produzca o enumere un recurso navegable (borrador, evento, panel, documento).
- Cree el URL con `buildDeepLink(...)`, la única fuente de confianza para el formato de ruta abierta.
- Mantenga `link` puro y sincrónico; devuelve `null` cuando no haya nada que abrir.
- Haga que el agente externo ingiera actions GET + `readOnly` + `publicAgent` y lea el estado activo (Yjs), no la columna de base de datos obsoleta.
- Deje que la ruta abierta resuelva la sesión del navegador; pase los identificadores de registro como parámetros de enlace profundo y deje que UI los enfoque mediante el comando encuestado `navigate`.
- Revocar un token de conexión acuñado por `jti` cuando un cliente agente sea dado de baja.
- Pruebe las aplicaciones MCP con los accesorios livianos alrededor de `embedApp()` y
  `McpAppRenderer`; cubren CSP, contexto de host, inicio de aplicaciones y puente
  comportamiento del mensaje sin necesidad de un host externo real.
- Al validar la web ChatGPT o Claude, active una nueva llamada de herramienta después del shell
  cambia y mide el iframe visible. Fotogramas renderizados previamente en el
  Es posible que la misma conversación aún muestre la altura del caché o el comportamiento de inicio.
- Mantenga compactos los catálogos de hosts de aplicaciones ChatGPT/Claude. Utilice Despacho y
  `open_app({ embed: true })` para vistas previas completas de la aplicación; solo marca un específico
  acción `mcpApp.compactCatalog: true` cuando debe aparecer directamente en el
  superficie de descubrimiento de host compacta.

**No**

- Copie el `ACCESS_TOKEN`/`A2A_SECRET` compartido de una implementación en una configuración de cliente cuando `connect` pueda generar un token revocable por usuario.
- Formatee manualmente el `/_agent-native/open` URL; pase siempre por `buildDeepLink`.
- Realice E/S, esperas, lecturas de bases de datos o lecturas de estado de aplicaciones dentro de un constructor `link`.
- Alcance la escritura `navigate` en el token del agente o pase el estado privilegiado a través del enlace profundo: es un puntero puro.
- Inventar un nuevo mecanismo de navegación; puente al contrato `navigate` / `application_state` existente.
- Amplíe la lista de permitidos de la plantilla pública al crear una aplicación desde un agente externo: la lista de permitidos tiene autoridad y está protegida.

## Relacionado {#related}

- [MCP Apps](/docs/mcp-apps): creación de la aplicación MCP, UI, el puente integrado y el puente host API.
- [MCP Protocol](/docs/mcp-protocol): el servidor MCP de montaje automático y la metaherramienta `ask-agent`.
- [MCP Clients](/docs/mcp-clients): la dirección simétrica: su aplicación consume servidores MCP locales/remotos.
- [A2A Protocol](/docs/a2a-protocol): la metaherramienta `ask-agent` y las llamadas de pares JSON-RPC.
- [Actions](/docs/actions): definición de actions, `publicAgent`, GET / `readOnly`.
- [Context Awareness](/docs/context-awareness): `navigate` / `application_state` contratan los puentes de ruta abierta hacia.
