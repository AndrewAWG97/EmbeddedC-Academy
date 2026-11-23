# Protocol Labs Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Add UART/SPI/I2C circuit + breadboard + timing labs via a shared engine.

**Architecture:** Config-driven `initProtocolLab` in `app.js`; three HTML lab cards; CSS for circuit/breadboard.

**Tech Stack:** Vanilla HTML/CSS/JS canvas (existing project)

## Global Constraints

- No new dependencies
- Match neo-brutal design tokens
- Teaching toy only (fixed devices)

---

### Task 1: HTML lab cards
- [ ] Replace UART visualizer + SPI + I2C static cards with three `protocol-lab` cards
- [ ] Keep UART Setup, Comparison, DMA

### Task 2: CSS
- [ ] Add circuit-strip, breadboard-toy, protocol-lab control styles

### Task 3: Shared engine + configs
- [ ] Implement frame builders + animation + breadboard pulse
- [ ] Wire `vizInitializers['protocols']` / redrawers

### Task 4: Verify
- [ ] Load Protocols section; Run each lab
