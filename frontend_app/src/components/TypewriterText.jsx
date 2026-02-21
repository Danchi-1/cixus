import React, { useState, useEffect, useRef } from 'react';

/**
 * TypewriterText
 * Renders text character-by-character like a digital transmission.
 *
 * Props:
 *   text       – string to animate
 *   speed      – ms per character (default 22)
 *   onComplete – optional callback when typing finishes
 *   className  – optional extra class names
 */
const TypewriterText = ({ text = '', speed = 22, onComplete, className = '' }) => {
    const [displayed, setDisplayed] = useState('');
    const indexRef = useRef(0);
    const timerRef = useRef(null);

    useEffect(() => {
        // Reset when text changes
        setDisplayed('');
        indexRef.current = 0;

        if (!text) return;

        timerRef.current = setInterval(() => {
            indexRef.current += 1;
            setDisplayed(text.slice(0, indexRef.current));

            if (indexRef.current >= text.length) {
                clearInterval(timerRef.current);
                onComplete?.();
            }
        }, speed);

        return () => clearInterval(timerRef.current);
    }, [text, speed]);

    return (
        <span className={className}>
            {displayed}
            {/* Blinking cursor while typing */}
            {displayed.length < text.length && (
                <span className="inline-block w-[2px] h-[1em] bg-crimson-500 ml-[1px] animate-pulse align-middle" />
            )}
        </span>
    );
};

export default TypewriterText;
