import { AppState } from "@/hooks/useJarvis";
import { motion } from "framer-motion";

interface OrbProps {
  state: AppState;
}

export function Orb({ state }: OrbProps) {
  // Define animation states based on the app state
  const variants = {
    idle: {
      scale: [1, 1.05, 1],
      opacity: [0.6, 0.8, 0.6],
      boxShadow: [
        "0 0 20px 5px rgba(0, 255, 255, 0.2)",
        "0 0 30px 10px rgba(0, 255, 255, 0.4)",
        "0 0 20px 5px rgba(0, 255, 255, 0.2)"
      ],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const }
    },
    listening: {
      scale: [1, 1.2, 1.1, 1.2],
      opacity: [0.8, 1, 0.8, 1],
      boxShadow: [
        "0 0 30px 10px rgba(0, 255, 255, 0.5)",
        "0 0 60px 20px rgba(0, 255, 255, 0.8)",
        "0 0 40px 15px rgba(0, 255, 255, 0.6)",
        "0 0 60px 20px rgba(0, 255, 255, 0.8)"
      ],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }
    },
    thinking: {
      scale: [1.1, 1.15, 1.1],
      rotate: [0, 180, 360],
      opacity: [0.8, 1, 0.8],
      boxShadow: [
        "0 0 40px 10px rgba(0, 200, 255, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.5)",
        "0 0 50px 15px rgba(0, 150, 255, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.8)",
        "0 0 40px 10px rgba(0, 200, 255, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.5)"
      ],
      transition: {
        rotate: { duration: 3, repeat: Infinity, ease: "linear" as const },
        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
      }
    },
    speaking: {
      scale: [1.1, 1.3, 1.05, 1.2],
      opacity: [0.8, 1, 0.7, 0.9],
      boxShadow: [
        "0 0 40px 15px rgba(0, 255, 255, 0.6)",
        "0 0 80px 30px rgba(0, 255, 255, 0.9)",
        "0 0 30px 10px rgba(0, 255, 255, 0.5)",
        "0 0 70px 25px rgba(0, 255, 255, 0.8)"
      ],
      transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const }
    },
    error: {
      scale: 1,
      opacity: 0.5,
      boxShadow: "0 0 20px 5px rgba(255, 0, 0, 0.5)",
      backgroundColor: "rgba(255, 0, 0, 0.2)",
      transition: { duration: 0.5 }
    },
    loading: {
      scale: [0.8, 1, 0.8],
      opacity: [0.3, 0.6, 0.3],
      boxShadow: "0 0 10px 2px rgba(0, 255, 255, 0.2)",
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const }
    }
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer rings for listening state */}
      {state === "listening" && (
        <>
          <motion.div 
            className="absolute w-full h-full rounded-full border border-primary/30"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0 }}
          />
          <motion.div 
            className="absolute w-full h-full rounded-full border border-primary/20"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
          <motion.div 
            className="absolute w-full h-full rounded-full border border-primary/10"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 1.0 }}
          />
        </>
      )}

      {/* Main Orb */}
      <motion.div
        className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/80 to-primary/20 backdrop-blur-md z-10"
        variants={variants}
        initial="loading"
        animate={state}
      >
        {/* Inner core */}
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-transparent to-white/30 mix-blend-overlay" />
      </motion.div>
    </div>
  );
}
