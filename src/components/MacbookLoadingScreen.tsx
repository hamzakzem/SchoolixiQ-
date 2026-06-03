import React from 'react';
import { BRAND_LOGO_PATH } from '../lib/brandAssets';
const KEY_IDS = Array.from({ length: 13 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
);

type Props = {
  caption?: string;
  className?: string;
  /** Keep screen visible with looping progress (boot / route loading). */
  persistent?: boolean;
};

/** Animated MacBook loader (platform boot / suspense fallback). */
export const MacbookLoadingScreen: React.FC<Props> = ({
  caption = 'جاري تحميل المنصة...',
  className = '',
  persistent = true,
}) => {
  return (
    <div
      className={`sq-macbook-loader-screen flex flex-col items-center justify-center min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 gap-8 px-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={caption}
    >
      <div
        className={`sq-macbook-loader ${persistent ? 'sq-macbook-loader--persistent' : ''}`}
      >
        <div className="macbook">
          <div className="macbook__topBord">
            <div className="macbook__display">
              <div className="macbook__load">
                <img
                  src={BRAND_LOGO_PATH}
                  alt=""
                  className="macbook__load-logo"
                  aria-hidden
                />
              </div>
            </div>
          </div>
          <div className="macbook__underBord">
            <div className="macbook__keybord">
              <div className="keybord">
                <div className="keybord__touchbar" />
                <div className="keybord__keyBox">
                  {KEY_IDS.map((id) => (
                    <div
                      key={id}
                      className={`keybord__key key--${id}`}
                    />
                  ))}
                </div>
                <div className="keybord__keyBox keybord__keyBox--under">
                  <div className="keybord__key key--19" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {caption ? (
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 text-center">
          {caption}
        </p>
      ) : null}
    </div>
  );
};

export default MacbookLoadingScreen;
