"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
    return (
        <div
            className={cn(
                "absolute inset-0 z-0 h-full w-full bg-neutral-950 pointer-events-none",
                className
            )}
        >
            <div
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
                }}
                className="absolute inset-0 z-0 h-full w-full opacity-[0.2]"
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />

            {/* Static Gradients for Performance */}
            <div className="absolute top-[20%] left-0 w-[500px] h-[500px] rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.5) 0%, rgba(45,212,191,0) 70%)' }} />

            <div className="absolute top-[60%] right-0 w-[600px] h-[600px] rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, rgba(186,240,156,0.5) 0%, rgba(186,240,156,0) 70%)' }} />
        </div>
    );
};
