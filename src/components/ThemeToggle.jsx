import { IconMoon, IconSun } from '../lib/icons.jsx'

export default function ThemeToggle({ theme, onChange }) {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      <span className="pill" aria-hidden="true" />
      <button
        type="button"
        aria-label="Switch to dark theme"
        aria-pressed={theme === 'dark'}
        className={theme === 'dark' ? 'active' : ''}
        onClick={() => onChange('dark')}
      >
        <IconMoon />
      </button>
      <button
        type="button"
        aria-label="Switch to light theme"
        aria-pressed={theme === 'light'}
        className={theme === 'light' ? 'active' : ''}
        onClick={() => onChange('light')}
      >
        <IconSun />
      </button>
    </div>
  )
}
