import { useEffect, useRef } from "react";
import { Message } from "@/hooks/useJarvis";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

interface ConversationHistoryProps {
  messages: Message[];
  streamingResponse?: string;
}

export function ConversationHistory({ messages, streamingResponse }: ConversationHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingResponse]);

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto overflow-hidden relative" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
      <ScrollArea className="h-full w-full pr-4 pb-20 pt-10" ref={scrollRef}>
        <div className="flex flex-col space-y-6">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[80%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {msg.role === "assistant" && (
                    <Avatar className="h-8 w-8 bg-primary/20 border border-primary/50 text-primary mt-1 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                      <AvatarFallback className="bg-transparent">J</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-secondary text-secondary-foreground border border-white/5"
                        : "bg-transparent text-primary-foreground font-mono"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {streamingResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full justify-start"
            >
              <div className="flex max-w-[80%] gap-3 flex-row">
                <Avatar className="h-8 w-8 bg-primary/20 border border-primary/50 text-primary mt-1 shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                  <AvatarFallback className="bg-transparent">J</AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-transparent text-primary-foreground font-mono">
                  {streamingResponse}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
