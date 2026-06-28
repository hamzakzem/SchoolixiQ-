import React, { useRef, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { canManuallyDeleteNotification } from '../lib/notificationRetention';

const SWIPE_THRESHOLD = 72;
const MAX_DRAG = 96;

type NotificationSwipeCardProps = {
  notification: Record<string, unknown>;
  isArabic: boolean;
  enableSwipe: boolean;
  userRole?: string;
  onMarkRead: () => void;
  onDelete: () => void;
  onCriticalDeleteBlocked: () => void;
  children: React.ReactNode;
};

export const NotificationSwipeCard: React.FC<NotificationSwipeCardProps> = ({
  notification,
  isArabic,
  enableSwipe,
  userRole,
  onMarkRead,
  onDelete,
  onCriticalDeleteBlocked,
  children,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const isDeletable = canManuallyDeleteNotification(notification, userRole);

  const reset = () => {
    setOffsetX(0);
    setDragging(false);
    lockedRef.current = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableSwipe || e.pointerType === 'mouse') return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lockedRef.current = null;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableSwipe || !dragging) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!lockedRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (lockedRef.current !== 'horizontal') return;

    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    setOffsetX(clamped);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableSwipe) return;
    if (dragging && lockedRef.current === 'horizontal') {
      if (offsetX >= SWIPE_THRESHOLD) {
        onMarkRead();
      } else if (offsetX <= -SWIPE_THRESHOLD) {
        if (isDeletable) {
          onDelete();
        } else {
          onCriticalDeleteBlocked();
        }
      }
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    reset();
  };

  if (!enableSwipe) {
    return <>{children}</>;
  }

  return (
    <div className="sx-notif-swipe" dir="ltr">
      <div className="sx-notif-swipe__actions" aria-hidden>
        <div className={`sx-notif-swipe__action sx-notif-swipe__action--read${offsetX > 20 ? ' is-active' : ''}`}>
          <Check className="sx-notif-lucide" strokeWidth={2.25} />
          <span>{isArabic ? 'مقروء' : 'Read'}</span>
        </div>
        <div className={`sx-notif-swipe__action sx-notif-swipe__action--delete${offsetX < -20 ? ' is-active' : ''}`}>
          <Trash2 className="sx-notif-lucide" strokeWidth={2.25} />
          <span>{isArabic ? 'حذف' : 'Delete'}</span>
        </div>
      </div>
      <div
        className={`sx-notif-swipe__surface${dragging ? ' is-dragging' : ''}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
      >
        {children}
      </div>
    </div>
  );
};
