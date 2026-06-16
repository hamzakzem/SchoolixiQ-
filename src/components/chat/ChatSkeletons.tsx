import React from 'react';

export function ContactListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="px-2 py-1 space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sx-chat-skeleton-row flex items-center gap-3 p-3 rounded-2xl">
          <div className="sx-chat-skeleton sx-chat-skeleton--circle w-12 h-12 shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="sx-chat-skeleton h-3.5 w-[55%] rounded-full" />
            <div className="sx-chat-skeleton h-2.5 w-[80%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 py-2 px-1" aria-hidden>
      <div className="flex justify-center">
        <div className="sx-chat-skeleton h-6 w-24 rounded-full" />
      </div>
      {Array.from({ length: count }).map((_, i) => {
        const outgoing = i % 2 === 1;
        return (
          <div
            key={i}
            className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`sx-chat-skeleton rounded-2xl ${
                outgoing ? 'h-14 w-[62%] max-w-xs' : 'h-12 w-[58%] max-w-xs'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
