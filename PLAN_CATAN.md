# PLAN_CATAN.md: Generador de tableros de Catan

> Documento vivo del proyecto. **Claude: léelo al empezar cada sesión** y mantenlo al día:
> marca las casillas completadas, apunta las decisiones en el *Registro de decisiones*,
> añade ideas nuevas en *Banco de ideas* y anota las dudas para el usuario en *Preguntas abiertas*.
> Si algo de este plan resulta mala idea al implementarlo, cámbialo aquí y explica por qué.

---

## 0. Instrucciones para Claude Code

1. Al empezar el proyecto, crea un `CLAUDE.md` en la raíz con una sola línea importante:
   `Lee PLAN_CATAN.md antes de hacer nada. Es la fuente de verdad del proyecto.`
2. Trabaja **por fases** (sección 9). No empieces una fase sin cerrar los chequeos de la anterior.
3. Antes de una decisión grande (cambiar de stack, quitar una función, cambiar el flujo), pregunta al usuario.
4. Al terminar cada sesión, actualiza:
   - las casillas `[ ]` → `[x]`
   - el *Registro de decisiones* (sección 12)
   - las *Preguntas abiertas* (sección 13)
5. **No inventes las bromas internas** del "Dato curioso del día". Deja ejemplos marcados con `TODO` para que el usuario los escriba.
6. El usuario prefiere explicaciones sencillas y en español.
7. Preguntale al usuario si quiere que escriba el codigo en VS Code y lo vea en directo como se esta escribiendo con un live server extension o algo asi.
   → *Respondido (2026-11-02): sí. El proyecto se abre en VS Code y la app se ve con `npm run dev` (Vite recarga solo; no hace falta Live Server).*
8. El usuario no maneja ramas de git: se trabaja en `main` y se hace un commit al terminar cada fase.

---

## 1. Visión

Una app web **muy cuidada visualmente** nivel diseño Apple, para un grupo de amigos que juegan a Catan.
Su función principal es **generar tableros aleatorios del Catan base (3-4 jugadores)** según las reglas que elija el grupo,
con una **animación de generación épica**: el mapa se construye en 3D flotando en el espacio, como si la isla fuera un planeta.

Además tiene personalidad propia: un "Dato curioso del día" con bromas internas del grupo, fondos a elegir y pequeños detalles divertidos.

**Plataforma principal:** móvil (se usa en la mesa mientras se juega).

---

## 2. Stack técnico recomendado

| Pieza | Elección | Por qué |
|---|---|---|
| Base | **Vite + React + TypeScript** | Rápido, fácil de ampliar con secciones nuevas |
| 3D | **Three.js** con **@react-three/fiber** + **@react-three/drei** | La animación 3D del mapa en el espacio |
| Animaciones de interfaz | **Framer Motion** (paquete `motion`) | Fades, transiciones entre pantallas, menús |
| Sonido (opcional) | **Howler.js** | Efectos y música con control de volumen |
| Estado | **Zustand** | Simple; guarda ajustes y opciones de generación |
| Guardado | `localStorage` (con try/catch) | Ajustes, tableros favoritos |
| Tests | **Vitest** | Comprobar que el generador cumple las reglas |
| Instalable | **vite-plugin-pwa** | Que se pueda "instalar" en el móvil y funcione sin internet |
| Publicación | GitHub Pages, Netlify o Vercel | Para pasarle un enlace al amigo |

Si el móvil no aguanta bien el 3D, debe existir un **modo 2D de respaldo** (ver sección 7.4).

### Estructura de carpetas sugerida

```
src/
  app/            # rutas/pantallas: Inicio, Personalizar, Generacion, Tablero, Ajustes
  components/     # botones, tarjetas, toggles, modales (estilo del diseño)
  game/           # LÓGICA PURA del Catan (sin React): tablero, reglas, generador, semilla
    board.ts      # coordenadas de hexágonos, cruces (vértices) y caminos (aristas)
    generator.ts  # genera el tablero según las opciones
    rules.ts      # comprobaciones de equilibrio
    rng.ts        # aleatorio con semilla (mulberry32 o similar)
  three/          # escena 3D: espacio, isla, hexágonos, fichas, aura
  data/
    datos-curiosos.json
    nombres-isla.json
  styles/         # tokens de diseño (colores, radios, tipografías)
  audio/
tests/
```

**Regla importante:** la carpeta `game/` no importa nada de React ni de Three.js. Así se puede probar sola.

---

## 3. Diseño visual

El usuario va a hacer el diseño con **Claude Design**. Hasta que lo traiga, usa estos **tokens provisionales**
y, cuando llegue el diseño, sustitúyelos en `src/styles/` sin tocar los componentes.

### Estilo
- **Minimalista**, mucho aire, pocos elementos por pantalla.
- **Esquinas redondeadas** en todo (botones, tarjetas, menús): radio 16-24 px; botones en forma de píldora.
- **Títulos y letras "cremosas"**: tonos crema y marfil sobre fondos oscuros o desenfocados.
- Tarjetas tipo **cristal esmerilado** (fondo semitransparente + `backdrop-filter: blur`) sobre el fondo elegido.
- Sombras suaves, nada de bordes duros.

### Tokens provisionales
```
--crema:        #F3E9D2   (texto principal / títulos)
--crema-suave:  #E8DCC0   (texto secundario)
--marfil:       #FFF8EC   (resaltados)
--tinta:        #1E1B18   (fondos oscuros)
--tarjeta:      rgba(30, 27, 24, 0.55) + blur(16px)
--acento:       #E0A458   (botón principal, color trigo/miel)
--radio-s: 12px   --radio-m: 18px   --radio-l: 28px   --radio-pildora: 999px
```
Tipografías sugeridas (Google Fonts):
- **Títulos:** *Fraunces* o *DM Serif Display* (serif suave, "cremosa")
- **Texto:** *Nunito* o *Inter*

### Colores de los terrenos (provisionales)
| Terreno | Recurso | Color |
|---|---|---|
| Bosque | Madera | verde oscuro `#2F5D3A` |
| Pasto | Lana | verde claro `#8DBF5A` |
| Cereal | Trigo | dorado `#E3B94C` |
| Colinas | Arcilla | terracota `#C0623B` |
| Montañas | Mineral | gris piedra `#8A8D91` |
| Desierto | — | arena `#D9C49A` |

### Fondos a elegir (en Ajustes)
1. **Espacio** (por defecto): estrellas con parallax suave y una nebulosa tenue
2. **Océano**: olas animadas lentas
3. **Pergamino**: textura cálida, estilo mapa antiguo
4. **Atardecer**: degradado naranja-violeta
5. **Bosque nocturno**: siluetas de árboles y luciérnagas
6. **Minimal**: color liso oscuro (consume menos batería)

Cada fondo es un componente intercambiable con la misma interfaz.

---

## 4. Flujo del usuario (pantalla a pantalla)

```
[Carga] → [Inicio] ─┬→ [Personalizar] → [Generación épica] → [Tablero]
                    ├→ [Ajustes]                                │
                    └→ [Mis tableros]  ←──── guardar ───────────┘
```

### 4.1 Pantalla de carga
- Muy breve (o ninguna). Logo que aparece con un fade mientras cargan las texturas 3D.

### 4.2 Inicio
Al entrar, **todo aparece con un fade-in escalonado** (fondo → título → bienvenida → botón).
- **Arriba:** tarjeta pequeña **"💡 Dato curioso del día"** (sección 6). Se puede tocar para expandirla.
- **Centro:** el **título** de la app, grande y en crema.
- Debajo, una **frase corta de bienvenida** (puede cambiar según la hora: "Buenas noches, colonos").
- **Botón principal centrado:** "Generar tablero".
- **Abajo, discretos:** iconos de **Ajustes ⚙️** y **Mis tableros 📜**.
- El fondo elegido se mueve detrás, con calma.

### 4.3 Personalizar la generación
Se abre al pulsar "Generar tablero". Debe ser **rápido de usar**: arriba unos **presets** de un toque,
y debajo las opciones detalladas, agrupadas y plegables (sección 5.4).
- Modos (sección 5.5): **Oficial**, **Equilibrado** (recomendado), **Competitivo**, **Tranquila**, **Escasez**,
  **Continentes**, **Pelea por el centro**, **Mercaderes**, **Caos total**, más **🎲 Sorpresa** y **Personalizado**.
  Cada modo muestra su frase de "para qué sirve".
- Tocar cualquier opción cambia el modo a "Personalizado".
- Recordar la última configuración usada.
- Botón final grande: **"¡Crear isla!"**

### 4.4 Generación épica
La animación 3D (sección 7). Se puede **saltar tocando la pantalla**.

### 4.5 Tablero
El mapa ya colocado, en 3D, con un ligero giro posible con el dedo (limitado, sin perderlo de vista).
Acciones (barra inferior con botones redondeados):
- 🔄 **Otra vez** (regenera con las mismas opciones, animación más corta)
- ⭐ **Guardar** en Mis tableros
- 📊 **Análisis**: puntuación de equilibrio, mejores cruces, recurso más escaso
- 👁️ Mostrar/ocultar **puntitos de probabilidad**
- 📷 **Foto**: guarda una imagen del mapa para mandarla al grupo
- ⬅️ Volver al inicio

### 4.6 Ajustes
Ver sección 8.

### 4.7 Mis tableros
Lista de tableros guardados (miniatura, nombre de la isla, fecha). Abrir, renombrar o borrar.

---

## 5. El juego: Catan base (investigación)

> Para 3-4 jugadores, sin expansiones. **Claude:** si tienes acceso a internet, contrasta estos datos con el reglamento oficial
> (catan.com) y corrige aquí lo que haga falta. Hay pequeñas diferencias entre ediciones (por ejemplo, en el marco y los puertos).

### 5.1 Componentes que genera la app
**19 hexágonos de terreno** en forma de 3-4-5-4-3 filas:
| Terreno | Cantidad |
|---|---|
| Bosque (madera) | 4 |
| Pasto (lana) | 4 |
| Cereal (trigo) | 4 |
| Colinas (arcilla) | 3 |
| Montañas (mineral) | 3 |
| Desierto | 1 |

**18 fichas de número** (el desierto no lleva):
`2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12`. No hay 7: al sacar un 7 se mueve el ladrón.

Las fichas oficiales llevan **letras A-R** en el reverso para el montaje variable oficial:
`A5 B2 C6 D3 E8 F10 G9 H12 I11 J4 K8 L10 M9 N4 O5 P6 Q3 R11`.
Se colocan **en orden alfabético, en espiral en sentido antihorario**, empezando por una esquina exterior
y saltando el desierto. Ese orden evita por diseño que el 6 y el 8 queden juntos
(comprobado en los tests: 0 de 114 combinaciones de desierto × esquina de inicio los juntan).

**9 puertos** repartidos por la costa:
- 4 puertos **genéricos 3:1**
- 5 puertos **específicos 2:1** (uno por recurso)
En la 5.ª edición los puertos van impresos en las piezas del marco: sus posiciones son fijas y se pueden barajar las piezas.
En ediciones anteriores eran fichas que se colocaban sobre el mar.

**El ladrón** empieza siempre en el desierto.

**Tablero:** 19 hexágonos, **54 cruces** (donde van poblados y ciudades) y **72 caminos**.

### 5.2 Probabilidades (los "puntitos")
| Número | 2 | 3 | 4 | 5 | 6 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|
| Puntitos | 1 | 2 | 3 | 4 | 5 | 5 | 4 | 3 | 2 | 1 |
| Prob. (de 36) | 1 | 2 | 3 | 4 | 5 | 5 | 4 | 3 | 2 | 1 |

Total de puntitos en el tablero: **58**. El 6 y el 8 son los "números rojos".
Un cruce vale la **suma de puntitos** de sus hasta 3 hexágonos. Los cruces de 11-13 puntos son muy fuertes.

### 5.3 Cómo lo juega la gente (variantes habituales al montar)
- **Montaje para principiantes**: el mapa fijo del reglamento.
- **Montaje variable oficial**: terrenos al azar + números en espiral A-R.
- **Todo al azar con reglas de la casa**, la más común entre grupos con experiencia:
  - 6 y 8 nunca juntos (casi todos los grupos)
  - Dos números iguales nunca juntos
  - 2 y 12 no juntos (algunos grupos)
  - No más de 2 terrenos iguales juntos
  - Desierto en el centro (y el ladrón con él), o desierto en cualquier sitio
  - Que cada recurso tenga un reparto justo de puntitos (por ejemplo, que la arcilla no quede toda en 2 y 12)
  - Que ningún cruce sea demasiado bueno (tope de puntitos por cruce)
  - Puertos al azar, o puerto 2:1 lejos (o cerca) de su recurso
- **Caos total**: sin reglas, todo vale.
- Reglas de juego (no de montaje), solo para la chuleta: *ladrón amistoso* (no puede robar a quien tiene ≤ 2 puntos), etc.

### 5.4 Opciones del menú de personalización
Cada opción tiene un valor por defecto **según el modo** (sección 5.5). Las opciones están en `src/game/options.ts`.

**🏝️ Terrenos**
- Posición del desierto: `Centro` · `Aleatorio` · `En la costa`
- Distribución: `Normal` · `Regiones` (cada terreno forma un solo bloque)
- Máximo de terrenos iguales juntos: `Sin límite` · `3` · `2` · `Ninguno juntos`

**🎲 Números**
- Método: `Espiral oficial (A-R)` · `Aleatorio con reglas`
- 6 y 8 juntos: `Permitir` · `Evitar`
- Números iguales juntos: `Permitir` · `Evitar`
- 2 y 12 juntos: `Permitir` · `Evitar`
- Reparto justo por recurso: `Off` · `On` (diferencia máxima de puntitos entre recursos)
- Tope de puntitos por cruce: `Sin tope` · `12` · `11` (el 10 se quitó: ver Registro de decisiones)
- Zona de los 6 y 8: `Cualquiera` · `Solo interior` · `Solo costa`
- Escasez: `Ninguna` · `Recurso al azar` · un recurso concreto (ese recurso solo recibe 2, 3, 11 o 12)

**🚫 Combinaciones imposibles** (`optionConflicts()` en `options.ts`; el generador las rechaza al momento
y el menú de la Fase 2 debe impedirlas o avisar):
- 6 y 8 *solo en el interior* + *6 y 8 nunca juntos*: en las 7 casillas interiores solo caben 3 sin tocarse.
- *Escasez* + *reparto justo*: se contradicen.
- *Regiones* + límite de terrenos iguales juntos.
- *Espiral oficial* + zona de 6/8 o escasez: la espiral tiene un orden fijo.

**⚓ Puertos**
- Puertos: `Sí` · `No`
- Posición: `Fija (oficial)` · `Aleatoria por la costa` (nunca dos puertos en lados seguidos)
- Tipos: siempre barajados (como al mezclar las piezas del marco)
- Puerto 2:1 junto a su recurso: `Da igual` · `Evitar` · `Forzar`
  ("junto" = el hexágono de tierra al que pertenece ese lado de costa produce ese recurso)

*Reparto justo* = la diferencia de puntitos por hexágono entre el mejor y el peor recurso es ≤ 1,0
(`FAIR_SPREAD` en `src/game/rules.ts`).

**🦹 Ladrón**
- Empieza en: `Desierto` (oficial) · `Fuera del tablero` (variante)

### 5.5 Modos de generación
Cada modo es un conjunto de opciones pensado para un tipo de partida. El usuario elige un modo de un toque
y, si quiere, retoca opciones (entonces pasa a *Personalizado*). Hay también un botón **🎲 Sorpresa**,
que elige un modo al azar y dice cuál ha tocado.

| Modo | Para qué | Opciones clave |
|---|---|---|
| 📜 **Oficial** | Como el reglamento | Espiral A-R, puertos fijos, desierto al azar |
| ⚖️ **Equilibrado** | Partida normal y justa | Desierto en el centro, máx. 2 terrenos iguales juntos, 6/8, iguales y 2-12 separados, reparto justo, tope 12 |
| 🏆 **Competitivo** | Equilibrio máximo | Como Equilibrado + ningún terreno igual junto, tope 11, puertos fijos y lejos de su recurso |
| ☕ **Tranquila** | Jugar relajados o con gente nueva | Como Equilibrado + ladrón fuera al empezar, desierto en la costa |
| 📉 **Escasez** | Partidas de mucho comercio | Un recurso al azar solo tiene 2, 3, 11 o 12 |
| 🗺️ **Continentes** | Expandirse o comerciar | Cada terreno forma una sola región, reparto justo |
| 🔥 **Pelea por el centro** | Pelearse por el interior | Todos los 6 y 8 en el interior (pueden tocarse), desierto en la costa |
| ⚓ **Mercaderes** | Estrategia de puertos | Como Equilibrado + cada puerto 2:1 junto a su recurso |
| 🌪️ **Caos total** | Lo que salga | Sin reglas |

Velocidad medida (10.000 tableros por modo): todos por debajo de 0,5 ms por tablero.

---

## 6. Dato curioso del día

- Lista en `src/data/datos-curiosos.json`, un array de textos (pueden llevar emoji).
- El dato del día se elige **según la fecha** (número de día mod largo de la lista), para que **todos los amigos vean el mismo ese día**.
- Al tocar la tarjeta: se expande. Opción secreta: tocar 3 veces muestra otro al azar.
- **Las bromas las escribe el usuario.** Deja 3 ejemplos con `TODO`:
  ```json
  [
    "TODO: broma interna 1",
    "TODO: broma interna 2",
    "Dato real: el 7 sale 1 de cada 6 tiradas. Culpad a los dados, no a [TODO: nombre]."
  ]
  ```
- Idea: fechas especiales (cumpleaños del grupo) con un dato fijo ese día.

---

## 7. Animación de generación épica

### 7.1 Escena
- **Fondo espacial**: campo de estrellas en varias capas (parallax), una nebulosa suave y quizá un sol lejano que da luz lateral.
- La isla **flota en el espacio como si fuera un planeta**: alrededor, un **anillo de mar** brillante y un **aura/atmósfera**
  (halo azul-crema que late despacio, como la atmósfera de la Tierra vista desde el espacio).

### 7.2 Secuencia (≈ 5-6 s; versión rápida ≈ 2 s)
1. **Cámara lejos**: solo estrellas. Aparece un punto de luz que crece (la "semilla" del mundo).
2. **Se forma el aura** y el anillo de mar.
3. **Los hexágonos llegan volando** desde el espacio, **en espiral del centro hacia fuera**.
   Cada uno gira, cae en su sitio con un pequeño rebote y suelta un destello del color de su terreno.
4. **Las fichas de número caen girando como monedas** sobre cada hexágono; las de 6 y 8 brillan en rojo.
5. **Los barcos/puertos se deslizan** hasta su sitio en la costa.
6. **El ladrón** aparece con una nubecita de humo en el desierto.
7. **La cámara se acerca** y se queda inclinada en 3D. Aparecen el **nombre de la isla** y los botones del tablero.

Sonido (si está activado): zumbido espacial suave, un "tock" de madera por hexágono y un acorde final.

### 7.3 Detalle de los hexágonos en 3D
- Prismas hexagonales con un poco de grosor y bordes biselados.
- Decoración low-poly sencilla: árboles (bosque), ovejas (pasto), espigas (cereal), ladrillos/colinas (arcilla), picos (montaña), dunas (desierto).
- Fichas: discos color crema con el número en tipografía de título y los puntitos debajo.

### 7.4 Rendimiento y accesibilidad
- Objetivo: **60 fps en un móvil de gama media**. Medir y ajustar.
- Ajuste **Calidad gráfica**: Alta / Media / Baja (menos estrellas, sin sombras, menos partículas).
- **Modo 2D** de respaldo (SVG + Framer Motion) si WebGL falla o el usuario lo elige.
- Si el sistema tiene `prefers-reduced-motion`, usar por defecto la animación corta.
- Toque en pantalla = **saltar animación**.

---

## 8. Ajustes

- 🎨 **Fondo**: elegir entre los de la sección 3
- 🔊 **Sonido**: efectos on/off, música on/off, volumen
- ⏩ **Velocidad de animación**: Épica · Rápida · Sin animación
- 🖥️ **Calidad gráfica**: Alta · Media · Baja · Modo 2D
- 👁️ **Mostrar puntitos de probabilidad** por defecto
- 📳 **Vibración** al tocar (en móviles que la permitan)
- 🔆 **Mantener pantalla encendida** mientras se ve el tablero (Wake Lock API)
- 👥 **Jugadores del grupo**: nombres y colores (para futuras secciones: marcador, quién empieza…)
- 🗑️ Borrar datos guardados
- ℹ️ Créditos y versión

---

## 9. Fases (hoja de ruta)

### Fase 1: Base y lógica del juego ✅ (2026-11-02)
- [x] Proyecto Vite + React + TS creado, con `CLAUDE.md`
- [x] `game/board.ts`: 19 hexágonos (coordenadas axiales), 54 cruces, 72 caminos, vecinos y posiciones de puertos
- [x] `game/rng.ts`: aleatorio con semilla
- [x] `game/generator.ts`: genera según opciones (espiral oficial y aleatorio con reglas)
- [x] `game/rules.ts`: cada regla como función que devuelve qué incumple
- [x] Puntuación de equilibrio del tablero (0-100) y análisis (`game/score.ts`)
- [x] 9 modos de generación + Sorpresa, con descripción (`game/options.ts`)
- ~~Código de compartir~~ (quitado: la app la usa una sola persona)
- [x] Tests (ver sección 10): `npm test`
- [x] Vista 2D sencilla en SVG para comprobar visualmente (`components/BoardSvg.tsx` + pantalla de prueba en `App.tsx`)

### Fase 2: Interfaz y flujo ✅ (2026-11-02)
- [x] Tokens de diseño provisionales (`src/styles/tokens.css`; estilos de pantallas en `src/styles/app.css`)
- [x] Pantalla de Inicio con fade-in escalonado y Dato curioso del día (`src/app/Inicio.tsx`)
- [x] Menú de Personalizar con modos y opciones plegables; si una opción choca con otra, ajusta la otra y avisa (`src/app/Personalizar.tsx`)
- [x] Pantalla de Tablero (2D de momento) con Otra vez / Análisis / Puntitos y animación de aparición provisional (`src/app/Tablero.tsx`)
- [x] Transiciones suaves entre pantallas; el botón "atrás" del móvil vuelve a la pantalla anterior
- [x] Ajustes básicos (fondo, velocidad de animación, puntitos, borrar datos) guardados en el móvil (`src/app/Ajustes.tsx`, `src/store.ts`)
- [x] Fondos de momento: Espacio (estrellas animadas), Atardecer y Minimal. El resto, en la Fase 4.

### Fase 3: La escena 3D épica
- [ ] Fondo espacial con estrellas y parallax
- [ ] Isla 3D: hexágonos, fichas, puertos, ladrón
- [ ] Aura/atmósfera y anillo de mar
- [ ] Secuencia de animación completa + saltar tocando
- [ ] Calidad gráfica y modo 2D de respaldo
- [ ] Prueba real en el móvil del usuario

### Fase 4: Pulido y personalidad
- [ ] Todos los fondos seleccionables
- [ ] Sonidos y música (opcionales)
- [ ] Mis tableros (guardar, renombrar, borrar)
- [ ] Nombres de isla aleatorios
- [ ] Análisis del tablero
- [ ] Foto del mapa para compartir
- [ ] Integrar el diseño final de Claude Design

### Fase 5: Publicar
- [ ] PWA instalable y funcionando sin conexión
- [ ] Icono y pantalla de arranque
- [ ] Publicada con un enlace para el grupo
- [ ] Chequeo final (sección 10.3)

### Fase 6+: Extras (ver Banco de ideas)

---

## 10. Chequeos

### 10.1 Tests automáticos del generador (Vitest): `tests/generator.test.ts`
- [x] Siempre hay exactamente 19 hexágonos con la cantidad correcta de cada terreno
- [x] Siempre hay 18 números con la distribución correcta y el desierto sin número
- [x] Siempre hay 9 puertos (4 de 3:1 y 5 de 2:1, uno por recurso)
- [x] El ladrón empieza donde dice la opción
- [x] **10.000 generaciones** con cada preset → ninguna incumple sus reglas activas
- [x] Misma semilla + mismas opciones → **exactamente el mismo tablero**
- [x] Cada modo especial cumple lo suyo (escasez, regiones, 6/8 en el interior o la costa, ladrón fuera)
- [x] Los modos no tienen opciones contradictorias
- [x] La espiral oficial reproduce el orden A-R correctamente
- [x] Generar un tablero tarda **< 50 ms** (medido: Oficial 0,03 ms · Equilibrado 0,25 ms · Caos 0,02 ms)
- [x] Combinaciones de opciones imposibles → mensaje claro al usuario, nunca un bucle infinito (responde en ~15 ms)

### 10.2 Chequeos visuales y de uso (en cada fase)
*Fase 2 (2026-11-02): probado a 375 y 390 px. Sin scroll horizontal, botones y chips de 44 px o más,
sin errores en la consola, ajustes que sobreviven a recargar. Pendiente: contraste medido y prueba en el móvil real.*
- [ ] Se ve bien en móvil de 360 px de ancho y en PC
- [ ] Sin scroll horizontal
- [ ] Botones de al menos 44 px de alto (fáciles de tocar)
- [ ] Texto crema legible sobre todos los fondos (buen contraste)
- [ ] Sin errores en la consola
- [ ] La animación va fluida en el móvil del usuario

### 10.3 Chequeo final antes de publicar
- [ ] Funciona sin conexión tras la primera visita
- [ ] Se instala en Android e iPhone
- [ ] Los ajustes y tableros guardados sobreviven al cerrar la app
- [ ] Si localStorage falla (modo incógnito), la app sigue funcionando
- [ ] Lighthouse: rendimiento y accesibilidad > 90

---

## 11. Banco de ideas (para hacerla más divertida)

Claude: añade aquí ideas nuevas. El usuario elegirá cuáles entran.

- 🏷️ **Nombre aleatorio para cada isla** ("Isla de las Ovejas Perdidas", "Archipiélago del Trigo Maldito"), combinando palabras de `nombres-isla.json`, que puede incluir bromas del grupo.
- 🎲 **Dados virtuales 3D** con estadística de la partida ("el 7 ha salido 9 veces, sospechoso…").
- 🏆 **Marcador** de puntos con aviso de victoria a los 10 puntos y confeti.
- 👑 **Salón de la fama**: quién ha ganado más partidas del grupo.
- 🎡 **Ruleta "¿Quién empieza?"** con los nombres del grupo.
- 🧠 **Comentario gracioso del análisis**: "Este mapa es más justo que un juez" / "Alguien va a llorar por la arcilla".
- 🐑 **Sonidos al tocar hexágonos**: un "beee" en el pasto, un hachazo en el bosque.
- 🥚 **Easter eggs**: tocar el título 7 veces → aparece el ladrón y "roba" el botón un segundo.
- 🎖️ **Logros**: "Generaste 50 mapas", "Mapa perfectamente equilibrado", "Caos total ×10".
- 📅 **Eventos por fecha**: Navidad (nieve en el espacio), Halloween (ladrón con capa), cumpleaños del grupo.
- 📋 **Chuleta de reglas**: costes de construcción, cartas de desarrollo, ladrón y montaje inicial.
- ⏱️ **Temporizador de turno** opcional para el amigo lento (con broma incluida).
- 🌍 Más adelante: **expansión 5-6 jugadores** (30 hexágonos) y Navegantes.

---

## 12. Registro de decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-30 | Plan inicial creado | Idea del usuario: generador con animación épica en el espacio |
| 2026-11-02 | Proyecto en `C:\Users\alaea\catan`, git local, trabajo en `main` | El usuario no usa ramas; un commit por fase |
| 2026-11-02 | Quitado el tope de 10 puntitos por cruce | Siempre sale, pero tarda 150-300 ms por tablero (casi no hay combinaciones válidas). 11 ya da mapas muy igualados y sale en < 3 ms |
| 2026-11-02 | "Sin rojos en la costa" + "6 y 8 nunca juntos" es imposible | Solo hay 7 casillas interiores y en ellas caben 3 rojos sin tocarse, no 4. El menú de la Fase 2 debe impedirlo |
| 2026-11-02 | Tipos de puerto siempre barajados (sin opción "orden oficial") | No hay un orden oficial fijo fiable; en la 5.ª edición se mezclan las piezas del marco |
| 2026-11-02 | Posiciones fijas de puertos = separaciones 3-3-4 en la costa | Aproximación al marco de la 5.ª edición; revisar si el usuario tiene otra edición |
| 2026-11-02 | Números con reglas: se colocan primero las fichas más difíciles (6/8, luego 5/9…) | Mucho más rápido que ir casilla a casilla cuando hay topes de puntitos |
| 2026-11-02 | Quitado el código para compartir tableros | La app la usa una sola persona |
| 2026-11-02 | 9 modos de generación + Sorpresa (sección 5.5) | El usuario quería más modos, cada uno con un motivo distinto, no solo Caos total |
| 2026-11-02 | "Sin rojos en la costa" pasa a "Zona de los 6 y 8" (cualquiera / interior / costa) | Hace falta para el modo Pelea por el centro |
| 2026-11-02 | Al tocar una opción que choca con otra, se respeta la tocada y se ajusta la otra con un aviso | Más cómodo que bloquear opciones; `setOptionResolving()` en `options.ts`, con tests |
| 2026-11-02 | Sin router: la pantalla vive en el estado y se usa el historial del navegador | El botón atrás del móvil funciona sin añadir dependencias |
| 2026-11-02 | "Mis tableros" no aparece en el Inicio hasta la Fase 4 | No mostrar botones que aún no hacen nada |
| 2026-11-02 | Animación 2D provisional al generar (hexágonos del centro hacia fuera, números, puertos, ladrón) | Para que la Fase 2 ya se sienta viva; la Fase 3 la sustituye por la escena 3D |

---

## 13. Preguntas abiertas para el usuario

- [ ] ¿Cómo se llama la app? (título de la pantalla de inicio)
- [ ] ¿Nombres y colores de los amigos del grupo?
- [ ] ¿Se usará sobre todo en móvil? ¿Android o iPhone?
- [ ] ¿Queréis sonido y música?
- [ ] ¿Qué edición del Catan tenéis? (afecta a los puertos: marco fijo o fichas sueltas)
- [ ] ¿Cuándo llegará el diseño de Claude Design y en qué formato?
- [ ] Lista de bromas para el Dato curioso del día
- [ ] ¿Dónde publicarla? (GitHub Pages, Netlify…)
