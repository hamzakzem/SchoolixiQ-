import React from 'react';
import { MailCheck, RefreshCw, Send, X } from 'lucide-react';

type EmailVerificationBannerProps = {
  isRtl: boolean;
  email?: string | null;
  sending: boolean;
  cooldown: number;
  onResend: () => void;
  onRefresh: () => void;
  onDismiss: () => void;
  className?: string;
};

/** Account notice shown until the signed-in user confirms their email. */
export function EmailVerificationBanner({
  isRtl,
  email,
  sending,
  cooldown,
  onResend,
  onRefresh,
  onDismiss,
  className,
}: EmailVerificationBannerProps) {
  const resendLabel = sending
    ? isRtl ? 'جاري الإرسال…' : 'Sending…'
    : cooldown > 0
      ? isRtl ? `إعادة الإرسال بعد ${cooldown}ث` : `Resend in ${cooldown}s`
      : isRtl ? 'إعادة إرسال الرابط' : 'Resend link';

  return (
    <div
      className={`sx-verify-banner${className ? ` ${className}` : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      role="status"
    >
      <span className="sx-verify-banner__icon" aria-hidden>
        <MailCheck size={20} strokeWidth={1.9} />
      </span>
      <div className="sx-verify-banner__copy">
        <p className="sx-verify-banner__title">
          {isRtl ? 'أكّد بريدك الإلكتروني' : 'Confirm your email'}
        </p>
        <p className="sx-verify-banner__desc">
          {isRtl ? 'أرسلنا رابط التفعيل إلى ' : 'We sent an activation link to '}
          <bdi className="sx-verify-banner__email">{email}</bdi>
        </p>
      </div>
      <div className="sx-verify-banner__actions">
        <button type="button" className="sx-verify-banner__btn" onClick={onRefresh}>
          <RefreshCw size={14} strokeWidth={2} aria-hidden />
          {isRtl ? 'تم التأكيد' : "I've confirmed"}
        </button>
        <button
          type="button"
          className="sx-verify-banner__btn sx-verify-banner__btn--primary"
          onClick={onResend}
          disabled={sending || cooldown > 0}
        >
          <Send size={14} strokeWidth={2} aria-hidden />
          {resendLabel}
        </button>
      </div>
      <button
        type="button"
        className="sx-verify-banner__close"
        onClick={onDismiss}
        aria-label={isRtl ? 'إخفاء مؤقتاً' : 'Dismiss for now'}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
