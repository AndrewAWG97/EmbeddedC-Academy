# Protocol Labs Design — UART / SPI / I2C

**Date:** 2026-11-23  
**Status:** Approved for implementation

## Goal

Replace the Protocols section’s UART waveform card and static SPI/I2C cards with three full-width interactive teaching labs. Each lab combines a wiring diagram, a fixed teaching-toy breadboard, and an animated multi-lane timing waveform.

## Scope

- Teaching toy only: fixed MCU + one example device per protocol
- UART: TX frame only (byte + baud); device = USB-UART terminal
- SPI: Mode 0, one-byte transfer; MISO returns canned `0xA5`; device = SPI Flash
- I2C: 7-bit write only (addr + reg + data); device = sensor @ `0x48`
- Keep Protocol Comparison and DMA cards
- No new dependencies; vanilla JS + canvas, match existing neo-brutal UI

## Architecture

Shared `initProtocolLab(config)` engine in `app.js`:

- Configs for `uart`, `spi`, `i2c` (pins, colors, controls, `buildFrames`)
- Frame model: `{ lanes: [{ name, color, samples }], bitLabels }`
- Circuit strip: HTML/CSS labeled chips + colored wires
- Breadboard: MCU + device boxes; wires pulse during Run; status text updates
- Theme/resize: register redraw via `vizRedrawers['protocols']`

## Files

- `index.html` — three lab cards; remove old UART viz + static SPI/I2C
- `styles.css` — `.protocol-lab`, `.circuit-strip`, `.breadboard-toy`, etc.
- `app.js` — shared engine + three configs; replace `initUartViz`

## Out of scope (v1)

- UART RX echo, SPI modes 1–3, I2C read / multi-master
- Free-form pin wiring or multi-device bus
