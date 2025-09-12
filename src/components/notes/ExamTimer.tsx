"use client";

import { useState, useEffect } from "react";
import { formatTime } from "@/lib/notes/examUtils";

interface ExamTimerProps {
  initialTimeSeconds: number;
  onTimeUp: () => void;
  isRunning: boolean;
  compact?: boolean;
}

export default function ExamTimer({ initialTimeSeconds, onTimeUp, isRunning, compact = false }: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTimeSeconds);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimeUp]);

  // Reset timer when initialTimeSeconds changes
  useEffect(() => {
    setTimeLeft(initialTimeSeconds);
  }, [initialTimeSeconds]);

  const percentage = (timeLeft / initialTimeSeconds) * 100;
  const isLowTime = percentage <= 25;
  const isCriticalTime = percentage <= 10;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`text-sm ${isCriticalTime ? 'animate-pulse' : ''}`}>
          {isCriticalTime ? '🚨' : '⏱️'}
        </div>
        <div className={`text-sm font-mono font-bold ${
          isCriticalTime ? 'text-red-400' : 
          isLowTime ? 'text-yellow-400' : 
          'text-white'
        }`}>
          {formatTime(timeLeft)}
        </div>
        <div className="w-16 bg-gray-700 rounded-full h-1">
          <div 
            className={`h-1 rounded-full transition-all duration-1000 ${
              isCriticalTime ? 'bg-red-500' :
              isLowTime ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg backdrop-blur-sm">
      {/* Timer Icon */}
      <div className={`text-2xl ${isCriticalTime ? 'animate-pulse' : ''}`}>
        {isCriticalTime ? '🚨' : isLowTime ? '⚠️' : '⏱️'}
      </div>

      {/* Time Display */}
      <div className="flex-1">
        <div className={`text-lg font-mono font-bold ${
          isCriticalTime ? 'text-red-400' : 
          isLowTime ? 'text-yellow-400' : 
          'text-white'
        }`}>
          {formatTime(timeLeft)}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
          <div 
            className={`h-1.5 rounded-full transition-all duration-1000 ${
              isCriticalTime ? 'bg-red-500' :
              isLowTime ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="text-xs text-gray-400">
        {!isRunning ? 'Pausado' : 
         isCriticalTime ? '¡Tiempo crítico!' :
         isLowTime ? 'Poco tiempo' :
         'En progreso'}
      </div>
    </div>
  );
}
