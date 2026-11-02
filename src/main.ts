import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { deriveFamilies, validateCatalog, type DerivedCatalog, type TouchColor } from './catalog.ts';
import { textColorFor } from './contrast.ts';
import data from './data/touch-colors.json';
import {
  computeProgress,
  DEFAULT_FILTERS,
  hasActiveFilters,
  matchesFilters,
  NO_FAMILY,
  type Filters,
  type StatusFilter,
} from './filter.ts';
import { createBackup, getBrowserStorage, loadInventory, MAX_BACKUP_BYTES, parseBackup, saveInventory } from './inventory.ts';

/** Tamaño anunciado por las cartas TOUCH. Solo se usa para avisar la diferencia, nunca como denominador. */
const ANNOUNCED_CATALOG_SIZE = 204;

const { colors: catalog, aliases } = data as DerivedCatalog;

/** Fondo y texto de las tarjetas cuyo color ninguna fuente respalda (se muestran rayadas, sin inventar un HEX). */
const NO_HEX_SWATCH = '#F2F1EC';

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento #${id}`);
  return element as T;
}

function createElement(tag: string, className: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const ui = {
  notice: byId('storage-notice'),
  ownedCount: byId('owned-count'),
  totalCount: byId('total-count'),
  percent: byId('percent'),
  progress: byId('progress'),
  progressFill: byId('progress-fill'),
  missingText: byId('missing-text'),
  search: byId<HTMLInputElement>('search'),
  searchClear: byId('search-clear'),
  statusButtons: [...document.querySelectorAll<HTMLButtonElement>('[data-status]')],
  families: byId('family-filters'),
  resultsText: byId('results-text'),
  resetFilters: byId('reset-filters'),
  results: document.querySelector<HTMLElement>('.results')!,
  toolbar: document.querySelector<HTMLElement>('.toolbar')!,
  boot: byId('boot-message'),
  grid: byId('grid'),
  empty: byId('empty'),
  emptyText: byId('empty-text'),
  emptyClearSearch: byId('empty-clear-search'),
  emptyShowAll: byId('empty-show-all'),
  exportButton: byId('export'),
  importButton: byId('import'),
  importFile: byId<HTMLInputElement>('import-file'),
  clearButton: byId('clear'),
  catalogText: byId('catalog-text'),
  toast: byId('toast'),
  toastText: byId('toast-text'),
  toastAction: byId<HTMLButtonElement>('toast-action'),
  dialog: byId<HTMLDialogElement>('confirm-dialog'),
  dialogTitle: byId('confirm-title'),
  dialogText: byId('confirm-text'),
  dialogOk: byId('confirm-ok'),
};

// ---------- Estado ----------

const storage = getBrowserStorage();
const loaded = loadInventory(storage, new Set(catalog.map((c) => c.id)), aliases);

const state = {
  owned: loaded.owned,
  /** IDs guardados que no existen en este catálogo; se conservan sin mostrarse. */
  orphans: loaded.orphans,
  filters: { ...DEFAULT_FILTERS } as Filters,
};

function persist(): void {
  const ordered = catalog.filter((c) => state.owned.has(c.id)).map((c) => c.id);
  if (!saveInventory(storage, ordered, state.orphans)) {
    showNotice('No se pudieron guardar los cambios en este navegador. Seguís pudiendo usar la app, pero lo que marques se puede perder al cerrarla.');
  }
}

function showNotice(message: string): void {
  ui.notice.textContent = message;
  ui.notice.hidden = false;
}

// ---------- Cuadrícula ----------

const tiles = new Map<string, { item: HTMLLIElement; button: HTMLButtonElement }>();

function displayCode(color: TouchColor): string {
  return color.family + color.number;
}

function buildGrid(): void {
  const fragment = document.createDocumentFragment();
  for (const color of catalog) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    button.dataset.id = color.id;
    const swatch = color.hex ?? NO_HEX_SWATCH;
    button.style.setProperty('--swatch', swatch);
    button.style.setProperty('--ink', textColorFor(swatch));
    const noHex = color.hex === null ? ', color sin muestra verificada' : '';
    button.setAttribute('aria-label', `${displayCode(color)}, ${color.name}${noHex}`);
    button.title = `${displayCode(color)} · ${color.name}${noHex ? ' (color sin muestra verificada)' : ''}`;

    const code = createElement('span', 'tile-code');
    if (color.family) code.append(createElement('span', 'tile-family', color.family));
    code.append(createElement('span', 'tile-number', color.number));
    const name = createElement('span', 'tile-name', color.name);
    name.lang = 'en';
    const check = createElement('span', 'tile-check');
    check.setAttribute('aria-hidden', 'true');

    button.append(code);
    if (color.hex === null) {
      button.classList.add('tile-no-hex');
      button.append(createElement('span', 'tile-no-hex-label', 'sin muestra'));
    }
    button.append(name, check);
    item.append(button);
    fragment.append(item);
    tiles.set(color.id, { item, button });
  }
  ui.grid.append(fragment);
}

function buildFamilyChips(): void {
  const chip = (label: string, family: string | null, swatch?: string) => {
    const button = createElement('button', 'chip', label) as HTMLButtonElement;
    button.type = 'button';
    if (family !== null) button.dataset.family = family;
    if (swatch) {
      const dot = createElement('span', 'chip-dot');
      dot.style.setProperty('--swatch', swatch);
      dot.setAttribute('aria-hidden', 'true');
      button.prepend(dot);
    }
    ui.families.append(button);
    return button;
  };

  chip('Todas', null);
  for (const family of deriveFamilies(catalog)) {
    const swatches = catalog.filter((c) => c.family === family && c.hex !== null).map((c) => c.hex!);
    chip(family, family, swatches[Math.floor(swatches.length / 2)]);
  }
  const unfamilied = catalog.filter((c) => c.family === NO_FAMILY);
  if (unfamilied.length > 0) {
    const button = chip('Sin familia', NO_FAMILY);
    button.title = `Códigos sin familia: ${unfamilied.map((c) => c.id).join(', ')}`;
  }
}

function chipFamily(button: HTMLElement): string | null {
  return button.dataset.family ?? null;
}

// ---------- Render ----------

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function render(): void {
  const { owned, filters } = state;
  let visible = 0;
  for (const color of catalog) {
    const tile = tiles.get(color.id)!;
    const show = matchesFilters(color, owned, filters);
    tile.item.hidden = !show;
    tile.button.setAttribute('aria-pressed', String(owned.has(color.id)));
    if (show) visible++;
  }

  const progress = computeProgress(catalog, owned);
  ui.ownedCount.textContent = String(progress.owned);
  ui.totalCount.textContent = String(progress.total);
  ui.percent.textContent = `${progress.percent}%`;
  ui.progress.setAttribute('aria-valuemax', String(progress.total));
  ui.progress.setAttribute('aria-valuenow', String(progress.owned));
  ui.progress.setAttribute('aria-valuetext', `${progress.owned} de ${progress.total} colores`);
  ui.progressFill.style.setProperty('--progress', String(progress.total ? progress.owned / progress.total : 0));
  ui.missingText.textContent =
    progress.missing === 0 && progress.total > 0
      ? '¡Tenés todos los colores del catálogo!'
      : `Te ${progress.missing === 1 ? 'falta' : 'faltan'} ${plural(progress.missing, 'color', 'colores')}`;

  const active = hasActiveFilters(filters);
  ui.resultsText.textContent = active ? `${visible} de ${plural(catalog.length, 'color', 'colores')}` : plural(catalog.length, 'color', 'colores');
  ui.resetFilters.hidden = !active;

  ui.empty.hidden = visible > 0;
  const query = filters.query.trim();
  ui.emptyText.textContent = query ? `Ningún color coincide con “${query}”.` : 'No hay colores en esta vista.';
  ui.emptyClearSearch.hidden = query === '';

  ui.searchClear.hidden = filters.query === '';
  for (const button of ui.statusButtons) button.setAttribute('aria-pressed', String(button.dataset.status === filters.status));
  for (const button of ui.families.querySelectorAll<HTMLElement>('.chip')) {
    button.setAttribute('aria-pressed', String(chipFamily(button) === filters.family));
  }
}

/** Si la cuadrícula quedó por encima de la pantalla tras filtrar, vuelve al inicio de los resultados. */
function keepResultsInView(): void {
  const top = ui.results.getBoundingClientRect().top;
  const toolbarHeight = getComputedStyle(ui.toolbar).position === 'sticky' ? ui.toolbar.offsetHeight : 0;
  if (top < toolbarHeight) window.scrollTo({ top: window.scrollY + top - toolbarHeight - 8 });
}

function updateFilters(change: Partial<Filters>): void {
  state.filters = { ...state.filters, ...change };
  if (change.query !== undefined && ui.search.value !== change.query) ui.search.value = change.query;
  render();
  keepResultsInView();
}

function toggle(id: string): void {
  const color = catalog.find((c) => c.id === id);
  if (!color) return;
  const wasOwned = state.owned.has(id);
  if (wasOwned) state.owned.delete(id);
  else state.owned.add(id);
  persist();
  render();

  // Si el cambio hizo desaparecer la tarjeta de la vista filtrada, ofrecer deshacer.
  if (tiles.get(id)!.item.hidden) {
    showToast(`${displayCode(color)} ${color.name}: ${wasOwned ? 'pasó a “Me faltan”' : 'pasó a “Los tengo”'}`, {
      label: 'Deshacer',
      run: () => toggle(id),
    });
  }
}

// ---------- Toast y confirmación ----------

let toastTimer: number | undefined;
let toastAction: (() => void) | null = null;
let pendingUpdate: { message: string; action: { label: string; run: () => void } } | null = null;

function showToast(message: string, action?: { label: string; run: () => void }, persistent = false): void {
  window.clearTimeout(toastTimer);
  ui.toastText.textContent = message;
  toastAction = action?.run ?? null;
  ui.toastAction.hidden = !action;
  ui.toastAction.textContent = action?.label ?? '';
  ui.toast.hidden = false;
  if (!persistent) toastTimer = window.setTimeout(hideToast, action ? 6000 : 4000);
}

function hideToast(): void {
  ui.toast.hidden = true;
  toastAction = null;
  if (pendingUpdate) showToast(pendingUpdate.message, pendingUpdate.action, true);
}

function confirmAction(title: string, text: string, okLabel: string): Promise<boolean> {
  if (typeof ui.dialog.showModal !== 'function') return Promise.resolve(window.confirm(`${title}\n\n${text}`));
  window.clearTimeout(toastTimer);
  ui.toast.hidden = true;
  ui.dialogTitle.textContent = title;
  ui.dialogText.textContent = text;
  ui.dialogOk.textContent = okLabel;
  ui.dialog.returnValue = '';
  ui.dialog.showModal();
  return new Promise((resolve) => {
    ui.dialog.addEventListener('close', () => resolve(ui.dialog.returnValue === 'confirm'), { once: true });
  });
}

// ---------- Backup ----------

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function exportBackup(): void {
  const now = new Date();
  const ids = catalog.filter((c) => state.owned.has(c.id)).map((c) => c.id);
  const blob = new Blob([JSON.stringify(createBackup(ids, now), null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mis-touch-${localDate(now)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  showToast(`Copia exportada con ${plural(ids.length, 'color', 'colores')}.`);
}

async function importBackup(file: File): Promise<void> {
  if (file.size > MAX_BACKUP_BYTES) {
    showToast('El archivo es demasiado grande para ser una copia de Mis Touch.');
    return;
  }
  let text: string;
  try {
    text = await file.text();
  } catch {
    showToast('No se pudo leer el archivo.');
    return;
  }

  const result = parseBackup(text, new Set(catalog.map((c) => c.id)), aliases);
  if (!result.ok) {
    showToast(`No se importó nada. ${result.error}`);
    return;
  }

  const unknown = result.unknownIds.length
    ? ` Además trae ${plural(result.unknownIds.length, 'código que no está', 'códigos que no están')} en este catálogo (${result.unknownIds.join(', ')}); no se van a mostrar.`
    : '';
  const confirmed = await confirmAction(
    '¿Reemplazar tu colección?',
    `La copia tiene ${plural(result.ids.length, 'color', 'colores')}.${unknown} Tu selección actual (${plural(state.owned.size, 'color', 'colores')}) se va a reemplazar.`,
    'Reemplazar',
  );
  if (!confirmed) return;

  state.owned = new Set(result.ids);
  state.orphans = result.unknownIds;
  persist();
  render();
  showToast(`Copia importada: ${plural(result.ids.length, 'color', 'colores')}.`);
}

async function clearInventory(): Promise<void> {
  if (state.owned.size === 0 && state.orphans.length === 0) {
    showToast('Tu colección ya está vacía.');
    return;
  }
  const confirmed = await confirmAction(
    '¿Vaciar tu colección?',
    `Se van a desmarcar ${plural(state.owned.size, 'color', 'colores')}. No se puede deshacer; si querés, exportá una copia antes.`,
    'Vaciar',
  );
  if (!confirmed) return;
  state.owned = new Set();
  state.orphans = [];
  persist();
  render();
  showToast('Colección vaciada.');
}

// ---------- Eventos ----------

function bindEvents(): void {
  ui.grid.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.tile');
    if (button?.dataset.id) toggle(button.dataset.id);
  });

  ui.search.addEventListener('input', () => updateFilters({ query: ui.search.value }));
  ui.search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') updateFilters({ query: '' });
    if (event.key === 'Enter') ui.search.blur();
  });
  ui.searchClear.addEventListener('click', () => {
    updateFilters({ query: '' });
    ui.search.focus();
  });

  for (const button of ui.statusButtons) {
    button.addEventListener('click', () => updateFilters({ status: button.dataset.status as StatusFilter }));
  }
  ui.families.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('.chip');
    if (!button) return;
    const family = chipFamily(button);
    // Tocar la familia activa vuelve a "Todas".
    updateFilters({ family: family === state.filters.family ? null : family });
  });

  ui.resetFilters.addEventListener('click', () => updateFilters({ ...DEFAULT_FILTERS }));
  ui.emptyShowAll.addEventListener('click', () => updateFilters({ ...DEFAULT_FILTERS }));
  ui.emptyClearSearch.addEventListener('click', () => updateFilters({ query: '' }));

  ui.toastAction.addEventListener('click', () => {
    const action = toastAction;
    hideToast();
    action?.();
  });

  ui.exportButton.addEventListener('click', exportBackup);
  ui.importButton.addEventListener('click', () => ui.importFile.click());
  ui.importFile.addEventListener('change', () => {
    const file = ui.importFile.files?.[0];
    ui.importFile.value = '';
    if (file) void importBackup(file);
  });
  ui.clearButton.addEventListener('click', () => void clearInventory());
}

// ---------- Inicio ----------

function start(): void {
  const errors = validateCatalog(catalog);
  if (errors.length > 0) {
    ui.boot.textContent = 'El catálogo de colores tiene errores y no se puede mostrar. Tu colección guardada no se modificó.';
    console.error(errors);
    return;
  }

  buildFamilyChips();
  buildGrid();
  bindEvents();
  ui.boot.remove();

  const withoutHex = catalog.filter((c) => c.hex === null).map(displayCode);
  const estimated = catalog.filter((c) => c.hexEstimated).map(displayCode);
  ui.catalogText.textContent = [
    catalog.length === ANNOUNCED_CATALOG_SIZE
      ? `El catálogo tiene los ${catalog.length} colores de la línea TOUCH Twin.`
      : `El catálogo cargado tiene ${catalog.length} colores. Las cartas TOUCH anuncian ${ANNOUNCED_CATALOG_SIZE}; la diferencia todavía está en revisión, así que el total puede cambiar en una próxima versión sin que pierdas lo que marcaste.`,
    withoutHex.length > 0
      ? `${withoutHex.join(' y ')} todavía no tienen una muestra de color confiable, por eso aparecen rayados; podés marcarlos igual.`
      : '',
    estimated.length > 0 ? `El color de ${estimated.join(' y ')} se tomó de una foto de producto, así que es más aproximado que el resto.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (loaded.problem === 'unavailable') {
    showNotice('Este navegador no permite guardar datos (por ejemplo, en modo incógnito). Podés usar la app, pero lo que marques se perderá al cerrarla.');
  } else if (loaded.problem === 'corrupt') {
    showToast('Los datos guardados estaban dañados y no se pudieron leer. Empezamos con la colección vacía.');
  }

  render();
}

start();

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    // No se recarga solo: el usuario elige cuándo. El inventario ya está guardado en cada toque.
    pendingUpdate = { message: 'Hay una versión nueva de Mis Touch.', action: { label: 'Actualizar', run: () => void updateServiceWorker(true) } };
    showToast(pendingUpdate.message, pendingUpdate.action, true);
  },
  onOfflineReady() {
    showToast('Listo: Mis Touch ya funciona sin conexión.');
  },
});
