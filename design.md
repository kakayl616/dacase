# Design System — Discord Case Platform

## Theme
Discord Dark — authentic to Discord's UI language.

## Colors
- Background: #1e1f22 (darkest, main bg)
- Surface: #2b2d31 (cards, panels)
- Surface Raised: #313338 (elevated surfaces)
- Surface Input: #1e1f22 (inputs)
- Accent: #5865F2 (Discord blurple — primary actions)
- Accent Hover: #4752C4
- Danger: #ed4245 (delete, warning)
- Warning: #faa61a
- Success: #3ba55c
- Muted: #949ba4
- Text Primary: #f2f3f5
- Text Secondary: #b5bac1
- Border: #3f4147

## Typography
- Font: Inter (sans-serif)
- Display: 24-32px bold
- Body: 14-16px
- Small: 12-13px
- Mono: JetBrains Mono (case IDs, codes)

## Components
- Cards: bg-[#2b2d31] border border-[#3f4147] rounded-lg
- Buttons: rounded-[3px] (Discord style, slight radius)
- Inputs: bg-[#1e1f22] border border-[#3f4147] text-[#f2f3f5]
- Badges: pill-shaped, color-coded by status

## Status Colors
- Active: #3ba55c green
- Closed: #faa61a yellow
- Deleted: #ed4245 red

## Motion
- Framer Motion for page transitions and chat messages
- CSS animations for warning banner blink
- Smooth hover transitions (150ms)
