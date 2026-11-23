# EmbeddedC Academy

Interactive Embedded C course site — from bare-metal fundamentals to RTOS — with visualizations and hands-on labs aimed at STM32 / ARM Cortex-M.

**Live locally:** open `index.html`, or serve the folder with any static file server.

## Features

- **10 modules** covering memory, data types, bitwise ops, pointers, registers, interrupts, protocols, timers, RTOS, and an Embedded Linux preview
- **35+ annotated C samples** styled for STM32F4 / CMSIS-style register access
- **Interactive labs**
  - Memory map (stack / heap)
  - Bitwise calculator
  - GPIO MODER register explorer + LED patterns
  - Interrupt timeline (tail-chaining vs nested IRQ)
  - **UART / SPI / I2C Protocol Lab** — SVG schematics, step-by-step scope, per-signal explanations
  - PWM generator (ARR / CCR live values)
  - FreeRTOS-style priority scheduler visualizer
- Dark / light theme, progress tracking, deep links (`#protocols`, `#rtos`, …)

## Modules

| # | Section | Focus |
|---|---------|--------|
| 00 | Roadmap | Learning path |
| 01 | Memory | Stack, heap, BSS/DATA, `volatile` |
| 02 | Data Types | Fixed-width types, casting, endianness |
| 03 | Bitwise Ops | Set / clear / toggle / masks |
| 04 | Pointers | MMIO, struct overlays, callbacks |
| 05 | Registers | GPIO config, RMW, bit-banding |
| 06 | Interrupts | ISR patterns, NVIC / EXTI |
| 07 | Protocols | UART, SPI Mode 0, I2C write + ACK |
| 08 | Timers | PSC/ARR math, PWM, IWDG, SysTick |
| 09 | RTOS | FreeRTOS tasks, mutexes, queues, priority inheritance |
| 10 | Linux | Preview — device trees, build systems |

## Run locally

No build step and no dependencies — plain HTML, CSS, and JavaScript.

```bash
# Option A — open the file
open index.html          # macOS
start index.html         # Windows

# Option B — local server (recommended for Labs / canvas)
python -m http.server 5500
# then visit http://127.0.0.1:5500/
```

## Project layout

```
├── index.html      # Course content + protocol lab markup
├── styles.css      # Neo-brutalism design system
├── app.js          # Navigation, theme, all visualizers & protocol engine
└── docs/           # Design notes for the protocol labs
```

## Protocol Lab notes

- **UART:** 8N1, LSB-first; baud select drives bit/frame-time explanations
- **SPI:** Mode 0 (CPOL=0, CPHA=0), MSB-first; canned MISO `0xA5` for teaching
- **I2C:** 7-bit write, Address+W = `(addr << 1) | 0` (e.g. `0x48` → `0x90`), ACK on 9th clock, START/STOP conditions

Use **Next / Prev / Play**, adjust simulation speed, or click chips / wires on the schematic.

## License

Free and open for learning. Contributions and corrections welcome via pull request.
