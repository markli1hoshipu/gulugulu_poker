import React, { useState } from 'react';
import { Card } from '../ui/card';

const ActionFlipCard = ({ title, situation, actions, icon: Icon }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'text-red-600 font-semibold';
      case 'MEDIUM':
        return 'text-yellow-600 font-medium';
      case 'LOW':
        return 'text-blue-600 font-normal';
      default:
        return 'text-foreground font-normal';
    }
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return 'No deadline';
    try {
      const date = new Date(deadline);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return deadline;
    }
  };

  const actionCount = actions?.length || 0;
  const hasActions = actionCount > 0;

  return (
    <div className="perspective-1000 h-64 cursor-pointer" onClick={handleFlip}>
      <div
        className={`relative w-full h-full transition-transform duration-600 preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front Face */}
        <Card
          className={`absolute w-full h-full p-6 border border-border bg-card flex flex-col ${
            isFlipped ? 'hidden' : ''
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center gap-2 mb-4">
            {Icon && <Icon className="w-5 h-5 text-foreground" />}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>

          <div className="flex-1 overflow-hidden">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
              {situation || 'No situation details available'}
            </p>
          </div>

          <div className="pt-4 mt-auto border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{actionCount} {actionCount === 1 ? 'Action' : 'Actions'}</span>
              <span>Click to view →</span>
            </div>
          </div>
        </Card>

        {/* Back Face */}
        <Card
          className={`absolute w-full h-full p-6 border border-border bg-card flex flex-col ${
            !isFlipped ? 'hidden' : ''
          }`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            {Icon && <Icon className="w-5 h-5 text-foreground" />}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {hasActions ? (
              actions.map((actionItem, index) => (
                <div key={index} className="text-sm border-b border-border pb-2 last:border-0">
                  <div className="font-medium text-foreground mb-1">
                    {actionItem.action}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {actionItem.customer && (
                      <span className="font-medium">{actionItem.customer}</span>
                    )}
                    {actionItem.priority && (
                      <span className={getPriorityStyle(actionItem.priority)}>
                        {actionItem.priority}
                      </span>
                    )}
                    {actionItem.deadline && (
                      <span>Due: {formatDeadline(actionItem.deadline)}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                <p>No actions required for this area.</p>
                <p className="mt-1">Business operations are normal.</p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-auto border-t border-border">
            <div className="text-xs text-muted-foreground text-right">
              ← Click to flip back
            </div>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .duration-600 {
          transition-duration: 0.6s;
        }
      `}</style>
    </div>
  );
};

export default ActionFlipCard;