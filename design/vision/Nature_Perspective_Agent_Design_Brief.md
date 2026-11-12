# Nature Perspective Agent — Concept Design Brief

**Working title:** *Through Other Lives*  
**Status:** Early concept, based on the interaction notes in Figma frame `169:30` and adjacent project notes.  
**Primary setting:** An ordinary urban park; phone-first prototype.

## 1. Design question

How might an AI agent help people temporarily shift attention from a human-centred view of a park to the environmental cues relevant to another living being, and then notice how everyday human actions affect that shared place?

The experience is a guided interpretation, **not a claim to reproduce an animal's subjective experience or a plant's consciousness**. It should deepen observation of the real park rather than replace it with a screen.

## 2. Intent and desired change

The project follows a progression: **notice → connect → revisit → care**. It aims to help a visitor:

- Notice species, habitats, resources, and disturbances they would otherwise pass by.
- Compare how the same location can have different ecological meanings for a squirrel, a sparrow, or a tree.
- Connect a concrete human action to a possible consequence, with evidence and uncertainty made visible.
- Choose a small, locally appropriate action of care, then return to observe change over time.

The agent's emotional role is to create curiosity, humility, and care without pretending to speak as a nonhuman being or assigning guilt.

## 3. Audience and use context

**Primary participant:** A curious park visitor with a smartphone, alone or with a friend.  
**Context:** A short, self-paced outdoor walk. Visitors may have limited time, unreliable connectivity, sunlight glare, or a need to keep their attention on the path.  
**Secondary stakeholders:** Park staff, local naturalists, accessibility advisors, and ecological experts who can review species information and place-specific guidance.

## 4. Experience concept

The visitor enters a park. Using the park zone, season, user preference, and visible or audible clues, the agent offers two or three **mystery perspectives**. Each starts with a brief, scientifically grounded cue: for example, a route through connected tree cover, a patch of food-bearing vegetation, or changes in light and soil moisture. The visitor explores and guesses whose perspective it might be.

At an appropriate public spot, the visitor can photograph a clue or choose a species directly. The agent proposes an identification, shows its confidence, and lets the visitor correct it. Once a perspective is unlocked, a short visual layer highlights **ecologically relevant cues in the current park**. The visitor can put the phone away and keep looking at the actual surroundings.

During the walk, an encounter with a relevant feature or human activity can prompt a **compare perspectives** moment. For instance, a lawn edge may be a passage for a squirrel, a foraging area for a bird, and a root-zone condition for a tree. The agent explains the possible effect of a nearby action and offers one practical care choice. It does not automatically switch views without the visitor's consent.

### Example storyboard

1. **Enter and orient.** The visitor reaches a park entrance. The agent suggests two mystery perspectives, based on the current area and available evidence.
2. **Follow a clue.** A low-poly illustration hints at canopy routes and ground-level food without naming the species. The visitor looks up and walks along an existing public path.
3. **Observe and unlock.** The visitor photographs a squirrel on a tree, or selects “squirrel” manually. The agent confirms the likely species and cites the clue used.
4. **See a situated interpretation.** A short phone overlay marks connected branches, food, shelter, and potential disturbance. It is labelled “interpretive view,” not “what a squirrel literally sees.”
5. **Compare meanings.** The visitor notices a heavily used path near a tree. The agent offers a sparrow or tree perspective and explains what changes in the same scene.
6. **Reflect and care.** The visitor records one observation and chooses a suitable action, such as staying on the path, giving wildlife space, or joining a park-led stewardship activity. The agent invites a later return.

## 5. Interaction flow and agent responsibilities

| Stage | Visitor action | Agent action | Design intent |
| --- | --- | --- | --- |
| Arrival | Opens the walk and selects interests or accessibility settings | Suggests 2–3 locally plausible mystery perspectives | Spark curiosity without overloading |
| Search | Follows one clue and observes from a public path | Gives short evidence-based cues, never exact sensitive locations | Keep attention on the real environment |
| Unlock | Takes a photo, records a sound, or chooses a species | Identifies candidate species or habitat, reports confidence, asks for correction when uncertain | Make identification accountable |
| Situated view | Looks at a brief overlay, then continues walking | Maps documented ecological cues to the current scene | Translate evidence into an approachable interpretation |
| Comparison | Accepts a prompt to change perspective | Presents a meaningfully different animal or plant lens for the same place | Reveal relationships, not just visual effects |
| Reflection | Notes what changed in their understanding | Connects a human action to a supported, local implication and one care option | Support agency and continued attention |

**Inputs:** Opt-in camera or audio, approximate location or chosen park zone, season/time, user observations, and curated local species/habitat data.  
**Outputs:** Brief clues, candidate identification with confidence, interpretive overlays, evidence cards, comparison prompts, and a private observation note.  
**Core AI work:** Contextual recommendation, multimodal clue interpretation, retrieval from a reviewed ecological knowledge base, and concise explanation.  
**Human control:** Skip a clue, choose a species directly, reject an identification, pause sensing, and decline any perspective change.

## 6. Representation and scientific integrity

- Distinguish **observed** information (for example, a photographed tree), **supported inference** (a species may use a connected canopy), and **illustration** (the low-poly scene).
- Use species- and place-specific sources where available. Do not generalize the findings of one squirrel species, site, or season to all parks.
- Treat the plant perspective as a visualization of **environmental conditions and responses** such as light, water, temperature, and soil context. Avoid a human-like first-person narrator for plants.
- Avoid invented claims about exact animal colour vision, hearing, emotion, or intent. Any sensory transformation needs species-specific evidence and expert review.
- Let the experience say “we do not have enough evidence here.” When a species cannot be identified reliably, stay with a habitat-level lens.

The initial illustration style is **low-poly colour blocks**: simple canopies, paths, animals, and light/soil zones. It should make the *interpretation* legible without implying photorealistic biological accuracy.

## 7. Care, access, and data boundaries

- Never direct visitors off paths, toward nests, dens, rare species, or ecologically sensitive locations.
- Prefer low-frequency, optional prompts. Pause prompts while the visitor is moving quickly or navigating a hazard.
- Make the walk usable without camera, audio, AR, smart glasses, or a wristband. The phone is the first prototype; wearables are later possibilities.
- Ask before sensing. Process media on device where feasible, retain no raw media by default, and provide a clear delete control.
- Avoid scoring people or turning ecological care into a competitive game. Offer locally reviewed, practical actions.

## 8. Prototype scope

**First prototype:** One park route, two animal lenses (for example squirrel and sparrow), one plant lens (a common tree), two mystery clues, one photo-or-manual unlock, one short situated overlay, one comparison moment, and one reflection card. Content should be reviewed for the selected park and species before field testing.

**Later exploration:** Audio cues, seasonal revisits, accessible haptics, or glasses-based overlays. These depend on evidence that they improve observation without increasing distraction or disturbance.

## 9. Research and evaluation

Start with a short observation walk and interview: what do people already notice, what do they assume about other species, and where does the phone interrupt observation? Test a paper or clickable storyboard before building live recognition.

Evaluate whether participants can (1) describe at least one new ecological relationship, (2) tell observed facts from interpretation, (3) identify a supported effect of a human action, and (4) choose an appropriate care action. Also record screen time, confusion, unsafe movement, disturbance to wildlife, and accessibility barriers. A successful prototype should increase attention to the park itself, not merely time spent in the interface.

## 10. Open decisions

1. Which park, species, and season will anchor the first test?
2. What local knowledge source and expert will review each species cue and care action?
3. Should the mystery identity be revealed through a location reached on a path, an observation, or either?
4. Which comparison is most meaningful in the chosen park: animal ↔ animal, animal ↔ plant, or a three-way comparison?

## Research starting points

- [Urban human activity and Eurasian red squirrel behaviour — primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12527259/)
- [Urban conditions and red squirrel problem solving — primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8059950/)
- [How plants integrate light, temperature, and water cues — review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10709290/)

These papers support **specific design questions and review criteria**. They do not validate a universal animal-view simulation or a claim about the species in an unselected local park.
