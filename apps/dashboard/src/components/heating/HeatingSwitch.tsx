/** [fork] The heating plan's switch (card head, window): one button with role switch. */

import { useIsGlas } from '../../app/glas/useUiStyle';

/**
 * The plan switch: Glas draws the iOS switch (controls.css `.g-switch`), Klassisch its own track. Disabled by
 * `aria-disabled`, not `disabled`: a disabled button loses the keyboard focus, and the switch is disabled while its
 * own call runs.
 */
export function HeatingSwitch({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: (on: boolean) => void }) {
  const glas = useIsGlas();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="heating-switch"
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onChange(!on);
      }}
    >
      <span className={glas ? 'g-switch' : `heating-switch__track${on ? ' heating-switch__track--on' : ''}`} aria-hidden="true" />
    </button>
  );
}
