Project Summary: Kitchen-Up Inventory (KUI)
Project Title: Real-Time Operational Inventory Management for Toast POS

Primary Goal: Bridge the gap between Theoretical Inventory (what the computer thinks) and Operational Inventory (what is actually in the kitchen).

1. The Core Problem & Innovation
Existing inventory solutions (including Toast’s native tools and xtraCHEF) are "Management-Down." They focus on weekly counts, reporting, and cost-of-goods-sold for owners.

KUI is "Kitchen-Up":

The Gap: Prep staff currently use paper par sheets or mental notes. Theoretical counts often drift from reality by mid-shift.

The Solution: A lightweight, phone-first application for line cooks and prep staff to log "Live Prep" (e.g., "+10 quarts of salsa") and "Live Waste" in real-time.

The Value: Predictive alerts that notify the chef before an item runs out based on live sales vs. live prep.

2. Technical Architecture & Integration
POS Integration: Toast REST API (v1/v2).

Real-Time Sync: Use Toast Webhooks (order_updated, menu_updated) to decrement stock the moment a transaction occurs.

Stock Write-Back: Use the Toast /stock/v1/inventory endpoint to update official counts if the user chooses to sync back to the master POS.

Predictive Layer: Simple moving averages and seasonality logic (AI-assisted) to suggest prep levels based on the day of the week and historical sale volumes.

3. Chat History Highlights (ChatGPT & Gemini)
Feasibility: Confirmed that Toast APIs are accessible via "Custom Integrations" for single locations, provided the owner grants Client ID and Client Secret.

Timeline: 1–3 months is the target for a Minimum Viable Product (MVP) using AI coding tools (Cursor, Copilot, GPT-4) to handle boilerplate.

Differentiation: Verified that Toast's "Prep List" feature is static (PDF-based) and not an interactive real-time tool, leaving a clear market for this app.

4. Next Steps for Copilot
Phase 1: Design the Database Schema for InventoryItems, Recipes, and LiveCounts.

Phase 2: Scaffold the Toast API Client to fetch the menu structure.

Phase 3: Create the "Tap-to-Prep" mobile UI.