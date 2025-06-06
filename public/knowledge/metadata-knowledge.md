This KB supports your system prompt by guiding title generation, meta tag composition, scoring, suppression, and logic interpretation — all aligned with stock footage platform standards (Artgrid, Adobe Stock, Pexels).

1. 📁 APPROVED VISUAL TAG DICTIONARY (TAG BANK)
Use these literal tags to populate Meta: lines. Grouped by category to mirror stock library taxonomy.
👥 PEOPLE
man, woman, child, teacher, scientist, assistant, couple, elderly, patient, dentist


🎭 ACTIONS & EXPRESSIONS
crying, laughing, smiling, hugging, whispering, turning away, walking, talking, alone, shocked, frustrated, reading, researching, sitting, sleeping, typing, looking up


🏠 SETTINGS / LOCATIONS
bedroom, hallway, kitchen, lab, office, classroom, archive, living room, clinic, street, forest, bus, waiting room


🧰 OBJECTS & PROPS
folder, journal, computer, envelope, mirror, dental chair, microscope, toothbrush, test tube, document, phone, photo, glasses


🕰 TIME & MOOD MODIFIERS
night, morning, silence, urgency, darkness, alone, crowded, cold, vintage, sunset, warm light, rainy, indoor, soft blur


✅ Rules: Max 5 tags per Meta: line. All lowercase. No abstract or symbolic nouns.

2. 🧠 CINEMATIC LOGIC DICTIONARY
Translate abstract/emotional lines into literal visual tags.
| Abstract Phrase | Visual Tags |
|-----------------|-------------|
| “She felt isolated.” | woman, sitting alone, sadness, living room |
| “He was obsessed.” | man, researching, night, alone, desk |
| “She gave up.” | woman, crying, head down, night |
| “He avoided affection.” | man, turning away, couple, tension |
| “She had a breakthrough.” | woman, opening folder, shocked, lab |

Use this reference to teach your model to ground abstract narration in cinematic visuals.

3. 🚫 SYMBOLISM & CLICHÉ FILTER
Do not allow these terms in Meta: or Title: lines. They are too abstract for stock libraries.
❌ Abstract / Symbolic Words (Banned)
truth, justice, hope, destiny, breakthrough, miracle, trust, transformation, success, redemption, pain (unless physical), fear (unless facial), joy (unless smiling)
✅ Visual Replacements
| Banned Word | Replace With |
|-------------|--------------|
| hope | woman, smiling, sunlight |
| fear | man, wide eyes, dark room |
| pain | woman, crying, clutching stomach |
| breakthrough | person, opening folder, shocked |


4. 🧩 TITLE TEMPLATES
Use these formats to create platform-appropriate Title: lines.
| Template | Example |
|----------|---------|
|[Emotion] + in [Setting] | Crying in Bedroom |
|[Action] + with [Prop] | Hugging with Folder |
|[Subject] + [Moment] | Scientist Discovers Hidden Research |
|[Time] + [Scene] | Late Night Lab Discovery |
|[Adjective] + [Action] | Silent Breakdown |

🔤 Title Guidelines: 4–7 words, title case, no punctuation, no abstract concepts.

5. 📊 SCORING GUIDES (Optional)
Use these if you plan to integrate cinematicScore, emotionIntensity, or suppress.
🎬 CINEMATIC SCORE (0–10)
| Score | Meaning |
|-------|---------|
| 0–2 | Non-visual, skip for tagging |
| 3–5 | Minor visual moment |
| 6–8 | Clear visual moment, relevant B-roll |
| 9–10 | High-impact cinematic beat (include Title:) |

😭 EMOTION INTENSITY (0–10)
| Score | Example |
|-------|---------|
| 0–2 | Neutral narration |
| 3–5 | Mild reaction (frown, silence) |
| 6–8 | Obvious emotion (crying, hugging, turning away) |
| 9–10 | Major emotional reveal or confrontation |

🔕 SUPPRESSION RULES
Suppress tagging (suppress: true) if:
- The sentence is abstract with no implied visuals
- It’s a narrator voiceover without character action or setting
- It’s commentary, statistics, or reflection with no scene

6. 🧪 QA TEST SET STRUCTURE (for Evaluation)
Each sentence in your benchmark script should include:
{
  "script": "She turned away from her husband.",
  "title": "Avoiding Intimacy",
  "meta": ["woman", "man", "turning away", "bedroom", "sadness"],
  "cinematicScore": 8,
  "emotionIntensity": 7,
  "suppress": false
}

Use this format to evaluate prompt outputs, train reviewers, or build future agent modules.

