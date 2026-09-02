Quiero un dashboard web que muestre los rosters actuales de los 10 equipos de la
LEC (League of Legends EMEA), inspirado en la sección Transfers de
Sheepesports (parrilla por equipo, logo + foto/avatar de cada jugador + su rol) solo como inspiracion el diseño visual debe ser nuevo y original
https://www.sheepesports.com/en/all/transfers, pero con una capa añadida: el estado de su contrato, para poder ver de un vistazo
quién termina contrato esta offseason (2026) y un filtro por su agente. (Los jugadores tienen agentes varios jugadores pueden tener el mismo agente)

FUENTES DE DATOS
1. Google Sheet de contratos (base "de trabajo", puede tener columnas propias
   como agente/agencia, salario estimado, notas, etc.):
   https://docs.google.com/spreadsheets/d/1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o/pubhtml#gid=148326031
2. Global Contract Database (GCD) de Leaguepedia, región EMEA — fuente oficial
   reconocida por Riot, con fecha de fin de contrato por jugador:
   https://lol.fandom.com/wiki/Archive:Global_Contract_Database/EMEA/Current
3. Imagenes de la cara de los jugadores en https://lol.fandom.com/wiki/ poniendo el nombre del jugador y lo mismo para el logo de los equipos
4. Para los svgs de los roles de los jugadores usa los de sheepesports ejemplo: https://www.sheepesports.com/_next/image?url=%2F_n…static%2Fmedia%2Ftop.1qqoknpu755x-.svg&w=32&q=100

ESTRUCTURA DE DATOS OBJETIVO (una fila por jugador)
- Equipo (con logo)
- Jugador (nombre in-game)
- Rol (Top / Jungla / Mid / ADC / Support / Coach opcional)
- Fecha de fin de contrato
- ¿Termina en 2026? (booleano derivado, para resaltar)
- Agente / agencia (campo a rellenar manualmente/TODO)
- Nacionalidad (opcional, para banderita)

FUNCIONALIDADES CLAVE
- Vista principal: parrilla de los 10 equipos LEC, cada uno con su roster de 5
  titulares tipo tarjetas de jugador.
- Indicador visual de contrato en cada tarjeta:
  · Verde/neutro = contrato vigente más allá de 2026
  · Rojo/ámbar + badge "Termina 2026" = contrato expira este año (foco offseason)
- Filtro por AGENTE/AGENCIA: al seleccionar un agente, resaltar o aislar solo
  los jugadores representados por él, aunque estén en equipos distintos.
- Filtros adicionales: por equipo, por rol, por "solo contratos que expiran
  este año".
- Buscador rápido de jugador por nombre.
- Vista alternativa tipo lista/tabla ordenable por fecha de fin de contrato
  (para ver de un vistazo el orden cronológico de la offseason).
- Ficha de jugador al hacer clic: equipo, rol, fecha de contrato, agente,
  histórico de equipos si se puede sacar del GCD.

DISEÑO
- leer @bmw-m-DESIGN.md modo oscuro y @bmw-DESIGN.md modo claro
- Visual, limpio, moderno — no clon de Sheepesports, sino un diseño propio con
  identidad
- Mobile-friendly y responsive.
- Prioridad a la legibilidad rápida: en 2 segundos se debe poder ver qué
  jugadores están "en juego" para la offseason.

ALCANCE OFFSEASON 2026
- El foco es la offseason de 2026 (tras el Summer Split / Worlds), así que
  "contratos que terminan este año" = contratos con fecha de expiración en 2026.

PENDIENTE DE DEFINIR
-Actualizacion periodica del GCD
- Habra que construir el tema de los agentes manualmente e investigando a que agencia/agente pertenece cada jugador
- Stack técnico: sin preferencia cerrada, pero pensado para funcionar bien
  como single-page app (ej. React + Tailwind), con los datos como JSON local
  editable en vez de conexión en vivo a las fuentes externas.
- Futura implementacion de movimientos para verlo. Por ejemplo: si Naak Nako va de Vitality a G2 habria que ponerlo de alguna manera como rosters para el año que viene y/o posibles rumores de los cambios... con los jugadores que acaban contrato.