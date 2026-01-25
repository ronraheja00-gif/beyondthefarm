import { useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { cn } from '@/lib/utils';

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  appendMode?: boolean;
  currentValue?: string;
}

export function SpeechToTextButton({
  onTranscript,
  disabled = false,
  className,
  appendMode = true,
  currentValue = '',
}: SpeechToTextButtonProps) {
  // Store values in refs to avoid recreating the callback
  const currentValueRef = useRef(currentValue);
  const onTranscriptRef = useRef(onTranscript);
  const appendModeRef = useRef(appendMode);
  
  // Update refs synchronously
  currentValueRef.current = currentValue;
  onTranscriptRef.current = onTranscript;
  appendModeRef.current = appendMode;

  const handleResult = useCallback((transcript: string) => {
    if (appendModeRef.current && currentValueRef.current) {
      const separator = currentValueRef.current.endsWith(' ') || currentValueRef.current.endsWith('\n') ? '' : ' ';
      onTranscriptRef.current(currentValueRef.current + separator + transcript);
    } else {
      onTranscriptRef.current(transcript);
    }
  }, []);

  const { isListening, isSupported, startListening, stopListening, error } = useSpeechToText({
    onResult: handleResult,
  });

  const handleClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Return null after all hooks are called
  if (!isSupported) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              'h-8 w-8 shrink-0',
              isListening && 'text-destructive animate-pulse',
              error && 'text-destructive',
              className
            )}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : isListening ? (
            <p>Click to stop listening</p>
          ) : (
            <p>Click to speak</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
