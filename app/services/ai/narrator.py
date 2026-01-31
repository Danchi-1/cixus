import asyncio

class PreludeNarrator:
    """
    AI Persona: Prelude Narrator
    Role: Mood-setter. Introduces the world, tone, and stakes.
    Rules: Returns deterministic, pre-authored JSON beats. 
    """

    async def generate_prelude(self, username: str) -> dict:
        """
        Returns the specific, timed cinematic beats for the frontend overlay.
        This is "stored forever" content, not generated on the fly.
        """
        
        return {
            "prelude_id": "default_v1",
            "duration_ms": 8000,
            "skippable": True,
            "beats": [
                {
                    "t": 0,
                    "text": "Year 2149.",
                    "style": "fade-in"
                },
                {
                    "t": 1200,
                    "text": "Wars no longer end by surrender.",
                    "style": "slide-up"
                },
                {
                    "t": 2800,
                    "text": "They end when the General falls.",
                    "style": "hold"
                },
                {
                    "t": 4600,
                    "text": "Cixus is watching.",
                    "style": "pulse-crimson"
                }
            ]
        }

narrator = PreludeNarrator()
