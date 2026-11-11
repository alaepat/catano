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
| 3D | **Three.js** con **@react-three/fiber** (sin drei: no hacía falta) | La animación 3D del mapa en el espacio |
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

### 5.6 Expansión: Navegantes de Catan (investigación, 2026-11-02)
> Resumen de memoria; **comprobar con el reglamento de la caja** (cifras y nombres cambian entre ediciones).
> **Nuevo mundo** ya está comprobado con el libro oficial (Catan: Seafarers, edición 2021, escenario 9, págs. 30-31):
> marco de **42 hexágonos** con el lado plano arriba, en columnas **5-6-7-6-7-6-5**; **19 de mar + 23 de tierra**
> (5 campos, 4 colinas, 4 montañas, 5 pastos, 5 bosques; **sin desierto ni oro**); **23 fichas** (2, 3×3, 4×3, 5×3, 6×2,
> 8×2, 9×3, 10×3, 11×2, 12); un 6 y un 8 nunca juntos; **9 puertos** (5 de 2:1 y 4 de 3:1) en lados entre tierra y mar
> (o tierra y marco), los colocan los jugadores; ladrón y pirata empiezan **fuera**; los pueblos iniciales en cualquier isla;
> **+1 punto** por construir en cada isla "extranjera" (una vez por isla); se gana con **12 puntos**. El libro permite
> rehacer el mapa si sale feo (muchas islas pequeñas o una isla enorme).

**Qué añade**
- **Mar dentro del tablero**: el mapa es más grande y se juega con varias islas separadas por agua.
- **Barcos** (15 por jugador): cuestan 1 madera + 1 lana. Van en lados que tocan el mar y deben enlazar con un pueblo, una ciudad
  u otro barco propio. Carreteras y barcos solo se unen a través de un pueblo o una ciudad. Una vez por turno se puede mover
  el último barco de una ruta abierta (no uno construido en ese turno).
- **Ruta comercial más larga** (carreteras + barcos, mínimo 5): sustituye a la carretera más larga, 2 puntos.
- **Campos de oro**: producen el recurso que el jugador elija.
- **Pirata**: va por el mar. Con un 7 o un caballero se mueve el ladrón o el pirata. El pirata bloquea barcos a su alrededor
  y roba a quien tenga barcos junto a él.
- **Puntos por islas nuevas**: el primer pueblo en una isla nueva da 1-2 puntos extra (fichas de Catan), según el escenario.
- **Escenarios** con mapa y meta de puntos propios (normalmente 12-14 puntos para 3-4 jugadores): Rumbo a nuevas costas,
  Las cuatro islas, El mar de niebla (casillas tapadas que se descubren al explorar), A través del desierto, La tribu olvidada,
  Telas para Catan, Las islas piratas, Las maravillas de Catan y **Nuevo mundo** (mapa aleatorio: el que mejor encaja con esta app).

**Cómo meterlo en la app**
1. Geometría flexible: hoy `board.ts` solo sabe hacer el hexágono de 19 casillas; hay que permitir mapas de cualquier forma.
2. Terrenos nuevos: `mar` y `oro`. Puertos en cualquier costa.
3. Escenarios como datos (JSON): casillas fijas, montones aleatorios, casillas ocultas, meta de puntos y bonus por isla.
4. Generador de **Nuevo mundo**: 3-4 islas separadas por mar, oro, 6 y 8 separados, puertos repartidos (con tests, como el base).
5. 3D: casillas de mar más bajas con olas, barcos de colores, barco pirata con velas negras.
   En El mar de niebla, las casillas ocultas salen boca abajo y se descubren tocándolas durante la partida.
6. En Personalizar: selector "Base / Navegantes" y, dentro, el escenario.
7. El marcador de puntos usa la meta del escenario y añade "Isla nueva" y "Ruta comercial más larga".

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

### 7.3 bis: Cómo está hecho (Fase 3, 2026-11-02)
- Todo en `src/three/`. `Board3D.tsx` monta el lienzo, la cámara, las luces y el giro con el dedo;
  `Island.tsx` (hexágonos, decoración, fichas, cruces del análisis), `Pieces.tsx` (barcos y ladrón con humo),
  `Space.tsx` (mar, aura, destello inicial y estrellas 3D).
- **Guion de la animación** en `src/three/timeline.ts` (tiempos de cada parte), con tests en `tests/timeline.test.ts`.
  Para retocar la animación, cambiar los números de `SEQ`.
- Las caras de las fichas y las etiquetas de los puertos se dibujan con canvas en el propio móvil (sin descargar nada).
- La escena 3D se descarga aparte (~245 kB comprimida) y Personalizar la pide por adelantado.
- Al acabar, la isla flota despacio y se puede girar un poco con el dedo; al soltar vuelve a su sitio.

### 7.4 Rendimiento y accesibilidad
- Objetivo: **60 fps en un móvil de gama media**. Medir y ajustar.
- Ajuste **Calidad gráfica**: Alta / Media / Baja (menos estrellas, sin sombras, menos partículas).
- **Modo 2D** de respaldo (SVG + Framer Motion) si WebGL falla o el usuario lo elige.
- Si el sistema tiene `prefers-reduced-motion`, el tablero sale directamente, sin animación (ver decisiones).
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

### Fase 3: La escena 3D épica ✅ (2026-11-02, falta probarla en el iPhone)
- [x] Fondo espacial con estrellas y parallax (estrellas 3D sobre el fondo animado; solo con el fondo Espacio)
- [x] Isla 3D: hexágonos con bisel y decoración low-poly, fichas, barcos en los puertos, ladrón (`src/three/`)
- [x] Aura/atmósfera y anillo de mar
- [x] Secuencia de animación completa + saltar tocando ("Toca para saltar" acelera hasta el final)
- [x] Calidad gráfica (Alta / Media / Baja / 2D en Ajustes) y modo 2D de respaldo si el 3D falla o el móvil no puede
- [ ] Prueba real en el móvil del usuario (fluidez a 60 fps: no se puede medir desde el PC)
- [x] Nombre de la isla al final de la animación (hecho en la Fase 4)

### Fase 4: Pulido y personalidad ✅ (2026-11-02, salvo el diseño de Claude Design)
- [x] Todos los fondos seleccionables: Espacio, Océano, Pergamino (oscuro, para que se lea el texto crema), Atardecer, Bosque nocturno y Minimal (`components/Background.tsx`)
- [x] Sonidos: efectos sintetizados en el móvil (`lib/sound.ts`), apagados por defecto; se encienden en Ajustes. Música: no (pendiente de que el usuario la quiera)
- [x] Mis tableros: guardar ⭐ desde el tablero, abrir, renombrar y borrar (`app/MisTableros.tsx`, máximo 60)
- [x] Nombres de isla aleatorios (`lib/islandName.ts` + `data/nombres-isla.json`, con hueco para bromas del grupo); salen al terminar la animación
- [x] Análisis del tablero, ahora con un comentario con gracia (`lib/comentario.ts`)
- [x] Foto del mapa para compartir: imagen 1080×1350 con nombre, modo y equilibrio; en el iPhone abre el menú de compartir (`lib/photo.ts`)
- [ ] Integrar el diseño final de Claude Design (esperando al usuario)

### Fase 5: Publicar (adelantada el 2026-11-02)
- [x] PWA instalable y funcionando sin conexión (`vite-plugin-pwa` en `vite.config.ts`)
- [x] Icono (`public/icon.svg` → `npm run iconos` genera los PNG). Pantalla de arranque: pendiente
- [x] Publicada: **https://alaepat.github.io/catano/** (repo `alaepat/catano`, se publica sola en cada push a `main`
      con `.github/workflows/publicar.yml`; si un test falla, no se publica). Comprobado: carga, genera tableros y el modo sin conexión está activo
- Para publicar un cambio: commit en `main` + `git push`. En 1-2 minutos está en la web; la app instalada se actualiza sola al abrirla
- [ ] Probada instalada en el iPhone 17 del usuario ("Compartir → Añadir a pantalla de inicio" en Safari)
- [ ] Chequeo final (sección 10.3)

### Fase 6: Peticiones del usuario (2026-11-02: hechos 6.1 a 6.8; en 6.7 falta el resto de escenarios)

**6.1 Esconder lo que no hace falta** (la app la usa una sola persona)
- [x] Ocultar 📷 Foto y ⭐ Guardar / Mis tableros con interruptores en `lib/config.ts` (`FEATURES = { foto: false, guardar: false }`).
  No borrar el código: se puede volver a encender en el futuro.

**6.2 Acercar la cámara (zoom)**
- [x] Tocar un hexágono o su número → la cámara vuela hasta él y muestra una tarjeta: terreno, número,
  puntitos y probabilidad (p. ej. "8 · 5 puntitos · 13,9 %"). Botón "Ver todo" o tocar fuera → vuelve.
- [x] Pellizcar con dos dedos = zoom libre (con límites para no perder la isla). Con zoom, arrastrar mueve el mapa.
  Tocar el mar o "Ver todo" vuelve a la vista completa. (El doble toque no hace falta: un toque ya acerca.)
- [x] En modo 2D: tocar un hexágono lo amplía (zoom con CSS sobre el SVG) y muestra la misma tarjeta.
- [x] (v0.7) El pellizco acerca hacia donde están los dedos (el punto bajo los dedos se queda bajo los dedos) y con
  dos dedos también se mueve el mapa. Con un dedo, el mapa sigue al dedo exactamente.
- [x] (v0.7) Sin bordes: el lienzo 3D ocupa toda la pantalla, por detrás de textos y botones. Sin zoom, la isla se encaja
  en el hueco libre (`.board-3d` es solo ese hueco; la cámara se desplaza con `setViewOffset`). En 2D el SVG puede salirse de su caja.

**6.3 Marcador de puntos** (dentro del tablero)
- [x] Jugadores guardados en el móvil (nombre + color de Catan; se reutilizan en cada partida). `marcadorStore.ts`, `lib/marcador.ts`.
- [x] Tira de jugadores arriba del tablero (moneda del color con los puntos y el nombre debajo). Tocar uno → hoja con botones claros:
  + Pueblo (1), Pueblo → Ciudad (+1, la ciudad vale 2 pero sustituye al pueblo), Carretera más larga (+2, se quita al anterior),
  Gran ejército (+2, igual), Carta de punto de victoria (+1), Deshacer. Con Navegantes: isla nueva y ruta comercial más larga.
- [x] Empieza con 2 pueblos por jugador (2 puntos). Límites del juego: 5 pueblos, 4 ciudades y 5 cartas de punto.
- [x] Al llegar a 10: celebración con confeti y resumen (duración y clasificación). Pendiente: gráfico de puntos.
- [x] Historial de ganadores (Salón de la fama), en la hoja "¿Quién juega?" y en el menú de la partida.

**6.4 Pantalla de modos más bonita**
- [x] Elegida la **Rueda** (2026-11-02). `ModeWheel.tsx`: los modos en círculo; se gira con el dedo (con impulso
  y encaje), o se toca uno para subirlo arriba. El de arriba (junto a la marca) es el elegido, con un "toc" y una
  vibración corta. En el centro, un minitablero de ejemplo de ese modo (semilla fija). Debajo, nombre y descripción.

**6.5 Fondos nuevos**
- [x] Playa (arena, olas, palmeras al atardecer). `components/Scenes.tsx`.
- [x] Canoa liderando los mares (canoa con remero que se mece sobre olas animadas, al amanecer).
- [x] Espacio: con la isla ya generada, las estrellas pasan hacia abajo con estela, como si la isla volara hacia arriba
  (las estrellas 3D se apagan al terminar y toman el relevo las del fondo; `flying` en el store).
- [x] ~~Camping~~ (v0.7, ilustración nocturna con el Polo por detrás): **no gustó** (2026-11-02). Sustituido por el Parque.
  Quien lo tenía elegido pasa al Parque solo (`migrateBackground` en `store.ts`).
- [x] **Parque** (v0.8, muy importante para el usuario): parque verde con el sol poniéndose; a media distancia 4 personas
  jugando al Catan en sillas de playa sobre una manta de cuadros (cada una distinta: pelo, ropa, postura, latas, cartas,
  un perro), y aparcado al lado un **Volkswagen Polo blanco 2023** calcado de fotos reales (Wikimedia Commons, Polo VI
  restyling: pilotos de dos piezas, pilar C ancho, llantas de radios dobles). Estilo pintado a mano, con imperfecciones a propósito.
- [x] **Mesa de noche** (v0.8): ilustración pintada *inspirada* en la foto del usuario (pérgola con lámpara, mesa con el
  Catan, zumo, ajedrez, pueblo blanco iluminado al fondo, 4 jugadores). La foto **no** se publica (sigue solo en `docs/`, sin subir).
- Cómo están hechos: SVG fijos en `public/fondos/` (`parque.svg`, `mesa-noche.svg`), generados con scripts de Python
  (no están en el repo) y pintados una vez como `<img>`; encima, `PaintedScenes.tsx` anima lo poco que se mueve
  (pájaros; lámpara que respira, polillas y luces del pueblo). Mismo lienzo 1080×1920 y encuadre `xMidYMax slice`.

- [x] (v0.8.1) En el inicio, **mantener pulsado** (~0,5 s) esconde todo y deja ver solo el fondo; al soltar vuelve
  (y ese toque no pulsa ningún botón). `usePeek` en `Inicio.tsx`.
- [x] (v0.9) Parque y Mesa de noche dibujados con código (v0.8) **no convencieron**. Sustituidos por imágenes que el usuario
  generó con ChatGPT (Claude Design no genera ilustraciones): `public/fondos/parque.webp` (5 amigos jugando en el maletero del
  Polo blanco, de lejos, sin caras reconocibles, atardecer con viento) y `mesa-noche.webp` (su foto redibujada, sin personas;
  con grano fino para que el cielo oscuro no salga a escalones). 852×1846.
  Capa animada en `PaintedScenes.tsx` (mismo tamaño que la imagen): parque = sol que palpita, pájaros, semillas al viento y
  cielo de arriba oscurecido para leer el título; noche = lámpara que respira, polillas, luces del pueblo y estrella fugaz.
  En CSS la imagen se agranda desde arriba (120 % / 117 %) para que la escena quede bajo el botón "Generar tablero".
- [x] (v0.9.1) Fondo extra **Mesa en el espacio** (`flotante`): la mesa sobre una isla flotante con luna (imagen del usuario, ChatGPT).
  La isla está recortada aparte con transparencia (`mesa-espacio-isla.webp`, GrabCut con contorno a mano) y sube y baja
  despacio sobre el cielo (`mesa-espacio.webp`, con el hueco rellenado). Lámpara, luna, estrellas que parpadean y estrella fugaz.
  Miniatura para Ajustes: `mesa-espacio-mini.webp` (la imagen entera, pequeña).
- [x] (v0.10) **Fondo del tablero**: en la pantalla del tablero la isla es la protagonista, así que el fondo pasa solo al
  Espacio (con su "vuelo") y al volver al inicio regresa el elegido, con un fundido. Ajustes → Tablero → "Fondo mientras ves
  el tablero": Espacio (por defecto) / Minimal / El mismo. `lib/background.ts` (`backgroundFor`), `settings.boardBackground`.

**6.6 Iconos propios en vez de emojis**
- [x] Juego de iconos SVG propio (trazo fino y redondeado, color crema): recursos, modos, acciones, puertos. `lib/glyphs.ts`.
  Sustituidos los emojis de toda la app, también los del 2D y las etiquetas de los puertos en 3D.

**6.7 Expansión Navegantes de Catan** (v0.12, 2026-11-09; ver sección 5.6)
- [x] Geometría flexible: `board.ts` construye tableros de cualquier forma (`Geometry`: hexágonos, cruces, caminos,
  "de punta" o "de lado plano"). `BASE_GEOMETRY` (el de siempre) y `SEA_GEOMETRY` (marco de 42 de Nuevo mundo).
  `Board.map` dice cuál es (si falta, es el base: los tableros guardados antes siguen valiendo). `geometryOf(board)`.
- [x] Terreno `mar`. Puertos de Navegantes: `Port.coast` = id del lado entre tierra y mar/marco.
- [x] `game/navegantes.ts`: `generateNuevoMundo('equilibrado' | 'azar')` con las piezas oficiales. "Equilibradas":
  3-6 islas, la grande de 6-11 hexágonos con 4 de los 5 recursos, cada recurso en 2 islas o más, números sin iguales
  juntos, 2 y 12 separados, tope 12 puntitos por cruce, reparto justo, puertos repartidos por islas (uno por casilla
  de mar). "Al azar (reglas)": solo el 6 y el 8 separados. Tarda menos de 1 ms. Tests en `tests/navegantes.test.ts`.
- [x] 2D y 3D: casillas de mar (en 3D, hexágonos de agua sobre un mar más grande), piezas giradas 30° (lado plano
  arriba), puertos sobre el mar, animación del mismo largo que el base, cámara encajada al marco.
- [x] "Tu isla": selector **Catan / Navegantes** arriba; en Navegantes, ficha de Nuevo mundo y "Islas: Equilibradas /
  Al azar (reglas)". Botón "¡Crear mapa!".
- [x] Marcador: con un mapa de Navegantes, las partidas nuevas van a **12**, con "Isla nueva" (+1) y "Ruta comercial más
  larga". Logro nuevo "Rumbo al Nuevo mundo". El mar no cuenta para el Geólogo ni Nuevo mundo para los 9 modos.
- [x] Oro y desierto opcionales en Nuevo mundo (v0.13, variante de la casa: el libro no los usa en este escenario).
  2 ríos de oro y/o 2 desiertos en lugar de casillas de mar. El oro lleva 3, 4, 10 u 11 y, en "Equilibradas", va en
  islas pequeñas y no juntos. Terreno nuevo `oro` (2D, 3D con arroyo y pepitas, tarjeta "Da el recurso que elijas").
- [x] Escenarios 1-4 del libro (v0.14, montaje de 4 jugadores): Rumbo a nuevas costas (14 puntos), Las cuatro islas
  (13, marco de 35), Islas de niebla (12, casillas `niebla` blancas con "?" en 2D y nubes en 3D) y A través del desierto
  (14). Silueta fija del libro y, dentro, terrenos, números y 9 puertos al azar ("Variable Set-up"); Equilibrado o Al
  azar. Ladrón donde dice el libro (desierto o el 12) y pirata en una casilla de mar. `game/mapas.ts` (con tests).
- [x] Barco pirata en 3D (negro, vela oscura, calavera y bandera roja): en su casilla o, en Nuevo mundo, dando vueltas
  alrededor del marco. En 2D, disco negro con el barco.
- [x] Escenarios 5-8 (v0.15) en el marco grande de 49 hexágonos (`GRANDE_GEOMETRY`, columnas 6-7-8-7-8-7-6), copiados
  del libro en `game/mapas2.ts` (con tests que cuadran piezas y fichas con la lista del libro): La tribu olvidada (13;
  isla grande al azar, sin 5/6/8/9 abajo; regalos: 8 fichas de punto, 4 cartas y 6 puertos), Tela para Catan (14; dos
  islas al azar y 8 aldeas con número en los cruces), Las islas piratas (10 + fortaleza; mapa fijo, sin ladrón, con
  fortalezas, objetivos y casas de cada color) y Las maravillas de Catan (isla grande al azar, sin 6/8 junto a los
  desiertos; cruces reservados y "!"). `Board.spots` (cruces) y `Board.gifts` (lados), en 2D y 3D.
- [ ] Pendiente si se pide: mapas de 3 jugadores.

**6.11 Letras, nombres a gusto y portada nueva** (v0.16, 2026-11-11)
- [x] ~~Ajustes →~~ (desde v0.17, solo en Caos total) "Letras en vez de números": las fichas salen con su letra (Catan base: la letra de verdad de cada ficha,
  A=5, B=2...; en los demás mapas, letras seguidas que no dicen nada). Sin análisis ni 6/8 en rojo hasta tocar
  **Números** (el botón sustituye a Puntitos) para darles la vuelta. `game/letras.ts` (con tests).
- [x] Título de la portada a gusto (Ajustes → Portada; vacío = Cataniciño) y nombre de cada isla tocándolo en el tablero.
- [x] Portada: fuera el dato curioso del día. Arriba, una islita de 7 hexágonos flotando con un barquito; bajo el
  título, un adorno; saludo "QUE TALLL SEÑOORRR" y la predicción "hoy gana el [color] y el número que más va a caer es
  el [n]" (color de jugador al azar y dos dados de verdad, que se ven debajo).

**6.12 Letras en Caos total y modos favoritos** (v0.17, 2026-11-11)
- [x] Las letras ya no son un ajuste: van con el modo **Caos total** (`LETTER_PRESETS` en `game/options.ts`). Todo
  tablero de Caos total sale con letras; el botón **Números** abre antes una ventanita "¿Seguro que ya pusieron todos los
  pueblos, pillín!!??" (Todavía no / ¡Sí, dale la vuelta!) y solo entonces se ven los números.
- [x] **Equilibrado** y **Caos total** resaltados como favoritos (`FAVORITE_PRESETS`): estrellita y borde dorado en la
  rueda, y etiqueta "★ Favorito" junto al nombre del modo.

**6.9 Ruleta "¿Quién empieza?"** (v0.12)
- [x] Rueda con los jugadores de la partida (sus colores y nombres). Sale sola al empezar una partida en el marcador y
  desde el menú "···" → "¿Quién empieza? Girar la ruleta". Gira 5-6 vueltas, "tic" (o vibración) en cada separación,
  acorde al parar; atenúa a los demás y dice "Empieza X · luego se sigue hacia su izquierda". `lib/ruleta.ts` (con tests)
  y `components/Ruleta.tsx`.

**6.10 Nombre, partidas jugadas y ampliación 5-6 jugadores** (v0.13, 2026-11-11, víspera del cumple)
- [x] La app se llama **Cataniciño** (portada, pestaña, icono del iPhone y manifest). Título algo más pequeño para que quepa.
- [x] "Partidas jugadas" empieza en **45** (las que el grupo ya llevaba): `PARTIDAS_PREVIAS` en `lib/logros.ts`; se ve en
  Logros y sube con cada partida terminada en el marcador. Veterano = 50 partidas jugadas; logro nuevo Centenario = 100.
- [x] **Ampliación 5-6 jugadores**: tercera opción en "Tu isla" (Catan / 5-6 / Navegantes). 30 hexágonos en filas
  3-4-5-6-5-4-3 (6 bosque, 6 pasto, 6 cereal, 5 colinas, 5 montañas, 2 desiertos), 28 fichas, 11 puertos (5 de 3:1 y
  6 de 2:1, dos de lana) repartidos por la costa, ladrón en un desierto. Equilibrado (sin 3 iguales juntos, desiertos
  separados, números sin iguales juntos, 2-12 separados, tope 12 por cruce, reparto justo) o Al azar (solo 6/8
  separados). `game/cincoSeis.ts` (con tests) y `game/reparto.ts` (reparto común de números y puertos).
- [x] Geometría: `Geometry.kind` ('isla' con disco de mar / 'mar' con marco) y `Geometry.coast`; `makeGeometry` registra
  cada forma para `geometryOf`. Mar y cámara se ajustan al tamaño de la isla.

**6.8 Números de las fichas a gusto** (Ajustes → "Números de las fichas", v0.7)
- [x] Tamaño (pequeños / normales / grandes: cambia la cifra y un poco la ficha), letra (Clásica, Redonda, Moderna, Romana
  con Cinzel, A mano con Caveat) y "El 6 y el 8 en rojo". Muestra en vivo con tres fichas. `lib/numberStyle.ts`; vale para 3D y 2D.

### Fase 7+: Extras (ver Banco de ideas)

**7.1 Logros** (v0.11, 2026-11-02)
- [x] 13 logros: generar 1/10/50/200 tableros, los 9 modos, 10 en Caos, equilibrio ≥ 95 y < 50, de madrugada,
  tocar los 6 terrenos, 5 fondos, 1 y 10 partidas con el marcador. `lib/logros.ts` (puro, con tests) + `logrosStore.ts`
  (guardado aparte, 'catan-logros'). Aviso "Logro conseguido" en cualquier pantalla (`LogroToast`, vibra y, con sonido, acorde).
  Pantalla `Logros` desde la medalla del inicio (junto a Ajustes). Lo anterior a esta versión no cuenta (empieza en 0).

**7.2 Tocar un hexágono suena o vibra** (v0.11)
- [x] Con sonido: un efecto por terreno (hacha en el bosque, "beee" en el pasto, viento en el trigo, ladrillos en las
  colinas, pico en la montaña, viento seco en el desierto), sintetizados en `lib/sound.ts`. Sin sonido: vibración corta.
- [x] `lib/haptics.ts`: Android usa `navigator.vibrate`; el iPhone no lo tiene, así que se pulsa un interruptor nativo
  escondido (`<input type="checkbox" switch>`, iOS 18+), que da un toque de vibración. También lo usan la rueda de modos
  y el "mantener pulsado" del inicio. Sin probar aún en el iPhone.

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
*Repaso final (2026-11-11, v0.12.1, web publicada a 360 px): inicio, Tu isla (Catan y Navegantes), tablero de Nuevo
mundo, marcador, ruleta y ajustes. Sin scroll horizontal, sin errores en la consola. Los círculos de color del marcador
(32 px) tienen ahora zona de toque de ~40x44 px.*
- [x] Se ve bien en móvil de 360 px de ancho y en PC
- [x] Sin scroll horizontal
- [x] Botones de al menos 44 px de alto (fáciles de tocar) (los de icono, 36-40 px con zona de toque suficiente)
- [ ] Texto crema legible sobre todos los fondos (buen contraste)
- [x] Sin errores en la consola
- [ ] La animación va fluida en el móvil del usuario

### 10.3 Chequeo final antes de publicar
- [x] Funciona sin conexión tras la primera visita (todo precacheado, fondos y 3D incluidos; tipografías de Google
  guardadas la primera vez)
- [ ] Se instala en Android e iPhone
- [ ] Los ajustes y tableros guardados sobreviven al cerrar la app
- [x] Si localStorage falla (modo incógnito), la app sigue funcionando (`lib/storage.ts` lo envuelve todo en try/catch)
- [ ] Lighthouse: rendimiento y accesibilidad > 90

---

## 11. Banco de ideas (para hacerla más divertida)

Claude: añade aquí ideas nuevas. El usuario elegirá cuáles entran.

- 🏷️ **Nombre aleatorio para cada isla** ("Isla de las Ovejas Perdidas", "Archipiélago del Trigo Maldito"), combinando palabras de `nombres-isla.json`, que puede incluir bromas del grupo.
- ~~🎲 Dados virtuales~~ (descartado por el usuario, 2026-11-02)
- 🏆 **Marcador** de puntos con aviso de victoria a los 10 puntos y confeti.
- 👑 **Salón de la fama**: quién ha ganado más partidas del grupo.
- ✅ 🎡 **Ruleta "¿Quién empieza?"** (hecho, Fase 6.9)
- 🧠 **Comentario gracioso del análisis**: "Este mapa es más justo que un juez" / "Alguien va a llorar por la arcilla".
- ✅ 🐑 **Sonidos al tocar hexágonos** (hecho, Fase 7.2; sin sonido, vibra)
- ~~🥚 Easter eggs~~ (descartado)
- ✅ 🎖️ **Logros** (hecho, Fase 7.1)
- ~~📅 Eventos por fecha~~ (descartado)
- ~~📋 Chuleta de reglas~~ (descartado)
- ~~⏱️ Temporizador de turno~~ (descartado)
- 🌍 Más adelante: **expansión 5-6 jugadores** (30 hexágonos). ✅ Navegantes · Nuevo mundo hecho (Fase 6.7).

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
| 2026-11-02 | Publicada como web instalable (PWA) en GitHub Pages, no en App Store / Play Store | Gratis y se actualiza sola; la App Store cuesta 99 €/año, pide Mac, revisa cada versión y rechazaría el nombre "Catan" (marca registrada). El usuario de la app tiene iPhone |
| 2026-11-02 | La app la usa una sola persona | Por eso no hay código para compartir ni funciones multijugador |
| 2026-11-02 | 3D sin @react-three/drei; los controles (girar con el dedo y volver) están hechos a mano | Lo único que se usaba era eso; así la descarga pesa menos |
| 2026-11-02 | La escena 3D se carga aparte (lazy) y el lienzo 3D no se recrea al pulsar "Otra vez" | La app arranca igual de rápido que antes, y el iPhone no acumula lienzos 3D |
| 2026-11-02 | Números de las fichas dibujados con canvas, no con texto 3D | El texto 3D descargaría tipografías de internet y fallaría sin conexión |
| 2026-11-02 | Con "reducir movimiento" del sistema, el tablero sale sin animación | Una cámara que vuela por el espacio puede marear; el plan decía "animación corta", pero es más seguro quitarla |
| 2026-11-02 | La animación nunca avanza más de 0,1 s por fotograma | Si el móvil se atasca un momento, la animación va más lenta en vez de dar saltos |
| 2026-11-02 | Sonidos sintetizados con Web Audio, no archivos ni Howler.js | No pesan nada, funcionan sin internet y no hay que buscar sonidos con licencia |
| 2026-11-02 | Sonido apagado por defecto | El usuario aún no ha dicho si lo quiere, y que la app suene de golpe en público molesta |
| 2026-11-02 | Pergamino oscuro (cuero viejo) en vez de claro | Con un pergamino claro el texto crema no se leería |
| 2026-11-02 | La foto 3D se hace con un encuadre cuadrado propio y sin estrellas, con los bordes difuminados | Con el encuadre de la pantalla el aura quedaba cortada en seco |
| 2026-11-02 | Mis tableros se guarda en el móvil (localStorage), hasta 60 islas | Una sola persona usa la app; no hace falta servidor |

---

## 13. Preguntas abiertas para el usuario

- [x] ¿Cómo se llama la app? → **Cataniciño** (2026-11-11)
- [ ] ¿Nombres y colores de los amigos del grupo?
- [ ] ¿Se usará sobre todo en móvil? ¿Android o iPhone?
- [ ] ¿Queréis sonido y música? → hay efectos (apagados por defecto, en Ajustes). ¿Encenderlos por defecto? ¿Música?
- [x] Bromas del grupo → **canceladas** por el usuario (2026-11-02): la app es solo para generar el tablero.
  El Dato curioso del día ahora son datos reales de Catan (`datos-curiosos.json`); `bromas` de islas queda vacío.
- [ ] ¿Qué edición del Catan tenéis? (afecta a los puertos: marco fijo o fichas sueltas)
- [ ] ¿Cuándo llegará el diseño de Claude Design y en qué formato? (El usuario preguntó qué es; explicado el 2026-11-02. ¿Lo usará o diseña Claude?)
- [ ] Zoom: ¿tocar un hexágono para acercarse, pellizcar con dos dedos, o las dos cosas?
- [ ] Marcador: nombres y colores de los 4 jugadores; ¿empezar con 2 puntos cada uno?; ¿cartas de punto de victoria visibles u ocultas hasta el final?
- [ ] Pantalla de modos: ¿qué diseño (A carrusel, B ruleta, C mosaico, D mazo)?
- [x] Camping → Parque al atardecer, ilustración, 4 personas inventadas (respondido 2026-11-02)
- [ ] Fotos personales como fondo: ¿OK con que estén en la web pública? (por ahora: ilustración inspirada, la foto no se sube)
- [ ] Iconos: ¿iconos propios dibujados o sin iconos?
- [ ] Navegantes: ¿qué escenarios primero? ¿Solo 3-4 jugadores?
- [x] ¿Dónde publicarla? → GitHub Pages, https://alaepat.github.io/catano/ (repo público: todo lo que se suba se ve)
- [x] ¿Móvil? → la usará una persona con un **iPhone 17** (402×874 puntos)
