import { Mic, MicOff, Loader2 } from 'lucide-react';
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
  const { isListening, isSupported, startListening, stopListening, error } = useSpeechToText({
    onResult: (transcript) => {
      if (appendMode && currentValue) {
        const separator = currentValue.endsWith(' ') || currentValue.endsWith('\n') ? '' : ' ';
        onTranscript(currentValue + separator + transcript);
      } else {
        onTranscript(transcript);
      }
    },
  });

  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

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
