// Vibración corta al tocar algo. Android tiene navigator.vibrate; el iPhone no, pero desde iOS 18 Safari
// da un "toque" de vibración al cambiar un interruptor nativo (<input type="checkbox" switch>), así que
// se pulsa uno escondido. En móviles sin ninguna de las dos cosas, simplemente no pasa nada.

let hiddenSwitch: HTMLLabelElement | null = null;

export function haptic(ms = 10) {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
      return;
    }
    if (!hiddenSwitch) {
      hiddenSwitch = document.createElement('label');
      hiddenSwitch.setAttribute('aria-hidden', 'true');
      hiddenSwitch.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      hiddenSwitch.appendChild(input);
      document.body.appendChild(hiddenSwitch);
    }
    hiddenSwitch.click();
  } catch {
    /* sin vibración */
  }
}
