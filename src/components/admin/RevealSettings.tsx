import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Grid3X3, Shuffle, Settings, ChevronDown, Eye } from 'lucide-react';
import type { GameSettings } from '../../types';

interface RevealSettingsProps {
  settings: GameSettings;
  onUpdate: (settings: Partial<GameSettings>) => void;
  disabled?: boolean;
}

interface SectionConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const sections: SectionConfig[] = [
  { id: 'timing', title: 'Timing', icon: <Clock className="w-4 h-4" /> },
  { id: 'grid', title: 'Grid', icon: <Grid3X3 className="w-4 h-4" /> },
  { id: 'reveal', title: 'Reveal', icon: <Eye className="w-4 h-4" /> },
  { id: 'gameplay', title: 'Gameplay', icon: <Settings className="w-4 h-4" /> },
];

export default function RevealSettings({ settings, onUpdate, disabled = false }: RevealSettingsProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['timing', 'grid', 'reveal', 'gameplay']));
  const pendingRef = useRef<Partial<GameSettings> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdate = useCallback(
    (updates: Partial<GameSettings>) => {
      pendingRef.current = { ...(pendingRef.current || {}), ...updates };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (pendingRef.current) {
          onUpdate(pendingRef.current);
          pendingRef.current = null;
        }
      }, 300);
    },
    [onUpdate]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalTiles = (settings?.gridRows || 4) * (settings?.gridCols || 4);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 flex items-center gap-2 mb-4">
        <Shuffle className="w-4 h-4 text-gaming-purple" />
        Game Settings
      </h3>

      {disabled && (
        <div className="text-xs text-yellow-400/70 bg-yellow-400/10 px-3 py-2 rounded-lg border border-yellow-400/20 mb-3">
          Settings are locked during an active game
        </div>
      )}

      {sections.map((section) => {
        const isOpen = openSections.has(section.id);

        return (
          <div key={section.id} className="rounded-xl border border-white/5 overflow-hidden bg-navy-900/40">
            {/* Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-gaming-purple">{section.icon}</span>
                {section.title}
              </div>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    {section.id === 'timing' && (
                      <>
                        {/* Reveal Duration */}
                        <SettingRow
                          label="Reveal Duration"
                          description="Total time to fully reveal photo"
                          value={`${settings.revealDuration}s`}
                        >
                          <input
                            type="range"
                            min={10}
                            max={120}
                            step={5}
                            value={settings.revealDuration}
                            onChange={(e) => debouncedUpdate({ revealDuration: Number(e.target.value) })}
                            disabled={disabled}
                            className="slider w-full"
                          />
                          <div className="flex justify-between text-[10px] text-white/30 mt-1">
                            <span>10s</span>
                            <span>120s</span>
                          </div>
                        </SettingRow>

                        {/* Reveal Interval */}
                        <SettingRow
                          label="Tile Interval"
                          description="Seconds between each tile reveal"
                          value={`${settings.revealInterval}s`}
                        >
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={0.5}
                            value={settings.revealInterval}
                            onChange={(e) => debouncedUpdate({ revealInterval: Number(e.target.value) })}
                            disabled={disabled}
                            className="slider w-full"
                          />
                          <div className="flex justify-between text-[10px] text-white/30 mt-1">
                            <span>1s</span>
                            <span>10s</span>
                          </div>
                        </SettingRow>
                      </>
                    )}

                    {section.id === 'grid' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <SettingRow label="Rows" description="">
                            <input
                              type="number"
                              min={2}
                              max={8}
                              value={settings.gridRows}
                              onChange={(e) => debouncedUpdate({ gridRows: Math.min(8, Math.max(2, Number(e.target.value))) })}
                              disabled={disabled}
                              className="input-field text-sm text-center"
                            />
                          </SettingRow>
                          <SettingRow label="Columns" description="">
                            <input
                              type="number"
                              min={2}
                              max={8}
                              value={settings.gridCols}
                              onChange={(e) => debouncedUpdate({ gridCols: Math.min(8, Math.max(2, Number(e.target.value))) })}
                              disabled={disabled}
                              className="input-field text-sm text-center"
                            />
                          </SettingRow>
                        </div>
                        <div className="text-center text-xs text-white/40 bg-white/5 rounded-lg py-2">
                          Total tiles: <span className="text-gaming-purple font-semibold">{totalTiles}</span>
                        </div>
                      </>
                    )}

                    {section.id === 'reveal' && (
                      <>
                        {/* Reveal Order */}
                        <SettingRow label="Reveal Order" description="How tiles are uncovered">
                          <div className="grid grid-cols-2 gap-2">
                            <ToggleButton
                              active={settings.revealOrder === 'random'}
                              onClick={() => debouncedUpdate({ revealOrder: 'random' })}
                              disabled={disabled}
                            >
                              Random
                            </ToggleButton>
                            <ToggleButton
                              active={settings.revealOrder === 'sequential'}
                              onClick={() => debouncedUpdate({ revealOrder: 'sequential' })}
                              disabled={disabled}
                            >
                              Sequential
                            </ToggleButton>
                          </div>
                        </SettingRow>

                        {/* Reveal Mode */}
                        <SettingRow label="Reveal Mode" description="Auto or manual tile control">
                          <div className="grid grid-cols-2 gap-2">
                            <ToggleButton
                              active={settings.revealMode === 'auto'}
                              onClick={() => debouncedUpdate({ revealMode: 'auto' })}
                              disabled={disabled}
                            >
                              Auto
                            </ToggleButton>
                            <ToggleButton
                              active={settings.revealMode === 'manual'}
                              onClick={() => debouncedUpdate({ revealMode: 'manual' })}
                              disabled={disabled}
                            >
                              Manual
                            </ToggleButton>
                          </div>
                        </SettingRow>
                      </>
                    )}

                    {section.id === 'gameplay' && (
                      <>
                        <ToggleSwitch
                          label="Hints Enabled"
                          description="Show hints to players"
                          checked={settings.hintsEnabled}
                          onChange={(v) => debouncedUpdate({ hintsEnabled: v })}
                          disabled={disabled}
                        />
                        <ToggleSwitch
                          label="Timer Enabled"
                          description="Show countdown timer"
                          checked={settings.timerEnabled}
                          onChange={(v) => debouncedUpdate({ timerEnabled: v })}
                          disabled={disabled}
                        />
                        <ToggleSwitch
                          label="Multiple Attempts"
                          description="Allow multiple guesses per photo"
                          checked={settings.multipleAttempts}
                          onChange={(v) => debouncedUpdate({ multipleAttempts: v })}
                          disabled={disabled}
                        />
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function SettingRow({
  label,
  description,
  value,
  children,
}: {
  label: string;
  description: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-white/60">{label}</span>
        {value && <span className="text-xs font-mono text-gaming-purple">{value}</span>}
      </div>
      {description && <p className="text-[10px] text-white/30 mb-2">{description}</p>}
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-gaming-purple/20 text-gaming-purple border border-gaming-purple/30'
          : 'bg-navy-900/60 text-white/40 border border-white/5 hover:border-white/20'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-xs font-medium text-white/60">{label}</span>
        <p className="text-[10px] text-white/30">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-gaming-purple' : 'bg-white/10'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}
