const INTERACTIVE = 'input, textarea, select, button, [role="option"], [contenteditable]:not([contenteditable="false"])'

/**
 * True when a keydown came from a control that owns its own keys (text fields,
 * buttons, listbox options, editable content). Global shortcuts such as Space
 * for play must ignore these so a focused control's key is not handled twice.
 */
export function isInteractiveKeyTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null
}
