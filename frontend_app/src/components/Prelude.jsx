import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Prelude = ({ data, onComplete }) => {
    // Default mock data if none provided (fail-safe)
    const beats = data?.beats || [
        { t: 0, text: "Year 2149." },
        { t: 1200, text: "Wars no longer end by surrender." },
        { t: 2800, text: "They end when the General falls." },
        { t: 4600, text: "Cixus is watching." }
    ];

    const [currentText, setCurrentText] = useState("");
    const [fadeState, setFadeState] = useState("opacity-0 translate-y-5"); // equivalent to .show class logic
    const textRef = useRef(null);
    const timers = useRef([]);

    const endPrelude = () => {
        // Fade out
        if (textRef.current) {
            textRef.current.style.opacity = 0;
        }
        // Wait for fade then unmount
        const t = setTimeout(() => {
            onComplete();
        }, 600);
        timers.current.push(t);
    };

    useEffect(() => {
        // Play Prelude
        beats.forEach(beat => {
            const t1 = setTimeout(() => {
                // Hide previous
                setFadeState("opacity-0 translate-y-5");

                // Show new after brief pause
                const t2 = setTimeout(() => {
                    setCurrentText(beat.text);
                    setFadeState("opacity-100 translate-y-0");
                }, 200);
                timers.current.push(t2);

            }, beat.t);
            timers.current.push(t1);
        });

        // Auto end
        const duration = data?.duration_ms || 8000;
        const tEnd = setTimeout(endPrelude, duration);
        timers.current.push(tEnd);

        // Cleanup
        return () => {
            timers.current.forEach(clearTimeout);
        };
    }, [data]);

    return (
        <div
            id="prelude"
            onDoubleClick={() => {
                timers.current.forEach(clearTimeout);
                endPrelude();
            }}
            className="fixed inset-0 z-[9999] bg-obsidian-950 flex items-center justify-center cursor-pointer select-none"
        >
            <div
                ref={textRef}
                id="prelude-text"
                className={`
                    text-obsidian-100 font-mono text-2xl md:text-5xl text-center
                    transition-all duration-700 ease-out
                    ${fadeState}
                `}
            >
                {currentText}
            </div>

            {/* Skip hint */}
            <div className="absolute bottom-8 left-0 w-full text-center opacity-30 text-[10px] uppercase font-mono tracking-[0.3em]">
                Double Click to Skip
            </div>
        </div>
    );
};

export default Prelude;
